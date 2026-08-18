'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Send, Check, X, PhoneCall, Sparkles, Target, Award,
  CalendarCheck, Palette, Eye, CalendarDays, Ban, ShieldCheck,
  Megaphone, UserMinus, Shield, Cake, PartyPopper, History,
  TrendingUp, CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';

const APP_NAME = "SYNAPSE";

type TabType = 'dashboard' | 'calendar' | 'leaderboard' | 'discussions' | 'profile' | 'admin';
type ThemeType = 'slate' | 'obsidian' | 'porcelain' | 'nordic' | 'birthday';

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
  display_name?: string;
  role: 'admin' | 'moderator' | 'student';
  points: number;
  phone?: string;
  is_blocked?: boolean;
  preferred_theme?: string;
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

const themeStyles: Record<string, {
  bg: string;
  header: string;
  card: string;
  input: string;
  btnPrimary: string;
  accent: string;
  nav: string;
  isLight: boolean;
}> = {
  slate: {
    bg: 'bg-[#0b0f19] text-slate-100',
    header: 'bg-slate-900/90 border-slate-800',
    card: 'bg-slate-900/70 border border-slate-800/80 shadow-md',
    input: 'bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500',
    btnPrimary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
    accent: 'text-blue-400',
    nav: 'bg-slate-950/95 border-slate-800',
    isLight: false
  },
  obsidian: {
    bg: 'bg-[#080808] text-neutral-100',
    header: 'bg-neutral-900/90 border-neutral-800',
    card: 'bg-neutral-900/60 border border-neutral-800 shadow-md',
    input: 'bg-neutral-950 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:border-emerald-500',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm',
    accent: 'text-emerald-400',
    nav: 'bg-neutral-950/95 border-neutral-800',
    isLight: false
  },
  porcelain: {
    bg: 'bg-[#f4f6fa] text-slate-900',
    header: 'bg-white/90 border-slate-200 shadow-sm',
    card: 'bg-white border border-slate-200 shadow-sm',
    input: 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    accent: 'text-blue-600',
    nav: 'bg-white/95 border-slate-200 shadow-sm',
    isLight: true
  },
  nordic: {
    bg: 'bg-[#f7f4ef] text-stone-900',
    header: 'bg-[#ede8e1]/90 border-stone-200 shadow-sm',
    card: 'bg-white border border-stone-200/80 shadow-sm',
    input: 'bg-[#f4efe8] border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-700',
    btnPrimary: 'bg-stone-800 hover:bg-stone-900 text-white shadow-sm',
    accent: 'text-amber-700',
    nav: 'bg-[#ede8e1]/95 border-stone-200 shadow-sm',
    isLight: true
  },
  birthday: {
    bg: 'bg-[#18111e] text-pink-50',
    header: 'bg-[#22162c]/90 border-pink-900/50',
    card: 'bg-[#22162c]/60 border border-pink-900/40 shadow-sm',
    input: 'bg-[#140c1a] border border-pink-900/60 text-pink-100 placeholder-pink-300/40 focus:border-pink-500',
    btnPrimary: 'bg-pink-600 hover:bg-pink-500 text-white shadow-sm',
    accent: 'text-pink-400',
    nav: 'bg-[#18111e]/95 border-pink-900/50',
    isLight: false
  }
};

