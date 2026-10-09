import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import { createServer } from 'node:net';
import nodemailer from 'nodemailer';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createOtpHandler } from './sendOtp.js';

const env = {
  EMAIL_RELAY_SECRET: 'fixture-secret-at-least-32-bytes-long',
  GMAIL_USER: 'sender@example.com',
  GMAIL_APP_PASSWORD: 'fixture-password',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.invalid',
  UPSTASH_REDIS_REST_TOKEN: 'fixture-token',
};
const now = 1800000000000;
const body = Buffer.from('From: sender@example.com\r\nTo: user@example.com\r\n\r\n123456');

function request(overrides = {}) {
  const headers = {
    'content-type': 'application/octet-stream',
    'x-otp-timestamp': String(now / 1000),
    'x-otp-request-id': '12345678-1234-4123-8123-123456789012',
    'x-otp-recipient': 'user@example.com',
    ...overrides,
  };
  headers['x-otp-signature'] = createHmac('sha256', env.EMAIL_RELAY_SECRET)
    .update(`${headers['x-otp-timestamp']}\n${headers['x-otp-request-id']}\n${headers['x-otp-recipient']}\n`)
    .update(body).digest('hex');
  return Object.assign(Readable.from([body]), { method: 'POST', headers });
}

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    end() { this.ended = true; return this; },
  };
}

function fixture(overrides = {}) {
  const sent = [];
  const logs = [];
  const claims = new Set();
  let redisCalls = 0;
  const handler = createOtpHandler({
    env,
    now: () => now,
    log: { error: (message) => logs.push(message) },
    createRedis: () => ({
      set: async (key, value, options) => {
        redisCalls++;
        assert.deepEqual(options, { nx: true, ex: 180 });
        if (claims.has(key)) return null;
        claims.add(key);
        return 'OK';
      },
    }),
    createTransport: (options) => {
      assert.equal(options.host, 'smtp.gmail.com');
      assert.equal(options.secure, true);
      assert.equal(options.disableFileAccess, true);
      return {
        sendMail: async (mail) => {
          sent.push(mail);
          return { accepted: ['user@example.com'], rejected: [] };
        },
        close() {},
      };
    },
    ...overrides,
  });
  return { handler, sent, logs, redisCalls: () => redisCalls };
}

test('signed MIME is delivered without returning OTP or credentials', async () => {
  const f = fixture();
  const res = response();
  await f.handler(request(), res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.deepEqual(f.sent[0], {
    envelope: { from: env.GMAIL_USER, to: ['user@example.com'] },
    raw: body,
  });
  assert.deepEqual(f.logs, []);
});

test('concurrent replay is rejected by durable atomic claim', async () => {
  const f = fixture();
  const first = response();
  const second = response();
  await Promise.all([f.handler(request(), first), f.handler(request(), second)]);
  assert.deepEqual([first.statusCode, second.statusCode].sort(), [204, 409]);
  assert.equal(f.sent.length, 1);
});

for (const [name, mutate] of [
  ['missing authentication', (req) => { delete req.headers['x-otp-signature']; }],
  ['incorrect signature', (req) => { req.headers['x-otp-signature'] = '0'.repeat(64); }],
  ['altered recipient', (req) => { req.headers['x-otp-recipient'] = 'attacker@example.com'; }],
  ['expired request', (req) => { req.headers['x-otp-timestamp'] = String(now / 1000 - 61); }],
  ['future request', (req) => { req.headers['x-otp-timestamp'] = String(now / 1000 + 61); }],
  ['multiple recipients', (req) => { req.headers['x-otp-recipient'] = 'a@example.com,b@example.com'; }],
]) {
  test(`${name} is rejected before Redis or SMTP`, async () => {
    const f = fixture();
    const req = request();
    mutate(req);
    const res = response();
    await f.handler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(f.redisCalls(), 0);
    assert.equal(f.sent.length, 0);
  });
}

test('modified MIME fails authentication', async () => {
  const f = fixture();
  const original = request();
  const req = Object.assign(Readable.from([Buffer.from('tampered')]), {
    method: original.method, headers: original.headers,
  });
  const res = response();
  await f.handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(f.sent.length, 0);
});

test('oversized bodies are rejected', async () => {
  const f = fixture();
  const original = request();
  const req = Object.assign(Readable.from([Buffer.alloc(256 * 1024 + 1)]), {
    method: original.method, headers: original.headers,
  });
  const res = response();
  await f.handler(req, res);
  assert.equal(res.statusCode, 413);
  assert.equal(f.redisCalls(), 0);
});

test('wrong methods and content types are rejected', async () => {
  const f = fixture();
  const req = request();
  req.method = 'GET';
  const res = response();
  await f.handler(req, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');
  const second = response();
  await f.handler(request({ 'content-type': 'application/json' }), second);
  assert.equal(second.statusCode, 415);
  assert.equal(f.sent.length, 0);
});

test('missing server secrets fail closed', async () => {
  const f = fixture({ env: { ...env, EMAIL_RELAY_SECRET: '' } });
  const res = response();
  await f.handler(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(f.sent.length, 0);
  assert.equal(f.redisCalls(), 0);
});

test('Redis outage fails closed without sending email', async () => {
  const f = fixture({
    createRedis: () => ({ set: async () => { throw new Error('secret redis token'); } }),
  });
  const res = response();
  await f.handler(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(f.sent.length, 0);
  assert.equal(f.logs.join('').includes('secret redis token'), false);
});

test('SMTP failure is explicit without leaking sensitive provider details', async () => {
  const f = fixture({
    createTransport: () => ({
      sendMail: async () => { throw new Error('123456 user@example.com fixture-password'); },
      close() {},
    }),
  });
  const res = response();
  await f.handler(request(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(f.logs.join('').includes('123456'), false);
  assert.equal(f.logs.join('').includes('user@example.com'), false);
  assert.equal(f.logs.join('').includes('fixture-password'), false);
});

test('SMTP rejection never returns success', async () => {
  const f = fixture({
    createTransport: () => ({
      sendMail: async () => ({ accepted: [], rejected: ['user@example.com'] }),
      close() {},
    }),
  });
  const res = response();
  await f.handler(request(), res);
  assert.equal(res.statusCode, 502);
});

test('real Nodemailer transport forwards the signed MIME to SMTP', async () => {
  let received = '';
  const sockets = new Set();
  const smtp = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.write('220 fixture SMTP\r\n');
    let pending = '';
    let data = false;
    socket.on('data', (chunk) => {
      pending += chunk.toString();
      let end;
      while ((end = pending.indexOf('\r\n')) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 2);
        if (data) {
          if (line === '.') {
            data = false;
            socket.write('250 queued\r\n');
          } else {
            received += `${line}\r\n`;
          }
        } else if (line.startsWith('EHLO') || line.startsWith('HELO')) {
          socket.write('250 fixture\r\n');
        } else if (line === 'DATA') {
          data = true;
          socket.write('354 send message\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 bye\r\n');
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });
  await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  try {
    const f = fixture({
      createTransport: () => nodemailer.createTransport({
        host: '127.0.0.1', port: smtp.address().port, secure: false,
        connectionTimeout: 1000, socketTimeout: 1000,
      }),
    });
    const res = response();
    await f.handler(request(), res);
    assert.equal(res.statusCode, 204);
    assert.equal(received, body.toString() + '\r\n');
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => smtp.close(resolve));
  }
});
