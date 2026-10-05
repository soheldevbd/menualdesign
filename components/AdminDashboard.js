'use client';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [edits, setEdits] = useState({});

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/usage', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load admin data');
      setData(result);
      setEdits(Object.fromEntries(result.users.map(user => [user.id, { name: user.name, limit: String(user.limit ?? 5) }])));
    } catch (e) { setError(e.message || 'Something went wrong'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function changeEdit(id, key, value) {
    setEdits(current => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }
  async function updateUser(user) {
    const edit = edits[user.id] || {};
    setBusyId(user.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: edit.name, limit: Number(edit.limit) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update user');
      setNotice(`${user.email}: ${result.message}`);
      await load();
    } catch (e) { setError(e.message || 'Could not update user'); }
    finally { setBusyId(''); }
  }
  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name} (${user.email})? This cannot be undone.`)) return;
    setBusyId(user.id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete user');
      setNotice(`${user.email}: ${result.message}`);
      await load();
    } catch (e) { setError(e.message || 'Could not delete user'); }
    finally { setBusyId(''); }
  }

  return <div className="admin-dashboard">
    <div className="admin-heading"><div><span className="pill">OWNER ACCESS</span><h1 className="h2">Admin Dashboard</h1><p className="muted">Manage users, set design quotas, and delete accounts.</p></div><button className="btn ghost" onClick={load} disabled={loading}>↻ Refresh</button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
    {loading && !data ? <p className="muted">Loading dashboard…</p> : null}
    {data && <>
      <div className="admin-stats">
        <div className="admin-stat"><span className="muted">Registered users</span><strong>{data.stats.users}</strong></div>
        <div className="admin-stat"><span className="muted">Designs created today</span><strong>{data.stats.designsToday}</strong></div>
        <div className="admin-stat"><span className="muted">Users active today</span><strong>{data.stats.activeToday}</strong></div>
      </div>
      <div className="panel admin-table-wrap"><div className="admin-table-head"><h2>Registered users</h2><span className="muted small">Default: 5 designs · Set 0 for unlimited</span></div>
        <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>User</th><th>Email</th><th>Designs used</th><th>Set quota</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
          {data.users.map(user => {
            const edit = edits[user.id] || { name: user.name, limit: String(user.limit ?? 5) };
            const isOwner = Boolean(user.isAdminAccount);
            return <tr key={user.id || user.email}>
              <td><input className="admin-edit-input" aria-label={`Name for ${user.email}`} value={edit.name ?? ''} onChange={e => changeEdit(user.id, 'name', e.target.value)} disabled={busyId === user.id || isOwner} /></td>
              <td>{user.email}</td>
              <td><span className={(user.limit !== 0 && user.total >= user.limit) ? 'limit-pill full' : 'limit-pill'}>{user.total} / {user.limit === 0 ? '∞' : user.limit}</span><div className="muted small">Today: {user.today}</div></td>
              <td><input className="admin-limit-input" type="number" min="0" max="100000" step="1" aria-label={`Design quota for ${user.email}`} value={edit.limit ?? '5'} onChange={e => changeEdit(user.id, 'limit', e.target.value)} disabled={busyId === user.id || isOwner} /><div className="muted small">0 = unlimited</div></td>
              <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
              <td><div className="admin-actions"><button className="btn small" onClick={() => updateUser(user)} disabled={busyId === user.id || isOwner}>{busyId === user.id ? 'Saving…' : 'Update'}</button><button className="btn small danger" onClick={() => deleteUser(user)} disabled={busyId === user.id || isOwner}>Delete</button></div>{isOwner && <span className="muted small">Admin account protected</span>}</td>
            </tr>;
          })}
          {!data.users.length && <tr><td colSpan="6" className="muted">No registered users found.</td></tr>}
        </tbody></table></div>
        <p className="muted small">Update a user's name and lifetime design quota. Existing design count is retained. Deleting removes the account and its stored usage/session records. Dashboard shows up to 100 newest accounts.</p>
      </div>
    </>}
  </div>;
}
