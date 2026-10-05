'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(result.error.message || 'Email or password is incorrect.');
        return;
      }
      setPassword('');
      router.replace('/studio');
      router.refresh();
    } catch {
      setError('Could not sign in. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="pill">YOUR CREATIVE WORKSPACE</span>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to open your Particle Studio.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <label className="field">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn auth-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        <p className="auth-switch">New to the studio? <Link href="/sign-up">Create an account</Link></p>
      </form>
    </section>
  );
}
