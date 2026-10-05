'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';

const links = [['/', 'Home'], ['/studio', 'Studio'], ['/guide', 'Guide']];

export default function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      if (!session?.user) {
        setIsAdmin(false);
        return;
      }
      try {
        const response = await fetch('/api/admin/usage', { cache: 'no-store' });
        if (!cancelled) setIsAdmin(response.ok);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }
    checkAdmin();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  async function logout() {
    await authClient.signOut();
    setIsAdmin(false);
    setOpen(false);
    router.replace('/sign-in');
    router.refresh();
  }

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="logo"><span className="logo-dot" />Adove<b>AutoImage</b></Link>
        <button className="burger" aria-label="Toggle menu" onClick={() => setOpen(!open)}>☰</button>
        <nav className={open ? 'links open' : 'links'}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'active' : ''} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          {isPending ? <span className="muted">Checking session…</span> : session?.user ? (
            <>
              {isAdmin && <Link href="/admin" className={path === '/admin' ? 'active' : ''} onClick={() => setOpen(false)}>Admin Dashboard</Link>}
              <button type="button" className="btn ghost sm" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/sign-in" onClick={() => setOpen(false)}>Sign in</Link>
              <Link href="/sign-up" className="btn sm" onClick={() => setOpen(false)}>Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
