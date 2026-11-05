import { useState } from 'react';
import { api } from './api';
import { Dashboard, Vendors, Users, Reviews, Payments } from './pages';

const TABS = [
  ['Dashboard', Dashboard], ['Vendors', Vendors], ['Users', Users], ['Reviews', Reviews], ['Payments', Payments],
];

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      setError('');
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (data.user.role !== 'admin') throw new Error('This account is not an admin');
      sessionStorage.setItem('adminToken', data.token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <h2>ServiceApp Admin</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="err">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('adminToken'));
  const [tab, setTab] = useState('Dashboard');

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const Page = TABS.find(([name]) => name === tab)[1];
  return (
    <div className="layout">
      <aside>
        <h3>ServiceApp</h3>
        {TABS.map(([name]) => (
          <button key={name} className={tab === name ? 'nav active' : 'nav'} onClick={() => setTab(name)}>{name}</button>
        ))}
        <button className="nav logout" onClick={() => { sessionStorage.removeItem('adminToken'); setAuthed(false); }}>
          Log out
        </button>
      </aside>
      <main>
        <h1>{tab}</h1>
        <Page />
      </main>
    </div>
  );
}