'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Send, Check, X, PhoneCall, Sparkles, Target, Award,
  CalendarCheck, Palette, Eye, CalendarDays, Ban, ShieldCheck,
  Megaphone, UserMinus, Shield, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

type TabType = 'dashboard' | 'calendar' | 'leaderboard' | 'discussions' | 'profile' | 'admin';
type ThemeType = 'cyber' | 'light' | 'sunset' | 'emerald';

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
}

interface DiscussionGroup {
  id: string;
  title: string;
  description: string;
  created_by: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'member' | 'moderator';
  profiles?: Profile;
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
  const [theme, setTheme] = useState<ThemeType>('cyber');
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
  const [myMemberships, setMyMemberships] = useState<Record<string, { status: string; role: string }>>({});
  const [groupMembersList, setGroupMembersList] = useState<GroupMember[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Phone profile state
  const [phoneNumber, setPhoneNumber] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const savedTheme = localStorage.getItem('sq_theme') as ThemeType;
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

  const changeTheme = (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('sq_theme', newTheme);
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
      else alert('Account registered successfully! Please sign in.');
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
      alert('Your account is blocked.');
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
        origin: { y: 0.75 }
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

  // Group & Specific Moderator Methods
  const loadGroups = async () => {
    const { data: groupList } = await supabase.from('discussion_groups').select('*').order('created_at', { ascending: false });
    setGroups(groupList || []);

    if (user) {
      const { data: memberList } = await supabase.from('group_members').select('*').eq('user_id', user.id);
      const memMap: Record<string, { status: string; role: string }> = {};
      memberList?.forEach((m: any) => {
        memMap[m.group_id] = { status: m.status, role: m.role };
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
      // Auto assign creator as moderator of this group
      await supabase.from('group_members').insert([{
        group_id: data.id,
        user_id: user.id,
        status: 'approved',
        role: 'moderator'
      }]);

      setGroups([data, ...groups]);
      setNewGroupName('');
      setNewGroupDesc('');
    }
  };

  const requestToJoinGroup = async (groupId: string) => {
    if (!user || profile?.is_blocked) return;
    const { error } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: user.id, status: 'pending', role: 'member' }]);

    if (!error) {
      setMyMemberships({ ...myMemberships, [groupId]: { status: 'pending', role: 'member' } });
      alert('Join request sent to Group Moderator & Admin!');
    }
  };

  const loadGroupMessagesAndMembers = async (group: DiscussionGroup) => {
    setActiveGroup(group);
    
    // Messages
    const { data: msgData } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true });
    setGroupMessages(msgData || []);

    // Load group members & pending requests for moderators/admins
    const { data: memData } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, status, role, profiles(display_name, email)')
      .eq('group_id', group.id);
    setGroupMembersList((memData as any) || []);
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

  // Moderator specific functions for THIS active group
  const updateGroupMemberStatus = async (membershipId: string, status: 'approved' | 'rejected') => {
    await supabase.from('group_members').update({ status }).eq('id', membershipId);
    setGroupMembersList(groupMembersList.map(m => m.id === membershipId ? { ...m, status } : m));
  };

