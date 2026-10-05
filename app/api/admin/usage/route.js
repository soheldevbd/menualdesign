import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '../../../../lib/auth';
import clientPromise from '../../../../lib/mongodb';

export const runtime = 'nodejs';
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const signedInEmail = (session?.user?.email || '').trim().toLowerCase();
  if (!session?.user || !adminEmail || signedInEmail !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'adoveautoimage');
    const today = new Date().toISOString().slice(0, 10);
    const [userCount, users, todayUsage, totalUsage] = await Promise.all([
      db.collection('user').countDocuments(),
      db.collection('user').find({}, { projection: { id: 1, name: 1, email: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(100).toArray(),
      db.collection('design_usage').find({ day: today }).toArray(),
      db.collection('design_limits').find({}).toArray()
    ]);
    const todayMap = new Map(todayUsage.map(x => [x.userId, x.used]));
    const totalsMap = new Map(totalUsage.map(x => [x.userId, x.used]));
    const limitMap = new Map(totalUsage.map(x => [x.userId, Number.isInteger(x.limit) ? x.limit : 5]));
    return NextResponse.json({
      stats: { users: userCount, designsToday: todayUsage.reduce((sum, x) => sum + (x.used || 0), 0), activeToday: todayUsage.length },
      users: users.map(u => { const id = String(u.id || u._id?.toString() || ''); return { id, name: u.name || 'Unnamed', email: u.email || '', createdAt: u.createdAt || null, today: todayMap.get(id) || 0, total: totalsMap.get(id) || 0, limit: limitMap.get(id) ?? 5, isAdminAccount: (u.email || '').trim().toLowerCase() === adminEmail }; }),
      today: today
    });
  } catch (error) {
    console.error('Admin usage error:', error);
    return NextResponse.json({ error: 'Could not load dashboard data.' }, { status: 500 });
  }
}
