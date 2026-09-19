import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Star,
  BookOpen,
  CheckCircle2,
  Gift,
  LogOut,
  Home,
  Trophy,
  Shirt,
  Target,
  BookMarked,
  Users,
} from 'lucide-react';
import { supabase } from './supabase';
import './style.css';

const COLORS = {
  navy: '#172554',
  blue: '#2563eb',
  gold: '#f59e0b',
  green: '#16a34a',
  purple: '#7c3aed',
  red: '#dc2626',
};

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
        console.error(error);
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

    if (enteredPin === null) return;

    if (!enteredPin.trim()) {
      setLoginError('Please enter a PIN.');
      return;
    }

    const { data, error } = await supabase.rpc('verify_profile_pin', {
      profile_name: profile.name,
      entered_pin: enteredPin.trim(),
    });

    if (error) {
      console.error(error);
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
      <LoginScreen
        profiles={profiles}
        loading={loading}
        error={loginError}
        onLogin={handleLogin}
      />
    );
  }

  if (user.role === 'parent') {
    return <ParentDashboard user={user} onLogout={logout} />;
  }

  return <ChildDashboard user={user} onLogout={logout} />;
}

function LoginScreen({ profiles, loading, error, onLogin }) {
  const children = profiles.filter((p) => p.role === 'child');
  const parents = profiles.filter((p) => p.role === 'parent');

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #172554 0%, #1d4ed8 55%, #60a5fa 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'white',
          borderRadius: '28px',
          padding: '42px',
          boxShadow: '0 25px 70px rgba(0,0,0,.25)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '22px',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'white',
            }}
          >
            <Trophy size={40} />
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '38px',
              fontWeight: 900,
              color: '#172554',
              letterSpacing: '-1px',
            }}
          >
            TEAM MILLER
          </h1>

          <p
            style={{
              margin: '10px 0 0',
              color: '#64748b',
              fontSize: '16px',
            }}
          >
            Working together. Serving our family. Honoring God.
          </p>
        </div>

        <h2
          style={{
            textAlign: 'center',
            color: '#172554',
            marginBottom: '18px',
          }}
        >
          Who's logging in?
        </h2>

        {loading ? (
          <p style={{ textAlign: 'center' }}>Loading...</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
              }}
            >
              {children.map((profile) => (
                <ProfileButton
                  key={profile.id}
                  profile={profile}
                  onClick={() => onLogin(profile)}
                />
              ))}
            </div>

            {parents.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onLogin(profile)}
                style={{
                  width: '100%',
                  marginTop: '18px',
                  padding: '16px',
                  border: 'none',
                  borderRadius: '14px',
                  background: '#172554',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Users size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Parent Dashboard
              </button>
            ))}
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: '18px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#fee2e2',
              color: '#991b1b',
              textAlign: 'center',
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

function ProfileButton({ profile, onClick }) {
  const colors = {
    Kiegan: '#2563eb',
    Levi: '#16a34a',
    Will: '#7c3aed',
  };

  const color = colors[profile.name] || '#2563eb';

  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: '18px',
        padding: '22px 10px',
        background: `${color}12`,
        color,
        cursor: 'pointer',
        fontWeight: 900,
        fontSize: '18px',
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: color,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 10px',
          fontSize: '22px',
        }}
      >
        {profile.name.charAt(0)}
      </div>

      {profile.name}
    </button>
  );
}

function DashboardShell({ children, title, subtitle, user, onLogout }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#172554',
      }}
    >
      <header
        style={{
          background: '#172554',
          color: 'white',
          padding: '20px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              opacity: 0.75,
            }}
          >
            TEAM MILLER
          </div>

          <h1 style={{ margin: '3px 0 0', fontSize: '28px' }}>{title}</h1>

          <p style={{ margin: '4px 0 0', opacity: 0.75 }}>{subtitle}</p>
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            border: '1px solid rgba(255,255,255,.3)',
            background: 'transparent',
            color: 'white',
            borderRadius: '10px',
            padding: '10px 14px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          <LogOut size={17} />
          Log Out
        </button>
      </header>

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '28px',
        }}
      >
        {children}
      </div>
    </main>
  );
}

