import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LockKeyhole, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from './supabase';
import './style.css';

function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    async function loadProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,name,role')
        .eq('is_active', true);

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

  function chooseProfile(profile) {
    setSelectedProfile(profile);
    setPin('');
    setLoginError('');
  }

  async function submitPin(e) {
    e.preventDefault();

    if (!selectedProfile || !pin.trim()) return;

    setCheckingPin(true);
    setLoginError('');

    const { data, error } = await supabase.rpc('verify_profile_pin', {
      profile_name: selectedProfile.name,
      entered_pin: pin.trim(),
    });

    setCheckingPin(false);

    if (error) {
      console.error(error);
      setLoginError('There was a problem verifying the PIN.');
      return;
    }

    if (!data) {
      setLoginError('That PIN is not correct. Try again.');
      setPin('');
      return;
    }

    setUser(selectedProfile);
    setSelectedProfile(null);
    setPin('');
  }

  function logout() {
    setUser(null);
    setSelectedProfile(null);
    setPin('');
    setLoginError('');
  }

  if (user) {
    return (
      <main className="tm-dashboard">
        <header className="tm-dashboard-header">
          <Brand />

          <button className="tm-text-button" onClick={logout}>
            Log out
          </button>
        </header>

        <section className="tm-dashboard-welcome">
          <span className="tm-eyebrow">
            <Sparkles size={17} />
            TEAM MILLER
          </span>

          <h1>
            Welcome,
            <br />
            <em>{user.name}.</em>
          </h1>

          <p>
            {user.role === 'parent'
              ? 'Your family dashboard is ready.'
              : 'Your mission board is ready.'}
          </p>

          <div className="tm-coming-soon">
            <strong>
              {user.role === 'parent'
                ? 'Parent Dashboard'
                : `${user.name}'s Mission Board`}
            </strong>
            <span>
              We’ll build this screen next using the same TEAM Miller style.
            </span>
          </div>
        </section>
      </main>
    );
  }

  const children = ['Kiegan', 'Levi', 'Will']
    .map((name) => profiles.find((profile) => profile.name === name))
    .filter(Boolean);

  const parent = profiles.find((profile) => profile.role === 'parent');

  return (
    <main className="tm-home">
      <div className="tm-decor-circle" />

      <header className="tm-header">
        <Brand />

        {parent && (
          <button
            className="tm-parent-link"
            onClick={() => chooseProfile(parent)}
          >
            <LockKeyhole size={20} />
            Parent dashboard
          </button>
        )}
      </header>

      <section className="tm-hero">
        <div className="tm-eyebrow">
          <Sparkles size={19} />
          A LITTLE ROOM TO DO GOOD
        </div>

        <h1 className="tm-hero-title">
          <span>Working together.</span>
          <em>Serving our family.</em>
        </h1>

        <p className="tm-hero-copy">
          Choose your name and enter your private PIN to open your mission
          board.
        </p>
      </section>

      <section className="tm-profile-section">
        {loading ? (
          <p>Loading TEAM MILLER...</p>
        ) : (
          <div className="tm-profile-grid">
            {children.map((profile) => (
              <button
                key={profile.id}
                className={`tm-profile-card tm-${profile.name.toLowerCase()}`}
                onClick={() => chooseProfile(profile)}
              >
                <div className="tm-profile-initial">
                  {profile.name.charAt(0)}
                </div>

                <div className="tm-profile-info">
                  <small>MISSION BOARD</small>
                  <strong>{profile.name}</strong>
                </div>

                <ArrowRight className="tm-profile-arrow" size={28} />
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedProfile && (
        <div
          className="tm-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedProfile(null);
          }}
        >
          <div className="tm-pin-modal">
            <button
              className="tm-modal-close"
              onClick={() => setSelectedProfile(null)}
            >
              ×
            </button>

            <div className="tm-pin-icon">
              {selectedProfile.name.charAt(0)}
            </div>

            <small>WELCOME BACK</small>
            <h2>{selectedProfile.name}</h2>
            <p>Enter your private PIN to continue.</p>

            <form onSubmit={submitPin}>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                maxLength="12"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="tm-pin-input"
              />

              {loginError && (
                <div className="tm-login-error">{loginError}</div>
              )}

              <button
                className="tm-pin-submit"
                type="submit"
                disabled={checkingPin || !pin.trim()}
              >
                {checkingPin ? 'Checking...' : 'Open my board'}
                {!checkingPin && <ArrowRight size={19} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function Brand() {
  return (
    <div className="tm-brand">
      <div className="tm-brand-mark">M</div>

      <div className="tm-brand-words">
        <span>TEAM</span>
        <strong>Miller</strong>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
