'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';

type TabType = 'dashboard' | 'calendar' | 'leaderboard' | 'profile' | 'admin';

interface Task {
  id: string;
  tier: 'LEARN' | 'APPLY' | 'REVIEW';
  title: string;
  is_completed: boolean;
}

interface DailyLog {
  id: string;
  hours_studied: number;
  blockers: string;
}

interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'student';
  points: number;
  current_streak: number;
}

interface StudyEvent {
  id: string;
  title: string;
  start_time: string;
  tag: string;
  is_completed: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Dashboard State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [hours, setHours] = useState<string>('0');
  const [blockers, setBlockers] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTier, setNewTaskTier] = useState<'LEARN' | 'APPLY' | 'REVIEW'>('LEARN');

  // Social & Admin State
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTag, setNewEventTag] = useState('General');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        await loadDailyData(currentUser.id);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        await loadDailyData(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) setProfile(data);
  };

  const loadDailyData = async (userId: string) => {
    let { data: dailyLog } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayStr)
      .maybeSingle();

    if (!dailyLog) {
      const { data: newLog } = await supabase
        .from('daily_logs')
        .insert([{ user_id: userId, date: todayStr, hours_studied: 0, blockers: '' }])
        .select()
        .single();
      dailyLog = newLog;
    }

    if (dailyLog) {
      setLog(dailyLog);
      setHours(dailyLog.hours_studied?.toString() || '0');
      setBlockers(dailyLog.blockers || '');

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('daily_log_id', dailyLog.id)
        .order('created_at', { ascending: true });

      setTasks(taskData || []);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Account created! Please sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTasks([]);
  };

  const addPoints = async (pointsToAdd: number) => {
    if (!profile) return;
    const newPoints = (profile.points || 0) + pointsToAdd;
    setProfile({ ...profile, points: newPoints });
    await supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !log || !user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        daily_log_id: log.id,
        user_id: user.id,
        tier: newTaskTier,
        title: newTaskTitle.trim(),
        is_completed: false,
      }])
      .select()
      .single();

    if (!error && data) {
      setTasks([...tasks, data]);
      setNewTaskTitle('');
    }
  };

  const toggleTask = async (task: Task) => {
    const updatedStatus = !task.is_completed;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: updatedStatus } : t));

    if (updatedStatus) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      await addPoints(10);
    }

    await supabase.from('tasks').update({ is_completed: updatedStatus }).eq('id', task.id);
  };

  const deleteTask = async (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const saveDailyLog = async () => {
    if (!log) return;
    const parsedHours = parseFloat(hours) || 0;
    await supabase
      .from('daily_logs')
      .update({ hours_studied: parsedHours, blockers })
      .eq('id', log.id);

    await addPoints(Math.round(parsedHours * 20));
    alert('Log and XP updated!');
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false })
      .limit(50);
    setLeaderboard(data || []);
  };

  const loadEvents = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('study_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });
    setEvents(data || []);
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate || !user) return;

    const { data, error } = await supabase
      .from('study_events')
      .insert([{
        user_id: user.id,
        title: newEventTitle,
        start_time: new Date(newEventDate).toISOString(),
        end_time: new Date(newEventDate).toISOString(),
        tag: newEventTag,
      }])
      .select()
      .single();

    if (!error && data) {
      setEvents([...events, data]);
      setNewEventTitle('');
      setNewEventDate('');
    }
  };

  const loadAdminData = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setAllUsers(data || []);
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') loadLeaderboard();
    if (activeTab === 'calendar') loadEvents();
    if (activeTab === 'admin' && profile?.role === 'admin') loadAdminData();
  }, [activeTab]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-cyan-400 font-mono">Initializing System...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl border border-slate-800">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
              <Trophy className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-slate-100 tracking-tight">StudyQuest</h1>
          <p className="text-xs text-center text-slate-400 mb-6">Gamified Daily Planner & Cross-Device Sync</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
              required
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-lg text-sm transition shadow-lg shadow-cyan-500/20"
            >
              {authMode === 'login' ? 'Enter Academy' : 'Create Account'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs text-slate-400 mt-4 hover:text-cyan-400 transition"
          >
            {authMode === 'login' ? "New student? Sign up" : "Existing account? Sign in"}
          </button>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-lg">
              STUDYQUEST
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-400 hover:text-red-400 p-2 rounded-lg transition flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl">
                <span className="text-xs text-slate-400 uppercase font-mono">Today's Focus</span>
                <p className="text-2xl font-bold text-cyan-400 mt-1">{hours} <span className="text-xs font-normal text-slate-400">hrs</span></p>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl">
                <span className="text-xs text-slate-400 uppercase font-mono">Tasks Done</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{completedCount} <span className="text-xs font-normal text-slate-400">/ {tasks.length}</span></p>
              </div>
            </div>

            <section className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Daily Completion</span>
                <span className="font-semibold text-cyan-400">{progress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            <form onSubmit={addTask} className="space-y-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add target task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition flex items-center gap-1 shrink-0 shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="flex gap-2">
                {(['LEARN', 'APPLY', 'REVIEW'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setNewTaskTier(tier)}
                    className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition flex items-center justify-center gap-1.5 ${
                      newTaskTier === tier
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </form>

            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Today's Roadmap</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-900/20 p-4 rounded-lg border border-slate-800/60 text-center">
                  No objectives added yet.
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition ${
                      task.is_completed
                        ? 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                        : 'bg-slate-900/50 border-slate-800 text-slate-200 shadow-sm'
                    }`}
                  >
                    <div
                      onClick={() => toggleTask(task)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                      )}
                      <span className={`text-sm truncate ${task.is_completed ? 'line-through' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition ml-2 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <section className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Evening Reflection</h2>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Total Hours Studied
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Blockers / Topics to Review
                </label>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>
              <button
                onClick={saveDailyLog}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg transition border border-slate-700 shadow-md"
              >
                Save & Claim XP
              </button>
            </section>
          </div>
        )}

        {/* CALENDAR & PLANNER TAB */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl">
              <h2 className="text-sm font-bold text-slate-100 mb-4">Schedule Future Study Session</h2>
              <form onSubmit={addEvent} className="space-y-3">
                <input
                  type="text"
                  placeholder="Session Goal (e.g. Deep Learning Module 4 Exam Prep)"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                />
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
                  >
                    <option>General</option>
                    <option>Exam</option>
                    <option>Assignment</option>
                    <option>Project</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition shadow-lg shadow-cyan-600/20"
                >
                  Add to Calendar
                </button>
              </form>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">Upcoming Milestones</h3>
              {events.map((ev) => (
                <div key={ev.id} className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">{ev.title}</h4>
                    <p className="text-xs text-slate-400">{new Date(ev.start_time).toLocaleString()}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {ev.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6 rounded-2xl text-center">
              <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-slate-100">Monthly Academy Leaderboard</h2>
              <p className="text-xs text-slate-400 mt-1">Earn points by finishing tasks and logging study hours daily.</p>
            </div>

            <div className="space-y-2">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    student.id === user.id
                      ? 'bg-cyan-950/30 border-cyan-500/40 shadow-md'
                      : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-sm w-6 font-bold ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">
                        {student.display_name} {student.id === user.id && <span className="text-xs text-cyan-400">(You)</span>}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">{student.role}</p>
                    </div>
                  </div>
                  <span className="font-bold text-amber-400 text-sm">{student.points} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{profile?.display_name}</h2>
                <p className="text-xs text-slate-400">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-mono">Total Points</span>
                <p className="text-2xl font-bold text-amber-400 mt-1">{profile?.points || 0} XP</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-mono">Role Status</span>
                <p className="text-lg font-bold text-cyan-400 mt-1 capitalize">{profile?.role || 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-200">Admin Control Center</h3>
                <p className="text-xs text-slate-400">Manage registered students and oversee platform growth.</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono text-slate-400 uppercase">Registered Students ({allUsers.length})</h4>
              {allUsers.map((u) => (
                <div key={u.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{u.display_name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {u.role} | {u.points} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 py-2 px-6">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Today</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'calendar' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'leaderboard' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] font-medium">Rankings</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ShieldAlert className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}