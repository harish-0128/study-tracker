'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Send, Check, X, PhoneCall, Sparkles, Target, Award, ArrowUpRight,
  TrendingUp, CalendarCheck, ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

type TabType = 'dashboard' | 'calendar' | 'leaderboard' | 'discussions' | 'profile' | 'admin';

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
  phone?: string;
}

interface DiscussionGroup {
  id: string;
  title: string;
  description: string;
  created_by: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_name: string;
  message: string;
  created_at: string;
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

  // Calendar State
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTag, setNewEventTag] = useState('General');

  // Social & Admin State
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<any[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Profile | null>(null);

  // Discussion Groups State
  const [groups, setGroups] = useState<DiscussionGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<DiscussionGroup | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myMemberships, setMyMemberships] = useState<Record<string, string>>({});
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Phone profile state
  const [phoneNumber, setPhoneNumber] = useState('');

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
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      setPhoneNumber(data.phone || '');
    }
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
      else alert('Account registered successfully! Welcome to StudyQuest!');
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
      confetti({ 
        particleCount: 60, 
        spread: 70, 
        origin: { y: 0.75 },
        colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
      });
      await addPoints(15);
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

    await addPoints(Math.round(parsedHours * 25));
    confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
    alert('🔥 Awesome work! Progress & Daily XP claimed successfully!');
  };

  const savePhone = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({ phone: phoneNumber }).eq('id', profile.id);
    alert('WhatsApp number updated!');
  };

  // Group Methods
  const loadGroups = async () => {
    const { data: groupList } = await supabase.from('discussion_groups').select('*').order('created_at', { ascending: false });
    setGroups(groupList || []);

    if (user) {
      const { data: memberList } = await supabase.from('group_members').select('*').eq('user_id', user.id);
      const memMap: Record<string, string> = {};
      memberList?.forEach((m: any) => {
        memMap[m.group_id] = m.status;
      });
      setMyMemberships(memMap);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    const { data, error } = await supabase
      .from('discussion_groups')
      .insert([{ title: newGroupName.trim(), description: newGroupDesc.trim(), created_by: user.id }])
      .select()
      .single();

    if (!error && data) {
      setGroups([data, ...groups]);
      setNewGroupName('');
      setNewGroupDesc('');
    }
  };

  const requestToJoinGroup = async (groupId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: user.id, status: 'pending' }]);

    if (!error) {
      setMyMemberships({ ...myMemberships, [groupId]: 'pending' });
      alert('Join request sent to Admin!');
    }
  };

  const loadGroupMessages = async (group: DiscussionGroup) => {
    setActiveGroup(group);
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true });
    setGroupMessages(data || []);
  };

  const postGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeGroup || !user) return;

    const { data, error } = await supabase
      .from('group_messages')
      .insert([{
        group_id: activeGroup.id,
        user_id: user.id,
        sender_name: profile?.display_name || 'Scholar',
        message: newMessage.trim(),
      }])
      .select()
      .single();

    if (!error && data) {
      setGroupMessages([...groupMessages, data]);
      setNewMessage('');
    }
  };

  // Calendar Methods
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

  const deleteEvent = async (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    await supabase.from('study_events').delete().eq('id', id);
  };

  // Admin Methods
  const loadAdminControlData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('points', { ascending: false });
    setAllUsers(usersData || []);

    const { data: reqs } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, status, profiles:user_id(display_name, email), discussion_groups:group_id(title)')
      .eq('status', 'pending');
    setAdminRequests(reqs || []);
  };

  const updateMemberStatus = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    await supabase.from('group_members').update({ status: newStatus }).eq('id', requestId);
    setAdminRequests(adminRequests.filter(r => r.id !== requestId));
  };

  const inspectStudent = async (student: Profile) => {
    setViewingStudent(student);
    const { data } = await supabase
      .from('daily_logs')
      .select('date, hours_studied, blockers, tasks(*)')
      .eq('user_id', student.id)
      .order('date', { ascending: false })
      .limit(7);
    setSelectedStudentLogs(data || []);
  };

  const triggerWhatsAppReminder = (studentPhone: string, studentName: string) => {
    if (!studentPhone) {
      alert('Student has not added a phone number yet.');
      return;
    }
    const cleanPhone = studentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hey ${studentName}! 🚀 Quick reminder from StudyQuest: Don't break your streak! Complete your daily focus tasks and log your hours tonight.`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  useEffect(() => {
    if (activeTab === 'discussions') loadGroups();
    if (activeTab === 'calendar') loadEvents();
    if (activeTab === 'admin' && profile?.role === 'admin') loadAdminControlData();
    if (activeTab === 'leaderboard') {
      supabase.from('profiles').select('*').order('points', { ascending: false }).limit(50).then(({ data }) => setLeaderboard(data || []));
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070913] text-cyan-400 font-mono text-sm tracking-widest animate-pulse">
        <Sparkles className="w-5 h-5 mr-2 animate-spin text-purple-400" /> IGNITING STUDYQUEST...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-[#070913] via-[#0d1124] to-[#120b24]">
        <div className="w-full max-w-md rounded-3xl bg-slate-900/60 backdrop-blur-2xl p-8 border border-slate-700/60 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)]">
          <div className="flex justify-center mb-5">
            <div className="p-4 bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 shadow-inner">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 tracking-tight">
            STUDYQUEST
          </h1>
          <p className="text-xs text-center text-slate-400 mb-6 font-medium">Daily Mastery • Social Rankings • Peer Discussion</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:opacity-95 text-white font-bold rounded-xl text-sm transition shadow-[0_0_25px_rgba(168,85,247,0.4)]"
            >
              {authMode === 'login' ? 'Enter Academy 🚀' : 'Start Journey ✨'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs text-slate-400 mt-5 hover:text-cyan-300 transition"
          >
            {authMode === 'login' ? "New student? Create an account" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060814] via-[#090d20] to-[#0e071c] text-slate-100 flex flex-col font-sans">
      {/* Dynamic Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-lg">
              STUDYQUEST
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-bounce" />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>
          <button 
            onClick={handleSignOut} 
            className="text-xs text-slate-400 hover:text-red-400 p-2 rounded-xl bg-slate-900/60 border border-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 pb-36 flex-1 relative z-10">
        
        {/* TAB 1: TODAY'S DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-cyan-500/30 p-5 rounded-2xl shadow-[0_4px_20px_rgba(6,182,212,0.1)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Today's Focus</span>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-3xl font-black text-slate-100">{hours} <span className="text-sm font-normal text-slate-400">hours</span></p>
              </div>

              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl border border-emerald-500/30 p-5 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Tasks Finished</span>
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black text-slate-100">{completedCount} <span className="text-sm font-normal text-slate-400">/ {tasks.length}</span></p>
              </div>
            </div>

            {/* Glowing Progress Bar */}
            <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl space-y-2.5 shadow-lg">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Daily Mastery Level</span>
                <span className="text-cyan-400 font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            {/* New Task Entry */}
            <form onSubmit={addTask} className="space-y-3 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What will you conquer next? (e.g. Neural Net Backprop)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 rounded-xl bg-slate-950/80 border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 transition"
                />
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-bold transition flex items-center gap-1.5 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
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
                    className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all flex items-center justify-center gap-1.5 ${
                      newTaskTier === tier 
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tier === 'LEARN' && <BookOpen className="w-3.5 h-3.5 text-cyan-400" />}
                    {tier === 'APPLY' && <Code2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {tier === 'REVIEW' && <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                    {tier}
                  </button>
                ))}
              </div>
            </form>

            {/* Task Item List */}
            <div className="space-y-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-purple-400" /> Today's Action Items
              </h2>
              {tasks.length === 0 ? (
                <div className="text-sm text-slate-500 italic bg-slate-900/30 p-6 rounded-2xl border border-slate-800/80 text-center">
                  No targets configured yet. Add your first goal above!
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      task.is_completed 
                        ? 'bg-slate-950/40 border-slate-800/50 text-slate-500' 
                        : 'bg-slate-900/70 border-slate-700/80 text-slate-100 shadow-md hover:border-slate-600'
                    }`}
                  >
                    <div onClick={() => toggleTask(task)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 shrink-0 hover:text-cyan-400" />
                      )}
                      <span className={`text-sm font-medium truncate ${task.is_completed ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 p-1 transition ml-2 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Evening Reflection */}
            <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Daily Summary & Reflection
              </h2>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" /> Total Hours Studied Today
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Doubts, Blockers & Questions
                </label>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="What concepts challenged you or need revision?"
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-400 transition"
                />
              </div>
              <button 
                onClick={saveDailyLog} 
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-[0_0_20px_rgba(147,51,234,0.3)]"
              >
                Log Day & Claim XP 🔥
              </button>
            </section>
          </div>
        )}

        {/* TAB 2: CALENDAR & PLANNER */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Event Form */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-cyan-400" /> Schedule Study Milestones & Exams
              </h2>
              <form onSubmit={addEvent} className="space-y-3">
                <input
                  type="text"
                  placeholder="Event Name (e.g. Deep Learning Module 4 Exam Prep)"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400 transition"
                />
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-purple-400 transition"
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className="rounded-xl bg-slate-950/80 border border-slate-700/80 px-3 py-2 text-sm text-slate-100 outline-none"
                  >
                    <option>General</option>
                    <option>Exam</option>
                    <option>Assignment</option>
                    <option>Project</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-sm font-bold transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  Add Milestone
                </button>
              </form>
            </div>

            {/* Scheduled Milestones */}
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" /> Upcoming Study Milestones ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-900/30 p-6 rounded-2xl border border-slate-800 text-center">
                  No upcoming calendar events scheduled.
                </p>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-md">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">{ev.title}</h4>
                      <p className="text-xs text-cyan-400 font-mono mt-0.5">{new Date(ev.start_time).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                        {ev.tag}
                      </span>
                      <button onClick={() => deleteEvent(ev.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DISCUSSION GROUPS */}
        {activeTab === 'discussions' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeGroup ? (
              <div className="space-y-4">
                {profile?.role === 'admin' && (
                  <form onSubmit={createGroup} className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/30 p-5 rounded-2xl space-y-3 shadow-lg">
                    <h3 className="text-xs font-mono uppercase text-purple-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Admin: Launch New Discussion Hub
                    </h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Deep Learning & ML Q&A)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-purple-400"
                    />
                    <input
                      type="text"
                      placeholder="Hub Description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2 text-sm text-slate-100 outline-none"
                    />
                    <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl text-sm font-bold shadow-md">
                      Create Group
                    </button>
                  </form>
                )}

                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Available Study Communities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((grp) => {
                    const status = myMemberships[grp.id];
                    const isApproved = status === 'approved' || profile?.role === 'admin';
                    return (
                      <div key={grp.id} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-lg hover:border-slate-700 transition">
                        <div>
                          <h4 className="text-base font-bold text-slate-100">{grp.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{grp.description || 'Community Q&A and doubt clearance.'}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessages(grp)}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:opacity-90 transition"
                            >
                              Enter Discussion Room 💬
                            </button>
                          ) : status === 'pending' ? (
                            <span className="text-xs text-amber-400 font-mono font-semibold">⏳ Approval Pending</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                            >
                              Request Access
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col h-[600px] shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-100">{activeGroup.title}</h3>
                    <p className="text-xs text-slate-400">{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className="text-xs text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-xl bg-slate-800/60">
                    Back to Hub
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-slate-500 text-xs italic my-auto">No questions yet. Ask your question below!</p>
                  ) : (
                    groupMessages.map((msg) => (
                      <div key={msg.id} className={`p-3.5 rounded-2xl max-w-[80%] shadow-md ${msg.sender_name === profile?.display_name ? 'ml-auto bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/40' : 'bg-slate-950/80 border border-slate-800'}`}>
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className="text-xs font-bold text-cyan-400">{msg.sender_name}</span>
                          <span className="text-[10px] text-slate-500">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-slate-200">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={postGroupMessage} className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your question or solution..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400"
                  />
                  <button type="submit" className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-amber-500/30 p-6 rounded-3xl text-center shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce" />
              <h2 className="text-xl font-black text-slate-100">Monthly Scholar Leaderboard</h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">Rankings calculated by tasks finished and consistent focus hours.</p>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    student.id === user.id 
                      ? 'bg-gradient-to-r from-cyan-950/50 to-purple-950/50 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`font-mono text-sm w-7 font-black ${idx === 0 ? 'text-amber-400 text-base' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {student.display_name} {student.id === user.id && <span className="text-xs text-cyan-400 font-semibold">(You)</span>}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono capitalize">{student.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm">
                    <Flame className="w-4 h-4 fill-amber-400" />
                    <span>{student.points} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-100">{profile?.display_name}</h2>
                <p className="text-xs text-slate-400">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 font-mono">WhatsApp Number (For reminders, e.g. +919876543210)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91..."
                  className="flex-1 rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
                />
                <button onClick={savePhone} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md">
                  Save Phone
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 font-mono">Total Points</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{profile?.points || 0} XP</p>
              </div>
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 font-mono">Role Tier</span>
                <p className="text-lg font-bold text-cyan-400 mt-1 capitalize">{profile?.role || 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN CONTROL */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-200">Admin Control Center</h3>
                  <p className="text-xs text-slate-400">Approve hub access and review student activity records.</p>
                </div>
              </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg">
              <h4 className="text-xs font-mono uppercase text-amber-400 font-bold">Pending Group Requests ({adminRequests.length})</h4>
              {adminRequests.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No pending requests right now.</p>
              ) : (
                adminRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-200">{req.profiles?.display_name}</span>
                      <span className="text-xs text-slate-400"> requests to join </span>
                      <span className="text-xs text-cyan-400 font-semibold">{req.discussion_groups?.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateMemberStatus(req.id, 'approved')} className="p-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-lg hover:bg-emerald-600/30">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateMemberStatus(req.id, 'rejected')} className="p-2 bg-red-600/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-600/30">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Registered Students */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Registered Students & Analytics ({allUsers.length})</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {allUsers.map((student) => (
                  <div key={student.id} className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{student.display_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{student.email} • {student.points} XP</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => inspectStudent(student)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold border border-slate-700"
                      >
                        View Logs
                      </button>
                      <button
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Log Modal */}
            {viewingStudent && (
              <div className="bg-slate-900 border border-cyan-500/50 p-5 rounded-2xl space-y-4 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-bold text-cyan-400">Activity Report: {viewingStudent.display_name}</h4>
                  <button onClick={() => setViewingStudent(null)} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedStudentLogs.length === 0 ? (
                    <p className="text-xs text-slate-500">No logs found.</p>
                  ) : (
                    selectedStudentLogs.map((item, i) => (
                      <div key={i} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div className="flex justify-between font-mono text-slate-400">
                          <span>{item.date}</span>
                          <span className="text-cyan-400 font-bold">{item.hours_studied} hrs</span>
                        </div>
                        {item.blockers && <p className="text-amber-400/90 italic">Blocker: {item.blockers}</p>}
                        <div className="pt-1 space-y-1">
                          {item.tasks?.map((t: any) => (
                            <div key={t.id} className="text-slate-300 flex items-center gap-1.5">
                              <span>{t.is_completed ? '✅' : '⏳'}</span>
                              <span className={t.is_completed ? 'line-through text-slate-500' : ''}>{t.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar with Safe Area Insets */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/90 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-cyan-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Today</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('calendar')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'calendar' ? 'text-purple-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Planner</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('discussions')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'discussions' ? 'text-pink-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Hub</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('leaderboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'leaderboard' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Ranks</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'profile' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Profile</span>
          </button>
          
          {profile?.role === 'admin' && (
            <button 
              type="button"
              onClick={() => setActiveTab('admin')} 
              className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'admin' ? 'text-red-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ShieldAlert className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}