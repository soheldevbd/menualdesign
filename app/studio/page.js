import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import Studio from '../../components/Studio';

export const metadata = { title: 'Studio – Particle Studio' };

export default async function StudioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in?callbackURL=%2Fstudio');

  return (
    <section className="wrap section">
      <h1 className="h2">Studio</h1>
      <p className="muted lead">Welcome, {session.user.name || session.user.email}. Pick a style, tweak it, and download your design.</p>
      <Studio />
    </section>
  );
}
