'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Send, Check, X, PhoneCall, Sparkles, Target, Award,
  CalendarCheck, Palette, Eye, CalendarDays, Ban, ShieldCheck,
  Megaphone, UserMinus, Shield, Cake, PartyPopper
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  display_name: string;
  role: 'admin' | 'moderator' | 'student';
  points: number;
  phone?: string;
  is_blocked?: boolean;
  preferred_theme?: ThemeType;
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

  // Auto-recovery for stale chunks
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (
        event?.message?.includes('Loading chunk') ||
        event?.message?.includes('Failed to fetch') ||
        event?.message?.includes('Script error')
      ) {
        window.location.reload();
      }
    };
    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  // Initialize and load user profile
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

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      setPhoneNumber(data.phone || '');
      if (data.preferred_theme) {
        setTheme(data.preferred_theme);
        localStorage.setItem('sq_theme', data.preferred_theme);
        if (data.preferred_theme === 'birthday') {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
        }
      }
    }
  };

  const changeTheme = async (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('sq_theme', newTheme);
    if (profile) {
      setProfile({ ...profile, preferred_theme: newTheme });
      await supabase.from('profiles').update({ preferred_theme: newTheme }).eq('id', profile.id);
    }
    if (newTheme === 'birthday') {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  const setStudentThemeSurprise = async (studentId: string, surpriseTheme: ThemeType) => {
    await supabase.from('profiles').update({ preferred_theme: surpriseTheme }).eq('id', studentId);
    setAllUsers(allUsers.map(u => u.id === studentId ? { ...u, preferred_theme: surpriseTheme } : u));
    if (viewingStudent && viewingStudent.id === studentId) {
      setViewingStudent({ ...viewingStudent, preferred_theme: surpriseTheme });
    }
    alert(`Surprise theme applied to student!`);
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
    alert('Study log saved!');
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
    const message = encodeURIComponent(`Hey ${studentName}! Friendly reminder from StudyQuest to log your tasks and focus hours tonight! 🚀`);
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

  // Refined 2 Light + 2 Dark + Subtle Birthday Palettes
  const themeStyles = {
    // DARK 1: Clean Graphite Slate
    slate: {
      bg: 'bg-slate-950 text-slate-100',
      header: 'bg-slate-900/80 border-slate-800',
      card: 'bg-slate-900/60 border border-slate-800 shadow-sm',
      input: 'bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500',
      btnPrimary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
      accent: 'text-blue-400',
      nav: 'bg-slate-950/95 border-slate-800',
      isLight: false
    },
    // DARK 2: Deep Obsidian Black
    obsidian: {
      bg: 'bg-neutral-950 text-neutral-100',
      header: 'bg-neutral-900/80 border-neutral-800',
      card: 'bg-neutral-900/50 border border-neutral-800 shadow-sm',
      input: 'bg-neutral-950 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:border-emerald-500',
      btnPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm',
      accent: 'text-emerald-400',
      nav: 'bg-neutral-950/95 border-neutral-800',
      isLight: false
    },
    // LIGHT 1: Minimal Porcelain White
    porcelain: {
      bg: 'bg-[#f8fafc] text-slate-900',
      header: 'bg-white/90 border-slate-200 shadow-sm',
      card: 'bg-white border border-slate-200/80 shadow-sm',
      input: 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600',
      btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
      accent: 'text-blue-600',
      nav: 'bg-white/95 border-slate-200 shadow-sm',
      isLight: true
    },
    // LIGHT 2: Nordic Warm Sand
    nordic: {
      bg: 'bg-[#faf8f5] text-stone-900',
      header: 'bg-[#f4f0eb]/90 border-stone-200 shadow-sm',
      card: 'bg-white border border-stone-200/80 shadow-sm',
      input: 'bg-[#f6f3ee] border border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-700',
      btnPrimary: 'bg-stone-800 hover:bg-stone-900 text-white shadow-sm',
      accent: 'text-amber-700',
      nav: 'bg-[#f4f0eb]/95 border-stone-200 shadow-sm',
      isLight: true
    },
    // SPECIAL: Subtle Birthday Theme
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

  const curTheme = themeStyles[theme];
  const isLight = curTheme.isLight;

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
        <Sparkles className="w-5 h-5 mr-2 animate-spin text-blue-500" /> LOADING STUDYQUEST...
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
            STUDYQUEST
          </h1>
          <p className="text-xs text-center mb-6 opacity-60">Focus Tracker & Group Discussion</p>
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
    <div className={`min-h-screen ${curTheme.bg} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 py-3 ${curTheme.header}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-base flex items-center gap-1.5">
              {theme === 'birthday' && <Cake className="w-4 h-4 text-pink-400" />}
              STUDYQUEST
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>

          <button 
            onClick={handleSignOut} 
            className="text-xs p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:text-red-500 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Broadcast Announcement Bar */}
      {announcements.length > 0 && (
        <div className={`px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 border-b ${isLight ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-blue-950/50 text-blue-200 border-blue-900/50'}`}>
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

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 pb-36 flex-1">
        
        {/* TAB 1: TODAY'S FOCUS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 max-w-2xl mx-auto">
            {/* Metric Overview */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className={`p-4 rounded-xl ${curTheme.card}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">Today's Focus</span>
                <p className="text-2xl font-bold mt-0.5">{hours} <span className="text-xs font-normal opacity-60">hours</span></p>
              </div>

              <div className={`p-4 rounded-xl ${curTheme.card}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">Tasks Completed</span>
                <p className="text-2xl font-bold mt-0.5">{completedCount} <span className="text-xs font-normal opacity-60">/ {tasks.length}</span></p>
              </div>
            </div>

            {/* Clean Progress Line */}
            <section className={`p-4 rounded-xl ${curTheme.card} space-y-2`}>
              <div className="flex justify-between text-xs font-medium">
                <span>Daily Completion</span>
                <span className={`font-mono ${curTheme.accent}`}>{progress}%</span>
              </div>
              <div className={`w-full rounded-full h-2 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                <div
                  className={`h-full transition-all duration-300 ${isLight ? 'bg-blue-600' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            {/* Task Add Form */}
            <form onSubmit={addTask} className={`p-4 rounded-xl ${curTheme.card} space-y-2.5`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add target study task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                />
                <button 
                  type="submit" 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 shrink-0 ${curTheme.btnPrimary}`}
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
                        ? (isLight ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-900 border-slate-100 font-semibold')
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </form>

            {/* Action Item List */}
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">
                Action Items
              </h2>
              {tasks.length === 0 ? (
                <div className={`text-xs italic p-4 rounded-xl text-center opacity-60 ${curTheme.card}`}>
                  No tasks scheduled for today yet.
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition ${                       task.is_completed ? 'opacity-40' : ''                     } ${curTheme.card}`}
                  >
                    <div onClick={() => toggleTask(task)} className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      {task.is_completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 opacity-40 hover:opacity-100 shrink-0" />
                      )}
                      <span className={`text-sm truncate ${task.is_completed ? 'line-through' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Evening Log */}
            <section className={`p-4 rounded-xl ${curTheme.card} space-y-3.5`}>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">
                Daily Log & Reflection
              </h2>
              <div>
                <label className="flex items-center gap-1 text-xs mb-1 font-medium opacity-80">
                  <Clock className="w-3.5 h-3.5" /> Total Hours Studied
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none transition ${curTheme.input}`}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs mb-1 font-medium opacity-80">
                  <AlertCircle className="w-3.5 h-3.5" /> Blockers / Doubts
                </label>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Any difficult concepts or revision blockers today?"
                  className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none transition ${curTheme.input}`}
                />
              </div>
              <button 
                onClick={saveDailyLog} 
                className={`w-full py-2.5 font-medium rounded-lg text-sm transition ${curTheme.btnPrimary}`}
              >
                Save Progress & Claim XP
              </button>
            </section>
          </div>
        )}

        {/* TAB 2: CALENDAR & PLANNER */}
        {activeTab === 'calendar' && (
          <div className="space-y-5 max-w-2xl mx-auto">
            <div className={`p-4 rounded-xl ${curTheme.card} space-y-3`}>
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 opacity-70" /> Schedule Study Milestones
              </h2>
              <form onSubmit={addEvent} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Exam or project milestone..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                />
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm outline-none transition ${curTheme.input}`}
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                  >
                    <option>General</option>
                    <option>Exam</option>
                    <option>Assignment</option>
                    <option>Project</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className={`w-full py-2 rounded-lg text-sm font-medium transition ${curTheme.btnPrimary}`}
                >
                  Add Milestone
                </button>
              </form>
            </div>

            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">
                Scheduled Events ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className={`text-xs italic p-4 rounded-xl text-center opacity-60 ${curTheme.card}`}>
                  No calendar milestones added.
                </p>
              ) : (
                events.map((ev) => (
                  <div key={ev.id} className={`p-3 rounded-lg flex items-center justify-between ${curTheme.card}`}>
                    <div>
                      <h4 className="text-sm font-medium">{ev.title}</h4>
                      <p className="text-xs opacity-60 font-mono mt-0.5">{new Date(ev.start_time).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
                        {ev.tag}
                      </span>
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 p-1">
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
          <div className="max-w-3xl mx-auto space-y-5">
            {!activeGroup ? (
              <div className="space-y-4">
                {profile?.role === 'admin' && (
                  <form onSubmit={createGroup} className={`p-4 rounded-xl ${curTheme.card} space-y-2.5`}>
                    <h3 className="text-xs font-mono uppercase font-semibold opacity-70">
                      Admin: Create New Group
                    </h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Machine Learning Study Group)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <input
                      type="text"
                      placeholder="Group Description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-medium ${curTheme.btnPrimary}`}>
                      Create Group
                    </button>
                  </form>
                )}

                <h3 className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">Discussion Hubs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {groups.map((grp) => {
                    const membership = myMemberships[grp.id];
                    const isApproved = isGlobalAdmin || membership?.status === 'approved';
                    const isMod = isGlobalAdmin || membership?.role === 'moderator';

                    return (
                      <div key={grp.id} className={`p-4 rounded-xl flex flex-col justify-between space-y-3 ${curTheme.card}`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold">{grp.title}</h4>
                            {isMod && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-950/60 text-blue-300 border-blue-800'}`}>
                                Moderator
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-60 mt-1">{grp.description || 'General study discussion.'}</p>
                        </div>
                        <div className="pt-2 border-t border-inherit flex items-center justify-between">
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessagesAndMembers(grp)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${curTheme.btnPrimary}`}
                            >
                              Enter Discussion
                            </button>
                          ) : membership?.status === 'pending' ? (
                            <span className="text-xs text-amber-500 font-mono">Pending Approval</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}
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
              <div className={`rounded-xl flex flex-col h-[600px] border ${curTheme.card} overflow-hidden`}>
                <div className="p-3.5 border-b border-inherit flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      {activeGroup.title}
                      {isGroupModerator && <span className="text-[10px] opacity-60 font-mono">(Moderator)</span>}
                    </h3>
                    <p className="text-xs opacity-60">{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className="text-xs border border-inherit px-2.5 py-1 rounded-md opacity-75 hover:opacity-100">
                    Back
                  </button>
                </div>

                {isGroupModerator && (
                  <div className={`p-2.5 border-b border-inherit text-xs space-y-1.5 ${isLight ? 'bg-slate-50' : 'bg-slate-900/40'}`}>
                    <span className="font-semibold text-[11px] opacity-75 block">Group Requests & Members:</span>
                    <div className="flex gap-2 overflow-x-auto pb-0.5">
                      {groupMembersList.map((m) => (
                        <div key={m.id} className={`p-1.5 px-2 rounded border border-inherit text-[11px] shrink-0 flex items-center gap-2 ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
                          <div>
                            <span className="font-medium">{m.profiles?.display_name}</span>
                            <span className="opacity-50 text-[10px] ml-1">({m.status})</span>
                          </div>
                          {m.status === 'pending' && (
                            <div className="flex gap-1">
                              <button onClick={() => updateGroupMemberStatus(m.id, 'approved')} className="p-0.5 text-emerald-600">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => updateGroupMemberStatus(m.id, 'rejected')} className="p-0.5 text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {isGlobalAdmin && m.status === 'approved' && (
                            <button 
                              onClick={() => toggleGroupModerator(m.id, m.role)}
                              className={`text-[9px] px-1 rounded border border-inherit ${m.role === 'moderator' ? 'bg-blue-600 text-white' : ''}`}
                            >
                              {m.role === 'moderator' ? 'Mod' : 'Make Mod'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-xs italic my-auto opacity-40">No messages yet in this group.</p>
                  ) : (
                    groupMessages.map((msg) => (
                      <div key={msg.id} className={`p-2.5 rounded-lg max-w-[80%] text-xs ${msg.sender_name === profile?.display_name ? (isLight ? 'ml-auto bg-blue-50 border border-blue-200' : 'ml-auto bg-blue-950/60 border border-blue-800') : (isLight ? 'bg-slate-50 border border-slate-200' : 'bg-slate-900 border border-slate-800')}`}>
                        <div className="flex justify-between items-center gap-3 mb-1">
                          <span className="font-bold opacity-90">{msg.sender_name}</span>
                          <span className="text-[10px] opacity-50">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={postGroupMessage} className="p-2.5 border-t border-inherit flex gap-2">
                  <input
                    type="text"
                    placeholder={isApprovedMember ? "Type a question or message..." : "Join group to chat"}
                    disabled={!isApprovedMember}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                  />
                  <button type="submit" disabled={!isApprovedMember} className={`p-2 rounded-lg ${curTheme.btnPrimary}`}>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className={`p-5 rounded-xl text-center ${curTheme.card}`}>
              <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-1.5" />
              <h2 className="text-base font-bold">Monthly Rankings</h2>
              <p className="text-xs opacity-60">Points earned from consistent daily focus and completed tasks.</p>
            </div>

            <div className="space-y-2">
              {leaderboard.map((student, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    student.id === user.id ? (isLight ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-slate-800/80 border-slate-700 font-medium') : curTheme.card
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm w-5 font-bold opacity-60">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold">
                        {student.display_name} {student.id === user.id && <span className={`text-xs ${curTheme.accent}`}>(You)</span>}
                      </h4>
                      <p className="text-[11px] opacity-60 capitalize">{student.role}</p>
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

        {/* TAB 5: PROFILE WITH CLEAN 2 LIGHT / 2 DARK THEMES */}
        {activeTab === 'profile' && (
          <div className={`max-w-2xl mx-auto p-5 sm:p-6 rounded-xl space-y-5 ${curTheme.card}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border ${isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-100 border-slate-700'}`}>
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold">{profile?.display_name}</h2>
                <p className="text-xs opacity-60">{profile?.email}</p>
              </div>
            </div>

            {/* 2 LIGHT + 2 DARK THEME PICKER */}
            <div className={`space-y-3 p-3.5 rounded-xl border border-inherit ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
              <label className="text-xs font-semibold font-mono uppercase opacity-75 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Appearance & Theme
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {/* Dark 1 */}
                <button
                  type="button"
                  onClick={() => changeTheme('slate')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'slate' ? 'border-blue-500 bg-blue-500/10 font-bold' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-3 h-3 rounded-full bg-slate-900 border border-slate-600" />
                    <span className="text-xs">Deep Slate</span>
                  </div>
                  <p className="text-[10px] opacity-50">Dark Mode 1 (Graphite)</p>
                </button>

                {/* Dark 2 */}
                <button
                  type="button"
                  onClick={() => changeTheme('obsidian')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'obsidian' ? 'border-emerald-500 bg-emerald-500/10 font-bold' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-3 h-3 rounded-full bg-neutral-950 border border-neutral-700" />
                    <span className="text-xs">Obsidian Black</span>
                  </div>
                  <p className="text-[10px] opacity-50">Dark Mode 2 (OLED)</p>
                </button>

                {/* Light 1 */}
                <button
                  type="button"
                  onClick={() => changeTheme('porcelain')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'porcelain' ? 'border-blue-600 bg-blue-50 font-bold text-slate-900' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300" />
                    <span className="text-xs">Minimal Porcelain</span>
                  </div>
                  <p className="text-[10px] opacity-50">Light Mode 1 (Pure White)</p>
                </button>

                {/* Light 2 */}
                <button
                  type="button"
                  onClick={() => changeTheme('nordic')}
                  className={`p-3 rounded-lg border text-left transition ${theme === 'nordic' ? 'border-amber-700 bg-amber-50 font-bold text-stone-900' : 'border-inherit opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-3 h-3 rounded-full bg-[#f4f0eb] border border-stone-300" />
                    <span className="text-xs">Nordic Sand</span>
                  </div>
                  <p className="text-[10px] opacity-50">Light Mode 2 (Warm Cream)</p>
                </button>

                {/* Admin Only Birthday */}
                {profile?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => changeTheme('birthday')}
                    className={`p-3 rounded-lg border text-left col-span-2 transition ${theme === 'birthday' ? 'border-pink-500 bg-pink-500/10 font-bold' : 'border-inherit opacity-70 hover:opacity-100'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Cake className="w-3.5 h-3.5 text-pink-400" />
                      <span className="text-xs">Birthday Mode (Admin)</span>
                    </div>
                    <p className="text-[10px] opacity-50">Subtle celebration theme</p>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold font-mono opacity-75">WhatsApp Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91..."
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                />
                <button onClick={savePhone} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium">
                  Save
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border border-inherit ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                <span className="text-xs font-mono opacity-60">Total Points</span>
                <p className="text-xl font-bold mt-0.5">{profile?.points || 0} XP</p>
              </div>
              <div className={`p-3 rounded-lg border border-inherit ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                <span className="text-xs font-mono opacity-60">Role</span>
                <p className="text-xl font-bold mt-0.5 capitalize">{profile?.role || 'Student'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN CONTROL & INSPECTOR */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className={`p-4 rounded-xl flex items-center justify-between border ${isLight ? 'bg-red-50 border-red-200 text-red-900' : 'bg-red-950/30 border-red-900/50 text-red-200'}`}>
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold">Admin Center</h3>
                  <p className="text-xs opacity-75">Inspect records, manage permissions, and post announcements.</p>
                </div>
              </div>
            </div>

            {/* Broadcast Form */}
            <form onSubmit={createBroadcastAnnouncement} className={`p-4 rounded-xl ${curTheme.card} space-y-2.5`}>
              <h4 className="text-xs font-mono uppercase font-semibold opacity-75 flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5" /> Broadcast Announcement
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Platform message..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                />
                <button type="submit" className={`px-4 py-1.5 rounded-lg text-xs font-medium ${curTheme.btnPrimary}`}>
                  Post
                </button>
              </div>
            </form>

            {/* Student Directory */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60">
                Registered Students ({allUsers.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {allUsers.map((student) => (
                  <div key={student.id} className={`p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${curTheme.card}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{student.display_name}</p>
                        {student.is_blocked && <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded uppercase border border-inherit">
                          {student.role}
                        </span>
                        {student.preferred_theme === 'birthday' && (
                          <span className="text-[10px] text-pink-500 font-medium">🎂 Birthday</span>
                        )}
                      </div>
                      <p className="text-xs opacity-60 font-mono">{student.email} • {student.points} XP</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => inspectFullStudentDetails(student)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${curTheme.btnPrimary}`}
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() => toggleBlockUser(student)}
                        className={`px-2 py-1 rounded-md text-xs border border-inherit ${student.is_blocked ? 'text-emerald-600' : 'text-red-500'}`}
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
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name)}
                        className="px-2 py-1 bg-emerald-600/20 text-emerald-600 rounded-md text-xs font-medium border border-emerald-500/30 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL STUDENT INSPECTOR SUITE */}
            {viewingStudent && (
              <div className={`p-4 sm:p-5 rounded-xl space-y-4 border ${curTheme.card}`}>
                <div className="flex justify-between items-center border-b border-inherit pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold">Profile: {viewingStudent.display_name}</h3>
                    <p className="text-xs opacity-60">{viewingStudent.email} | Phone: {viewingStudent.phone || 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewingStudent(null)} className="text-xs border border-inherit px-2 py-1 rounded-md">
                    Close
                  </button>
                </div>

                {/* Surprise Theme Control */}
                <div className={`p-3 rounded-lg border border-inherit space-y-1.5 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
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
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-inherit ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
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
                        className={`flex-1 rounded px-2 py-1 text-xs outline-none ${curTheme.input}`}
                      />
                      <button
                        onClick={() => updateStudentPointsDirectly(viewingStudent.id)}
                        className="px-2.5 py-1 bg-amber-600 text-white rounded text-xs font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-semibold opacity-75">Scheduled Milestones ({studentEvents.length})</h4>
                  {studentEvents.length === 0 ? (
                    <p className="text-xs italic opacity-40">No planned events.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {studentEvents.map((ev) => (
                        <div key={ev.id} className={`p-2 rounded border border-inherit text-xs ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
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
                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-semibold opacity-75">Focus Logs ({studentLogs.length} Days)</h4>
                  {studentLogs.length === 0 ? (
                    <p className="text-xs italic opacity-40">No history recorded.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {studentLogs.map((item, i) => (
                        <div key={i} className={`p-2.5 rounded border border-inherit text-xs space-y-1 ${isLight ? 'bg-white' : 'bg-slate-950'}`}>
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

      {/* Floating Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 z-[100] backdrop-blur-md border-t px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-colors duration-200 ${curTheme.nav}`}>
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-lg transition ${activeTab === 'dashboard' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Today</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('calendar')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-lg transition ${activeTab === 'calendar' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <CalendarIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Planner</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('discussions')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-lg transition ${activeTab === 'discussions' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <MessageSquare className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Hub</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('leaderboard')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-lg transition ${activeTab === 'leaderboard' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <Trophy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Ranks</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-lg transition ${activeTab === 'profile' ? `${curTheme.accent} font-bold` : 'opacity-50 hover:opacity-100'}`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Profile</span>
          </button>
          
          {profile?.role === 'admin' && (
            <button 
              type="button"
              onClick={() => setActiveTab('admin')} 
              className={`flex flex-col items-center justify-center p-1.5 min-w-[48px] rounded-lg transition ${activeTab === 'admin' ? 'text-red-500 font-bold' : 'opacity-50 hover:opacity-100'}`}
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