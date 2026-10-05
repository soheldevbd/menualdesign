import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ObjectId } from 'mongodb';
import { auth } from '../../../../../lib/auth';
import clientPromise from '../../../../../lib/mongodb';

export const runtime = 'nodejs';
async function isAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const expected = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  return Boolean(session?.user && expected && (session.user.email || '').trim().toLowerCase() === expected);
}
function userFilter(id) {
  const conditions = [{ id: String(id) }];
  if (ObjectId.isValid(id)) conditions.push({ _id: new ObjectId(id) });
  return { $or: conditions };
}

export async function PATCH(request, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    const limit = Number(body.limit);
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (!Number.isInteger(limit) || limit < 0 || limit > 100000) return NextResponse.json({ error: 'Limit must be 0–100000. 0 means unlimited.' }, { status: 400 });
    if (name !== undefined && !name) return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'adoveautoimage');
    const user = await db.collection('user').findOne(userFilter(id));
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if ((user.email || '').trim().toLowerCase() === (process.env.ADMIN_EMAIL || '').trim().toLowerCase()) return NextResponse.json({ error: 'Admin account cannot be edited here.' }, { status: 400 });
    if (name !== undefined) await db.collection('user').updateOne(userFilter(id), { $set: { name, updatedAt: new Date() } });
    const userId = String(user.id || user._id?.toString() || id);
    await db.collection('design_limits').updateOne(
      { userId },
      { $set: { limit, email: user.email || '', updatedAt: new Date() }, $setOnInsert: { userId, used: 0, createdAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ success: true, message: limit === 0 ? 'Unlimited designs enabled.' : `Quota updated to ${limit} designs.` });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Could not update user.' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'adoveautoimage');
    const user = await db.collection('user').findOne(userFilter(id));
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if ((user.email || '').trim().toLowerCase() === (process.env.ADMIN_EMAIL || '').trim().toLowerCase()) return NextResponse.json({ error: 'You cannot delete the admin account.' }, { status: 400 });
    const userId = String(user.id || user._id?.toString() || id);
    await db.collection('user').deleteOne(userFilter(id));
    await Promise.all([
      db.collection('session').deleteMany({ userId }),
      db.collection('account').deleteMany({ userId }),
      db.collection('design_usage').deleteMany({ userId }),
      db.collection('design_limits').deleteMany({ userId }),
    ]);
    return NextResponse.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({ error: 'Could not delete user.' }, { status: 500 });
  }
}