function ChildDashboard({ user, onLogout }) {
  return (
    <DashboardShell
      title={`Welcome, ${user.name}!`}
      subtitle="Let's make today count."
      user={user}
      onLogout={onLogout}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
          gap: '16px',
          marginBottom: '26px',
        }}
      >
        <StatCard
          title="Mission Points"
          value="0"
          icon={<Star />}
          color="#2563eb"
        />

        <StatCard
          title="Reading Points"
          value="0"
          icon={<BookOpen />}
          color="#16a34a"
        />

        <StatCard
          title="Today's Missions"
          value="0 / 6"
          icon={<CheckCircle2 />}
          color="#7c3aed"
        />

        <StatCard
          title="Rewards"
          value="0"
          icon={<Gift />}
          color="#f59e0b"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
          gap: '18px',
        }}
      >
        <FeatureCard
          icon={<CheckCircle2 />}
          title="Today's Missions"
          description="Complete your daily responsibilities and earn Mission Points."
          button="View Missions"
          color="#2563eb"
        />

        <FeatureCard
          icon={<BookOpen />}
          title="Reading Challenge"
          description="Read a book, take your quiz, and earn Reading Points."
          button="Open Reading"
          color="#16a34a"
        />

        <FeatureCard
          icon={<Shirt />}
          title="Laundry"
          description="See today's laundry assignment and complete each step."
          button="Open Laundry"
          color="#7c3aed"
        />

        <FeatureCard
          icon={<Target />}
          title="Bonus Missions"
          description="Submit extra activities for parent approval."
          button="View Bonuses"
          color="#f59e0b"
        />

        <FeatureCard
          icon={<Trophy />}
          title="Rewards"
          description="See how many points you have and what you can earn."
          button="View Rewards"
          color="#dc2626"
        />

        <FeatureCard
          icon={<BookMarked />}
          title="History"
          description="Look back at your missions, reading, and points."
          button="View History"
          color="#0f766e"
        />
      </div>
    </DashboardShell>
  );
}

function ParentDashboard({ user, onLogout }) {
  return (
    <DashboardShell
      title="Parent Dashboard"
      subtitle="Manage the TEAM MILLER family mission board."
      user={user}
      onLogout={onLogout}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <StatCard
          title="Kiegan"
          value="0 MP"
          icon={<Star />}
          color="#2563eb"
        />

        <StatCard
          title="Levi"
          value="0 MP"
          icon={<Star />}
          color="#16a34a"
        />

        <StatCard
          title="Will"
          value="0 MP"
          icon={<Star />}
          color="#7c3aed"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
          gap: '18px',
        }}
      >
        <FeatureCard
          icon={<CheckCircle2 />}
          title="Daily Missions"
          description="Manage missions and see what each child has completed."
          button="Manage Missions"
          color="#2563eb"
        />

        <FeatureCard
          icon={<BookOpen />}
          title="Quizzes"
          description="Upload and manage book-specific reading quizzes."
          button="Manage Quizzes"
          color="#16a34a"
        />

        <FeatureCard
          icon={<Users />}
          title="Assignments"
          description="Manage weekly assignments and child overrides."
          button="Manage Assignments"
          color="#7c3aed"
        />

        <FeatureCard
          icon={<Shirt />}
          title="Laundry"
          description="Review laundry assignments and completion."
          button="Manage Laundry"
          color="#f59e0b"
        />

        <FeatureCard
          icon={<Gift />}
          title="Rewards"
          description="Manage rewards and point thresholds."
          button="Manage Rewards"
          color="#dc2626"
        />

        <FeatureCard
          icon={<Trophy />}
          title="Reports"
          description="Review historical points, missions, and reading."
          button="View Reports"
          color="#0f766e"
        />
      </div>
    </DashboardShell>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '18px',
        padding: '20px',
        boxShadow: '0 4px 18px rgba(15,23,42,.07)',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: `${color}15`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
        }}
      >
        {icon}
      </div>

      <div
        style={{
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '28px',
          fontWeight: 900,
          color: '#172554',
          marginTop: '4px',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, button, color }) {
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '18px',
        padding: '22px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 18px rgba(15,23,42,.06)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '13px',
          background: `${color}15`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '15px',
        }}
      >
        {icon}
      </div>

      <h2
        style={{
          margin: '0 0 7px',
          fontSize: '20px',
          color: '#172554',
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: '0 0 18px',
          color: '#64748b',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <button
        style={{
          border: 'none',
          borderRadius: '10px',
          padding: '10px 15px',
          background: color,
          color: 'white',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {button}
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