  const toggleGroupModerator = async (membershipId: string, currentRole: 'member' | 'moderator') => {
    if (profile?.role !== 'admin') {
      alert('Only platform Admins can assign group moderator privileges.');
      return;
    }
    const nextRole = currentRole === 'moderator' ? 'member' : 'moderator';
    await supabase.from('group_members').update({ role: nextRole }).eq('id', membershipId);
    setGroupMembersList(groupMembersList.map(m => m.id === membershipId ? { ...m, role: nextRole } : m));
    alert(`Member role updated to ${nextRole} for this group!`);
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

  // Admin God-Mode Methods
  const loadAdminControlData = async () => {
    const { data: usersData } = await supabase.from('profiles').select('*').order('points', { ascending: false });
    setAllUsers(usersData || []);
  };

  const changeUserPlatformRole = async (userId: string, newRole: 'admin' | 'student') => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setAllUsers(allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u));
    if (viewingStudent && viewingStudent.id === userId) {
      setViewingStudent({ ...viewingStudent, role: newRole });
    }
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
    if (!confirm('Are you sure you want to permanently delete this student record?')) return;
    await supabase.from('profiles').delete().eq('id', userId);
    setAllUsers(allUsers.filter(u => u.id !== userId));
    setViewingStudent(null);
  };

  const updateStudentPointsDirectly = async (userId: string) => {
    const pts = parseInt(editPointsValue);
    if (isNaN(pts)) return;
    await supabase.from('profiles').update({ points: pts }).eq('id', userId);
    setAllUsers(allUsers.map(u => u.id === userId ? { ...u, points: pts } : u));
    if (viewingStudent) setViewingStudent({ ...viewingStudent, points: pts });
    alert('XP updated!');
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
    if (activeTab === 'admin' && profile?.role === 'admin') loadAdminControlData();
    if (activeTab === 'leaderboard') {
      supabase.from('profiles').select('*').order('points', { ascending: false }).limit(50).then(({ data }) => setLeaderboard(data || []));
    }
  }, [activeTab]);

  // Theme Styling Engine
  const themeStyles = {
    cyber: {
      bg: 'bg-gradient-to-br from-[#060814] via-[#090d20] to-[#0e071c] text-slate-100',
      header: 'bg-slate-950/70 border-slate-800/80',
      card: 'bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-lg',
      input: 'bg-slate-950/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-cyan-400',
      btnPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white',
      accent: 'text-cyan-400',
      nav: 'bg-slate-950/90 border-slate-800/90'
    },
    light: {
      bg: 'bg-slate-100 text-slate-900',
      header: 'bg-white/80 border-slate-200',
      card: 'bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm',
      input: 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500',
      btnPrimary: 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:opacity-90 text-white',
      accent: 'text-indigo-600',
      nav: 'bg-white/95 border-slate-200'
    },
    sunset: {
      bg: 'bg-gradient-to-br from-[#1c0c0e] via-[#241113] to-[#12070a] text-amber-50',
      header: 'bg-stone-950/80 border-amber-950',
      card: 'bg-stone-900/70 backdrop-blur-xl border border-amber-900/40 shadow-lg',
      input: 'bg-stone-950/90 border border-amber-900/50 text-amber-100 placeholder-amber-700/50 focus:border-amber-500',
      btnPrimary: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:opacity-90 text-white',
      accent: 'text-amber-400',
      nav: 'bg-stone-950/95 border-amber-950'
    },
    emerald: {
      bg: 'bg-gradient-to-br from-[#061410] via-[#092019] to-[#040e0b] text-emerald-50',
      header: 'bg-slate-950/80 border-emerald-950',
      card: 'bg-emerald-950/30 backdrop-blur-xl border border-emerald-800/40 shadow-lg',
      input: 'bg-slate-950/90 border border-emerald-900/60 text-emerald-100 placeholder-emerald-700/50 focus:border-emerald-400',
      btnPrimary: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 text-white',
      accent: 'text-emerald-400',
      nav: 'bg-slate-950/95 border-emerald-950'
    }
  };

  const curTheme = themeStyles[theme];
  const isLight = theme === 'light';

  // Permission Checks for Active Discussion Room
  const isGlobalAdmin = profile?.role === 'admin';
  const isGroupModerator = activeGroup && (
    isGlobalAdmin || myMemberships[activeGroup.id]?.role === 'moderator'
  );
  const isApprovedMember = activeGroup && (
    isGlobalAdmin || myMemberships[activeGroup.id]?.status === 'approved'
  );

  if (loading) {
    return (
      <div className={`flex h-screen items-center justify-center font-mono text-sm tracking-widest ${curTheme.bg}`}>
        <Sparkles className="w-5 h-5 mr-2 animate-spin text-purple-500" /> LOADING STUDYQUEST...
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${curTheme.bg}`}>
        <div className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl backdrop-blur-2xl ${curTheme.card}`}>
          <div className="flex justify-center mb-5">
            <div className="p-4 rounded-2xl border shadow-inner bg-cyan-500/10 border-cyan-500/30">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 tracking-tight">
            STUDYQUEST
          </h1>
          <p className="text-xs text-center mb-6 font-medium text-slate-400">Daily Mastery • Group Discussion • Leaderboards</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 opacity-80">Email</label>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${curTheme.input}`}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5 opacity-80">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${curTheme.input}`}
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full py-3 font-bold rounded-xl text-sm transition shadow-lg ${curTheme.btnPrimary}`}
            >
              {authMode === 'login' ? 'Enter Academy 🚀' : 'Start Journey ✨'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs mt-5 text-slate-400 hover:opacity-80 transition"
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
    <div className={`min-h-screen ${curTheme.bg} flex flex-col font-sans transition-colors duration-300`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b px-4 py-3 ${curTheme.header}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-lg">
              STUDYQUEST
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-bounce" />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Selector Palette */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
              <button onClick={() => changeTheme('cyber')} className={`w-5 h-5 rounded-lg bg-cyan-500 ${theme === 'cyber' ? 'ring-2 ring-white' : 'opacity-60'}`} title="Cyber Dark" />
              <button onClick={() => changeTheme('light')} className={`w-5 h-5 rounded-lg bg-slate-200 ${theme === 'light' ? 'ring-2 ring-indigo-500' : 'opacity-60'}`} title="Crisp Light" />
              <button onClick={() => changeTheme('sunset')} className={`w-5 h-5 rounded-lg bg-amber-600 ${theme === 'sunset' ? 'ring-2 ring-white' : 'opacity-60'}`} title="Sunset Gold" />
              <button onClick={() => changeTheme('emerald')} className={`w-5 h-5 rounded-lg bg-emerald-500 ${theme === 'emerald' ? 'ring-2 ring-white' : 'opacity-60'}`} title="Midnight Emerald" />
            </div>

            <button 
              onClick={handleSignOut} 
              className="text-xs p-2 rounded-xl border border-white/10 hover:text-red-400 transition"
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

      {/* Blocked Account Banner */}
      {profile?.is_blocked && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-black text-center flex items-center justify-center gap-2">
          <Ban className="w-4 h-4 shrink-0" />
          ACCOUNT BLOCKED: Logging tasks and social discussions are currently suspended.
        </div>
      )}

      {/* Main Content Body */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 pb-36 flex-1 relative z-10">
        
        {/* TAB 1: TODAY'S DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border ${curTheme.card}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono opacity-75">Today's Focus</span>
                  <Clock className={`w-4 h-4 ${curTheme.accent}`} />
                </div>
                <p className="text-3xl font-black">{hours} <span className="text-sm font-normal opacity-60">hours</span></p>
              </div>

              <div className={`p-5 rounded-2xl border ${curTheme.card}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider font-mono opacity-75">Tasks Finished</span>
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black">{completedCount} <span className="text-sm font-normal opacity-60">/ {tasks.length}</span></p>
              </div>
            </div>

            {/* Glowing Progress Bar */}
            <section className={`p-5 rounded-2xl ${curTheme.card} space-y-2.5`}>
              <div className="flex justify-between text-xs font-semibold">
                <span>Daily Mastery Level</span>
                <span className={`${curTheme.accent} font-mono`}>{progress}%</span>
              </div>
              <div className="w-full rounded-full h-3 overflow-hidden p-0.5 border border-white/10 bg-black/20">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            {/* New Task Entry */}
            <form onSubmit={addTask} className={`p-4 sm:p-5 rounded-2xl ${curTheme.card} space-y-3`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What will you conquer next? (e.g. Backpropagation Math)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition ${curTheme.input}`}
                />
                <button 
                  type="submit" 
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-1.5 shrink-0 shadow-md ${curTheme.btnPrimary}`}
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
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                        : 'border-white/10 opacity-70 hover:opacity-100'
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
              <h2 className="text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 opacity-70">
                <Target className="w-3.5 h-3.5 text-purple-400" /> Today's Action Items
              </h2>
              {tasks.length === 0 ? (
                <div className={`text-sm italic p-6 rounded-2xl text-center border border-white/10 ${curTheme.card}`}>
                  No targets configured yet. Add your first goal above!
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      task.is_completed 
                        ? 'opacity-50 border-white/5 bg-black/10' 
                        : `${curTheme.card} shadow-sm`
                    }`}
                  >
                    <div onClick={() => toggleTask(task)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 opacity-40 hover:opacity-100 shrink-0" />
                      )}
                      <span className={`text-sm font-medium truncate ${task.is_completed ? 'line-through' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-50 hover:text-red-400 p-1 transition ml-2 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Evening Reflection */}
            <section className={`p-5 rounded-2xl ${curTheme.card} space-y-4`}>
              <h2 className="text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 opacity-70">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Daily Summary & Reflection
              </h2>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
                  <Clock className={`w-3.5 h-3.5 ${curTheme.accent}`} /> Total Hours Studied Today
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none transition ${curTheme.input}`}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Doubts, Blockers & Questions
                </label>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="What concepts challenged you or need revision?"
                  className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none transition ${curTheme.input}`}
                />
              </div>
              <button 
                onClick={saveDailyLog} 
                className={`w-full py-3 font-bold rounded-xl text-sm transition shadow-md ${curTheme.btnPrimary}`}
              >
                Log Day & Claim XP 🔥
              </button>
            </section>
          </div>
        )}

        {/* TAB 2: CALENDAR & PLANNER */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className={`p-5 rounded-2xl ${curTheme.card} space-y-4`}>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className={`w-4 h-4 ${curTheme.accent}`} /> Schedule Study Milestones & Exams
              </h2>
              <form onSubmit={addEvent} className="space-y-3">
                <input
                  type="text"
                  placeholder="Milestone (e.g. Deep Learning Module 4 Exam Prep)"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition ${curTheme.input}`}
                />
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className={`flex-1 rounded-xl px-3.5 py-2 text-sm outline-none transition ${curTheme.input}`}
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className={`rounded-xl px-3 py-2 text-sm outline-none ${curTheme.input}`}
                  >
                    <option>General</option>
                    <option>Exam</option>
                    <option>Assignment</option>
                    <option>Project</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-sm font-bold shadow-md transition ${curTheme.btnPrimary}`}
                >
                  Add Milestone
                </button>
              </form>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-2 opacity-70">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" /> Scheduled Milestones ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className={`text-sm italic p-6 rounded-2xl text-center border border-white/10 ${curTheme.card}`}>
                  No upcoming calendar events scheduled.
                </p>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className={`p-4 rounded-xl flex items-center justify-between border ${curTheme.card}`}>
                    <div>
                      <h4 className="text-sm font-bold">{ev.title}</h4>
                      <p className={`text-xs ${curTheme.accent} font-mono mt-0.5`}>{new Date(ev.start_time).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                        {ev.tag}
                      </span>
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-50 hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DISCUSSION GROUPS (WITH SPECIFIC GROUP MODERATORS) */}
        {activeTab === 'discussions' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeGroup ? (
              <div className="space-y-4">
                {profile?.role === 'admin' && (
                  <form onSubmit={createGroup} className={`p-5 rounded-2xl ${curTheme.card} space-y-3`}>
                    <h3 className="text-xs font-mono uppercase text-purple-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Admin: Launch New Discussion Hub
                    </h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Deep Learning & ML Q&A)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <input
                      type="text"
                      placeholder="Hub Description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className={`w-full rounded-xl px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <button type="submit" className={`px-4 py-2 rounded-xl text-sm font-bold shadow-md ${curTheme.btnPrimary}`}>
                      Create Group
                    </button>
                  </form>
                )}

                <h3 className="text-[11px] font-bold uppercase tracking-wider font-mono opacity-70">Available Study Communities</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((grp) => {
                    const membership = myMemberships[grp.id];
                    const isApproved = isGlobalAdmin || membership?.status === 'approved';
                    const isMod = isGlobalAdmin || membership?.role === 'moderator';

                    return (
                      <div key={grp.id} className={`p-5 rounded-2xl flex flex-col justify-between space-y-4 ${curTheme.card}`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-bold">{grp.title}</h4>
                            {isMod && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Moderator
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-75 mt-1">{grp.description || 'Community Q&A and doubt clearance.'}</p>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessagesAndMembers(grp)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition ${curTheme.btnPrimary}`}
                            >
                              Enter Room 💬
                            </button>
                          ) : membership?.status === 'pending' ? (
                            <span className="text-xs text-amber-400 font-mono font-semibold">⏳ Approval Pending</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition"
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
              <div className={`rounded-2xl flex flex-col h-[650px] shadow-2xl overflow-hidden border ${curTheme.card}`}>
                {/* Room Top Header */}
                <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      {activeGroup.title}
                      {isGroupModerator && <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded font-mono">MODERATOR MODE</span>}
                    </h3>
                    <p className="text-xs opacity-70">{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className="text-xs border border-white/10 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition">
                    Back to Hub
                  </button>
                </div>

                {/* Specific Group Moderator Panel */}
                {isGroupModerator && (
                  <div className="bg-purple-950/20 border-b border-purple-500/20 p-3 text-xs space-y-2">
                    <span className="font-bold font-mono text-purple-400 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Group Moderation: Members & Requests
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {groupMembersList.map((m) => (
                        <div key={m.id} className="p-2 rounded-lg bg-black/30 border border-white/10 shrink-0 flex items-center gap-2">
                          <div>
                            <p className="font-bold text-[11px]">{m.profiles?.display_name}</p>
                            <p className="text-[9px] opacity-60">{m.status} • {m.role}</p>
                          </div>
                          {m.status === 'pending' && (
                            <div className="flex gap-1">
                              <button onClick={() => updateGroupMemberStatus(m.id, 'approved')} className="p-1 bg-emerald-600 text-white rounded">
                                <Check className="w-3 h-3" />
                              </button>
                              <button onClick={() => updateGroupMemberStatus(m.id, 'rejected')} className="p-1 bg-red-600 text-white rounded">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {isGlobalAdmin && m.status === 'approved' && (
                            <button 
                              onClick={() => toggleGroupModerator(m.id, m.role)}
                              className={`text-[9px] px-1.5 py-0.5 rounded border ${m.role === 'moderator' ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/20'}`}
                            >
                              {m.role === 'moderator' ? 'Mod' : 'Make Mod'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-xs italic my-auto opacity-50">No questions yet. Ask your question below!</p>
                  ) : (
                    groupMessages.map((msg) => (
                      <div key={msg.id} className={`p-3.5 rounded-2xl max-w-[80%] shadow-sm ${msg.sender_name === profile?.display_name ? 'ml-auto bg-cyan-950/60 border border-cyan-500/40' : 'bg-black/30 border border-white/10'}`}>
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className={`text-xs font-bold ${curTheme.accent}`}>{msg.sender_name}</span>
                          <span className="text-[10px] opacity-50">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={postGroupMessage} className="p-3 border-t border-white/10 bg-black/20 flex gap-2">
                  <input
                    type="text"
                    placeholder={isApprovedMember ? "Type your question or solution..." : "Join group to post questions"}
                    disabled={!isApprovedMember}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm outline-none ${curTheme.input}`}
                  />
                  <button type="submit" disabled={!isApprovedMember} className={`p-3 rounded-xl shadow-lg ${curTheme.btnPrimary}`}>
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
            <div className={`p-6 rounded-3xl text-center border ${curTheme.card}`}>
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2 animate-bounce" />
              <h2 className="text-xl font-black">Monthly Scholar Leaderboard</h2>
              <p className="text-xs mt-1 font-medium opacity-70">Rankings calculated by tasks finished and consistent focus hours.</p>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    student.id === user.id ? 'border-cyan-500/50 bg-cyan-950/30' : curTheme.card
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`font-mono text-sm w-7 font-black ${idx === 0 ? 'text-amber-400 text-base' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'opacity-50'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold">
                        {student.display_name} {student.id === user.id && <span className={`text-xs ${curTheme.accent} font-semibold`}>(You)</span>}
                      </h4>
                      <p className="text-xs font-mono opacity-60 capitalize">{student.role}</p>
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
          <div className={`max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl space-y-6 ${curTheme.card}`}>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-md">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black">{profile?.display_name}</h2>
                <p className="text-xs opacity-70">{profile?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold font-mono opacity-80">WhatsApp Number (For reminders, e.g. +919876543210)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91..."
                  className={`flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none ${curTheme.input}`}
                />
                <button onClick={savePhone} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md">
                  Save Phone
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-black/20">
                <span className="text-xs font-semibold font-mono opacity-70">Total Points</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{profile?.points || 0} XP</p>
              </div>
              <div className="p-5 rounded-2xl border border-white/10 bg-black/20">
                <span className="text-xs font-semibold font-mono opacity-70">Role Status</span>
                <p className={`text-lg font-bold ${curTheme.accent} mt-1 capitalize`}>{profile?.role || 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN GOD MODE & FULL INSPECTION */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl flex items-center justify-between border bg-red-500/10 border-red-500/30">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-400">Admin Control & Inspection Suite</h3>
                  <p className="text-xs opacity-75">Assign group moderators, broadcast alerts, manage XP, and inspect full records.</p>
                </div>
              </div>
            </div>

            {/* Broadcast Form */}
            <form onSubmit={createBroadcastAnnouncement} className={`p-5 rounded-2xl ${curTheme.card} space-y-3`}>
              <h4 className="text-xs font-mono uppercase text-indigo-400 font-bold flex items-center gap-1.5">
                <Megaphone className="w-4 h-4" /> Broadcast Live Platform Alert
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Announcement message..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className={`flex-1 rounded-xl px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                />
                <button type="submit" className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md ${curTheme.btnPrimary}`}>
                  Broadcast
                </button>
              </div>
            </form>

            {/* Registered Students */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider font-mono opacity-70">All Registered Students ({allUsers.length})</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {allUsers.map((student) => (
                  <div key={student.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${curTheme.card}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{student.display_name}</p>
                        {student.is_blocked && <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded">BLOCKED</span>}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-white/10">
                          {student.role}
                        </span>
                      </div>
                      <p className="text-xs font-mono opacity-60 mt-0.5">{student.email} • {student.points} XP</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => inspectFullStudentDetails(student)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm ${curTheme.btnPrimary}`}
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>

                      <button
                        onClick={() => toggleBlockUser(student)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${student.is_blocked ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' : 'bg-red-600/20 text-red-400 border-red-500/40'}`}
                      >
                        {student.is_blocked ? 'Unblock' : 'Block'}
                      </button>

                      <button
                        onClick={() => deleteUserAccount(student.id)}
                        className="p-1.5 opacity-60 hover:text-red-400 border border-white/10 rounded-xl"
                        title="Purge user"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name)}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL STUDENT INSPECTOR SUITE */}
            {viewingStudent && (
              <div className={`p-6 rounded-3xl space-y-6 border shadow-2xl ${curTheme.card}`}>
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <h3 className={`text-base font-black ${curTheme.accent}`}>Student Profile: {viewingStudent.display_name}</h3>
                    <p className="text-xs opacity-60">Email: {viewingStudent.email} | Phone: {viewingStudent.phone || 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewingStudent(null)} className="text-xs border border-white/10 px-3 py-1.5 rounded-xl bg-white/5">
                    Close
                  </button>
                </div>

                {/* Platform Role & Points Adjustment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/20 border border-white/10">
                  <div>
                    <label className="text-xs font-bold opacity-80 block mb-1.5">Platform Access Role</label>
                    <div className="flex gap-1.5">
                      {(['student', 'admin'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => changeUserPlatformRole(viewingStudent.id, r)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border capitalize transition ${viewingStudent.role === r ? curTheme.btnPrimary : 'border-white/10 opacity-60'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold opacity-80 block mb-1.5">Direct XP Adjustment</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editPointsValue}
                        onChange={(e) => setEditPointsValue(e.target.value)}
                        className={`flex-1 rounded-lg px-3 py-1 text-xs outline-none ${curTheme.input}`}
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

                {/* Scheduled Calendar Plans */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-mono uppercase text-indigo-400 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4" /> Scheduled Milestones ({studentEvents.length})
                  </h4>
                  {studentEvents.length === 0 ? (
                    <p className="text-xs italic opacity-50">No calendar milestones scheduled.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {studentEvents.map((ev) => (
                        <div key={ev.id} className="p-3 rounded-xl border border-white/10 text-xs bg-black/20">
                          <div className="flex justify-between font-bold">
                            <span>{ev.title}</span>
                            <span className={curTheme.accent}>{ev.tag}</span>
                          </div>
                          <p className="mt-1 font-mono opacity-60">{new Date(ev.start_time).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Focus Logs & Tasks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold font-mono uppercase text-emerald-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Study Logs & Focus History ({studentLogs.length} Days)
                  </h4>
                  {studentLogs.length === 0 ? (
                    <p className="text-xs italic opacity-50">No study history recorded.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {studentLogs.map((item, i) => (
                        <div key={i} className="p-4 rounded-xl border border-white/10 text-xs space-y-2 bg-black/20">
                          <div className="flex justify-between font-mono font-bold">
                            <span>Date: {item.date}</span>
                            <span className={curTheme.accent}>{item.hours_studied} hrs</span>
                          </div>
                          {item.blockers && (
                            <p className="text-amber-400 italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                              Blocker: {item.blockers}
                            </p>
                          )}
                          <div className="space-y-1">
                            <span className="font-semibold opacity-70 block mb-1">Tasks:</span>
                            {item.tasks && item.tasks.length > 0 ? (
                              item.tasks.map((t: any) => (
                                <div key={t.id} className="flex items-center gap-1.5">
                                  <span>{t.is_completed ? '✅' : '⏳'}</span>
                                  <span className={t.is_completed ? 'line-through opacity-50' : 'font-medium'}>{t.title} ({t.tier})</span>
                                </div>
                              ))
                            ) : (
                              <p className="italic opacity-50">No tasks attached to this day.</p>
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
      <nav className={`fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-2xl border-t px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl transition-colors duration-300 ${curTheme.nav}`}>
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'dashboard' ? `${curTheme.accent} font-bold scale-105` : 'opacity-60 hover:opacity-100'}`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Today</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('calendar')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'calendar' ? 'text-purple-400 font-bold scale-105' : 'opacity-60 hover:opacity-100'}`}
          >
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Planner</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('discussions')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'discussions' ? 'text-pink-400 font-bold scale-105' : 'opacity-60 hover:opacity-100'}`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Hub</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('leaderboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'leaderboard' ? 'text-amber-400 font-bold scale-105' : 'opacity-60 hover:opacity-100'}`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Ranks</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'profile' ? 'text-emerald-400 font-bold scale-105' : 'opacity-60 hover:opacity-100'}`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Profile</span>
          </button>
          
          {profile?.role === 'admin' && (
            <button 
              type="button"
              onClick={() => setActiveTab('admin')} 
              className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-xl transition-all ${activeTab === 'admin' ? 'text-red-500 font-bold scale-105' : 'opacity-60 hover:opacity-100'}`}
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