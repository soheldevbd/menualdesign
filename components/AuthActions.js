'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '../lib/auth-client';

export default function AuthActions() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <span className="auth-loading" aria-label="Loading account" />;

  if (session?.user) {
    return (
      <div className="auth-actions">
        <span className="auth-user" title={session.user.email}>{session.user.name || session.user.email}</span>
        <button className="btn sm ghost" onClick={async () => { await authClient.signOut(); router.replace('/'); router.refresh(); }}>Sign out</button>
      </div>
    );
  }

  return <div className="auth-actions"><Link href="/sign-in">Sign in</Link><Link href="/sign-up" className="btn sm">Create account</Link></div>;
}
