'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Send, Check, X, PhoneCall, Sparkles, Target, Award,
  CalendarCheck, Sun, Moon, Eye, CalendarDays, Ban, ShieldCheck,
  Megaphone, UserMinus, Edit3
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
  date?: string;
  tasks?: Task[];
}

interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: 'admin' | 'moderator' | 'student';
  points: number;
  phone?: string;
  is_blocked?: boolean;
  created_at?: string;
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
  user_id?: string;
  title: string;
  start_time: string;
  tag: string;
  is_completed: boolean;
}

interface Announcement {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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

  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  // Social & Admin State
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Profile | null>(null);
  const [studentLogs, setStudentLogs] = useState<any[]>([]);
  const [studentEvents, setStudentEvents] = useState<StudyEvent[]>([]);
  const [editPointsValue, setEditPointsValue] = useState<string>('');

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
    const savedTheme = localStorage.getItem('sq_theme') as 'dark' | 'light';
    if (savedTheme) setTheme(savedTheme);

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        await loadDailyData(currentUser.id);
        await loadAnnouncements();
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
        await loadAnnouncements();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('sq_theme', next);
  };

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      setPhoneNumber(data.phone || '');
    }
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from('platform_announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setAnnouncements(data || []);
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
    if (!profile || profile.is_blocked) return;
    const newPoints = (profile.points || 0) + pointsToAdd;
    setProfile({ ...profile, points: newPoints });
    await supabase.from('profiles').update({ points: newPoints }).eq('id', profile.id);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.is_blocked) {
      alert('Your account is blocked by Admin.');
      return;
    }
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
    if (profile?.is_blocked) return;
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
    if (!log || profile?.is_blocked) return;
    const parsedHours = parseFloat(hours) || 0;
    await supabase
      .from('daily_logs')
      .update({ hours_studied: parsedHours, blockers })
      .eq('id', log.id);

    await addPoints(Math.round(parsedHours * 25));
    confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
    alert('Progress & Daily XP claimed successfully!');
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
    if (!user || profile?.is_blocked) return;
    const { error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: user.id, status: 'pending' }]);

    if (!error) {
      setMyMemberships({ ...myMemberships, [groupId]: 'pending' });
      alert('Join request sent to Admin/Moderators!');
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
    if (!newMessage.trim() || !activeGroup || !user || profile?.is_blocked) return;

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

  // Admin & Moderation Methods
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

  const changeUserRole = async (userId: string, newRole: 'admin' | 'moderator' | 'student') => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setAllUsers(allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (viewingStudent && viewingStudent.id === userId) {
      setViewingStudent({ ...viewingStudent, role: newRole });
    }
    alert(`User role updated to ${newRole}!`);
  };

  const toggleBlockUser = async (student: Profile) => {
    const nextStatus = !student.is_blocked;
    await supabase.from('profiles').update({ is_blocked: nextStatus }).eq('id', student.id);
    setAllUsers(allUsers.map(u => u.id === student.id ? { ...u, is_blocked: nextStatus } : u));
    if (viewingStudent && viewingStudent.id === student.id) {
      setViewingStudent({ ...viewingStudent, is_blocked: nextStatus });
    }
    alert(`User has been ${nextStatus ? 'BLOCKED' : 'UNBLOCKED'}.`);
  };

  const deleteUserAccount = async (userId: string) => {
    if (!confirm('Are you sure you want to completely delete this user record from the database? This cannot be undone.')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    setAllUsers(allUsers.filter(u => u.id !== userId));
    setViewingStudent(null);
    alert('User profile deleted.');
  };

  const updateStudentPointsDirectly = async (userId: string) => {
    const pts = parseInt(editPointsValue);
    if (isNaN(pts)) return;
    await supabase.from('profiles').update({ points: pts }).eq('id', userId);
    setAllUsers(allUsers.map(u => u.id === userId ? { ...u, points: pts } : u));
    if (viewingStudent) setViewingStudent({ ...viewingStudent, points: pts });
    alert('Points updated!');
  };

  const createBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim() || !user) return;
    const { data } = await supabase
      .from('platform_announcements')
      .insert([{ message: newAnnouncement.trim(), created_by: user.id }])
      .select()
      .single();
    if (data) {
      setAnnouncements([data, ...announcements]);
      setNewAnnouncement('');
      alert('Broadcast Announcement published live to all students!');
    }
  };

  const inspectFullStudentDetails = async (student: Profile) => {
    setViewingStudent(student);
    setEditPointsValue(student.points?.toString() || '0');

    const { data: logsData } = await supabase
      .from('daily_logs')
      .select('id, date, hours_studied, blockers, tasks(*)')
      .eq('user_id', student.id)
      .order('date', { ascending: false });
    setStudentLogs(logsData || []);

    const { data: eventsData } = await supabase
      .from('study_events')
      .select('*')
      .eq('user_id', student.id)
      .order('start_time', { ascending: true });
    setStudentEvents(eventsData || []);
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
    if (activeTab === 'admin' && (profile?.role === 'admin' || profile?.role === 'moderator')) loadAdminControlData();
    if (activeTab === 'leaderboard') {
      supabase.from('profiles').select('*').order('points', { ascending: false }).limit(50).then(({ data }) => setLeaderboard(data || []));
    }
  }, [activeTab]);

  const isLight = theme === 'light';

  if (loading) {
    return (
      <div className={`flex h-screen items-center justify-center font-mono text-sm tracking-widest ${isLight ? 'bg-slate-50 text-indigo-600' : 'bg-[#070913] text-cyan-400'}`}>
        <Sparkles className="w-5 h-5 mr-2 animate-spin text-purple-500" /> LOADING STUDYQUEST...
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${isLight ? 'bg-gradient-to-br from-indigo-50 via-slate-100 to-purple-50 text-slate-900' : 'bg-gradient-to-br from-[#070913] via-[#0d1124] to-[#120b24] text-slate-100'}`}>
        <div className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl backdrop-blur-2xl ${isLight ? 'bg-white/90 border-slate-200 shadow-indigo-100' : 'bg-slate-900/60 border-slate-700/60 shadow-[0_0_50px_-12px_rgba(139,92,246,0.3)]'}`}>
          <div className="flex justify-center mb-5">
            <div className={`p-4 rounded-2xl border shadow-inner ${isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 border-purple-500/30'}`}>
              <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 tracking-tight">
            STUDYQUEST
          </h1>
          <p className={`text-xs text-center mb-6 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Daily Mastery • Social Rankings • Peer Hub</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Email</label>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500' : 'bg-slate-950/80 border-slate-700/80 text-slate-100 focus:border-cyan-400'}`}
                required
              />
            </div>
            <div>
              <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500' : 'bg-slate-950/80 border-slate-700/80 text-slate-100 focus:border-purple-400'}`}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:opacity-95 text-white font-bold rounded-xl text-sm transition shadow-lg"
            >
              {authMode === 'login' ? 'Enter Academy 🚀' : 'Start Journey ✨'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className={`w-full text-center text-xs mt-5 transition ${isLight ? 'text-slate-500 hover:text-indigo-600' : 'text-slate-400 hover:text-cyan-300'}`}
          >
            {authMode === 'login' ? "New student? Create an account" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Style helper constants
  const bgClass = isLight ? 'bg-slate-100 text-slate-900' : 'bg-gradient-to-br from-[#060814] via-[#090d20] to-[#0e071c] text-slate-100';
  const cardClass = isLight ? 'bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm' : 'bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-lg';
  const inputClass = isLight ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500' : 'bg-slate-950/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-cyan-400';
  const textMuted = isLight ? 'text-slate-500' : 'text-slate-400';

  const isStaff = profile?.role === 'admin' || profile?.role === 'moderator';

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col font-sans transition-colors duration-300`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b px-4 py-3 ${isLight ? 'bg-white/80 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-lg">
              STUDYQUEST
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-bounce" />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition ${isLight ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-700 text-amber-300 hover:bg-slate-800'}`}
              title="Toggle Light/Dark Theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleSignOut} 
              className={`text-xs p-2 rounded-xl border transition ${isLight ? 'bg-slate-100 border-slate-300 text-slate-600 hover:text-red-500' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-red-400'}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Broadcast Announcement Bar */}
      {announcements.length > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md">
          <Megaphone className="w-4 h-4 animate-bounce shrink-0" />
          <span>{announcements[0].message}</span>
        </div>
      )}

      {/* Blocked Account Warning Banner */}
      {profile?.is_blocked && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-black text-center flex items-center justify-center gap-2">
          <Ban className="w-4 h-4 shrink-0" />
          ACCOUNT BLOCKED BY ADMIN: Logging tasks and social discussions are currently suspended.
        </div>
      )}

      {/* Main Content Body */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 pb-36 flex-1 relative z-10">
        
        {/* TAB 1: TODAY'S DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-cyan-200 shadow-sm' : 'bg-slate-900/60 border-cyan-500/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-600 uppercase tracking-wider font-mono">Today's Focus</span>
                  <Clock className="w-4 h-4 text-cyan-500" />
                </div>
                <p className="text-3xl font-black">{hours} <span className={`text-sm font-normal ${textMuted}`}>hours</span></p>
              </div>

              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-900/60 border-emerald-500/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Tasks Finished</span>
                  <Target className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-black">{completedCount} <span className={`text-sm font-normal ${textMuted}`}>/ {tasks.length}</span></p>
              </div>
            </div>

            {/* Glowing Progress Bar */}
            <section className={`p-5 rounded-2xl ${cardClass} space-y-2.5`}>
              <div className="flex justify-between text-xs font-semibold">
                <span>Daily Mastery Level</span>
                <span className="text-indigo-500 font-mono">{progress}%</span>
              </div>
              <div className={`w-full rounded-full h-3 overflow-hidden p-0.5 border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-950 border-slate-800'}`}>
                <div
                  className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            {/* New Task Entry */}
            <form onSubmit={addTask} className={`p-4 sm:p-5 rounded-2xl ${cardClass} space-y-3`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What will you conquer next? (e.g. Deep Learning Project)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition ${inputClass}`}
                />
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition flex items-center gap-1.5 shrink-0 shadow-md"
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
                        ? isLight ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                        : isLight ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    {tier === 'LEARN' && <BookOpen className="w-3.5 h-3.5 text-cyan-500" />}
                    {tier === 'APPLY' && <Code2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {tier === 'REVIEW' && <RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
                    {tier}
                  </button>
                ))}
              </div>
            </form>

            {/* Task Item List */}
            <div className="space-y-2.5">
              <h2 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${textMuted}`}>
                <Target className="w-3.5 h-3.5 text-purple-500" /> Today's Action Items
              </h2>
              {tasks.length === 0 ? (
                <div className={`text-sm italic p-6 rounded-2xl text-center border ${isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900/30 border-slate-800 text-slate-500'}`}>
                  No targets configured yet. Add your first goal above!
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      task.is_completed 
                        ? isLight ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-950/40 border-slate-800/50 text-slate-500'
                        : isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900/70 border-slate-700/80 text-slate-100'
                    }`}
                  >
                    <div onClick={() => toggleTask(task)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className={`w-5 h-5 shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      )}
                      <span className={`text-sm font-medium truncate ${task.is_completed ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-red-500 p-1 transition ml-2 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Evening Reflection */}
            <section className={`p-5 rounded-2xl ${cardClass} space-y-4`}>
              <h2 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${textMuted}`}>
                <Award className="w-3.5 h-3.5 text-amber-500" /> Daily Reflection & Focus
              </h2>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" /> Total Hours Studied Today
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none transition ${inputClass}`}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Doubts, Blockers & Questions
                </label>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="What concepts challenged you or need revision?"
                  className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none transition ${inputClass}`}
                />
              </div>
              <button 
                onClick={saveDailyLog} 
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-sm transition shadow-md"
              >
                Log Day & Claim XP 🔥
              </button>
            </section>
          </div>
        )}

        {/* TAB 2: CALENDAR & PLANNER */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className={`p-5 rounded-2xl ${cardClass} space-y-4`}>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-500" /> Schedule Study Milestones & Exams
              </h2>
              <form onSubmit={addEvent} className="space-y-3">
                <input
                  type="text"
                  placeholder="Milestone (e.g. Deep Learning Module 4 Exam Prep)"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${inputClass}`}
                />
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className={`flex-1 rounded-xl px-3.5 py-2 text-sm outline-none transition ${inputClass}`}
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className={`rounded-xl px-3 py-2 text-sm outline-none ${inputClass}`}
                  >
                    <option>General</option>
                    <option>Exam</option>
                    <option>Assignment</option>
                    <option>Project</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl text-sm font-bold shadow-md hover:opacity-95 transition"
                >
                  Add Milestone
                </button>
              </form>
            </div>

            <div className="space-y-2.5">
              <h3 className={`text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${textMuted}`}>
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" /> Scheduled Milestones ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className={`text-sm italic p-6 rounded-2xl text-center border ${isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-slate-900/30 border-slate-800 text-slate-500'}`}>
                  No upcoming calendar events scheduled.
                </p>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className={`p-4 rounded-xl flex items-center justify-between border ${cardClass}`}>
                    <div>
                      <h4 className="text-sm font-bold">{ev.title}</h4>
                      <p className="text-xs text-indigo-500 font-mono mt-0.5">{new Date(ev.start_time).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold border ${isLight ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                        {ev.tag}
                      </span>
                      <button onClick={() => deleteEvent(ev.id)} className="text-slate-400 hover:text-red-500 p-1">
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
                {isStaff && (
                  <form onSubmit={createGroup} className={`p-5 rounded-2xl ${cardClass} space-y-3`}>
                    <h3 className="text-xs font-mono uppercase text-purple-500 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Staff: Launch New Discussion Hub
                    </h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Deep Learning & ML Q&A)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none ${inputClass}`}
                    />
                    <input
                      type="text"
                      placeholder="Hub Description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none ${inputClass}`}
                    />
                    <button type="submit" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md">
                      Create Group
                    </button>
                  </form>
                )}

                <h3 className={`text-[11px] font-bold uppercase tracking-wider font-mono ${textMuted}`}>Available Study Communities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((grp) => {
                    const status = myMemberships[grp.id];
                    const isApproved = status === 'approved' || isStaff;
                    return (
                      <div key={grp.id} className={`p-5 rounded-2xl flex flex-col justify-between space-y-4 ${cardClass}`}>
                        <div>
                          <h4 className="text-base font-bold">{grp.title}</h4>
                          <p className={`text-xs mt-1 ${textMuted}`}>{grp.description || 'Community Q&A and doubt clearance.'}</p>
                        </div>
                        <div className={`pt-3 border-t flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessages(grp)}
                              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition"
                            >
                              Enter Discussion Room 💬
                            </button>
                          ) : status === 'pending' ? (
                            <span className="text-xs text-amber-500 font-mono font-semibold">⏳ Approval Pending</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-semibold transition border ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'}`}
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
              <div className={`rounded-2xl flex flex-col h-[600px] shadow-2xl overflow-hidden border ${cardClass}`}>
                <div className={`p-4 border-b flex justify-between items-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <div>
                    <h3 className="font-bold">{activeGroup.title}</h3>
                    <p className={`text-xs ${textMuted}`}>{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className={`text-xs border px-3 py-1.5 rounded-xl transition ${isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-800/60 border-slate-700 text-slate-300'}`}>
                    Back to Hub
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {groupMessages.length === 0 ? (
                    <p className={`text-center text-xs italic my-auto ${textMuted}`}>No questions yet. Ask your question below!</p>
                  ) : (
                    groupMessages.map((msg) => (
                      <div key={msg.id} className={`p-3.5 rounded-2xl max-w-[80%] shadow-sm ${msg.sender_name === profile?.display_name ? (isLight ? 'ml-auto bg-indigo-50 border border-indigo-200' : 'ml-auto bg-indigo-950/70 border border-indigo-500/40') : (isLight ? 'bg-white border border-slate-200' : 'bg-slate-950 border border-slate-800')}`}>
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className="text-xs font-bold text-indigo-500">{msg.sender_name}</span>
                          <span className={`text-[10px] ${textMuted}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={postGroupMessage} className={`p-3 border-t flex gap-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <input
                    type="text"
                    placeholder="Type your question or solution..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm outline-none ${inputClass}`}
                  />
                  <button type="submit" className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg">
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
            <div className={`p-6 rounded-3xl text-center border ${isLight ? 'bg-gradient-to-r from-amber-50 via-purple-50 to-indigo-50 border-amber-200 shadow-sm' : 'bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border-amber-500/30 shadow-lg'}`}>
              <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-2 animate-bounce" />
              <h2 className="text-xl font-black">Monthly Scholar Leaderboard</h2>
              <p className={`text-xs mt-1 font-medium ${textMuted}`}>Rankings calculated by tasks finished and consistent focus hours.</p>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    student.id === user.id 
                      ? isLight ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-cyan-950/50 border-cyan-500/50'
                      : cardClass
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`font-mono text-sm w-7 font-black ${idx === 0 ? 'text-amber-500 text-base' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-slate-400'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold">
                        {student.display_name} {student.id === user.id && <span className="text-xs text-indigo-500 font-semibold">(You)</span>}
                      </h4>
                      <p className={`text-xs font-mono capitalize ${textMuted}`}>{student.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500 font-black text-sm">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    <span>{student.points} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className={`max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl space-y-6 ${cardClass}`}>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black">{profile?.display_name}</h2>
                <p className={`text-xs ${textMuted}`}>{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-bold font-mono ${textMuted}`}>WhatsApp Number (For reminders, e.g. +919876543210)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91..."
                  className={`flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none ${inputClass}`}
                />
                <button onClick={savePhone} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md">
                  Save Phone
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'}`}>
                <span className={`text-xs font-semibold font-mono ${textMuted}`}>Total Points</span>
                <p className="text-2xl font-black text-amber-500 mt-1">{profile?.points || 0} XP</p>
              </div>
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'}`}>
                <span className={`text-xs font-semibold font-mono ${textMuted}`}>Role Status</span>
                <p className="text-lg font-bold text-indigo-500 mt-1 capitalize">{profile?.role || 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN & MODERATION GOD MODE */}
        {activeTab === 'admin' && isStaff && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className={`p-5 rounded-2xl flex items-center justify-between border ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-red-800' : 'text-red-200'}`}>Staff & Admin Control Center</h3>
                  <p className={`text-xs ${textMuted}`}>Manage permissions, assign group moderators, broadcast alerts, and inspect full records.</p>
                </div>
              </div>
            </div>

            {/* Broadcast Live Announcement Form */}
            {profile?.role === 'admin' && (
              <form onSubmit={createBroadcastAnnouncement} className={`p-5 rounded-2xl ${cardClass} space-y-3`}>
                <h4 className="text-xs font-mono uppercase text-indigo-500 font-bold flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4" /> Broadcast Live Platform Alert
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Announcement message (e.g. Semester finals starting next week! Log tasks daily.)"
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    className={`flex-1 rounded-xl px-3.5 py-2 text-sm outline-none ${inputClass}`}
                  />
                  <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold shadow-md">
                    Broadcast
                  </button>
                </div>
              </form>
            )}

            {/* Pending Requests */}
            <div className={`p-5 rounded-2xl ${cardClass} space-y-3`}>
              <h4 className="text-xs font-mono uppercase text-amber-500 font-bold">Pending Group Requests ({adminRequests.length})</h4>
              {adminRequests.length === 0 ? (
                <p className={`text-xs italic ${textMuted}`}>No pending requests right now.</p>
              ) : (
                adminRequests.map((req) => (
                  <div key={req.id} className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <div>
                      <span className="text-xs font-bold">{req.profiles?.display_name}</span>
                      <span className={`text-xs ${textMuted}`}> requests to join </span>
                      <span className="text-xs text-indigo-500 font-semibold">{req.discussion_groups?.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateMemberStatus(req.id, 'approved')} className="p-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-500 rounded-lg hover:bg-emerald-600/30">
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

            {/* Registered Students List */}
            <div className="space-y-2.5">
              <h4 className={`text-[11px] font-bold uppercase tracking-wider font-mono ${textMuted}`}>Registered Students & Role Management ({allUsers.length})</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {allUsers.map((student) => (
                  <div key={student.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${cardClass}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{student.display_name}</p>
                        {student.is_blocked && <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-md">BLOCKED</span>}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${student.role === 'admin' ? 'bg-red-500/20 text-red-500' : student.role === 'moderator' ? 'bg-purple-500/20 text-purple-500' : 'bg-slate-500/20 text-slate-500'}`}>
                          {student.role}
                        </span>
                      </div>
                      <p className={`text-xs font-mono mt-0.5 ${textMuted}`}>{student.email} • {student.points} XP</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => inspectFullStudentDetails(student)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>

                      {profile?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => toggleBlockUser(student)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${student.is_blocked ? 'bg-emerald-600/20 text-emerald-500 border-emerald-500/40' : 'bg-red-600/20 text-red-500 border-red-500/40'}`}
                          >
                            {student.is_blocked ? 'Unblock' : 'Block'}
                          </button>

                          <button
                            onClick={() => deleteUserAccount(student.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 border border-slate-700/60 rounded-xl"
                            title="Purge user record"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name)}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL STUDENT INSPECTOR / MODERATOR SUITE */}
            {viewingStudent && (
              <div className={`p-6 rounded-3xl space-y-6 border shadow-2xl ${isLight ? 'bg-white border-indigo-200' : 'bg-slate-900 border-indigo-500/50'}`}>
                <div className={`flex justify-between items-center border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div>
                    <h3 className="text-base font-black text-indigo-500">Student Profile: {viewingStudent.display_name}</h3>
                    <p className={`text-xs ${textMuted}`}>Email: {viewingStudent.email} | Phone: {viewingStudent.phone || 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewingStudent(null)} className={`text-xs border px-3 py-1.5 rounded-xl ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                    Close
                  </button>
                </div>

                {/* Role Assignment & XP Adjustment */}
                {profile?.role === 'admin' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Assign Access Role</label>
                      <div className="flex gap-1.5">
                        {(['student', 'moderator', 'admin'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => changeUserRole(viewingStudent.id, r)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border capitalize transition ${viewingStudent.role === r ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Direct XP Adjustment</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editPointsValue}
                          onChange={(e) => setEditPointsValue(e.target.value)}
                          className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs text-slate-100 outline-none"
                        />
                        <button
                          onClick={() => updateStudentPointsDirectly(viewingStudent.id)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold"
                        >
                          Set XP
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section A: Student Scheduled Calendar Plans */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-mono uppercase text-indigo-500 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" /> Scheduled Milestones & Planner ({studentEvents.length})
                  </h4>
                  {studentEvents.length === 0 ? (
                    <p className={`text-xs italic ${textMuted}`}>No calendar plans or milestones scheduled yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {studentEvents.map((ev) => (
                        <div key={ev.id} className={`p-3 rounded-xl border text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                          <div className="flex justify-between font-bold">
                            <span>{ev.title}</span>
                            <span className="text-indigo-500">{ev.tag}</span>
                          </div>
                          <p className={`mt-1 font-mono ${textMuted}`}>{new Date(ev.start_time).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section B: Student Study History & Tasks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-mono uppercase text-emerald-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Study Logs & Focus History ({studentLogs.length} Days Logged)
                  </h4>
                  {studentLogs.length === 0 ? (
                    <p className={`text-xs italic ${textMuted}`}>No study history logged yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {studentLogs.map((item, i) => (
                        <div key={i} className={`p-4 rounded-xl border text-xs space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                          <div className="flex justify-between font-mono font-bold">
                            <span>Date: {item.date}</span>
                            <span className="text-indigo-500">{item.hours_studied} hrs focus</span>
                          </div>
                          {item.blockers && (
                            <p className="text-amber-500 italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                              Blocker: {item.blockers}
                            </p>
                          )}
                          <div className="space-y-1">
                            <span className="font-semibold text-slate-400 block mb-1">Tasks logged:</span>
                            {item.tasks && item.tasks.length > 0 ? (
                              item.tasks.map((t: any) => (
                                <div key={t.id} className="flex items-center gap-1.5">
                                  <span>{t.is_completed ? '✅' : '⏳'}</span>
                                  <span className={t.is_completed ? 'line-through text-slate-400' : 'font-medium'}>{t.title} ({t.tier})</span>
                                </div>
                              ))
                            ) : (
                              <p className={`italic ${textMuted}`}>No tasks attached to this day.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-2xl border-t px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl transition-colors duration-300 ${isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-950/90 border-slate-800/90 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]'}`}>
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'dashboard' ? (isLight ? 'text-indigo-600 font-bold scale-105' : 'text-cyan-400 font-bold scale-105') : textMuted}`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Today</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('calendar')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'calendar' ? 'text-purple-500 font-bold scale-105' : textMuted}`}
          >
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Planner</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('discussions')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'discussions' ? 'text-pink-500 font-bold scale-105' : textMuted}`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Hub</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('leaderboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'leaderboard' ? 'text-amber-500 font-bold scale-105' : textMuted}`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Ranks</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'profile' ? 'text-emerald-500 font-bold scale-105' : textMuted}`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Profile</span>
          </button>
          
          {isStaff && (
            <button 
              type="button"
              onClick={() => setActiveTab('admin')} 
              className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'admin' ? 'text-red-500 font-bold scale-105' : textMuted}`}
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