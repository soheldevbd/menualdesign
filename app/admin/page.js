import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import AdminDashboard from '../../components/AdminDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Dashboard – Adoveautoimage' };

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/sign-in?callbackURL=%2Fadmin');

  // Admin access is granted only to the authenticated account matching ADMIN_EMAIL.
  // This avoids confusing MongoDB credentials/usernames with Better Auth user IDs.
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const signedInEmail = (session.user.email || '').trim().toLowerCase();
  if (!adminEmail || signedInEmail !== adminEmail) redirect('/studio');

  return <section className="wrap section"><AdminDashboard /></section>;
}
