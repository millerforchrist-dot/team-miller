import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Star, BookOpen, CheckCircle2, Gift } from 'lucide-react';
import { supabase } from './supabase';
import './style.css';

function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,name,role')
        .eq('is_active', true);

      if (error) {
        console.error('Could not load profiles:', error);
      } else {
        setProfiles(data || []);
      }

      setLoading(false);
    }

    loadProfiles();
  }, []);

  if (!user) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>TEAM MILLER</h1>
          <p>Working together. Serving our family. Honoring God.</p>

          <div className="profile-buttons">
            {loading ? (
              <p>Loading...</p>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setUser(profile)}
                >
                  {profile.name}
                </button>
              ))
            )}
          </div>

          <small>
            Select your profile to continue. PIN setup is the next connection step.
          </small>
        </div>
      </main>
    );
  }

  if (user.role === 'parent') {
    return <Parent user={user} onLogout={() => setUser(null)} />;
  }

  return <Child user={user} onLogout={() => setUser(null)} />;
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
        <Card title="Mission Points" value="0" icon={<Star />} />
        <Card title="Reading Points" value="0" icon={<BookOpen />} />
        <Card title="Missions Today" value="0" icon={<CheckCircle2 />} />
        <Card title="Rewards" value="0" icon={<Gift />} />
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
        <Card title="Kiegan" value="0 MP" icon={<Star />} />
        <Card title="Levi" value="0 MP" icon={<Star />} />
        <Card title="Will" value="0 MP" icon={<Star />} />
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
