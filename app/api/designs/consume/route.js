import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '../../../../lib/auth';
import clientPromise from '../../../../lib/mongodb';

export const runtime = 'nodejs';
const DAILY_LIMIT = 5;
const dayKey = () => new Date().toISOString().slice(0, 10);

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const isAdmin = Boolean(adminEmail && (session.user.email || '').trim().toLowerCase() === adminEmail);
    if (isAdmin) return NextResponse.json({ allowed: true, isAdmin: true, used: 0, limit: null, remaining: null });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'adoveautoimage');
    const limits = db.collection('design_limits');
    const dailyUsage = db.collection('design_usage');
    await limits.createIndex({ userId: 1 }, { unique: true });
    await dailyUsage.createIndex({ userId: 1, day: 1 }, { unique: true });
    const userId = session.user.id;
    const day = dayKey();
    const existingLimit = await limits.findOne({ userId });
    const userLimit = Number.isInteger(existingLimit?.limit) ? existingLimit.limit : DAILY_LIMIT;
    // A limit of 0 means unlimited; otherwise the admin-configured lifetime cap applies.
    if (userLimit === 0) {
      await limits.updateOne({ userId }, { $inc: { used: 1 }, $set: { email: session.user.email || '', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), limit: 0 } }, { upsert: true });
      await dailyUsage.findOneAndUpdate({ userId, day }, { $inc: { used: 1 }, $set: { email: session.user.email || '', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, returnDocument: 'after' });
      return NextResponse.json({ allowed: true, isAdmin: false, used: (existingLimit?.used || 0) + 1, limit: null, remaining: null });
    }
    let quotaDoc = await limits.findOneAndUpdate(
      { userId, used: { $lt: userLimit } },
      { $inc: { used: 1 }, $set: { email: session.user.email || '', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!quotaDoc) {
      try {
        await limits.insertOne({ userId, email: session.user.email || '', used: 1, createdAt: new Date(), updatedAt: new Date() });
        quotaDoc = { used: 1 };
      } catch (error) {
        if (error?.code !== 11000) throw error;
        quotaDoc = await limits.findOneAndUpdate(
          { userId, used: { $lt: userLimit } },
          { $inc: { used: 1 }, $set: { email: session.user.email || '', updatedAt: new Date() } },
          { returnDocument: 'after' }
        );
      }
    }
    if (!quotaDoc) {
      const current = await limits.findOne({ userId });
      return NextResponse.json({ allowed: false, isAdmin: false, used: current?.used || userLimit, limit: userLimit, remaining: 0, error: `You have reached your ${userLimit}-design account limit.` }, { status: 429 });
    }

    // Keep a separate daily counter for admin analytics.
    await dailyUsage.findOneAndUpdate(
      { userId, day },
      { $inc: { used: 1 }, $set: { email: session.user.email || '', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    return NextResponse.json({ allowed: true, isAdmin: false, used: quotaDoc.used, limit: userLimit, remaining: Math.max(0, userLimit - quotaDoc.used) });
  } catch (error) {
    console.error('Design quota error:', error);
    return NextResponse.json({ error: 'Could not verify your design limit. Please try again.' }, { status: 500 });
  }
}
