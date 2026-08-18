'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, Clock, AlertCircle, LogOut } from 'lucide-react';

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

export default function StudyTrackerApp() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [log, setLog] = useState<DailyLog | null>(null);
  const [hours, setHours] = useState<string>('0');
  const [blockers, setBlockers] = useState<string>('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTier, setNewTaskTier] = useState<'LEARN' | 'APPLY' | 'REVIEW'>('LEARN');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadDailyData(session.user.id);
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadDailyData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      else alert('Sign up successful! Please check your email or log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTasks([]);
    setLog(null);
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

    await supabase
      .from('tasks')
      .update({ is_completed: updatedStatus })
      .eq('id', task.id);
  };

  const deleteTask = async (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const saveDailyLog = async () => {
    if (!log) return;
    await supabase
      .from('daily_logs')
      .update({
        hours_studied: parseFloat(hours) || 0,
        blockers: blockers,
      })
      .eq('id', log.id);
    alert('Progress saved to cloud!');
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-2xl border border-slate-800">
          <h1 className="text-xl font-bold text-center mb-1 text-slate-100">Study Tracker</h1>
          <p className="text-xs text-center text-slate-400 mb-6">Cross-device sync & daily focus</p>
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
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-sm transition"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs text-slate-400 mt-4 hover:underline"
          >
            {authMode === 'login' ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'LEARN': return <BookOpen className="w-4 h-4 text-cyan-400" />;
      case 'APPLY': return <Code2 className="w-4 h-4 text-emerald-400" />;
      case 'REVIEW': return <RotateCcw className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
      {/* Top Bar */}
      <header className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Daily Study Log</h1>
          <p className="text-xs text-slate-400">{todayStr}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      {/* Progress Bar */}
      <section className="bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex justify-between text-xs text-slate-300 mb-2">
          <span>Completion: {completedCount} / {tasks.length} tasks</span>
          <span className="font-semibold text-cyan-400">{progress}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-cyan-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {/* Add Task Box */}
      <form onSubmit={addTask} className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition flex items-center gap-1 shrink-0"
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
                  ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {getTierIcon(tier)} {tier}
            </button>
          ))}
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tasks</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500 italic bg-slate-900/40 p-4 rounded-lg border border-slate-800 text-center">
            No tasks logged today yet.
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition ${
                task.is_completed
                  ? 'bg-slate-950/60 border-slate-800/60 text-slate-500'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
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
                <div className="flex items-center gap-2 truncate">
                  <span className="shrink-0">{getTierIcon(task.tier)}</span>
                  <span className={`text-sm truncate ${task.is_completed ? 'line-through' : ''}`}>
                    {task.title}
                  </span>
                </div>
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

      {/* Daily Reflection */}
      <section className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Evening Summary</h2>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> Total Hours Studied
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Doubts / Blockers
          </label>
          <textarea
            rows={2}
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="What concepts slowed you down or need extra review?"
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={saveDailyLog}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg transition border border-slate-700"
        >
          Save Daily Summary
        </button>
      </section>
    </div>
  );
}