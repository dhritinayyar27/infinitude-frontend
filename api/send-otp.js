import nodemailer from 'nodemailer';
import { Redis } from '@upstash/redis';
import { createOtpHandler } from '../server/sendOtp.js';

export const config = { api: { bodyParser: false } };

export default createOtpHandler({
  env: process.env,
  createTransport: (options) => nodemailer.createTransport(options),
  createRedis: (options) => new Redis(options),
});
