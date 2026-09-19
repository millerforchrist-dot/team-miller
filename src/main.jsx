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
  Kiegan: { className: 'kiegan', laundryDay: 'Monday', initial: 'K' },
  Levi: { className: 'levi', laundryDay: 'Tuesday', initial: 'L' },
  Will: { className: 'will', laundryDay: 'Wednesday', initial: 'W' }
};

const LAUNDRY_STEPS = ['Wash', 'Dry', 'Fold', 'Put Away'];

const REWARDS = [
  { points: 25, name: 'Pick Dessert' },
  { points: 50, name: 'Pick Family Movie' },
  { points: 75, name: 'Stay Up 30 Minutes Later' },
  { points: 100, name: 'Mom or Dad Date' },
  { points: 150, name: '$10' },
  { points: 250, name: 'Choose Saturday Activity' }
];

function localDate() {
  return new Date().toLocaleDateString('en-CA');
}

function App() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

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

    const { data, error } = await supabase.functions.invoke(
      'pin-login',
      {
        body: {
          profileName: selectedProfile.name,
          pin: pin.trim()
        }
      }
    );

    if (error || !data?.tokenHash || !data?.profile) {
      console.error(error);
      setCheckingPin(false);
      setLoginError('That PIN is not correct. Try again.');
      setPin('');
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: 'magiclink'
    });

    if (verifyError) {
      console.error(verifyError);
      setCheckingPin(false);
      setLoginError('Could not start your secure session.');
      setPin('');
      return;
    }

    setCheckingPin(false);
    setUser(data.profile);
    setSelectedProfile(null);
    setPin('');
  }

  async function logout() {
    await supabase.auth.signOut();

    setUser(null);
    setSelectedProfile(null);
    setPin('');
    setLoginError('');
  }

  if (user?.role === 'child') {
    return (
      <ChildDashboard
        user={user}
        onLogout={logout}
      />
    );
  }

  if (user?.role === 'parent') {
    return (
      <ParentDashboard
        onLogout={logout}
      />
    );
  }

  const children = ['Kiegan', 'Levi', 'Will']
    .map(name =>
      profiles.find(profile => profile.name === name)
    )
    .filter(Boolean);

  const parent = profiles.find(
    profile => profile.role === 'parent'
  );

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
          Choose your name and enter your private PIN to
          open your mission board.
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

                <ArrowRight
                  className="tm-profile-arrow"
                  size={28}
                />
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
  const config =
    CHILD_CONFIG[user.name] || CHILD_CONFIG.Kiegan;

  const [missions, setMissions] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [missionPoints, setMissionPoints] = useState(0);
  const [boardLoading, setBoardLoading] = useState(true);
  const [savingMission, setSavingMission] = useState(null);
  const [boardError, setBoardError] = useState('');

  const [laundryCompleted, setLaundryCompleted] = useState([]);
  const [savingLaundry, setSavingLaundry] = useState(null);
  const [laundryError, setLaundryError] = useState('');

  useEffect(() => {
    loadBoard();
  }, [user.id]);

  async function loadBoard() {
    setBoardLoading(true);
    setBoardError('');

    const today = localDate();

    const [
      missionsResult,
      completionsResult,
      pointsResult,
      laundryResult
    ] = await Promise.all([
      supabase
        .from('daily_missions')
        .select('id,name,point_value,sort_order')
        .eq('active', true)
        .order('sort_order'),

      supabase
        .from('daily_mission_completions')
        .select('mission_id')
        .eq('child_id', user.id)
        .eq('mission_date', today),

      supabase
        .from('mission_point_transactions')
        .select('amount')
        .eq('child_id', user.id),

      supabase
        .from('laundry_completions')
        .select('step_name,approved_at')
        .eq('child_id', user.id)
        .eq('laundry_date', today)
    ]);

    if (
      missionsResult.error ||
      completionsResult.error ||
      pointsResult.error
    ) {
      console.error(
        missionsResult.error,
        completionsResult.error,
        pointsResult.error
      );

      setBoardError(
        'Could not load your mission board.'
      );
    } else {
      setMissions(missionsResult.data || []);

      setCompletedIds(
        (completionsResult.data || []).map(
          item => item.mission_id
        )
      );

      setMissionPoints(
        (pointsResult.data || []).reduce(
          (total, transaction) =>
            total + Number(transaction.amount || 0),
          0
        )
      );
    }

    if (laundryResult.error) {
      console.error(laundryResult.error);
      setLaundryError('Could not load laundry.');
    } else {
      setLaundryCompleted(
        (laundryResult.data || []).map(
          item => item.step_name
        )
      );
    }

    setBoardLoading(false);
  }

  async function toggleMission(mission) {
    if (savingMission) return;

    const isCompleted =
      completedIds.includes(mission.id);

    setSavingMission(mission.id);
    setBoardError('');

    const functionName = isCompleted
      ? 'uncomplete_daily_mission'
      : 'complete_daily_mission';

    const { error } = await supabase.rpc(
      functionName,
      {
        p_child_id: user.id,
        p_mission_id: mission.id
      }
    );

    if (error) {
      console.error(error);

      setBoardError(
        'That mission could not be updated. Try again.'
      );

      setSavingMission(null);
      return;
    }

    await loadBoard();
    setSavingMission(null);
  }

  async function toggleLaundry(step) {
    if (savingLaundry) return;

    setSavingLaundry(step);
    setLaundryError('');

    const { error } = await supabase.rpc(
      'toggle_laundry_step',
      {
        p_child_id: user.id,
        p_step_name: step
      }
    );

    if (error) {
      console.error(error);

      if (
        error.message?.includes(
          'not your laundry day'
        )
      ) {
        setLaundryError(
          `Laundry can be checked on ${config.laundryDay}.`
        );
      } else {
        setLaundryError(
          'That laundry step could not be updated.'
        );
      }

      setSavingLaundry(null);
      return;
    }

    await loadBoard();
    setSavingLaundry(null);
  }

  const readingPoints = 0;

  const nextReward = REWARDS.find(
    reward => reward.points > missionPoints
  );

  const progress = nextReward
    ? Math.min(
        (missionPoints / nextReward.points) * 100,
        100
      )
    : 100;

  return (
    <main
      className={`child-board child-${config.className}`}
    >
      <header className="child-header">
        <Brand />

        <div className="child-header-actions">
          <button
            className="child-home-button"
            onClick={onLogout}
          >
            <Home size={18} />
            Home
          </button>

          <button
            className="child-logout-button"
            onClick={onLogout}
          >
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
            Small things done faithfully make a big
            difference.
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
          <small>
            Every book is an adventure.
          </small>
        </div>

        <div className="point-card reward-point">
          <div className="point-icon">
            <Gift size={25} />
          </div>

          <span>NEXT REWARD</span>

          <strong className="reward-name">
            {nextReward?.name ||
              'All rewards unlocked!'}
          </strong>

          {nextReward && (
            <>
              <small>
                {nextReward.points} Mission Points
              </small>

              <div className="reward-progress">
                <div
                  style={{
                    width: `${progress}%`
                  }}
                />
              </div>

              <small>
                {nextReward.points - missionPoints}{' '}
                points to go
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
              {completedIds.length} /{' '}
              {missions.length || 6}
            </div>
          </div>

          {boardError && (
            <div className="tm-login-error">
              {boardError}
            </div>
          )}

          {boardLoading ? (
            <p>Loading today's missions...</p>
          ) : (
            <div className="mission-list">
              {missions.map(mission => {
                const done =
                  completedIds.includes(mission.id);

                const saving =
                  savingMission === mission.id;

                return (
                  <button
                    key={mission.id}
                    className={`mission-row ${
                      done ? 'mission-done' : ''
                    }`}
                    onClick={() =>
                      toggleMission(mission)
                    }
                    disabled={Boolean(savingMission)}
                  >
                    <div className="mission-checkbox">
                      {done && <Check size={20} />}
                    </div>

                    <span>
                      {saving
                        ? 'Saving...'
                        : mission.name}
                    </span>

                    <strong>
                      +{Number(mission.point_value)}
                    </strong>
                  </button>
                );
              })}
            </div>
          )}

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

              <strong>
                Weekly assignment coming next
              </strong>

              <p>
                Mom or Dad will assign your rotating
                family job.
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
              Complete all four steps. Mom or Dad will
              approve them before Mission Points are
              awarded.
            </p>

            <div className="laundry-steps">
              {LAUNDRY_STEPS.map(
                (step, index) => {
                  const done =
                    laundryCompleted.includes(step);

                  const saving =
                    savingLaundry === step;

                  return (
                    <button
                      key={step}
                      type="button"
                      className={
                        done
                          ? 'laundry-step-done'
                          : ''
                      }
                      onClick={() =>
                        toggleLaundry(step)
                      }
                      disabled={Boolean(
                        savingLaundry
                      )}
                    >
                      <span>
                        {done ? (
                          <Check size={14} />
                        ) : (
                          index + 1
                        )}
                      </span>

                      {saving
                        ? 'Saving...'
                        : step}
                    </button>
                  );
                }
              )}
            </div>

            {laundryError && (
              <div className="tm-login-error">
                {laundryError}
              </div>
            )}

            <div className="laundry-note">
              <Clock size={17} />

              {laundryCompleted.length === 4
                ? 'Ready for parent approval!'
                : `${laundryCompleted.length} of 4 steps complete`}
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
              Bible reading, prayer, kindness,
              Scripture memory and helping without
              being asked.
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
              Find your book, take your 10-question
              quiz, and earn Reading Points.
            </p>

            <button>
              Find My Book
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="side-card verse-card">
            <Trophy size={22} />

            <p>
              “Whatever you do, work at it with all
              your heart, as working for the Lord.”
            </p>

            <strong>COLOSSIANS 3:23</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}

function ParentDashboard({ onLogout }) {
  const [children, setChildren] = useState([]);
  const [laundry, setLaundry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLaundryApprovals();
  }, []);

  async function loadLaundryApprovals() {
    setLoading(true);
    setError('');

    const [profilesResult, laundryResult] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id,name')
          .eq('role', 'child')
          .eq('is_active', true),

        supabase
          .from('laundry_completions')
          .select(
            'id,child_id,laundry_date,step_name,approved_at'
          )
          .order('laundry_date', {
            ascending: false
          })
      ]);

    if (profilesResult.error || laundryResult.error) {
      console.error(
        profilesResult.error,
        laundryResult.error
      );

      setError(
        'Could not load laundry approvals.'
      );

      setLoading(false);
      return;
    }

    setChildren(profilesResult.data || []);
    setLaundry(laundryResult.data || []);
    setLoading(false);
  }

  async function approveLaundry(childId, laundryDate) {
    if (approving) return;

    setApproving(`${childId}-${laundryDate}`);
    setError('');

    const { error: approvalError } =
      await supabase.rpc('approve_laundry', {
        p_child_id: childId,
        p_laundry_date: laundryDate
      });

    if (approvalError) {
      console.error(approvalError);

      setError(
        'Laundry could not be approved. Try again.'
      );

      setApproving(null);
      return;
    }

    await loadLaundryApprovals();
    setApproving(null);
  }

  const groupedLaundry = laundry.reduce(
    (groups, item) => {
      const key =
        `${item.child_id}-${item.laundry_date}`;

      if (!groups[key]) {
        groups[key] = {
          childId: item.child_id,
          date: item.laundry_date,
          steps: [],
          approved: true
        };
      }

      groups[key].steps.push(item.step_name);

      if (!item.approved_at) {
        groups[key].approved = false;
      }

      return groups;
    },
    {}
  );

  const laundryGroups = Object.values(
    groupedLaundry
  );

  const pendingLaundry = laundryGroups.filter(
    group =>
      group.steps.length === 4 &&
      !group.approved
  );

  const approvedLaundry = laundryGroups.filter(
    group =>
      group.steps.length === 4 &&
      group.approved
  );

  function childName(childId) {
    return (
      children.find(
        child => child.id === childId
      )?.name || 'Child'
    );
  }

  return (
    <main className="tm-dashboard">
      <header className="tm-dashboard-header">
        <Brand />

        <button
          className="tm-text-button"
          onClick={onLogout}
        >
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
          Review family activity and approve completed
          missions.
        </p>
      </section>

      <section
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px 80px'
        }}
      >
        <div className="section-heading">
          <div>
            <span>NEEDS YOUR ATTENTION</span>
            <h2>Laundry Approvals</h2>
          </div>

          <Shirt size={24} />
        </div>

        {error && (
          <div className="tm-login-error">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading laundry...</p>
        ) : pendingLaundry.length === 0 ? (
          <div className="weekly-placeholder">
            <div className="weekly-icon">
              <Check size={26} />
            </div>

            <div>
              <small>ALL CAUGHT UP</small>

              <strong>
                No laundry waiting for approval
              </strong>

              <p>
                When one of the boys completes all four
                laundry steps, it will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mission-list">
            {pendingLaundry.map(group => {
              const approvalKey =
                `${group.childId}-${group.date}`;

              const isApproving =
                approving === approvalKey;

              return (
                <div
                  className="mission-row"
                  key={approvalKey}
                >
                  <div className="mission-checkbox">
                    <Shirt size={18} />
                  </div>

                  <span>
                    <strong>
                      {childName(group.childId)}
                    </strong>
                    {' — '}
                    {group.date}
                    {' — '}
                    Wash, Dry, Fold & Put Away
                  </span>

                  <button
                    className="tm-pin-submit"
                    style={{
                      width: 'auto',
                      margin: 0,
                      padding: '10px 18px'
                    }}
                    disabled={Boolean(approving)}
                    onClick={() =>
                      approveLaundry(
                        group.childId,
                        group.date
                      )
                    }
                  >
                    {isApproving
                      ? 'Approving...'
                      : 'Approve +4'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {approvedLaundry.length > 0 && (
          <>
            <div
              className="section-heading lower-heading"
            >
              <div>
                <span>RECENT</span>
                <h2>Approved Laundry</h2>
              </div>

              <Check size={22} />
            </div>

            <div className="mission-list">
              {approvedLaundry
                .slice(0, 6)
                .map(group => (
                  <div
                    className="mission-row mission-done"
                    key={
                      `${group.childId}-${group.date}`
                    }
                  >
                    <div className="mission-checkbox">
                      <Check size={18} />
                    </div>

                    <span>
                      {childName(group.childId)}
                      {' — '}
                      {group.date}
                    </span>

                    <strong>+4</strong>
                  </div>
                ))}
            </div>
          </>
        )}
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
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="tm-pin-modal">
        <button
          className="tm-modal-close"
          onClick={onClose}
        >
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
            {checking
              ? 'Checking...'
              : 'Open my board'}

            {!checking && (
              <ArrowRight size={19} />
            )}
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

createRoot(
  document.getElementById('root')
).render(<App />);
