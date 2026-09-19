import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Star, BookOpen, CheckCircle2, Gift } from 'lucide-react';
import { supabase } from './supabase';
import './style.css';

function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,name,role')
        .eq('is_active', true)
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Could not load profiles:', error);
        setLoginError('Could not connect to TEAM MILLER.');
      } else {
        setProfiles(data || []);
      }

      setLoading(false);
    }

    loadProfiles();
  }, []);

  async function handleLogin(profile) {
    setLoginError('');

    const enteredPin = window.prompt(`Enter the PIN for ${profile.name}:`);

    if (enteredPin === null) {
      return;
    }

    if (!enteredPin.trim()) {
      setLoginError('Please enter a PIN.');
      return;
    }

    const { data, error } = await supabase.rpc('verify_profile_pin', {
      profile_name: profile.name,
      entered_pin: enteredPin.trim(),
    });

    if (error) {
      console.error('PIN verification error:', error);
      setLoginError('There was a problem verifying the PIN.');
      return;
    }

    if (!data) {
      setLoginError('Incorrect PIN. Please try again.');
      return;
    }

    setUser(profile);
  }

  function logout() {
    setUser(null);
    setLoginError('');
  }

  if (!user) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>TEAM MILLER</h1>
          <p>Working together. Serving our family. Honoring God.</p>

          <div className="profile-buttons">
            {loading ? (
              <p>Loading...</p>
            ) : profiles.length === 0 ? (
              <p>No profiles found.</p>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleLogin(profile)}
                >
                  {profile.name}
                </button>
              ))
            )}
          </div>

          {loginError && (
            <p
              style={{
                marginTop: '16px',
                color: '#b91c1c',
                fontWeight: '600',
              }}
            >
              {loginError}
            </p>
          )}

          <small>
            Select your profile and enter your PIN to continue.
          </small>
        </div>
      </main>
    );
  }

  if (user.role === 'parent') {
    return <Parent user={user} onLogout={logout} />;
  }

  return <Child user={user} onLogout={logout} />;
}

function Child({ user, onLogout }) {
  return (
    <main>
      <header>
        <h1>TEAM MILLER MISSION BOARD</h1>
        <p>Welcome, {user.name}!</p>
        <button onClick={onLogout}>Log Out</button>
      </header>

      <div className="stats">
        <Card
          title="Mission Points"
          value="0"
          icon={<Star />}
        />

        <Card
          title="Reading Points"
          value="0"
          icon={<BookOpen />}
        />

        <Card
          title="Missions Today"
          value="0"
          icon={<CheckCircle2 />}
        />

        <Card
          title="Rewards"
          value="0"
          icon={<Gift />}
        />
      </div>
    </main>
  );
}

function Parent({ user, onLogout }) {
  return (
    <main>
      <header>
        <h1>TEAM MILLER</h1>
        <p>Parent Dashboard</p>
        <button onClick={onLogout}>Log Out</button>
      </header>

      <div className="stats">
        <Card
          title="Kiegan"
          value="0 MP"
          icon={<Star />}
        />

        <Card
          title="Levi"
          value="0 MP"
          icon={<Star />}
        />

        <Card
          title="Will"
          value="0 MP"
          icon={<Star />}
        />
      </div>
    </main>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="card">
      {icon}
      <small>{title}</small>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