const normalizeTheme = (t?: string): ThemeType => {
  if (t === 'cyber') return 'slate';
  if (t === 'light') return 'porcelain';
  if (t === 'sunset') return 'nordic';
  if (t === 'emerald') return 'obsidian';
  if (t === 'birthday') return 'birthday';
  if (t && themeStyles[t]) return t as ThemeType;
  return 'slate';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [theme, setTheme] = useState<ThemeType>('slate');
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

  // Student Past Logs
  const [myPastLogs, setMyPastLogs] = useState<DailyLog[]>([]);

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
    try {
      const savedTheme = localStorage.getItem('sq_theme');
      if (savedTheme) setTheme(normalizeTheme(savedTheme));
    } catch (_) {}

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchUserProfile(currentUser.id);
          await loadDailyData(currentUser.id);
          await loadMyPastLogs(currentUser.id);
          await loadAnnouncements();
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.id);
        await loadDailyData(currentUser.id);
        await loadMyPastLogs(currentUser.id);
        await loadAnnouncements();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      setPhoneNumber(data.phone || '');
      const cleanTheme = normalizeTheme(data.preferred_theme);
      setTheme(cleanTheme);
      try {
        localStorage.setItem('sq_theme', cleanTheme);
      } catch (_) {}
    }
  };

  const changeTheme = async (newTheme: ThemeType) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('sq_theme', newTheme);
    } catch (_) {}
    if (profile) {
      setProfile({ ...profile, preferred_theme: newTheme });
      await supabase.from('profiles').update({ preferred_theme: newTheme }).eq('id', profile.id);
    }
  };

  const setStudentThemeSurprise = async (studentId: string, surpriseTheme: ThemeType) => {
    await supabase.from('profiles').update({ preferred_theme: surpriseTheme }).eq('id', studentId);
    setAllUsers(allUsers.map(u => u.id === studentId ? { ...u, preferred_theme: surpriseTheme } : u));
    if (viewingStudent && viewingStudent.id === studentId) {
      setViewingStudent({ ...viewingStudent, preferred_theme: surpriseTheme });
    }
    alert(`Surprise theme applied!`);
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

  const loadMyPastLogs = async (userId: string) => {
    const { data } = await supabase
      .from('daily_logs')
      .select('id, date, hours_studied, blockers, tasks(*)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(14);
    setMyPastLogs(data || []);
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
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.75 } });
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
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    if (user) await loadMyPastLogs(user.id);
    alert('Daily focus log and XP saved!');
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
      alert('Join request submitted.');
    }
  };

  const loadGroupMessagesAndMembers = async (group: DiscussionGroup) => {
    setActiveGroup(group);
    
    const { data: msgData } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: true });
    setGroupMessages(msgData || []);

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
        sender_name: profile?.display_name || profile?.email?.split('@')[0] || 'Scholar',
        message: newMessage.trim(),
      }])
      .select()
      .single();

    if (!error && data) {
      setGroupMessages([...groupMessages, data]);
      setNewMessage('');
    }
  };

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
    alert(`Role updated to ${nextRole}!`);
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
    if (!confirm('Permanently delete this student profile?')) return;
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
    alert('Points saved.');
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
      alert('Announcement posted.');
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
      alert('No phone number configured for this student.');
      return;
    }
    const cleanPhone = studentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hey ${studentName}! Friendly reminder from ${APP_NAME} to log your tasks and focus hours tonight! 🚀`);
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

  const curTheme = themeStyles[theme] || themeStyles.slate;
  const isLight = curTheme.isLight;

  const isGlobalAdmin = profile?.role === 'admin';
  const isGroupModerator = activeGroup && (
    isGlobalAdmin || myMemberships[activeGroup.id]?.role === 'moderator'
  );
  const isApprovedMember = activeGroup && (
    isGlobalAdmin || myMemberships[activeGroup.id]?.status === 'approved'
  );

  const displayNameDisplay = profile?.display_name || profile?.email?.split('@')[0] || 'User';
  const avatarLetter = (displayNameDisplay.charAt(0) || 'U').toUpperCase();

  if (loading) {
    return (
      <div className={`flex h-screen items-center justify-center font-mono text-sm tracking-widest ${curTheme.bg}`}>
        <Sparkles className="w-5 h-5 mr-2 animate-spin text-blue-500" /> INITIALIZING {APP_NAME}...
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${curTheme.bg}`}>
        <div className={`w-full max-w-md rounded-2xl p-8 border shadow-lg ${curTheme.card}`}>
          <div className="flex justify-center mb-5">
            <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/60 border-slate-700'}`}>
              <Sparkles className={`w-6 h-6 ${curTheme.accent}`} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center tracking-tight mb-1">
            {APP_NAME}
          </h1>
          <p className="text-xs text-center mb-6 opacity-60">Academic Mastery & Peer Hub</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1 opacity-75">Email</label>
              <input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1 opacity-75">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full py-2.5 font-semibold rounded-lg text-sm transition ${curTheme.btnPrimary}`}
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs mt-4 opacity-60 hover:opacity-100 transition"
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
    <div className={`min-h-screen ${curTheme.bg} flex flex-col font-sans transition-colors duration-200 antialiased`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 ${curTheme.header}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold tracking-tight text-base sm:text-lg flex items-center gap-1.5">
              {theme === 'birthday' && <Cake className="w-4 h-4 text-pink-400" />}
              {APP_NAME}
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs opacity-60 hidden sm:inline-block font-mono">{displayNameDisplay}</span>
            <button 
              onClick={handleSignOut} 
              className="text-xs p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-red-500 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Broadcast Announcement Bar */}
      {announcements.length > 0 && (
        <div className={`px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b ${isLight ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-blue-950/50 text-blue-200 border-blue-900/50'}`}>
          <Megaphone className="w-3.5 h-3.5 shrink-0" />
          <span>{announcements[0].message}</span>
        </div>
      )}

      {/* Subtle Birthday Notification Banner */}
      {theme === 'birthday' && (
        <div className="bg-pink-950/40 border-b border-pink-900/50 text-pink-200 px-4 py-1.5 text-xs font-medium text-center flex items-center justify-center gap-2">
          <PartyPopper className="w-3.5 h-3.5 text-pink-400" />
          Happy Birthday! Wishing you focus and success in your studies this year.
        </div>
      )}

      {/* Blocked Account Banner */}
      {profile?.is_blocked && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2">
          <Ban className="w-4 h-4 shrink-0" />
          Account suspended. Task logs and community access are currently restricted.
        </div>
      )}

      {/* Main Content Area - pb-48 ensures full scroll clearance past the bottom navigation */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 pb-48 sm:pb-56 flex-1">
        
        {/* TAB 1: TODAY'S FOCUS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Stat Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-5 rounded-xl ${curTheme.card}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Today's Focus
                </span>
                <p className="text-3xl font-bold mt-1">{hours} <span className="text-sm font-normal opacity-60">hours</span></p>
              </div>

              <div className={`p-5 rounded-xl ${curTheme.card}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" /> Tasks Finished
                </span>
                <p className="text-3xl font-bold mt-1">{completedCount} <span className="text-sm font-normal opacity-60">/ {tasks.length}</span></p>
              </div>

              <div className={`p-5 rounded-xl ${curTheme.card}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Daily Progress
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <p className="text-3xl font-bold">{progress}%</p>
                  <span className="text-xs opacity-60 font-mono">Status: {progress === 100 ? 'Mastered 🎯' : 'In Progress'}</span>
                </div>
                <div className={`w-full rounded-full h-1.5 overflow-hidden mt-3 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                  <div
                    className={`h-full transition-all duration-300 ${isLight ? 'bg-blue-600' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Main Laptop 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Columns: Action Roadmap & Daily Reflection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Task Add Form */}
                <form onSubmit={addTask} className={`p-5 rounded-xl ${curTheme.card} space-y-3`}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="What are you studying next? (e.g. Backprop Math / Assignment 3)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className={`flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none transition ${curTheme.input}`}
                    />
                    <button 
                      type="submit" 
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-1 shrink-0 ${curTheme.btnPrimary}`}
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
                        className={`flex-1 py-1.5 text-xs rounded-md border font-medium transition ${
                          newTaskTier === tier 
                            ? (isLight ? 'bg-slate-900 text-white border-slate-900 font-bold' : 'bg-slate-100 text-slate-900 border-slate-100 font-bold')
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </form>

                {/* Task List */}
                <div className="space-y-2.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">
                    Today's Roadmap ({tasks.length})
                  </h2>
                  {tasks.length === 0 ? (
                    <div className={`text-xs italic p-6 rounded-xl text-center opacity-60 ${curTheme.card}`}>
                      No objectives configured for today. Add your target tasks above!
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition ${                           task.is_completed ? 'opacity-40' : ''                         } ${curTheme.card}`}
                      >
                        <div onClick={() => toggleTask(task)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          {task.is_completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 opacity-40 hover:opacity-100 shrink-0" />
                          )}
                          <span className={`text-sm truncate font-medium ${task.is_completed ? 'line-through' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-inherit opacity-60">
                            {task.tier}
                          </span>
                          <button onClick={() => deleteTask(task.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Evening Log & Reflection Form */}
                <section className={`p-5 rounded-xl ${curTheme.card} space-y-4`}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Evening Reflection & Hours
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1 text-xs mb-1 font-medium opacity-80">
                        <Clock className="w-3.5 h-3.5" /> Total Hours Studied
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs mb-1 font-medium opacity-80">
                        <AlertCircle className="w-3.5 h-3.5" /> Doubts & Blockers
                      </label>
                      <textarea
                        rows={1}
                        value={blockers}
                        onChange={(e) => setBlockers(e.target.value)}
                        placeholder="Any doubts today?"
                        className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={saveDailyLog} 
                    className={`w-full py-3 font-bold rounded-xl text-sm transition shadow-md ${curTheme.btnPrimary}`}
                  >
                    Save Reflection & Claim XP 🔥
                  </button>
                </section>
              </div>

              {/* Right 1 Column: Student's Past History Feed */}
              <div className="space-y-4">
                <div className={`p-5 rounded-xl ${curTheme.card} space-y-4`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-75 flex items-center gap-1.5">
                    <History className="w-4 h-4" /> My Past Study Logs
                  </h3>
                  
                  {myPastLogs.length === 0 ? (
                    <p className="text-xs italic opacity-40 py-4 text-center">No previous logs recorded yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {myPastLogs.map((past, i) => (
                        <div key={i} className={`p-3 rounded-lg border border-inherit text-xs space-y-1.5 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                          <div className="flex justify-between font-mono font-semibold">
                            <span>{past.date}</span>
                            <span className={curTheme.accent}>{past.hours_studied} hrs</span>
                          </div>
                          {past.blockers && (
                            <p className="text-[11px] opacity-75 italic">Blocker: {past.blockers}</p>
                          )}
                          <div className="space-y-0.5 pt-1">
                            {past.tasks && past.tasks.length > 0 ? (
                              past.tasks.map((t) => (
                                <div key={t.id} className="flex items-center gap-1 text-[11px] opacity-75">
                                  <span>{t.is_completed ? '✓' : '•'}</span>
                                  <span className={t.is_completed ? 'line-through opacity-60' : ''}>{t.title}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] opacity-40">No tasks logged</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CALENDAR & PLANNER */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className={`p-5 rounded-xl ${curTheme.card} space-y-3`}>
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 opacity-70" /> Schedule Study Milestones & Exam Deadlines
              </h2>
              <form onSubmit={addEvent} className="space-y-3">
                <input
                  type="text"
                  placeholder="Event goal (e.g. Deep Learning Module 4 Exam Prep)"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition ${curTheme.input}`}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className={`w-full rounded-lg px-3.5 py-2 text-sm outline-none transition ${curTheme.input}`}
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                  >
                    <option>General</option>
                    <option>Exam</option>
                    <option>Assignment</option>
                    <option>Project</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition ${curTheme.btnPrimary}`}
                >
                  Add to Study Calendar
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">
                Upcoming Milestones ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className={`text-xs italic p-6 rounded-xl text-center opacity-60 ${curTheme.card}`}>
                  No calendar milestones scheduled.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {events.map((ev) => (
                    <div key={ev.id} className={`p-4 rounded-xl flex items-center justify-between ${curTheme.card}`}>
                      <div>
                        <h4 className="text-sm font-semibold">{ev.title}</h4>
                        <p className="text-xs opacity-60 font-mono mt-0.5">{new Date(ev.start_time).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded border font-medium ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                          {ev.tag}
                        </span>
                        <button onClick={() => deleteEvent(ev.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DISCUSSION GROUPS */}
        {activeTab === 'discussions' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {!activeGroup ? (
              <div className="space-y-5">
                {profile?.role === 'admin' && (
                  <form onSubmit={createGroup} className={`p-5 rounded-xl ${curTheme.card} space-y-3`}>
                    <h3 className="text-xs font-mono uppercase font-semibold opacity-75">
                      Admin: Create New Community Hub
                    </h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Deep Learning Discussion Room)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full rounded-lg px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <input
                      type="text"
                      placeholder="Hub Description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className={`w-full rounded-lg px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-medium ${curTheme.btnPrimary}`}>
                      Launch Community
                    </button>
                  </form>
                )}

                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">Active Study Communities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {groups.map((grp) => {
                    const membership = myMemberships[grp.id];
                    const isApproved = isGlobalAdmin || membership?.status === 'approved';
                    const isMod = isGlobalAdmin || membership?.role === 'moderator';

                    return (
                      <div key={grp.id} className={`p-5 rounded-xl flex flex-col justify-between space-y-4 ${curTheme.card}`}>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-base font-bold">{grp.title}</h4>
                            {isMod && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-950/60 text-blue-300 border-blue-800'}`}>
                                Moderator
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-60">{grp.description || 'Community Q&A and doubt resolution.'}</p>
                        </div>
                        <div className="pt-3 border-t border-inherit flex items-center justify-between">
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessagesAndMembers(grp)}
                              className={`w-full py-2 rounded-lg text-xs font-medium transition text-center ${curTheme.btnPrimary}`}
                            >
                              Enter Discussion
                            </button>
                          ) : membership?.status === 'pending' ? (
                            <span className="text-xs text-amber-500 font-mono mx-auto">Pending Approval</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className={`w-full py-2 border rounded-lg text-xs font-medium transition ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}
                            >
                              Request to Join
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`rounded-xl flex flex-col h-[650px] border ${curTheme.card} overflow-hidden`}>
                <div className="p-4 border-b border-inherit flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      {activeGroup.title}
                      {isGroupModerator && <span className="text-[10px] opacity-60 font-mono">(Moderator Mode)</span>}
                    </h3>
                    <p className="text-xs opacity-60">{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className="text-xs border border-inherit px-3 py-1.5 rounded-lg opacity-75 hover:opacity-100">
                    Back to Hubs
                  </button>
                </div>

                {isGroupModerator && (
                  <div className={`p-3 border-b border-inherit text-xs space-y-2 ${isLight ? 'bg-slate-50' : 'bg-slate-900/40'}`}>
                    <span className="font-semibold text-xs opacity-75 block">Member Access & Requests:</span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {groupMembersList.map((m) => (
                        <div key={m.id} className={`p-2 rounded-lg border border-inherit text-xs shrink-0 flex items-center gap-2 ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
                          <div>
                            <span className="font-semibold">{m.profiles?.display_name || m.profiles?.email?.split('@')[0]}</span>
                            <span className="opacity-50 text-[10px] ml-1">({m.status})</span>
                          </div>
                          {m.status === 'pending' && (
                            <div className="flex gap-1">
                              <button onClick={() => updateGroupMemberStatus(m.id, 'approved')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => updateGroupMemberStatus(m.id, 'rejected')} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {isGlobalAdmin && m.status === 'approved' && (
                            <button 
                              onClick={() => toggleGroupModerator(m.id, m.role)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border border-inherit ${m.role === 'moderator' ? 'bg-blue-600 text-white' : ''}`}
                            >
                              {m.role === 'moderator' ? 'Mod' : 'Make Mod'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-xs italic my-auto opacity-40">No messages yet. Ask a question or post notes!</p>
                  ) : (
                    groupMessages.map((msg) => (
                      <div key={msg.id} className={`p-3 rounded-xl max-w-[80%] text-xs ${msg.sender_name === displayNameDisplay ? (isLight ? 'ml-auto bg-blue-50 border border-blue-200' : 'ml-auto bg-blue-950/60 border border-blue-800') : (isLight ? 'bg-slate-50 border border-slate-200' : 'bg-slate-900 border border-slate-800')}`}>
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className="font-bold opacity-90">{msg.sender_name}</span>
                          <span className="text-[10px] opacity-50">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={postGroupMessage} className="p-3 border-t border-inherit flex gap-2">
                  <input
                    type="text"
                    placeholder={isApprovedMember ? "Type a question or answer..." : "Join group to participate"}
                    disabled={!isApprovedMember}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={`flex-1 rounded-lg px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                  />
                  <button type="submit" disabled={!isApprovedMember} className={`px-4 py-2 rounded-lg ${curTheme.btnPrimary}`}>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className={`p-6 rounded-xl text-center ${curTheme.card}`}>
              <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold">Monthly Rankings & Leaderboard</h2>
              <p className="text-xs opacity-60">Consistency scores computed by completed study tasks and logged focus hours.</p>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    student.id === user.id ? (isLight ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-slate-800/80 border-slate-700 font-medium') : curTheme.card
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono text-sm w-6 font-bold opacity-60">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold">
                        {student.display_name || student.email.split('@')[0]} {student.id === user.id && <span className={`text-xs ${curTheme.accent}`}>(You)</span>}
                      </h4>
                      <p className="text-xs opacity-60 capitalize">{student.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-sm opacity-90">
                    <Flame className="w-4 h-4 text-amber-500 fill-current" />
                    <span>{student.points} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & PAST STUDY HISTORY */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className={`p-6 rounded-xl ${curTheme.card} flex flex-col sm:flex-row items-center justify-between gap-4`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border ${isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-100 border-slate-700'}`}>
                  {avatarLetter}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{displayNameDisplay}</h2>
                  <p className="text-xs opacity-60">{profile?.email}</p>
                </div>
              </div>
              <div className="flex gap-4 text-center">
                <div className="px-4 py-2 rounded-lg border border-inherit">
                  <span className="text-[10px] font-mono opacity-60 block">ACCUMULATED XP</span>
                  <span className="text-lg font-bold text-amber-500">{profile?.points || 0}</span>
                </div>
                <div className="px-4 py-2 rounded-lg border border-inherit">
                  <span className="text-[10px] font-mono opacity-60 block">ROLE STATUS</span>
                  <span className="text-lg font-bold capitalize">{profile?.role || 'Student'}</span>
                </div>
              </div>
            </div>

            {/* 2 Light + 2 Dark Theme Switcher */}
            <div className={`p-5 rounded-xl border border-inherit ${curTheme.card} space-y-3`}>
              <label className="text-xs font-semibold font-mono uppercase opacity-75 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Appearance Preferences
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => changeTheme('slate')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'slate' ? 'border-blue-500 bg-blue-500/10 font-bold' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600" />
                    <span className="text-xs">Deep Slate</span>
                  </div>
                  <p className="text-[10px] opacity-50">Dark 1 (Graphite)</p>
                </button>

                <button
                  type="button"
                  onClick={() => changeTheme('obsidian')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'obsidian' ? 'border-emerald-500 bg-emerald-500/10 font-bold' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-neutral-700" />
                    <span className="text-xs">Obsidian</span>
                  </div>
                  <p className="text-[10px] opacity-50">Dark 2 (OLED)</p>
                </button>

                <button
                  type="button"
                  onClick={() => changeTheme('porcelain')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'porcelain' ? 'border-blue-600 bg-blue-50 font-bold text-slate-900' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300" />
                    <span className="text-xs">Porcelain</span>
                  </div>
                  <p className="text-[10px] opacity-50">Light 1 (Minimal)</p>
                </button>

                <button
                  type="button"
                  onClick={() => changeTheme('nordic')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'nordic' ? 'border-amber-700 bg-amber-50 font-bold text-stone-900' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f4f0eb] border border-stone-300" />
                    <span className="text-xs">Nordic Sand</span>
                  </div>
                  <p className="text-[10px] opacity-50">Light 2 (Warm)</p>
                </button>
              </div>
            </div>

            {/* WhatsApp Setting */}
            <div className={`p-5 rounded-xl border border-inherit ${curTheme.card} space-y-2`}>
              <label className="text-xs font-semibold font-mono opacity-75">WhatsApp Contact for Daily Study Alerts</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91..."
                  className={`flex-1 rounded-lg px-3.5 py-2 text-sm outline-none ${curTheme.input}`}
                />
                <button onClick={savePhone} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium">
                  Save Contact
                </button>
              </div>
            </div>

            {/* Student Full Past Log Timeline */}
            <div className={`p-5 rounded-xl border border-inherit ${curTheme.card} space-y-3`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-75 flex items-center gap-1.5">
                <History className="w-4 h-4" /> Full Study Log Timeline
              </h3>
              {myPastLogs.length === 0 ? (
                <p className="text-xs italic opacity-40 text-center py-4">No past logs found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myPastLogs.map((past, i) => (
                    <div key={i} className={`p-3.5 rounded-lg border border-inherit text-xs space-y-1.5 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                      <div className="flex justify-between font-mono font-bold">
                        <span>{past.date}</span>
                        <span className={curTheme.accent}>{past.hours_studied} hrs</span>
                      </div>
                      {past.blockers && (
                        <p className="text-[11px] opacity-75 italic">Blocker: {past.blockers}</p>
                      )}
                      <div className="space-y-0.5 pt-1">
                        {past.tasks && past.tasks.length > 0 ? (
                          past.tasks.map((t) => (
                            <div key={t.id} className="flex items-center gap-1 text-[11px] opacity-75">
                              <span>{t.is_completed ? '✓' : '•'}</span>
                              <span className={t.is_completed ? 'line-through opacity-60' : ''}>{t.title}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] opacity-40">No tasks logged</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN CONTROL & INSPECTOR */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className={`p-4 rounded-xl flex items-center justify-between border ${isLight ? 'bg-red-50 border-red-200 text-red-900' : 'bg-red-950/30 border-red-900/50 text-red-200'}`}>
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold">Admin Control Center</h3>
                  <p className="text-xs opacity-75">Manage student permissions, assign group moderators, and broadcast platform alerts.</p>
                </div>
              </div>
            </div>

            {/* Broadcast Form */}
            <form onSubmit={createBroadcastAnnouncement} className={`p-4 rounded-xl ${curTheme.card} space-y-2.5`}>
              <h4 className="text-xs font-mono uppercase font-semibold opacity-75 flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5" /> Broadcast Global Announcement
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Broadcast message to all students..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                />
                <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-medium ${curTheme.btnPrimary}`}>
                  Publish
                </button>
              </div>
            </form>

            {/* Student Directory */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">
                Registered Students Directory ({allUsers.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {allUsers.map((student) => (
                  <div key={student.id} className={`p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${curTheme.card}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{student.display_name || student.email.split('@')[0]}</p>
                        {student.is_blocked && <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded uppercase border border-inherit">
                          {student.role}
                        </span>
                        {student.preferred_theme === 'birthday' && (
                          <span className="text-[10px] text-pink-500 font-medium">🎂 Birthday Theme Active</span>
                        )}
                      </div>
                      <p className="text-xs opacity-60 font-mono">{student.email} • {student.points} XP</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => inspectFullStudentDetails(student)}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${curTheme.btnPrimary}`}
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() => toggleBlockUser(student)}
                        className={`px-2.5 py-1 rounded-md text-xs border border-inherit ${student.is_blocked ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {student.is_blocked ? 'Unblock' : 'Block'}
                      </button>

                      <button
                        onClick={() => deleteUserAccount(student.id)}
                        className="p-1 opacity-50 hover:opacity-100 hover:text-red-500"
                        title="Delete user"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name || student.email.split('@')[0])}
                        className="px-2.5 py-1 bg-emerald-600/20 text-emerald-600 rounded-md text-xs font-medium border border-emerald-500/30 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL STUDENT INSPECTOR MODAL */}
            {viewingStudent && (
              <div className={`p-5 sm:p-6 rounded-xl space-y-4 border shadow-xl ${curTheme.card}`}>
                <div className="flex justify-between items-center border-b border-inherit pb-3">
                  <div>
                    <h3 className="text-sm font-bold">Profile Inspector: {viewingStudent.display_name || viewingStudent.email.split('@')[0]}</h3>
                    <p className="text-xs opacity-60">{viewingStudent.email} | Phone: {viewingStudent.phone || 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewingStudent(null)} className="text-xs border border-inherit px-2.5 py-1 rounded-md">
                    Close
                  </button>
                </div>

                {/* Remote Theme Override */}
                <div className={`p-3.5 rounded-lg border border-inherit space-y-2 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                  <label className="text-xs font-mono font-semibold opacity-75">Assign Student Theme (Remote Override)</label>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setStudentThemeSurprise(viewingStudent.id, 'birthday')}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-pink-500/20 text-pink-500 border border-pink-500/30"
                    >
                      🎂 Surprise Birthday Theme
                    </button>
                    <button
                      onClick={() => setStudentThemeSurprise(viewingStudent.id, 'slate')}
                      className="px-2.5 py-1 rounded text-xs border border-inherit opacity-75"
                    >
                      Deep Slate (Dark 1)
                    </button>
                    <button
                      onClick={() => setStudentThemeSurprise(viewingStudent.id, 'obsidian')}
                      className="px-2.5 py-1 rounded text-xs border border-inherit opacity-75"
                    >
                      Obsidian (Dark 2)
                    </button>
                    <button
                      onClick={() => setStudentThemeSurprise(viewingStudent.id, 'porcelain')}
                      className="px-2.5 py-1 rounded text-xs border border-inherit opacity-75"
                    >
                      Porcelain (Light 1)
                    </button>
                    <button
                      onClick={() => setStudentThemeSurprise(viewingStudent.id, 'nordic')}
                      className="px-2.5 py-1 rounded text-xs border border-inherit opacity-75"
                    >
                      Nordic Sand (Light 2)
                    </button>
                  </div>
                </div>

                {/* Role & XP Modification */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg border border-inherit ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                  <div>
                    <label className="text-xs font-semibold opacity-75 block mb-1">Role</label>
                    <div className="flex gap-1">
                      {(['student', 'admin'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => changeUserPlatformRole(viewingStudent.id, r)}
                          className={`flex-1 py-1 text-xs rounded border capitalize ${viewingStudent.role === r ? 'bg-slate-800 text-white font-bold' : 'border-inherit opacity-60'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold opacity-75 block mb-1">Set XP Points</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={editPointsValue}
                        onChange={(e) => setEditPointsValue(e.target.value)}
                        className={`flex-1 rounded px-2.5 py-1 text-xs outline-none ${curTheme.input}`}
                      />
                      <button
                        onClick={() => updateStudentPointsDirectly(viewingStudent.id)}
                        className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-semibold opacity-75">Scheduled Milestones ({studentEvents.length})</h4>
                  {studentEvents.length === 0 ? (
                    <p className="text-xs italic opacity-40">No planned events.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {studentEvents.map((ev) => (
                        <div key={ev.id} className={`p-2.5 rounded border border-inherit text-xs ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
                          <div className="flex justify-between font-medium">
                            <span>{ev.title}</span>
                            <span className="opacity-60 font-mono">{ev.tag}</span>
                          </div>
                          <p className="text-[10px] opacity-50 font-mono mt-0.5">{new Date(ev.start_time).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History Logs */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-semibold opacity-75">Focus Logs ({studentLogs.length} Days)</h4>
                  {studentLogs.length === 0 ? (
                    <p className="text-xs italic opacity-40">No history recorded.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {studentLogs.map((item, i) => (
                        <div key={i} className={`p-3 rounded border border-inherit text-xs space-y-1 ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
                          <div className="flex justify-between font-mono font-semibold">
                            <span>{item.date}</span>
                            <span className={curTheme.accent}>{item.hours_studied} hrs</span>
                          </div>
                          {item.blockers && <p className="opacity-75 italic text-[11px]">Blocker: {item.blockers}</p>}
                          <div className="space-y-0.5 pt-0.5">
                            {item.tasks?.map((t: any) => (
                              <div key={t.id} className="flex items-center gap-1 opacity-80 text-[11px]">
                                <span>{t.is_completed ? '✓' : '•'}</span>
                                <span className={t.is_completed ? 'line-through opacity-50' : ''}>{t.title}</span>
                              </div>
                            ))}
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

      {/* Modern Fixed Bottom App Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors duration-200 ${curTheme.nav}`}>
        <div className="max-w-lg mx-auto flex justify-around items-center">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] rounded-lg transition ${activeTab === 'dashboard' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Today</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('calendar')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] rounded-lg transition ${activeTab === 'calendar' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Planner</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('discussions')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] rounded-lg transition ${activeTab === 'discussions' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Hub</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('leaderboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] rounded-lg transition ${activeTab === 'leaderboard' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Ranks</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] rounded-lg transition ${activeTab === 'profile' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Profile</span>
          </button>
          
          {profile?.role === 'admin' && (
            <button 
              type="button"
              onClick={() => setActiveTab('admin')} 
              className={`flex flex-col items-center justify-center p-1.5 min-w-[52px] rounded-lg transition ${activeTab === 'admin' ? 'text-red-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
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