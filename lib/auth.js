import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import clientPromise from './mongodb';

const client = await clientPromise;
const db = client.db(process.env.MONGODB_DB || 'adoveautoimage');

const trustedOrigins = [
  'http://localhost:3000',
  'https://adovestockdesign.vercel.app',
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
];

export const auth = betterAuth({
  appName: 'Adobe Auto Image Studio',
  database: mongodbAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [...new Set(trustedOrigins)],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});
