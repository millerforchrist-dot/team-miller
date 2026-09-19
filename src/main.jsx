import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LockKeyhole,
  ArrowRight,
  Sparkles,
  Star,
  BookOpen,
  Shirt,
  Gift,
  Heart,
  Check,
  LogOut,
  Home,
  RotateCcw,
  Clock,
  Trophy,
  Plus
} from 'lucide-react';
import { supabase } from './supabase';
import './style.css';

const CHILD_CONFIG = {
  Kiegan: {
    className: 'kiegan',
    laundryDay: 'Monday',
    initial: 'K'
  },
  Levi: {
    className: 'levi',
    laundryDay: 'Tuesday',
    initial: 'L'
  },
  Will: {
    className: 'will',
    laundryDay: 'Wednesday',
    initial: 'W'
  }
};

const DAILY_MISSIONS = [
  'Make Bed',
  'Bedroom Picked Up',
  'Dirty Clothes in Hamper',
  'Family 10-Minute Cleanup',
  'Be Respectful & Have a Good Attitude',
  'Read for 20 Minutes'
];

const LAUNDRY_STEPS = [
  'Wash',
  'Dry',
  'Fold',
  'Put Away'
];

const REWARDS = [
  { points: 25, name: 'Pick Dessert' },
  { points: 50, name: 'Pick Family Movie' },
  { points: 75, name: 'Stay Up 30 Minutes Later' },
  { points: 100, name: 'Mom or Dad Date' },
  { points: 150, name: '$10' },
  { points: 250, name: 'Choose Saturday Activity' }
];

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
      entered_pin: pin.trim()
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

  if (user?.role === 'child') {
    return <ChildDashboard user={user} onLogout={logout} />;
  }

  if (user?.role === 'parent') {
    return <ParentPlaceholder user={user} onLogout={logout} />;
  }

  const children = ['Kiegan', 'Levi', 'Will']
    .map(name => profiles.find(profile => profile.name === name))
    .filter(Boolean);

  const parent = profiles.find(profile => profile.role === 'parent');

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
          Choose your name and enter your private PIN to open your mission board.
        </p>
      </section>

      <section className="tm-profile-section">
        {loading ? (
          <p>Loading TEAM MILLER...</p>
        ) : (
          <div className="tm-profile-grid">
            {children.map(profile => (
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
        <PinModal
          profile={selectedProfile}
          pin={pin}
          setPin={setPin}
          error={loginError}
          checking={checkingPin}
          onSubmit={submitPin}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </main>
  );
}

function ChildDashboard({ user, onLogout }) {
  const config = CHILD_CONFIG[user.name] || CHILD_CONFIG.Kiegan;

  const [completed, setCompleted] = useState([]);

  function toggleMission(index) {
    setCompleted(current =>
      current.includes(index)
        ? current.filter(item => item !== index)
        : [...current, index]
    );
  }

  const missionPoints = 0;
  const readingPoints = 0;
  const nextReward = REWARDS.find(reward => reward.points > missionPoints);
  const progress = nextReward
    ? Math.min((missionPoints / nextReward.points) * 100, 100)
    : 100;

  return (
    <main className={`child-board child-${config.className}`}>
      <header className="child-header">
        <Brand />

        <div className="child-header-actions">
          <button className="child-home-button" onClick={onLogout}>
            <Home size={18} />
            Home
          </button>

          <button className="child-logout-button" onClick={onLogout}>
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </header>

      <section className="child-welcome">
        <div>
          <div className="tm-eyebrow">
            <Sparkles size={18} />
            {user.name.toUpperCase()}'S MISSION BOARD
          </div>

          <h1>
            Ready to make
            <br />
            <em>today count?</em>
          </h1>

          <p>
            Small things done faithfully make a big difference.
          </p>
        </div>

        <div className="child-avatar">
          {config.initial}
        </div>
      </section>

      <section className="points-grid">
        <div className="point-card primary-point">
          <div className="point-icon">
            <Star size={25} />
          </div>

          <span>MISSION POINTS</span>
          <strong>{missionPoints}</strong>
          <small>Keep serving. Keep growing.</small>
        </div>

        <div className="point-card reading-point">
          <div className="point-icon">
            <BookOpen size={25} />
          </div>

          <span>READING POINTS</span>
          <strong>{readingPoints}</strong>
          <small>Every book is an adventure.</small>
        </div>

        <div className="point-card reward-point">
          <div className="point-icon">
            <Gift size={25} />
          </div>

          <span>NEXT REWARD</span>
          <strong className="reward-name">
            {nextReward?.name || 'All rewards unlocked!'}
          </strong>

          {nextReward && (
            <>
              <small>{nextReward.points} Mission Points</small>

              <div className="reward-progress">
                <div style={{ width: `${progress}%` }} />
              </div>

              <small>
                {nextReward.points - missionPoints} points to go
              </small>
            </>
          )}
        </div>
      </section>

      <section className="board-layout">
        <div className="board-main">
          <div className="section-heading">
            <div>
              <span>TODAY</span>
              <h2>Daily Missions</h2>
            </div>

            <div className="mission-count">
              {completed.length} / {DAILY_MISSIONS.length}
            </div>
          </div>

          <div className="mission-list">
            {DAILY_MISSIONS.map((mission, index) => {
              const done = completed.includes(index);

              return (
                <button
                  key={mission}
                  className={`mission-row ${done ? 'mission-done' : ''}`}
                  onClick={() => toggleMission(index)}
                >
                  <div className="mission-checkbox">
                    {done && <Check size={20} />}
                  </div>

                  <span>{mission}</span>

                  <strong>+1</strong>
                </button>
              );
            })}
          </div>

          <div className="section-heading lower-heading">
            <div>
              <span>YOUR WEEK</span>
              <h2>Team Assignment</h2>
            </div>

            <RotateCcw size={22} />
          </div>

          <div className="weekly-placeholder">
            <div className="weekly-icon">
              <Heart size={26} />
            </div>

            <div>
              <small>THIS WEEK'S JOB</small>
              <strong>Weekly assignment coming next</strong>
              <p>
                Mom or Dad will assign your rotating family job.
              </p>
            </div>
          </div>
        </div>

        <aside className="board-side">
          <div className="side-card laundry-card">
            <div className="side-card-title">
              <Shirt size={23} />
              <div>
                <small>LAUNDRY DAY</small>
                <h3>{config.laundryDay}</h3>
              </div>
            </div>

            <p>
              Your laundry day is always <strong>{config.laundryDay}</strong>.
            </p>

            <div className="laundry-steps">
              {LAUNDRY_STEPS.map((step, index) => (
                <div key={step}>
                  <span>{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>

            <div className="laundry-note">
              <Clock size={17} />
              Parent approval required for points.
            </div>
          </div>

          <div className="side-card bonus-card">
            <div className="side-card-title">
              <Star size={23} />
              <div>
                <small>GO ABOVE & BEYOND</small>
                <h3>Bonus Missions</h3>
              </div>
            </div>

            <p>
              Bible reading, prayer, kindness, Scripture memory and helping
              without being asked.
            </p>

            <button>
              <Plus size={18} />
              Submit a Bonus Mission
            </button>
          </div>

          <div className="side-card reading-card">
            <div className="side-card-title">
              <BookOpen size={23} />
              <div>
                <small>READ • QUIZ • GROW</small>
                <h3>Reading Challenge</h3>
              </div>
            </div>

            <p>
              Find your book, take your 10-question quiz, and earn Reading
              Points.
            </p>

            <button>
              Find My Book
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="side-card verse-card">
            <Trophy size={22} />

            <p>
              “Whatever you do, work at it with all your heart, as working for
              the Lord.”
            </p>

            <strong>COLOSSIANS 3:23</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

function ParentPlaceholder({ onLogout }) {
  return (
    <main className="tm-dashboard">
      <header className="tm-dashboard-header">
        <Brand />

        <button className="tm-text-button" onClick={onLogout}>
          <LogOut size={18} />
          Log out
        </button>
      </header>

      <section className="tm-dashboard-welcome">
        <div className="tm-eyebrow">
          <Sparkles size={18} />
          TEAM MILLER
        </div>

        <h1>
          Parent
          <br />
          <em>Dashboard.</em>
        </h1>

        <p>
          We'll build the full parent control center after the boys' board.
        </p>
      </section>
    </main>
  );
}

function PinModal({
  profile,
  pin,
  setPin,
  error,
  checking,
  onSubmit,
  onClose
}) {
  return (
    <div
      className="tm-modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tm-pin-modal">
        <button className="tm-modal-close" onClick={onClose}>
          ×
        </button>

        <div className="tm-pin-icon">
          {profile.name.charAt(0)}
        </div>

        <small>WELCOME BACK</small>
        <h2>{profile.name}</h2>
        <p>Enter your private PIN to continue.</p>

        <form onSubmit={onSubmit}>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength="12"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="tm-pin-input"
          />

          {error && (
            <div className="tm-login-error">
              {error}
            </div>
          )}

          <button
            className="tm-pin-submit"
            type="submit"
            disabled={checking || !pin.trim()}
          >
            {checking ? 'Checking...' : 'Open my board'}
            {!checking && <ArrowRight size={19} />}
          </button>
        </form>
      </div>
    </div>
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
