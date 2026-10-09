import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 256 * 1024;
const MAX_AGE_SECONDS = 60;
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function createOtpHandler({ env, createTransport, createRedis, now = Date.now, log = console }) {
  return async function sendOtp(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end();
    }
    if (Buffer.byteLength(env.EMAIL_RELAY_SECRET || '') < 32
        || !EMAIL.test(env.GMAIL_USER || '') || !env.GMAIL_APP_PASSWORD
        || !env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      log.error('OTP relay configuration is incomplete.');
      return res.status(503).end();
    }

    const timestamp = req.headers['x-otp-timestamp'];
    const requestId = req.headers['x-otp-request-id'];
    const recipient = req.headers['x-otp-recipient'];
    const signature = req.headers['x-otp-signature'];
    if (typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp)
        || Math.abs(Math.floor(now() / 1000) - Number(timestamp)) > MAX_AGE_SECONDS
        || typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)
        || typeof recipient !== 'string' || recipient.length > 254 || !EMAIL.test(recipient)
        || typeof signature !== 'string' || !/^[0-9a-f]{64}$/.test(signature)) {
      return res.status(401).end();
    }
    if (req.headers['content-type'] !== 'application/octet-stream') {
      return res.status(415).end();
    }

    let body;
    try {
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        length += bytes.length;
        if (length > MAX_BODY_BYTES) return res.status(413).end();
        chunks.push(bytes);
      }
      body = Buffer.concat(chunks);
    } catch {
      log.error('OTP relay request stream failed.');
      return res.status(400).end();
    }
    if (!body.length) return res.status(400).end();

    const expected = createHmac('sha256', env.EMAIL_RELAY_SECRET)
      .update(`${timestamp}\n${requestId}\n${recipient}\n`)
      .update(body)
      .digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
      return res.status(401).end();
    }

    let claimed;
    try {
      const redis = createRedis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
      // Durable NX claim prevents replay across concurrent/cold Vercel instances.
      claimed = await redis.set(`otp-relay:${requestId}`, '1', { nx: true, ex: 180 });
    } catch {
      log.error('OTP relay replay protection is unavailable.');
      return res.status(503).end();
    }
    if (claimed !== 'OK') return res.status(409).end();

    let transport;
    try {
      transport = createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const result = await transport.sendMail({
        envelope: { from: env.GMAIL_USER, to: [recipient] },
        raw: body,
      });
      if (!result.accepted?.includes(recipient) || result.rejected?.length) {
        log.error('OTP relay SMTP server did not accept delivery.');
        return res.status(502).end();
      }
      return res.status(204).end();
    } catch {
      // Provider errors may contain recipient, credentials, or message content.
      log.error('OTP relay Gmail SMTP delivery failed.');
      return res.status(502).end();
    } finally {
      transport?.close();
    }
  };
}
