'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '../../lib/auth-client';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
      if (result.error) {
        setError(result.error.message || 'Could not create account.');
        return;
      }
      router.replace('/studio');
      router.refresh();
    } catch {
      setError('Could not create your account. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="pill">WELCOME TO THE STUDIO</span>
        <h1>Create your account</h1>
        <p className="muted">Save your session and start creating particle backgrounds.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <label className="field">Name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
        <label className="field">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="field">Password<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
        <button className="btn auth-submit" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        <p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>
      </form>
    </section>
  );
}
