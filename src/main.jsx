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
  X,
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

const WEEKLY_TASKS = [
  'Bathrooms',
  'Dishes',
  'Trash & Wipe Counters',
  'Wipe Table'
];

const BONUS_CATEGORIES = [
  'Bible Reading',
  'Prayer',
  'Scripture Memory',
  'Act of Kindness',
  'Helped Without Being Asked'
];

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

function currentMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);

  return monday.toLocaleDateString('en-CA');
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
    async function startApp() {
      await loadProfiles();

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id,name,role')
        .eq('auth_user_id', session.user.id)
        .eq('is_active', true)
        .single();

      if (error || !profile) {
        console.error(error);
        await supabase.auth.signOut();
        return;
      }

      setUser(profile);
    }

    startApp();
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
    return <ChildDashboard user={user} onLogout={logout} />;
  }

  if (user?.role === 'parent') {
    return <ParentDashboard onLogout={logout} />;
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
          Choose your name and enter your private PIN to open your mission
          board.
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

  const [missions, setMissions] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [missionPoints, setMissionPoints] = useState(0);
  const [boardLoading, setBoardLoading] = useState(true);
  const [savingMission, setSavingMission] = useState(null);
  const [boardError, setBoardError] = useState('');

  const [laundryCompleted, setLaundryCompleted] = useState([]);
  const [savingLaundry, setSavingLaundry] = useState(null);
  const [laundryError, setLaundryError] = useState('');
  const [fridayLaundry, setFridayLaundry] = useState([]);
  const [savingFridayLaundry, setSavingFridayLaundry] = useState(null);
  const [fridayLaundryError, setFridayLaundryError] = useState('');

  const [weeklyAssignments, setWeeklyAssignments] = useState([]);

  const [bonusMissions, setBonusMissions] = useState([]);
  const [showBonusForm, setShowBonusForm] = useState(false);
  const [bonusCategory, setBonusCategory] = useState(BONUS_CATEGORIES[0]);
  const [bonusNote, setBonusNote] = useState('');
  const [submittingBonus, setSubmittingBonus] = useState(false);
  const [bonusError, setBonusError] = useState('');
  const [bonusSuccess, setBonusSuccess] = useState('');

  useEffect(() => {
    loadBoard();
  }, [user.id]);

  async function loadBoard() {
    setBoardLoading(true);
    setBoardError('');

    const today = localDate();
    const weekStart = currentMonday();

    await supabase.rpc('ensure_weekly_assignments');

    const [
      missionsResult,
      completionsResult,
      pointsResult,
      laundryResult,
      weeklyResult,
      bonusResult,
      fridayLaundryResult
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
        .eq('laundry_date', today),

      supabase
        .from('weekly_assignments')
        .select('id,task_name,is_override')
        .eq('child_id', user.id)
        .eq('week_start', weekStart)
        .order('task_name'),

      supabase
        .from('bonus_mission_submissions')
        .select('id,category,note,status,submitted_at')
        .eq('child_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(5),

      supabase
        .from('friday_laundry_completions')
        .select('id,task_name,child_id,laundry_date,approved_at')
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
      setBoardError('Could not load your mission board.');
    } else {
      setMissions(missionsResult.data || []);
      setCompletedIds(
        (completionsResult.data || []).map(item => item.mission_id)
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
        (laundryResult.data || []).map(item => item.step_name)
      );
    }

    if (weeklyResult.error) {
      console.error(weeklyResult.error);
    } else {
      setWeeklyAssignments(weeklyResult.data || []);
    }

    if (bonusResult.error) {
      console.error(bonusResult.error);
      setBonusError('Could not load Bonus Missions.');
    } else {
      setBonusMissions(bonusResult.data || []);
    }

    if (fridayLaundryResult.error) {
      console.error(fridayLaundryResult.error);
      setFridayLaundryError('Could not load Friday laundry.');
    } else {
      setFridayLaundry(fridayLaundryResult.data || []);
    }

    setBoardLoading(false);
  }

  async function toggleMission(mission) {
    if (savingMission) return;

    const isCompleted = completedIds.includes(mission.id);

    setSavingMission(mission.id);
    setBoardError('');

    const functionName = isCompleted
      ? 'uncomplete_daily_mission'
      : 'complete_daily_mission';

    const { error } = await supabase.rpc(functionName, {
      p_child_id: user.id,
      p_mission_id: mission.id
    });

    if (error) {
      console.error(error);
      setBoardError('That mission could not be updated. Try again.');
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

    const { error } = await supabase.rpc('toggle_laundry_step', {
      p_child_id: user.id,
      p_step_name: step
    });

    if (error) {
      console.error(error);

      if (error.message?.includes('not your laundry day')) {
        setLaundryError(`Laundry can be checked on ${config.laundryDay}.`);
      } else {
        setLaundryError('That laundry step could not be updated.');
      }

      setSavingLaundry(null);
      return;
    }

    await loadBoard();
    setSavingLaundry(null);
  }

  async function toggleFridayLaundry(taskName) {
    if (savingFridayLaundry) return;
    setSavingFridayLaundry(taskName);
    setFridayLaundryError('');

    const { error } = await supabase.rpc('toggle_friday_laundry', {
      p_child_id: user.id,
      p_task_name: taskName
    });

    if (error) {
      console.error(error);
      setFridayLaundryError(
        error.message?.includes('only be completed on Friday')
          ? 'Bedding and Towels are Friday jobs.'
          : 'That Friday laundry task could not be updated.'
      );
      setSavingFridayLaundry(null);
      return;
    }

    await loadBoard();
    setSavingFridayLaundry(null);
  }

  async function submitBonusMission(e) {
    e.preventDefault();

    if (submittingBonus) return;

    setSubmittingBonus(true);
    setBonusError('');
    setBonusSuccess('');

    const { error } = await supabase.rpc('submit_bonus_mission', {
      p_child_id: user.id,
      p_category: bonusCategory,
      p_note: bonusNote.trim() || null
    });

    if (error) {
      console.error(error);
      setBonusError('Bonus Mission could not be submitted.');
      setSubmittingBonus(false);
      return;
    }

    setBonusNote('');
    setBonusCategory(BONUS_CATEGORIES[0]);
    setShowBonusForm(false);
    setBonusSuccess('Bonus Mission sent to Mom or Dad!');

    await loadBoard();
    setSubmittingBonus(false);
  }

  const readingPoints = 0;

  const nextReward = REWARDS.find(
    reward => reward.points > missionPoints
  );

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

          <p>Small things done faithfully make a big difference.</p>
        </div>

        <div className="child-avatar">{config.initial}</div>
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
              {completedIds.length} / {missions.length || 6}
            </div>
          </div>

          {boardError && (
            <div className="tm-login-error">{boardError}</div>
          )}

          {boardLoading ? (
            <p>Loading today's missions...</p>
          ) : (
            <div className="mission-list">
              {missions.map(mission => {
                const done = completedIds.includes(mission.id);
                const saving = savingMission === mission.id;

                return (
                  <button
                    key={mission.id}
                    className={`mission-row ${
                      done ? 'mission-done' : ''
                    }`}
                    onClick={() => toggleMission(mission)}
                    disabled={Boolean(savingMission)}
                  >
                    <div className="mission-checkbox">
                      {done && <Check size={20} />}
                    </div>

                    <span>{saving ? 'Saving...' : mission.name}</span>
                    <strong>+{Number(mission.point_value)}</strong>
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

          {weeklyAssignments.length === 0 ? (
            <div className="weekly-placeholder">
              <div className="weekly-icon">
                <Heart size={26} />
              </div>
              <div>
                <small>THIS WEEK'S JOB</small>
                <strong>No assignment found</strong>
                <p>Check back after the weekly rotation has been assigned.</p>
              </div>
            </div>
          ) : (
            weeklyAssignments.map(assignment => (
              <div className="weekly-placeholder" key={assignment.id}>
                <div className="weekly-icon">
                  <Heart size={26} />
                </div>
                <div>
                  <small>
                    {assignment.is_override
                      ? 'PARENT ASSIGNMENT'
                      : "THIS WEEK'S JOB"}
                  </small>
                  <strong>{assignment.task_name}</strong>
                  <p>
                    Help TEAM MILLER by taking care of your job this week.
                  </p>
                </div>
              </div>
            ))
          )}
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
              Complete all four steps. Mom or Dad will approve them before
              Mission Points are awarded.
            </p>

            <div className="laundry-steps">
              {LAUNDRY_STEPS.map((step, index) => {
                const done = laundryCompleted.includes(step);
                const saving = savingLaundry === step;

                return (
                  <button
                    key={step}
                    type="button"
                    className={done ? 'laundry-step-done' : ''}
                    onClick={() => toggleLaundry(step)}
                    disabled={Boolean(savingLaundry)}
                  >
                    <span>
                      {done ? <Check size={14} /> : index + 1}
                    </span>
                    {saving ? 'Saving...' : step}
                  </button>
                );
              })}
            </div>

            {laundryError && (
              <div className="tm-login-error">{laundryError}</div>
            )}

            <div className="laundry-note">
              <Clock size={17} />
              {laundryCompleted.length === 4
                ? 'Ready for parent approval!'
                : `${laundryCompleted.length} of 4 steps complete`}
            </div>
          </div>

          <div className="side-card laundry-card">
            <div className="side-card-title">
              <Shirt size={23} />
              <div>
                <small>FRIDAY FAMILY LAUNDRY</small>
                <h3>Bedding & Towels</h3>
              </div>
            </div>

            <p>
              Take care of your own bedding on Friday. Towels are shared —
              the first brother to claim them gets the task.
            </p>

            <div className="laundry-steps">
              {['Bedding', 'Towels'].map((task, index) => {
                const record = task === 'Bedding'
                  ? fridayLaundry.find(item =>
                      item.task_name === 'Bedding' &&
                      item.child_id === user.id
                    )
                  : fridayLaundry.find(item => item.task_name === 'Towels');

                const done = Boolean(record);
                const mine = record?.child_id === user.id;
                const claimedByOther = task === 'Towels' && done && !mine;
                const saving = savingFridayLaundry === task;

                return (
                  <button
                    key={task}
                    type="button"
                    className={done ? 'laundry-step-done' : ''}
                    onClick={() => toggleFridayLaundry(task)}
                    disabled={
                      Boolean(savingFridayLaundry) ||
                      claimedByOther ||
                      Boolean(record?.approved_at)
                    }
                  >
                    <span>{done ? <Check size={14} /> : index + 1}</span>
                    {saving
                      ? 'Saving...'
                      : claimedByOther
                        ? 'Towels — Already Claimed'
                        : record?.approved_at
                          ? `${task} — Approved +1`
                          : done
                            ? `${task} — Waiting for Approval`
                            : `${task} +1`}
                  </button>
                );
              })}
            </div>

            {fridayLaundryError && (
              <div className="tm-login-error">{fridayLaundryError}</div>
            )}

            <div className="laundry-note">
              <Clock size={17} />
              Friday only • Parent approval required
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

            {!showBonusForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowBonusForm(true);
                  setBonusError('');
                  setBonusSuccess('');
                }}
              >
                <Plus size={18} />
                Submit a Bonus Mission
              </button>
            ) : (
              <form
                onSubmit={submitBonusMission}
                style={{ display: 'grid', gap: '10px' }}
              >
                <select
                  value={bonusCategory}
                  onChange={e => setBonusCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid rgba(36,35,66,.15)'
                  }}
                >
                  {BONUS_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <textarea
                  value={bonusNote}
                  onChange={e => setBonusNote(e.target.value)}
                  placeholder="Tell Mom or Dad what you did..."
                  rows="3"
                  maxLength="500"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px',
                    borderRadius: '10px',
                    border: '1px solid rgba(36,35,66,.15)',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />

                <button type="submit" disabled={submittingBonus}>
                  <Check size={18} />
                  {submittingBonus ? 'Sending...' : 'Send for Approval'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBonusForm(false);
                    setBonusError('');
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            {bonusError && (
              <div className="tm-login-error">{bonusError}</div>
            )}

            {bonusSuccess && (
              <p>
                <strong>{bonusSuccess}</strong>
              </p>
            )}

            {bonusMissions.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  display: 'grid',
                  gap: '8px'
                }}
              >
                {bonusMissions.map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,.55)'
                    }}
                  >
                    <strong>{item.category}</strong>
                    <div style={{ fontSize: '12px', marginTop: '3px' }}>
                      {item.status === 'pending'
                        ? 'Waiting for approval'
                        : item.status === 'approved'
                          ? 'Approved +1'
                          : 'Not approved'}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              “Whatever you do, work at it with all your heart, as working
              for the Lord.”
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
  const [fridayLaundry, setFridayLaundry] = useState([]);
  const [weeklyAssignments, setWeeklyAssignments] = useState([]);
  const [bonusMissions, setBonusMissions] = useState([]);
  const [childPoints, setChildPoints] = useState({});
  const [rewardRedemptions, setRewardRedemptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [approvingFridayLaundry, setApprovingFridayLaundry] = useState(null);
  const [savingAssignment, setSavingAssignment] = useState(null);
  const [reviewingBonus, setReviewingBonus] = useState(null);
  const [redeemingReward, setRedeemingReward] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadParentDashboard();
  }, []);

  async function loadParentDashboard() {
    setLoading(true);
    setError('');

    await supabase.rpc('ensure_weekly_assignments');

    const weekStart = currentMonday();

    const [
      profilesResult,
      laundryResult,
      weeklyResult,
      bonusResult,
      pointsResult,
      rewardsResult,
      fridayLaundryResult
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,name')
        .eq('role', 'child')
        .eq('is_active', true),

      supabase
        .from('laundry_completions')
        .select('id,child_id,laundry_date,step_name,approved_at')
        .order('laundry_date', { ascending: false }),

      supabase
        .from('weekly_assignments')
        .select('id,week_start,task_name,child_id,is_override')
        .eq('week_start', weekStart),

      supabase
        .from('bonus_mission_submissions')
        .select('id,child_id,category,note,status,submitted_at')
        .order('submitted_at', { ascending: false }),

      supabase
        .from('mission_point_transactions')
        .select('child_id,amount'),

      supabase
        .from('reward_redemptions')
        .select(
          'id,child_id,reward_name,point_threshold,parent_note,redeemed_at'
        )
        .order('redeemed_at', { ascending: false }),

      supabase
        .from('friday_laundry_completions')
        .select('id,child_id,task_name,laundry_date,approved_at')
        .order('laundry_date', { ascending: false })
    ]);

    if (
      profilesResult.error ||
      laundryResult.error ||
      weeklyResult.error ||
      bonusResult.error ||
      pointsResult.error ||
      rewardsResult.error ||
      fridayLaundryResult.error
    ) {
      console.error(
        profilesResult.error,
        laundryResult.error,
        weeklyResult.error,
        bonusResult.error,
        pointsResult.error,
        rewardsResult.error,
        fridayLaundryResult.error
      );

      setError('Could not load the Parent Dashboard.');
      setLoading(false);
      return;
    }

    setChildren(profilesResult.data || []);
    setLaundry(laundryResult.data || []);
    setBonusMissions(bonusResult.data || []);
    setRewardRedemptions(rewardsResult.data || []);
    setFridayLaundry(fridayLaundryResult.data || []);

    const totals = {};

    (profilesResult.data || []).forEach(child => {
      totals[child.id] = 0;
    });

    (pointsResult.data || []).forEach(transaction => {
      totals[transaction.child_id] =
        (totals[transaction.child_id] || 0) +
        Number(transaction.amount || 0);
    });

    setChildPoints(totals);

    const sortedAssignments = WEEKLY_TASKS.map(task =>
      (weeklyResult.data || []).find(
        assignment => assignment.task_name === task
      )
    ).filter(Boolean);

    setWeeklyAssignments(sortedAssignments);
    setLoading(false);
  }

  async function approveLaundry(childId, laundryDate) {
    if (approving) return;

    setApproving(`${childId}-${laundryDate}`);
    setError('');

    const { error: approvalError } = await supabase.rpc(
      'approve_laundry',
      {
        p_child_id: childId,
        p_laundry_date: laundryDate
      }
    );

    if (approvalError) {
      console.error(approvalError);
      setError('Laundry could not be approved. Try again.');
      setApproving(null);
      return;
    }

    await loadParentDashboard();
    setApproving(null);
  }

  async function approveFridayLaundry(completionId) {
    if (approvingFridayLaundry) return;
    setApprovingFridayLaundry(completionId);
    setError('');

    const { error: approvalError } = await supabase.rpc(
      'approve_friday_laundry',
      { p_completion_id: completionId }
    );

    if (approvalError) {
      console.error(approvalError);
      setError('Friday laundry could not be approved.');
      setApprovingFridayLaundry(null);
      return;
    }

    await loadParentDashboard();
    setApprovingFridayLaundry(null);
  }

  async function changeAssignment(taskName, childId) {
    if (savingAssignment) return;

    setSavingAssignment(taskName);
    setError('');

    const { error: assignmentError } = await supabase.rpc(
      'override_weekly_assignment',
      {
        p_task_name: taskName,
        p_child_id: childId
      }
    );

    if (assignmentError) {
      console.error(assignmentError);
      setError('Weekly assignment could not be changed.');
      setSavingAssignment(null);
      return;
    }

    await loadParentDashboard();
    setSavingAssignment(null);
  }

  async function restoreAssignment(taskName) {
    if (savingAssignment) return;

    setSavingAssignment(taskName);
    setError('');

    const { error: restoreError } = await supabase.rpc(
      'restore_weekly_assignment',
      {
        p_task_name: taskName
      }
    );

    if (restoreError) {
      console.error(restoreError);
      setError('Automatic assignment could not be restored.');
      setSavingAssignment(null);
      return;
    }

    await loadParentDashboard();
    setSavingAssignment(null);
  }

  async function reviewBonusMission(submissionId, decision) {
    if (reviewingBonus) return;

    setReviewingBonus(submissionId);
    setError('');

    const { error: reviewError } = await supabase.rpc(
      'review_bonus_mission',
      {
        p_submission_id: submissionId,
        p_decision: decision,
        p_parent_note: null
      }
    );

    if (reviewError) {
      console.error(reviewError);
      setError('Bonus Mission could not be reviewed.');
      setReviewingBonus(null);
      return;
    }

    await loadParentDashboard();
    setReviewingBonus(null);
  }

  async function redeemReward(child, reward) {
    if (redeemingReward) return;

    const points = Number(childPoints[child.id] || 0);

    if (points < reward.points) {
      setError(
        `${child.name} needs ${reward.points - points} more Mission Points for ${reward.name}.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Record "${reward.name}" for ${child.name}?\n\nThis will NOT subtract Mission Points.`
    );

    if (!confirmed) return;

    setRedeemingReward(`${child.id}-${reward.points}`);
    setError('');

    const { error: rewardError } = await supabase.rpc(
      'redeem_reward',
      {
        p_child_id: child.id,
        p_reward_name: reward.name,
        p_point_threshold: reward.points,
        p_parent_note: null
      }
    );

    if (rewardError) {
      console.error(rewardError);
      setError('Reward could not be recorded.');
      setRedeemingReward(null);
      return;
    }

    await loadParentDashboard();
    setRedeemingReward(null);
  }

  const groupedLaundry = laundry.reduce((groups, item) => {
    const key = `${item.child_id}-${item.laundry_date}`;

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
  }, {});

  const laundryGroups = Object.values(groupedLaundry);

  const pendingLaundry = laundryGroups.filter(
    group => group.steps.length === 4 && !group.approved
  );

  const approvedLaundry = laundryGroups.filter(
    group => group.steps.length === 4 && group.approved
  );

  const pendingFridayLaundry = fridayLaundry.filter(
    item => !item.approved_at
  );

  const approvedFridayLaundry = fridayLaundry.filter(
    item => item.approved_at
  );

  const pendingBonusMissions = bonusMissions.filter(
    mission => mission.status === 'pending'
  );

  const reviewedBonusMissions = bonusMissions.filter(
    mission => mission.status !== 'pending'
  );

  function childName(childId) {
    return (
      children.find(child => child.id === childId)?.name || 'Child'
    );
  }

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
          Review family activity, manage weekly jobs, and approve completed
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
        {error && <div className="tm-login-error">{error}</div>}

        <div className="section-heading">
          <div>
            <span>THIS WEEK</span>
            <h2>Team Assignments</h2>
          </div>
          <RotateCcw size={24} />
        </div>

        {loading ? (
          <p>Loading assignments...</p>
        ) : (
          <div className="mission-list">
            {weeklyAssignments.map(assignment => (
              <div className="mission-row" key={assignment.id}>
                <div className="mission-checkbox">
                  <Heart size={18} />
                </div>

                <span>
                  <strong>{assignment.task_name}</strong>
                </span>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <select
                    value={assignment.child_id}
                    disabled={Boolean(savingAssignment)}
                    onChange={e =>
                      changeAssignment(
                        assignment.task_name,
                        e.target.value
                      )
                    }
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(36,35,66,.15)',
                      background: 'white',
                      fontWeight: 700
                    }}
                  >
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </select>

                  {assignment.is_override && (
                    <button
                      type="button"
                      disabled={Boolean(savingAssignment)}
                      onClick={() =>
                        restoreAssignment(assignment.task_name)
                      }
                      style={{
                        border: 0,
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      Restore Automatic
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="section-heading lower-heading">
          <div>
            <span>MISSION POINTS</span>
            <h2>Rewards</h2>
          </div>
          <Gift size={24} />
        </div>

        {!loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px'
            }}
          >
            {children.map(child => {
              const points = Number(childPoints[child.id] || 0);

              return (
                <div
                  className="weekly-placeholder"
                  key={child.id}
                  style={{ alignItems: 'flex-start' }}
                >
                  <div className="weekly-icon">
                    <Gift size={25} />
                  </div>

                  <div style={{ width: '100%' }}>
                    <small>{points} MISSION POINTS</small>
                    <strong>{child.name}'s Rewards</strong>

                    <div
                      style={{
                        display: 'grid',
                        gap: '8px',
                        marginTop: '14px'
                      }}
                    >
                      {REWARDS.map(reward => {
                        const unlocked = points >= reward.points;
                        const saving =
                          redeemingReward ===
                          `${child.id}-${reward.points}`;

                        return (
                          <button
                            key={reward.points}
                            type="button"
                            disabled={
                              !unlocked || Boolean(redeemingReward)
                            }
                            onClick={() =>
                              redeemReward(child, reward)
                            }
                            style={{
                              width: '100%',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border:
                                '1px solid rgba(36,35,66,.12)',
                              background: unlocked
                                ? 'white'
                                : 'rgba(255,255,255,.4)',
                              cursor: unlocked
                                ? 'pointer'
                                : 'not-allowed',
                              opacity: unlocked ? 1 : 0.55,
                              textAlign: 'left'
                            }}
                          >
                            <span>
                              {saving
                                ? 'Recording...'
                                : reward.name}
                            </span>

                            <strong>
                              {unlocked
                                ? 'Redeem'
                                : `${reward.points} pts`}
                            </strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="section-heading lower-heading">
          <div>
            <span>NEEDS YOUR ATTENTION</span>
            <h2>Bonus Missions</h2>
          </div>
          <Star size={24} />
        </div>

        {!loading && pendingBonusMissions.length === 0 ? (
          <div className="weekly-placeholder">
            <div className="weekly-icon">
              <Check size={26} />
            </div>
            <div>
              <small>ALL CAUGHT UP</small>
              <strong>No Bonus Missions waiting</strong>
              <p>New submissions from the boys will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="mission-list">
            {pendingBonusMissions.map(mission => (
              <div className="mission-row" key={mission.id}>
                <div className="mission-checkbox">
                  <Star size={18} />
                </div>

                <span>
                  <strong>
                    {childName(mission.child_id)} — {mission.category}
                  </strong>

                  {mission.note && (
                    <>
                      <br />
                      <small>{mission.note}</small>
                    </>
                  )}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="tm-pin-submit"
                    style={{
                      width: 'auto',
                      margin: 0,
                      padding: '9px 14px'
                    }}
                    disabled={Boolean(reviewingBonus)}
                    onClick={() =>
                      reviewBonusMission(mission.id, 'approved')
                    }
                  >
                    <Check size={16} />
                    Approve +1
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(reviewingBonus)}
                    onClick={() =>
                      reviewBonusMission(mission.id, 'rejected')
                    }
                    style={{
                      border: '1px solid rgba(36,35,66,.15)',
                      borderRadius: '10px',
                      padding: '9px 14px',
                      background: 'white',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="section-heading lower-heading">
          <div>
            <span>FRIDAY</span>
            <h2>Bedding & Towels Approvals</h2>
          </div>
          <Shirt size={24} />
        </div>

        {!loading && pendingFridayLaundry.length === 0 ? (
          <div className="weekly-placeholder">
            <div className="weekly-icon"><Check size={26} /></div>
            <div>
              <small>ALL CAUGHT UP</small>
              <strong>No Friday laundry waiting</strong>
              <p>Bedding and towel submissions will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="mission-list">
            {pendingFridayLaundry.map(item => (
              <div className="mission-row" key={item.id}>
                <div className="mission-checkbox"><Shirt size={18} /></div>
                <span>
                  <strong>{childName(item.child_id)}</strong>
                  {' — '}{item.task_name}{' — '}{item.laundry_date}
                </span>
                <button
                  className="tm-pin-submit"
                  style={{ width: 'auto', margin: 0, padding: '10px 18px' }}
                  disabled={Boolean(approvingFridayLaundry)}
                  onClick={() => approveFridayLaundry(item.id)}
                >
                  {approvingFridayLaundry === item.id ? 'Approving...' : 'Approve +1'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="section-heading lower-heading">
          <div>
            <span>NEEDS YOUR ATTENTION</span>
            <h2>Laundry Approvals</h2>
          </div>
          <Shirt size={24} />
        </div>

        {!loading && pendingLaundry.length === 0 ? (
          <div className="weekly-placeholder">
            <div className="weekly-icon">
              <Check size={26} />
            </div>
            <div>
              <small>ALL CAUGHT UP</small>
              <strong>No laundry waiting for approval</strong>
              <p>
                When one of the boys completes all four laundry steps, it
                will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mission-list">
            {pendingLaundry.map(group => {
              const approvalKey = `${group.childId}-${group.date}`;
              const isApproving = approving === approvalKey;

              return (
                <div className="mission-row" key={approvalKey}>
                  <div className="mission-checkbox">
                    <Shirt size={18} />
                  </div>

                  <span>
                    <strong>{childName(group.childId)}</strong>
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
                      approveLaundry(group.childId, group.date)
                    }
                  >
                    {isApproving ? 'Approving...' : 'Approve +4'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {rewardRedemptions.length > 0 && (
          <>
            <div className="section-heading lower-heading">
              <div>
                <span>RECENT</span>
                <h2>Reward History</h2>
              </div>
              <Gift size={22} />
            </div>

            <div className="mission-list">
              {rewardRedemptions.slice(0, 10).map(redemption => (
                <div
                  className="mission-row mission-done"
                  key={redemption.id}
                >
                  <div className="mission-checkbox">
                    <Gift size={18} />
                  </div>

                  <span>
                    <strong>
                      {childName(redemption.child_id)}
                    </strong>
                    {' — '}
                    {redemption.reward_name}
                  </span>

                  <strong>{redemption.point_threshold} pts</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {reviewedBonusMissions.length > 0 && (
          <>
            <div className="section-heading lower-heading">
              <div>
                <span>RECENT</span>
                <h2>Reviewed Bonus Missions</h2>
              </div>
              <Star size={22} />
            </div>

            <div className="mission-list">
              {reviewedBonusMissions.slice(0, 6).map(mission => (
                <div
                  className={`mission-row ${
                    mission.status === 'approved'
                      ? 'mission-done'
                      : ''
                  }`}
                  key={mission.id}
                >
                  <div className="mission-checkbox">
                    {mission.status === 'approved' ? (
                      <Check size={18} />
                    ) : (
                      <X size={18} />
                    )}
                  </div>

                  <span>
                    {childName(mission.child_id)} — {mission.category}
                  </span>

                  <strong>
                    {mission.status === 'approved'
                      ? '+1'
                      : 'Rejected'}
                  </strong>
                </div>
              ))}
            </div>
          </>
        )}

        {approvedFridayLaundry.length > 0 && (
          <>
            <div className="section-heading lower-heading">
              <div>
                <span>RECENT</span>
                <h2>Approved Friday Laundry</h2>
              </div>
              <Check size={22} />
            </div>

            <div className="mission-list">
              {approvedFridayLaundry.slice(0, 8).map(item => (
                <div className="mission-row mission-done" key={item.id}>
                  <div className="mission-checkbox"><Check size={18} /></div>
                  <span>
                    {childName(item.child_id)} — {item.task_name} — {item.laundry_date}
                  </span>
                  <strong>+1</strong>
                </div>
              ))}
            </div>
          </>
        )}

        {approvedLaundry.length > 0 && (
          <>
            <div className="section-heading lower-heading">
              <div>
                <span>RECENT</span>
                <h2>Approved Laundry</h2>
              </div>
              <Check size={22} />
            </div>

            <div className="mission-list">
              {approvedLaundry.slice(0, 6).map(group => (
                <div
                  className="mission-row mission-done"
                  key={`${group.childId}-${group.date}`}
                >
                  <div className="mission-checkbox">
                    <Check size={18} />
                  </div>

                  <span>
                    {childName(group.childId)} — {group.date}
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
            <div className="tm-login-error">{error}</div>
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

createRoot(
  document.getElementById('root')
).render(<App />);
