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
  'Helped Without Being Asked',
  'Have a Good Attitude & Be Respectful'
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
  const todayDay = new Date().getDay();
  const assignedLaundryDay = {
    Kiegan: 1,
    Levi: 2,
    Will: 3
  }[user.name];
  const regularLaundryAvailable =
    todayDay === assignedLaundryDay || todayDay === 4;
  const fridayLaundryAvailable = todayDay === 5;

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

  const [readingPoints, setReadingPoints] = useState(0);
  const [books, setBooks] = useState([]);
  const [readingOpen, setReadingOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizChoices, setQuizChoices] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizAttemptId, setQuizAttemptId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [readingError, setReadingError] = useState('');
  const [readingBusy, setReadingBusy] = useState(false);
  const [readingHistory, setReadingHistory] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [showReadingHistory, setShowReadingHistory] = useState(false);
  const [redeemingChildReward, setRedeemingChildReward] = useState(null);
  const [rewardError, setRewardError] = useState('');
  const [features, setFeatures] = useState({});

  useEffect(() => {
    loadBoard();
  }, [user.id]);

  async function loadBoard() {
    setBoardLoading(true);
    setBoardError('');

    const today = localDate();
    const weekStart = currentMonday();

    const { data: featureData } = await supabase
      .from('feature_settings')
      .select('feature_key,enabled');

    setFeatures(
      Object.fromEntries((featureData || []).map(item => [item.feature_key, item.enabled]))
    );

    await supabase.rpc('ensure_weekly_assignments');

    const [
      missionsResult,
      completionsResult,
      pointsResult,
      laundryResult,
      weeklyResult,
      bonusResult,
      fridayLaundryResult,
      booksResult,
      readingPointsResult,
      readingHistoryResult,
      activityResult
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
        .eq('laundry_date', today),

      supabase
        .from('books')
        .select('id,title,author,reading_level,maximum_points,description')
        .eq('is_active', true)
        .order('title'),

      supabase
        .from('reading_point_transactions')
        .select('amount')
        .eq('child_id', user.id),

      supabase
        .from('quiz_attempts')
        .select('id,book_id,score_percent,reading_points_earned,completed_at,is_first_attempt,books(title,author)')
        .eq('child_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(12),

      supabase
        .from('mission_point_transactions')
        .select('id,amount,source_type,description,created_at')
        .eq('child_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12)
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

    if (booksResult.error) {
      console.error(booksResult.error);
      setReadingError('Could not load books.');
    } else {
      setBooks(booksResult.data || []);
    }

    if (readingPointsResult.error) {
      console.error(readingPointsResult.error);
    } else {
      setReadingPoints(
        (readingPointsResult.data || []).reduce(
          (total, transaction) =>
            total + Number(transaction.amount || 0),
          0
        )
      );
    }

    if (!readingHistoryResult.error) {
      setReadingHistory(readingHistoryResult.data || []);
    }

    if (!activityResult.error) {
      setActivityHistory(activityResult.data || []);
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

  async function startBookQuiz(book) {
    if (readingBusy) return;
    setReadingBusy(true);
    setReadingError('');
    setQuizResult(null);

    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('id,book_id')
      .eq('book_id', book.id)
      .eq('active', true)
      .limit(1);

    if (quizError || !quizzes?.length) {
      console.error(quizError);
      setReadingError('No quiz is available for this book yet.');
      setReadingBusy(false);
      return;
    }

    const quiz = quizzes[0];

    const { data: attemptId, error: attemptError } = await supabase.rpc(
      'start_reading_quiz',
      { p_child_id: user.id, p_quiz_id: quiz.id }
    );

    if (attemptError) {
      console.error(attemptError);
      setReadingError('Could not start the quiz.');
      setReadingBusy(false);
      return;
    }

    const { data: questions, error: questionsError } = await supabase
      .from('child_quiz_questions')
      .select('id,quiz_id,question_number,question_text')
      .eq('quiz_id', quiz.id)
      .order('question_number');

    if (questionsError || !questions?.length) {
      console.error(questionsError);
      setReadingError('Could not load quiz questions.');
      setReadingBusy(false);
      return;
    }

    const questionIds = questions.map(question => question.id);

    const { data: choices, error: choicesError } = await supabase
      .from('child_quiz_choices')
      .select('id,question_id,choice_letter,choice_text')
      .in('question_id', questionIds)
      .order('choice_letter');

    if (choicesError) {
      console.error(choicesError);
      setReadingError('Could not load quiz choices.');
      setReadingBusy(false);
      return;
    }

    setActiveQuiz({ ...quiz, book });
    setQuizAttemptId(attemptId);
    setQuizQuestions(questions);
    setQuizChoices(choices || []);
    setQuizAnswers({});
    setReadingOpen(true);
    setReadingBusy(false);
  }

  async function submitReadingQuiz() {
    if (
      readingBusy ||
      !quizAttemptId ||
      quizQuestions.some(question => !quizAnswers[question.id])
    ) {
      setReadingError('Answer all 10 questions before submitting.');
      return;
    }

    setReadingBusy(true);
    setReadingError('');

    for (const question of quizQuestions) {
      const { error } = await supabase.rpc('save_quiz_answer', {
        p_attempt_id: quizAttemptId,
        p_question_id: question.id,
        p_selected_answer: quizAnswers[question.id]
      });

      if (error) {
        console.error(error);
        setReadingError('One of your answers could not be saved.');
        setReadingBusy(false);
        return;
      }
    }

    const { error: completeError } = await supabase.rpc(
      'complete_reading_quiz',
      { p_attempt_id: quizAttemptId }
    );

    if (completeError) {
      console.error(completeError);
      setReadingError('The quiz could not be scored.');
      setReadingBusy(false);
      return;
    }

    const { data: result, error: resultError } = await supabase
      .from('quiz_attempts')
      .select('score_percent,reading_points_earned,is_first_attempt')
      .eq('id', quizAttemptId)
      .single();

    if (resultError) {
      console.error(resultError);
      setReadingError('Quiz finished, but the result could not be loaded.');
      setReadingBusy(false);
      return;
    }

    setQuizResult(result);
    await loadBoard();
    setReadingBusy(false);
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

  async function redeemOwnReward(reward) {
    if (redeemingChildReward || totalPoints < reward.points) return;

    const confirmed = window.confirm(
      `Redeem "${reward.name}"?\n\nThis will deduct ${reward.points} Mission Points.`
    );

    if (!confirmed) return;

    setRedeemingChildReward(reward.points);
    setRewardError('');

    const { error } = await supabase.rpc('redeem_reward', {
      p_child_id: user.id,
      p_reward_name: reward.name,
      p_point_threshold: reward.points,
      p_parent_note: null
    });

    if (error) {
      console.error(error);
      setRewardError(
        `Reward could not be redeemed: ${error.message || 'Unknown error'}`
      );
      setRedeemingChildReward(null);
      return;
    }

    await loadBoard();
    setRedeemingChildReward(null);
  }

  const totalPoints = missionPoints + readingPoints;

  const nextReward = REWARDS.find(
    reward => reward.points > totalPoints
  );

  const progress = nextReward
    ? Math.min((totalPoints / nextReward.points) * 100, 100)
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

        <div className="point-card total-point">
          <div className="point-icon">
            <Trophy size={25} />
          </div>
          <span>TOTAL POINTS</span>
          <strong>{totalPoints}</strong>
          <small>Mission + Reading</small>
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
              <small>{nextReward.points} Total Points</small>
              <div className="reward-progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              <small>
                {nextReward.points - totalPoints} points to go
              </small>
            </>
          )}
        </div>
      </section>

      <section className="board-layout">
        <div className="board-main">
          {features.daily_missions !== false && <>
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

          </>}
          {features.weekly_assignments !== false && <>
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
          </>}
        </div>

        <aside className="board-side">
          {features.laundry !== false && <>
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
                    disabled={
                      Boolean(savingLaundry) || !regularLaundryAvailable
                    }
                    style={{
                      opacity: regularLaundryAvailable ? 1 : 0.5,
                      cursor: regularLaundryAvailable
                        ? 'pointer'
                        : 'not-allowed'
                    }}
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
              {!regularLaundryAvailable
                ? `Available ${config.laundryDay} or Thursday Catch-Up Day`
                : laundryCompleted.length === 4
                  ? 'Ready for parent approval!'
                  : todayDay === 4
                    ? `${laundryCompleted.length} of 4 steps complete • Catch-Up Day`
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
                      !fridayLaundryAvailable ||
                      claimedByOther ||
                      Boolean(record?.approved_at)
                    }
                    style={{
                      opacity:
                        fridayLaundryAvailable || done ? 1 : 0.5,
                      cursor:
                        fridayLaundryAvailable &&
                        !claimedByOther &&
                        !record?.approved_at
                          ? 'pointer'
                          : 'not-allowed'
                    }}
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
              {fridayLaundryAvailable
                ? 'Friday is active • Parent approval required'
                : 'Available Friday • Parent approval required'}
            </div>
          </div>

          </>}

          {features.bonus_missions !== false && (
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

          )}

          {features.reading_challenge !== false && <>
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

            {!readingOpen ? (
              <button
                type="button"
                onClick={() => {
                  setReadingOpen(true);
                  setReadingError('');
                  setQuizResult(null);
                }}
              >
                Find My Book
                <ArrowRight size={18} />
              </button>
            ) : activeQuiz ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                <strong>{activeQuiz.book.title}</strong>

                {quizResult ? (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,.65)'
                    }}
                  >
                    <strong style={{ fontSize: '22px' }}>
                      {Number(quizResult.score_percent)}%
                    </strong>
                    <p style={{ marginBottom: 0 }}>
                      {quizResult.is_first_attempt
                        ? `You earned ${Number(quizResult.reading_points_earned).toFixed(1)} Reading Points!`
                        : 'Retake complete — no additional Reading Points.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {quizQuestions.map(question => (
                      <div
                        key={question.id}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,.55)'
                        }}
                      >
                        <strong>
                          {question.question_number}. {question.question_text}
                        </strong>

                        <div
                          style={{
                            display: 'grid',
                            gap: '7px',
                            marginTop: '10px'
                          }}
                        >
                          {quizChoices
                            .filter(choice => choice.question_id === question.id)
                            .map(choice => (
                              <button
                                key={choice.id}
                                type="button"
                                onClick={() =>
                                  setQuizAnswers(current => ({
                                    ...current,
                                    [question.id]: choice.choice_letter
                                  }))
                                }
                                style={{
                                  textAlign: 'left',
                                  padding: '9px',
                                  borderRadius: '9px',
                                  border:
                                    quizAnswers[question.id] === choice.choice_letter
                                      ? '2px solid currentColor'
                                      : '1px solid rgba(36,35,66,.15)',
                                  background: 'white',
                                  color: '#181638'
                                }}
                              >
                                <strong>{choice.choice_letter}.</strong>{' '}
                                {choice.choice_text}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      disabled={readingBusy}
                      onClick={submitReadingQuiz}
                    >
                      <Check size={18} />
                      {readingBusy ? 'Scoring...' : 'Submit Quiz'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveQuiz(null);
                    setQuizQuestions([]);
                    setQuizChoices([]);
                    setQuizAnswers({});
                    setQuizAttemptId(null);
                    setQuizResult(null);
                    setBookSearch('');
                    setReadingError('');
                  }}
                >
                  Back to Books
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                <input
                  type="search"
                  value={bookSearch}
                  onChange={e => setBookSearch(e.target.value)}
                  placeholder="Search for your book..."
                  aria-label="Search for your book"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(36,35,66,.18)',
                    background: 'white',
                    color: '#181638',
                    fontSize: '16px'
                  }}
                />

                {books.length === 0 ? (
                  <p>No books are available yet.</p>
                ) : bookSearch.trim() === '' ? (
                  <p style={{ margin: 0, opacity: .72 }}>
                    Start typing a book title or author.
                  </p>
                ) : (
                  books
                    .filter(book => {
                      const search = bookSearch.trim().toLowerCase();
                      return (
                        book.title?.toLowerCase().includes(search) ||
                        book.author?.toLowerCase().includes(search)
                      );
                    })
                    .map(book => (
                      <button
                        key={book.id}
                        type="button"
                        disabled={readingBusy}
                        onClick={() => startBookQuiz(book)}
                        style={{
                          textAlign: 'left',
                          display: 'grid',
                          gap: '3px'
                        }}
                      >
                        <strong>{book.title}</strong>
                        <span>{book.author}</span>
                        <small>
                          Level {book.reading_level || '—'} •{' '}
                          {Number(book.maximum_points || 0).toFixed(1)} possible points
                        </small>
                      </button>
                    ))
                )}

                {bookSearch.trim() !== '' &&
                  books.filter(book => {
                    const search = bookSearch.trim().toLowerCase();
                    return (
                      book.title?.toLowerCase().includes(search) ||
                      book.author?.toLowerCase().includes(search)
                    );
                  }).length === 0 && (
                    <p style={{ margin: 0 }}>No matching books found.</p>
                  )}

                <button
                  type="button"
                  onClick={() => {
                    setReadingOpen(false);
                    setBookSearch('');
                    setReadingError('');
                  }}
                >
                  Close
                </button>
              </div>
            )}

            {readingError && (
              <div className="tm-login-error">{readingError}</div>
            )}
          </div>

          <div className="side-card reading-card">
            <div className="side-card-title">
              <Clock size={23} />
              <div>
                <small>YOUR PROGRESS</small>
                <h3>Reading History</h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReadingHistory(value => !value)}
            >
              {showReadingHistory ? 'Hide History' : 'View My Books'}
              <ArrowRight size={18} />
            </button>

            {showReadingHistory && (
              <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                {readingHistory.length === 0 ? (
                  <p>No completed quizzes yet.</p>
                ) : (
                  readingHistory.map(attempt => (
                    <div
                      key={attempt.id}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,.55)'
                      }}
                    >
                      <strong>{attempt.books?.title || 'Book'}</strong>
                      <div style={{ fontSize: '12px', marginTop: '3px' }}>
                        {Number(attempt.score_percent || 0)}% • +
                        {Number(attempt.reading_points_earned || 0).toFixed(1)}
                        {' '}Reading Points
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activityHistory.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <small>RECENT MISSION ACTIVITY</small>
                <div style={{ display: 'grid', gap: '6px', marginTop: '7px' }}>
                  {activityHistory.slice(0, 5).map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px',
                        fontSize: '12px'
                      }}
                    >
                      <span>{item.description}</span>
                      <strong>{Number(item.amount) > 0 ? '+' : ''}{Number(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          </>}

          {features.rewards !== false && (
          <div className="side-card bonus-card">
            <div className="side-card-title">
              <Gift size={23} />
              <div>
                <small>SPEND MISSION POINTS</small>
                <h3>Rewards</h3>
              </div>
            </div>

            <p>Choose any reward you have enough Total Points to redeem.</p>

            <div style={{ display: 'grid', gap: '8px' }}>
              {REWARDS.map(reward => {
                const unlocked = totalPoints >= reward.points;
                const saving = redeemingChildReward === reward.points;

                return (
                  <button
                    key={reward.points}
                    type="button"
                    disabled={!unlocked || Boolean(redeemingChildReward)}
                    onClick={() => redeemOwnReward(reward)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(36,35,66,.12)',
                      background: unlocked ? 'white' : 'rgba(255,255,255,.4)',
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      opacity: unlocked ? 1 : 0.55,
                      textAlign: 'left',
                      color: '#181638'
                    }}
                  >
                    <span style={{ color: '#181638', fontWeight: 700 }}>
                      {saving ? 'Redeeming...' : reward.name}
                    </span>
                    <strong style={{ color: '#181638' }}>
                      {unlocked ? `${reward.points} pts • Redeem` : `${reward.points} pts`}
                    </strong>
                  </button>
                );
              })}
            </div>

            {rewardError && (
              <div className="tm-login-error" style={{ marginTop: '10px' }}>
                {rewardError}
              </div>
            )}
          </div>

          )}

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
  const [readingAttempts, setReadingAttempts] = useState([]);
  const [activityTransactions, setActivityTransactions] = useState([]);
  const [showProgress, setShowProgress] = useState(true);
  const [showRewardHistory, setShowRewardHistory] = useState(false);
  const [showReviewedBonusHistory, setShowReviewedBonusHistory] = useState(false);
  const [pinChildId, setPinChildId] = useState('');
  const [newChildPin, setNewChildPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  const [excusedDays, setExcusedDays] = useState([]);
  const [excuseChildId, setExcuseChildId] = useState('');
  const [excuseDate, setExcuseDate] = useState(localDate());
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseBusy, setExcuseBusy] = useState(false);

  const [adjustChildId, setAdjustChildId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [approvingFridayLaundry, setApprovingFridayLaundry] = useState(null);
  const [savingAssignment, setSavingAssignment] = useState(null);
  const [reviewingBonus, setReviewingBonus] = useState(null);
  const [redeemingReward, setRedeemingReward] = useState(null);
  const [undoingReward, setUndoingReward] = useState(null);
  const [error, setError] = useState('');
  const [libraryBooks, setLibraryBooks] = useState([]);

  const [quizImportText, setQuizImportText] = useState('');
  const [quizImportPreview, setQuizImportPreview] = useState(null);
  const [quizImportError, setQuizImportError] = useState('');
  const [importingQuiz, setImportingQuiz] = useState(false);
  const [quizImportSuccess, setQuizImportSuccess] = useState('');
  const [features, setFeatures] = useState({});
  const [savingFeature, setSavingFeature] = useState('');

  useEffect(() => {
    loadParentDashboard();
  }, []);

  async function loadParentDashboard() {
    setLoading(true);
    setError('');

    await supabase.rpc('ensure_weekly_assignments');

    const { data: featureData, error: featureError } = await supabase
      .from('feature_settings')
      .select('feature_key,enabled')
      .order('feature_key');

    if (!featureError) {
      setFeatures(
        Object.fromEntries((featureData || []).map(item => [item.feature_key, item.enabled]))
      );
    }

    const weekStart = currentMonday();

    const [
      profilesResult,
      laundryResult,
      weeklyResult,
      bonusResult,
      pointsResult,
      rewardsResult,
      fridayLaundryResult,
      libraryResult,
      readingAttemptsResult,
      activityTransactionsResult,
      excusedDaysResult
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
        .order('laundry_date', { ascending: false }),

      supabase
        .from('books')
        .select('id,title,author,reading_level,maximum_points,quizzes!inner(id,active)')
        .eq('is_active', true)
        .eq('quizzes.active', true)
        .order('title'),

      supabase
        .from('quiz_attempts')
        .select('id,child_id,book_id,score_percent,reading_points_earned,completed_at,is_first_attempt,books(title,author)')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(40),

      supabase
        .from('mission_point_transactions')
        .select('id,child_id,amount,source_type,source_id,description,created_at')
        .order('created_at', { ascending: false })
        .limit(60),

      supabase
        .from('chore_excused_days')
        .select('id,child_id,excused_date,reason,created_at')
        .order('excused_date', { ascending: false })
        .limit(30)
    ]);

    if (
      profilesResult.error ||
      laundryResult.error ||
      weeklyResult.error ||
      bonusResult.error ||
      pointsResult.error ||
      rewardsResult.error ||
      fridayLaundryResult.error ||
      libraryResult.error ||
      readingAttemptsResult.error ||
      activityTransactionsResult.error ||
      excusedDaysResult.error
    ) {
      console.error(
        profilesResult.error,
        laundryResult.error,
        weeklyResult.error,
        bonusResult.error,
        pointsResult.error,
        rewardsResult.error,
        fridayLaundryResult.error,
        libraryResult.error,
        readingAttemptsResult.error,
        activityTransactionsResult.error,
        excusedDaysResult.error
      );

      setError('Could not load the Parent Dashboard.');
      setLoading(false);
      return;
    }

    setChildren(profilesResult.data || []);
    setLaundry(laundryResult.data || []);
    setBonusMissions(bonusResult.data || []);

    const undoneRewardIds = new Set(
      (activityTransactionsResult.data || [])
        .filter(transaction => transaction.source_type === 'reward_redemption_undo')
        .map(transaction => transaction.source_id)
        .filter(Boolean)
    );

    setRewardRedemptions(
      (rewardsResult.data || []).filter(
        redemption => !undoneRewardIds.has(redemption.id)
      )
    );

    setFridayLaundry(fridayLaundryResult.data || []);
    setLibraryBooks(libraryResult.data || []);
    setReadingAttempts(readingAttemptsResult.data || []);
    setActivityTransactions(activityTransactionsResult.data || []);
    setExcusedDays(excusedDaysResult.data || []);

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

  async function toggleFeature(featureKey) {
    if (savingFeature) return;

    setSavingFeature(featureKey);
    setError('');

    const newValue = !(features[featureKey] ?? true);

    const { error: featureError } = await supabase
      .from('feature_settings')
      .update({ enabled: newValue, updated_at: new Date().toISOString() })
      .eq('feature_key', featureKey);

    if (featureError) {
      console.error(featureError);
      setError('Feature setting could not be changed.');
      setSavingFeature('');
      return;
    }

    setFeatures(current => ({ ...current, [featureKey]: newValue }));
    setSavingFeature('');
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
      `Redeem "${reward.name}" for ${child.name}?\n\nThis will deduct ${reward.points} Mission Points.`
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
      setError(
        `Reward could not be recorded: ${rewardError.message || 'Unknown error'}`
      );
      setRedeemingReward(null);
      return;
    }

    await loadParentDashboard();
    setRedeemingReward(null);
  }

  async function undoRewardRedemption(redemption) {
    if (undoingReward) return;

    const confirmed = window.confirm(
      `Undo "${redemption.reward_name}" for ${childName(redemption.child_id)}?\n\nThis will restore ${Number(redemption.point_threshold)} Mission Points.`
    );

    if (!confirmed) return;

    setUndoingReward(redemption.id);
    setError('');

    const { error: undoError } = await supabase.rpc(
      'undo_reward_redemption',
      { p_redemption_id: redemption.id }
    );

    if (undoError) {
      console.error(undoError);
      setError(
        `Reward could not be undone: ${undoError.message || 'Unknown error'}`
      );
      setUndoingReward(null);
      return;
    }

    await loadParentDashboard();
    setUndoingReward(null);
  }

  async function undoBonusMissionReview(submissionId) {
    setError('');

    const { error: undoError } = await supabase.rpc(
      'undo_bonus_mission_review',
      { p_submission_id: submissionId }
    );

    if (undoError) {
      console.error(undoError);
      setError('Could not undo that bonus mission review.');
      return;
    }

    await loadParentDashboard();
  }

  function previewQuizImport() {
    setQuizImportError('');
    setQuizImportSuccess('');

    try {
      const text = quizImportText.replace(/\r/g, '').trim();
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

      function field(label, required = false) {
        const line = lines.find(item =>
          item.toUpperCase().startsWith(`${label}:`)
        );
        const value = line ? line.slice(line.indexOf(':') + 1).trim() : '';
        if (required && !value) throw new Error(`${label} is required.`);
        return value;
      }

      const title = field('TITLE', true);
      const author = field('AUTHOR', true);
      const readingLevel = field('READING LEVEL');
      const maxPoints = Number(field('MAX POINTS', true));

      if (!Number.isFinite(maxPoints) || maxPoints < 0) {
        throw new Error('MAX POINTS must be a number.');
      }

      const questionStart = lines.findIndex(line => /^1[\.\)]\s+/.test(line));
      if (questionStart === -1) {
        throw new Error('Start the quiz questions with "1. Question..."');
      }

      const questions = [];
      let currentQuestion = null;

      for (const line of lines.slice(questionStart)) {
        const questionMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);
        const choiceMatch = line.match(/^([A-D])[\.\)]\s+(.+)$/i);

        if (questionMatch) {
          if (currentQuestion) questions.push(currentQuestion);
          currentQuestion = {
            number: Number(questionMatch[1]),
            question: questionMatch[2].trim(),
            choices: []
          };
        } else if (choiceMatch && currentQuestion) {
          let choiceText = choiceMatch[2].trim();
          const correct = choiceText.endsWith('*');
          if (correct) choiceText = choiceText.slice(0, -1).trim();

          currentQuestion.choices.push({
            letter: choiceMatch[1].toUpperCase(),
            text: choiceText,
            correct
          });
        }
      }

      if (currentQuestion) questions.push(currentQuestion);

      if (questions.length !== 10) {
        throw new Error(`The quiz must contain exactly 10 questions. I found ${questions.length}.`);
      }

      questions.forEach((question, index) => {
        if (question.number !== index + 1) {
          throw new Error('Questions must be numbered 1 through 10 in order.');
        }
        if (question.choices.length !== 4) {
          throw new Error(`Question ${index + 1} must have exactly four choices.`);
        }
        if (question.choices.map(choice => choice.letter).join('') !== 'ABCD') {
          throw new Error(`Question ${index + 1} choices must be A, B, C, and D.`);
        }
        if (question.choices.filter(choice => choice.correct).length !== 1) {
          throw new Error(`Question ${index + 1} needs exactly one correct answer marked with *.`);
        }
      });

      setQuizImportPreview({
        book: {
          title,
          author,
          isbn_10: field('ISBN 10') || null,
          isbn_13: field('ISBN 13') || null,
          reading_level: readingLevel || null,
          maximum_points: maxPoints,
          points_source: field('POINTS SOURCE') || 'Accelerated Reader',
          description: field('DESCRIPTION') || ''
        },
        questions
      });
    } catch (importError) {
      console.error(importError);
      setQuizImportPreview(null);
      setQuizImportError(importError.message || 'That quiz is not valid.');
    }
  }

  async function importQuizPackage() {
    if (!quizImportPreview || importingQuiz) return;

    setImportingQuiz(true);
    setQuizImportError('');
    setQuizImportSuccess('');

    const { error: importError } = await supabase.rpc(
      'import_reading_quiz',
      { p_quiz: quizImportPreview }
    );

    if (importError) {
      console.error(importError);
      setQuizImportError(importError.message || 'Quiz could not be imported.');
      setImportingQuiz(false);
      return;
    }

    setQuizImportSuccess(
      `${quizImportPreview.book.title} was added to the Reading Challenge!`
    );
    setQuizImportText('');
    setQuizImportPreview(null);
    setImportingQuiz(false);
    await loadParentDashboard();
  }

  async function excuseChoreDay() {
    if (!excuseChildId || !excuseDate) {
      setError('Choose a child and date to excuse.');
      return;
    }

    setExcuseBusy(true);
    setError('');

    const { error: excuseError } = await supabase.rpc(
      'parent_excuse_chore_day',
      {
        p_child_id: excuseChildId,
        p_excused_date: excuseDate,
        p_reason: excuseReason.trim() || null
      }
    );

    if (excuseError) {
      console.error(excuseError);
      setError(excuseError.message || 'Could not excuse that chore day.');
      setExcuseBusy(false);
      return;
    }

    setExcuseReason('');
    await loadParentDashboard();
    setExcuseBusy(false);
  }

  async function unexcuseChoreDay(childId, excusedDate) {
    if (excuseBusy) return;

    setExcuseBusy(true);
    setError('');

    const { error: unexcuseError } = await supabase.rpc(
      'parent_unexcuse_chore_day',
      {
        p_child_id: childId,
        p_excused_date: excusedDate
      }
    );

    if (unexcuseError) {
      console.error(unexcuseError);
      setError(unexcuseError.message || 'Could not remove that excused day.');
      setExcuseBusy(false);
      return;
    }

    await loadParentDashboard();
    setExcuseBusy(false);
  }

  async function adjustMissionPoints() {
    const amount = Number(adjustAmount);

    if (!adjustChildId || !Number.isFinite(amount) || amount === 0) {
      setError('Choose a child and enter a non-zero point amount.');
      return;
    }

    if (!adjustReason.trim()) {
      setError('A reason is required for point adjustments.');
      return;
    }

    setAdjustBusy(true);
    setError('');

    const { error: adjustmentError } = await supabase.rpc(
      'parent_adjust_mission_points',
      {
        p_child_id: adjustChildId,
        p_amount: amount,
        p_reason: adjustReason.trim()
      }
    );

    if (adjustmentError) {
      console.error(adjustmentError);
      setError(adjustmentError.message || 'Could not adjust Mission Points.');
      setAdjustBusy(false);
      return;
    }

    setAdjustAmount('');
    setAdjustReason('');
    await loadParentDashboard();
    setAdjustBusy(false);
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

  async function changeChildPin() {
    if (!pinChildId || !/^\d{4}$/.test(newChildPin)) {
      setError('Enter a 4-digit PIN and choose a child.');
      return;
    }

    setPinBusy(true);
    setError('');

    const { error: pinError } = await supabase.rpc(
      'parent_change_child_pin',
      {
        p_child_id: pinChildId,
        p_new_pin: newChildPin
      }
    );

    if (pinError) {
      console.error(pinError);
      setError(pinError.message || 'Could not change the PIN.');
      setPinBusy(false);
      return;
    }

    setNewChildPin('');
    setPinChildId('');
    setPinBusy(false);
    setError('');
    window.alert('PIN changed successfully.');
  }

  function childName(childId) {
    return (
      children.find(child => child.id === childId)?.name || 'Child'
    );
  }

  function childReadingPoints(childId) {
    return readingAttempts
      .filter(attempt => attempt.child_id === childId && attempt.is_first_attempt)
      .reduce(
        (total, attempt) => total + Number(attempt.reading_points_earned || 0),
        0
      );
  }

  function childBooksCompleted(childId) {
    return new Set(
      readingAttempts
        .filter(attempt => attempt.child_id === childId && attempt.completed_at)
        .map(attempt => attempt.book_id)
    ).size;
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
            <span>FAMILY SETTINGS</span>
            <h2>Features</h2>
          </div>
          <Sparkles size={24} />
        </div>

        <div className="weekly-placeholder" style={{ alignItems: 'flex-start', marginBottom: '28px' }}>
          <div style={{ width: '100%' }}>
            <small>TURN FEATURES ON OR OFF</small>
            <strong>Family Mission Portal Features</strong>
            <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
              {[
                ['daily_missions', 'Daily Missions'],
                ['weekly_assignments', 'Weekly Assignments'],
                ['laundry', 'Laundry'],
                ['bonus_missions', 'Bonus Missions'],
                ['reading_challenge', 'Reading Challenge'],
                ['rewards', 'Rewards'],
                ['missed_chore_penalties', 'Missed Chore Penalties']
              ].map(([key, label]) => {
                const enabled = features[key] ?? true;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={Boolean(savingFeature)}
                    onClick={() => toggleFeature(key)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '11px 13px',
                      borderRadius: '10px',
                      border: '1px solid rgba(36,35,66,.12)',
                      background: 'white',
                      cursor: savingFeature ? 'wait' : 'pointer',
                      fontWeight: 800
                    }}
                  >
                    <span>{label}</span>
                    <span>{enabled ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="section-heading">
          <div>
            <span>FAMILY SETTINGS</span>
            <h2>Kids' PINs</h2>
          </div>
          <LockKeyhole size={24} />
        </div>

        <div
          className="weekly-placeholder"
          style={{ alignItems: 'flex-start', marginBottom: '28px' }}
        >
          <div className="weekly-icon">
            <LockKeyhole size={25} />
          </div>

          <div style={{ width: '100%' }}>
            <small>CHANGE LOGIN PIN</small>
            <strong>Update a child's 4-digit PIN</strong>
            <p>PINs stay securely hashed. You only need to choose the child and enter the new PIN.</p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                marginTop: '12px'
              }}
            >
              <select
                value={pinChildId}
                onChange={e => setPinChildId(e.target.value)}
                style={{
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(36,35,66,.18)',
                  background: 'white'
                }}
              >
                <option value="">Choose a child...</option>
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newChildPin}
                onChange={e => setNewChildPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="New 4-digit PIN"
                style={{
                  padding: '11px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(36,35,66,.18)',
                  background: 'white'
                }}
              />

              <button
                type="button"
                disabled={pinBusy || !pinChildId || newChildPin.length !== 4}
                onClick={changeChildPin}
                style={{
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: pinBusy ? 'wait' : 'pointer',
                  fontWeight: 800
                }}
              >
                {pinBusy ? 'Saving...' : 'Change PIN'}
              </button>
            </div>
          </div>
        </div>

        <div className="section-heading">
          <div>
            <span>CHORE CONTROLS</span>
            <h2>Excused Days & Point Adjustments</h2>
          </div>
          <Check size={24} />
        </div>

        <div className="weekly-placeholder" style={{ alignItems: 'flex-start', marginBottom: '18px' }}>
          <div className="weekly-icon"><Check size={25} /></div>
          <div style={{ width: '100%' }}>
            <small>EXCUSE REQUIRED CHORES</small>
            <strong>Excuse a child for a day</strong>
            <p>An excused day will not receive automatic missed-chore penalties.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
              <select value={excuseChildId} onChange={e => setExcuseChildId(e.target.value)}
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(36,35,66,.18)', background: 'white' }}>
                <option value="">Choose a child...</option>
                {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
              </select>

              <input type="date" value={excuseDate} onChange={e => setExcuseDate(e.target.value)}
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(36,35,66,.18)', background: 'white' }} />

              <input type="text" value={excuseReason} onChange={e => setExcuseReason(e.target.value)}
                placeholder="Reason (optional)" maxLength={250}
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(36,35,66,.18)', background: 'white' }} />

              <button type="button" disabled={excuseBusy || !excuseChildId || !excuseDate} onClick={excuseChoreDay}
                style={{ padding: '11px 14px', borderRadius: '10px', border: 'none', cursor: excuseBusy ? 'wait' : 'pointer', fontWeight: 800 }}>
                {excuseBusy ? 'Saving...' : 'Excuse Chores'}
              </button>
            </div>

            {excusedDays.length > 0 && (
              <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                <small>RECENT EXCUSED DAYS</small>
                {excusedDays.slice(0, 10).map(item => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'white' }}>
                    <span>
                      <strong>{childName(item.child_id)}</strong> — {item.excused_date}
                      {item.reason ? ` — ${item.reason}` : ''}
                    </span>
                    <button type="button" disabled={excuseBusy}
                      onClick={() => unexcuseChoreDay(item.child_id, item.excused_date)}
                      style={{ border: '1px solid rgba(36,35,66,.15)', background: 'white', borderRadius: '8px', padding: '7px 10px', cursor: excuseBusy ? 'wait' : 'pointer', fontWeight: 700 }}>
                      Un-excuse
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="weekly-placeholder" style={{ alignItems: 'flex-start', marginBottom: '28px' }}>
          <div className="weekly-icon"><Star size={25} /></div>
          <div style={{ width: '100%' }}>
            <small>MISSION POINTS</small>
            <strong>Manual Point Adjustment</strong>
            <p>Add or subtract Mission Points. Use a negative number to deduct points. A reason is required.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '12px' }}>
              <select value={adjustChildId} onChange={e => setAdjustChildId(e.target.value)}
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(36,35,66,.18)', background: 'white' }}>
                <option value="">Choose a child...</option>
                {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
              </select>

              <input type="number" step="1" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                placeholder="+5 or -5"
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(36,35,66,.18)', background: 'white' }} />

              <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                placeholder="Reason (required)" maxLength={500}
                style={{ padding: '11px 12px', borderRadius: '10px', border: '1px solid rgba(36,35,66,.18)', background: 'white' }} />

              <button type="button"
                disabled={adjustBusy || !adjustChildId || !adjustAmount || !adjustReason.trim()}
                onClick={adjustMissionPoints}
                style={{ padding: '11px 14px', borderRadius: '10px', border: 'none', cursor: adjustBusy ? 'wait' : 'pointer', fontWeight: 800 }}>
                {adjustBusy ? 'Saving...' : 'Adjust Points'}
              </button>
            </div>
          </div>
        </div>

        <div className="section-heading">
          <div>
            <span>FAMILY OVERVIEW</span>
            <h2>Progress Dashboard</h2>
          </div>
          <Trophy size={24} />
        </div>

        <button
          type="button"
          onClick={() => setShowProgress(value => !value)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(36,35,66,.12)',
            background: 'white',
            cursor: 'pointer',
            fontWeight: 800,
            marginBottom: '12px'
          }}
        >
          {showProgress ? 'Hide Family Progress' : 'Show Family Progress'}
        </button>

        {showProgress && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '28px'
            }}
          >
            {children.map(child => {
              const mission = Number(childPoints[child.id] || 0);
              const reading = childReadingPoints(child.id);
              const total = mission + reading;

              return (
                <div
                  className="weekly-placeholder"
                  key={child.id}
                  style={{ alignItems: 'flex-start' }}
                >
                  <div className="weekly-icon">
                    <Trophy size={25} />
                  </div>
                  <div style={{ width: '100%' }}>
                    <small>TEAM MILLER PROGRESS</small>
                    <strong>{child.name}</strong>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        marginTop: '12px'
                      }}
                    >
                      <div>
                        <small>MISSION</small>
                        <strong>{mission}</strong>
                      </div>
                      <div>
                        <small>READING</small>
                        <strong>{reading.toFixed(1)}</strong>
                      </div>
                      <div>
                        <small>TOTAL</small>
                        <strong>{total.toFixed(1)}</strong>
                      </div>
                    </div>

                    <p style={{ marginBottom: 0, marginTop: '10px' }}>
                      {childBooksCompleted(child.id)} books completed •{' '}
                      {readingAttempts.filter(a => a.child_id === child.id).length} quiz attempts
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
            <span>READING</span>
            <h2>Reading Management</h2>
          </div>
          <BookOpen size={24} />
        </div>

        <details
          className="weekly-placeholder"
          style={{
            alignItems: 'flex-start',
            marginBottom: '14px',
            cursor: 'pointer'
          }}
        >
          <summary
            style={{
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%'
            }}
          >
            <div className="weekly-icon">
              <BookOpen size={25} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <small>TEAM MILLER LIBRARY</small>
              <strong>Books With Quizzes</strong>
              <p style={{ marginBottom: 0 }}>
                {libraryBooks.length} {libraryBooks.length === 1 ? 'book' : 'books'} available
              </p>
            </div>

            <span style={{ fontSize: '20px', lineHeight: 1 }}>
              ▾
            </span>
          </summary>

          <div style={{ width: '100%', marginTop: '14px' }}>
            {libraryBooks.length === 0 ? (
              <p>No reading quizzes have been added yet.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '10px'
                }}
              >
                {libraryBooks.map(book => (
                  <div
                    key={book.id}
                    style={{
                      background: 'white',
                      border: '1px solid rgba(36,35,66,.10)',
                      borderRadius: '12px',
                      padding: '13px'
                    }}
                  >
                    <strong style={{ display: 'block' }}>{book.title}</strong>
                    <span style={{ display: 'block', marginTop: '3px' }}>
                      {book.author}
                    </span>
                    <small style={{ display: 'block', marginTop: '7px' }}>
                      Level {book.reading_level || '—'} •{' '}
                      {Number(book.maximum_points || 0).toFixed(1)} Reading Points
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        <div className="weekly-placeholder" style={{ alignItems: 'flex-start' }}>
          <div className="weekly-icon">
            <BookOpen size={25} />
          </div>

          <div style={{ width: '100%', minWidth: 0 }}>
            <small>ADD A TEAM MILLER QUIZ</small>
            <strong>Add a Book & Quiz</strong>
            <p>
              Paste the simple quiz text from ChatGPT. Put an * after the correct
              answer, preview it, then add it to the boys' Reading Challenge.
            </p>

            <textarea
              value={quizImportText}
              onChange={e => {
                setQuizImportText(e.target.value);
                setQuizImportPreview(null);
                setQuizImportError('');
                setQuizImportSuccess('');
              }}
              placeholder={`TITLE: Skyward
AUTHOR: Brandon Sanderson
READING LEVEL: HL680L
MAX POINTS: 21

1. What does Spensa dream of becoming?
A. A scientist
B. A pilot *
C. A teacher
D. A mechanic

Continue through question 10...`}
              rows="16"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(36,35,66,.15)',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '14px',
                background: 'white'
              }}
            />

            <button
              type="button"
              className="tm-pin-submit"
              disabled={!quizImportText.trim() || importingQuiz}
              onClick={previewQuizImport}
              style={{
                width: 'auto',
                marginTop: '10px',
                padding: '10px 18px'
              }}
            >
              <BookOpen size={17} />
              Preview Quiz
            </button>

            {quizImportError && (
              <div className="tm-login-error" style={{ marginTop: '10px' }}>
                {quizImportError}
              </div>
            )}

            {quizImportSuccess && (
              <p style={{ marginTop: '12px' }}>
                <strong>{quizImportSuccess}</strong>
              </p>
            )}

            {quizImportPreview && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,.65)'
                }}
              >
                <small>READY TO IMPORT</small>
                <strong style={{ display: 'block', marginTop: '4px' }}>
                  {quizImportPreview.book.title}
                </strong>
                <p style={{ margin: '5px 0 12px' }}>
                  {quizImportPreview.book.author} • Level{' '}
                  {quizImportPreview.book.reading_level || '—'} •{' '}
                  {Number(quizImportPreview.book.maximum_points || 0).toFixed(1)}{' '}
                  Reading Points • {quizImportPreview.questions.length} questions
                </p>

                <div style={{ display: 'grid', gap: '7px' }}>
                  {quizImportPreview.questions.map((question, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '9px 10px',
                        borderRadius: '9px',
                        background: 'white',
                        fontSize: '13px'
                      }}
                    >
                      <strong>{index + 1}.</strong> {question.question}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="tm-pin-submit"
                  disabled={importingQuiz}
                  onClick={importQuizPackage}
                  style={{
                    width: 'auto',
                    marginTop: '14px',
                    padding: '10px 18px'
                  }}
                >
                  <Check size={17} />
                  {importingQuiz
                    ? 'Adding Quiz...'
                    : 'Add to Reading Challenge'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="section-heading lower-heading">
          <div>
            <span>ACTIVITY</span>
            <h2>Reading & Mission History</h2>
          </div>
          <Clock size={24} />
        </div>

        <details className="weekly-placeholder" style={{ marginBottom: '14px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
            Recent Reading Quizzes ({readingAttempts.length})
          </summary>

          <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
            {readingAttempts.length === 0 ? (
              <p>No completed reading quizzes yet.</p>
            ) : (
              readingAttempts.slice(0, 20).map(attempt => (
                <div
                  key={attempt.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'white'
                  }}
                >
                  <span>
                    <strong>{childName(attempt.child_id)}</strong> —{' '}
                    {attempt.books?.title || 'Book'}
                  </span>
                  <span>{Number(attempt.score_percent || 0)}%</span>
                  <strong>+{Number(attempt.reading_points_earned || 0).toFixed(1)}</strong>
                </div>
              ))
            )}
          </div>
        </details>

        <details className="weekly-placeholder" style={{ marginBottom: '14px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>
            Recent Mission Activity ({activityTransactions.length})
          </summary>

          <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
            {activityTransactions.length === 0 ? (
              <p>No mission activity yet.</p>
            ) : (
              activityTransactions.slice(0, 20).map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'white'
                  }}
                >
                  <span>
                    <strong>{childName(item.child_id)}</strong> — {item.description}
                  </span>
                  <strong>
                    {Number(item.amount) > 0 ? '+' : ''}
                    {Number(item.amount)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </details>

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

            <button
              type="button"
              onClick={() => setShowRewardHistory(value => !value)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(36,35,66,.12)',
                background: 'white',
                cursor: 'pointer',
                fontWeight: 800,
                marginBottom: '10px'
              }}
            >
              {showRewardHistory ? 'Hide Reward History' : 'Show Reward History'}
            </button>

            {showRewardHistory && (
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

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <strong>{redemption.point_threshold} pts</strong>
                    <button
                      type="button"
                      disabled={Boolean(undoingReward)}
                      onClick={() => undoRewardRedemption(redemption)}
                      style={{
                        border: '1px solid rgba(36,35,66,.15)',
                        background: 'white',
                        color: '#181638',
                        borderRadius: '8px',
                        padding: '6px 9px',
                        cursor: undoingReward ? 'wait' : 'pointer',
                        fontWeight: 700
                      }}
                    >
                      {undoingReward === redemption.id ? 'Undoing...' : 'Undo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {reviewedBonusMissions.length > 0 && (
          <details
            className="weekly-placeholder"
            style={{ alignItems: 'flex-start', marginBottom: '28px' }}
          >
            <summary
              onClick={e => {
                e.preventDefault();
                setShowReviewedBonusHistory(value => !value);
              }}
              style={{
                cursor: 'pointer',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%'
              }}
            >
              <div className="weekly-icon">
                <Star size={25} />
              </div>

              <div style={{ flex: 1 }}>
                <small>RECENT</small>
                <strong>Reviewed Bonus Missions</strong>
                <p style={{ marginBottom: 0 }}>
                  {reviewedBonusMissions.length}{' '}
                  {reviewedBonusMissions.length === 1 ? 'mission' : 'missions'} in review history
                </p>
              </div>

              <span style={{ fontSize: '20px' }}>
                {showReviewedBonusHistory ? '▴' : '▾'}
              </span>
            </summary>

            {showReviewedBonusHistory && (
              <div style={{ width: '100%', marginTop: '14px', display: 'grid', gap: '10px' }}>
                {reviewedBonusMissions.map(mission => (
                  <div
                    key={mission.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'white',
                      border: '1px solid rgba(36,35,66,.10)'
                    }}
                  >
                    <strong>
                      {childName(mission.child_id)} — {mission.category}
                    </strong>

                    <span style={{ fontWeight: 800 }}>
                      {mission.status === 'approved' ? '+1' : 'Rejected'}
                    </span>

                    <button
                      type="button"
                      onClick={() => undoBonusMissionReview(mission.id)}
                      style={{
                        border: '1px solid rgba(36,35,66,.15)',
                        background: 'white',
                        color: '#181638',
                        borderRadius: '8px',
                        padding: '6px 9px',
                        cursor: 'pointer'
                      }}
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            )}
          </details>
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
