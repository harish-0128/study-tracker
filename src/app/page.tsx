'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Send, Check, X, PhoneCall, Sparkles, Target, Award,
  CalendarCheck, Palette, Eye, CalendarDays, Ban, ShieldCheck,
  Megaphone, UserMinus, Shield, Cake, PartyPopper, History,
  TrendingUp, CheckSquare, Music, Play, Pause, RefreshCw, Volume2, Link as LinkIcon,
  Bot, FileText, Users, FlameKindling, Zap, Medal, ExternalLink, Bookmark,
  ChevronDown, ChevronUp, Bell, BellRing, Hourglass, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

const APP_NAME = "SYNAPSE";

type TabType = 'dashboard' | 'calendar' | 'leaderboard' | 'discussions' | 'profile' | 'admin';
type ThemeType = 'slate' | 'obsidian' | 'porcelain' | 'nordic' | 'birthday';
type TaskScopeType = 'daily' | 'weekly' | 'monthly';

interface Task {
  id: string;
  tier: 'LEARN' | 'APPLY' | 'REVIEW';
  title: string;
  is_completed: boolean;
  due_time?: string;
  scope?: TaskScopeType;
  target_date?: string;
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
  weekly_goal_hours?: number;
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

interface GroupResource {
  id: string;
  group_id: string;
  sender_name: string;
  title: string;
  resource_url: string;
  category: string;
  created_at: string;
}

interface LivePresence {
  user_id: string;
  display_name: string;
  current_subject: string;
  started_at: string;
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
    card: 'bg-slate-900/70 border border-slate-800/80 shadow-sm',
    input: 'bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500',
    btnPrimary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
    accent: 'text-blue-400',
    nav: 'bg-slate-950/95 border-slate-800',
    isLight: false
  },
  obsidian: {
    bg: 'bg-[#080808] text-neutral-100',
    header: 'bg-neutral-900/90 border-neutral-800',
    card: 'bg-neutral-900/60 border border-neutral-800 shadow-sm',
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

const SPOTIFY_PRESETS = [
  { name: 'Lo-Fi Beats', embedUrl: 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM' },
  { name: 'Deep Focus Ambient', embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Rain & Waves', embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS' },
  { name: 'White Noise', embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4wG1z922pvX' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [theme, setTheme] = useState<ThemeType>('slate');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Mobile expandable tool panels
  const [activeToolDrawer, setActiveToolDrawer] = useState<'none' | 'ai' | 'library' | 'spotify'>('none');

  // Scope Tab: Daily, Weekly, Monthly
  const [selectedScope, setSelectedScope] = useState<TaskScopeType>('daily');

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
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [newTaskTargetDate, setNewTaskTargetDate] = useState('');

  // Notifications State
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Set<string>>(new Set());

  // Student Past Logs & Weekly Goal
  const [myPastLogs, setMyPastLogs] = useState<DailyLog[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(20);

  // Pomodoro Focus Timer State
  const [pomoSeconds, setPomoSeconds] = useState(25 * 60);
  const [isPomoRunning, setIsPomoRunning] = useState(false);
  const [pomoMode, setPomoMode] = useState<'focus' | 'break'>('focus');

  // Spotify Player State
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState(SPOTIFY_PRESETS[0].embedUrl);
  const [customSpotifyUrl, setCustomSpotifyUrl] = useState('');

  // Live Virtual Library Presence
  const [livePeers, setLivePeers] = useState<LivePresence[]>([]);
  const [isStudyingLive, setIsStudyingLive] = useState(false);
  const [studySubjectInput, setStudySubjectInput] = useState('Deep Work');

  // AI Mentor State
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{ learn: string[]; apply: string[]; review: string[] } | null>(null);

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
  const [groupResources, setGroupResources] = useState<GroupResource[]>([]);
  const [groupActiveSubTab, setGroupActiveSubTab] = useState<'chat' | 'vault'>('chat');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [newResourceCat, setNewResourceCat] = useState('Notes');
  const [newMessage, setNewMessage] = useState('');
  const [myMemberships, setMyMemberships] = useState<Record<string, { status: string; role: string }>>({});
  const [groupMembersList, setGroupMembersList] = useState<GroupMember[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  // Request Notification Permissions
  const requestNotificationAccess = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsAllowed(true);
        new Notification('SYNAPSE Reminders Active 🔔', {
          body: 'You will receive deadline notifications 1 hour before scheduled study tasks!',
          icon: '/logo.png'
        });
      }
    }
  };

  // 1-Hour Left Deadline Checker Engine
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsAllowed(Notification.permission === 'granted');
    }

    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach((t) => {
        if (!t.due_time || t.is_completed || notifiedTaskIds.has(t.id)) return;

        const [dueHour, dueMin] = t.due_time.split(':').map(Number);
        const targetTime = new Date();
        targetTime.setHours(dueHour, dueMin, 0, 0);

        const diffMinutes = Math.round((targetTime.getTime() - now.getTime()) / (1000 * 60));

        if (diffMinutes <= 60 && diffMinutes > 0) {
          if (Notification.permission === 'granted') {
            new Notification(`⚠️ 1 Hour Left: ${t.title}`, {
              body: `Your deadline is in ${diffMinutes} minutes (${t.due_time}). Keep pushing!`,
              icon: '/logo.png'
            });
          }
          setNotifiedTaskIds((prev) => new Set(prev).add(t.id));
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [tasks, notifiedTaskIds]);

  // Pomodoro Timer Engine
  useEffect(() => {
    let timer: any = null;
    if (isPomoRunning && pomoSeconds > 0) {
      timer = setInterval(() => setPomoSeconds((prev) => prev - 1), 1000);
    } else if (isPomoRunning && pomoSeconds === 0) {
      clearInterval(timer);
      setIsPomoRunning(false);
      if (pomoMode === 'focus') {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        addPoints(25);
        alert('🎉 Focus sprint completed! +25 XP awarded.');
        setPomoMode('break');
        setPomoSeconds(5 * 60);
      } else {
        alert('Break ended! Ready to dive back in?');
        setPomoMode('focus');
        setPomoSeconds(25 * 60);
      }
    }
    return () => clearInterval(timer);
  }, [isPomoRunning, pomoSeconds, pomoMode]);

  // Initial Load & Widget URL Listeners
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('sq_theme');
      if (savedTheme) setTheme(normalizeTheme(savedTheme));
    } catch (_) {}

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');

      if (action === 'sprint') {
        setActiveTab('dashboard');
        setIsPomoRunning(true);
      } else if (action === 'log') {
        setActiveTab('dashboard');
      } else if (action === 'hub') {
        setActiveTab('discussions');
      }
    }

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
          await fetchLivePeers();
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
        await fetchLivePeers();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      setPhoneNumber(data.phone || '');
      setWeeklyGoal(data.weekly_goal_hours || 20);
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

  // Daily Data & Automatic Task Rollover from Previous Day
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

      if (dailyLog) {
        const { data: previousLog } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', userId)
          .neq('date', todayStr)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (previousLog) {
          const { data: uncompletedPrevious } = await supabase
            .from('tasks')
            .select('title, tier, due_time, scope, target_date')
            .eq('daily_log_id', previousLog.id)
            .eq('is_completed', false);

          if (uncompletedPrevious && uncompletedPrevious.length > 0) {
            const rolledTasks = uncompletedPrevious.map(t => ({
              daily_log_id: dailyLog.id,
              user_id: userId,
              tier: t.tier,
              title: `${t.title} ↩`,
              due_time: t.due_time,
              scope: t.scope || 'daily',
              target_date: t.target_date,
              is_completed: false
            }));

            await supabase.from('tasks').insert(rolledTasks);
          }
        }
      }
    }

    if (dailyLog) {
      setLog(dailyLog);
      setHours(dailyLog.hours_studied?.toString() || '0');
      setBlockers(dailyLog.blockers || '');

      // Load all tasks for this user (both current daily log + multi-scope targets)
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
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
      .limit(60);
    setMyPastLogs(data || []);
  };

  // Virtual Library Presence
  const fetchLivePeers = async () => {
    const { data } = await supabase.from('live_study_presence').select('*').order('started_at', { ascending: false });
    setLivePeers(data || []);
    if (user && data?.some((p: any) => p.user_id === user.id)) {
      setIsStudyingLive(true);
    }
  };

  const toggleLiveStudySession = async () => {
    if (!user || !profile) return;
    if (isStudyingLive) {
      await supabase.from('live_study_presence').delete().eq('user_id', user.id);
      setIsStudyingLive(false);
      setLivePeers(livePeers.filter(p => p.user_id !== user.id));
    } else {
      const newEntry = {
        user_id: user.id,
        display_name: profile.display_name || profile.email?.split('@')[0] || 'Scholar',
        current_subject: studySubjectInput.trim() || 'Deep Work',
        started_at: new Date().toISOString()
      };
      await supabase.from('live_study_presence').upsert([newEntry]);
      setIsStudyingLive(true);
      setLivePeers([newEntry, ...livePeers]);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
    }
  };

  // AI Study Mentor Engine
  const generateAiStudyRoadmap = () => {
    if (!aiTopicInput.trim()) return;
    setIsGeneratingAi(true);
    setTimeout(() => {
      const topic = aiTopicInput.trim();
      const plan = {
        learn: [
          `Master core theoretical principles of ${topic}`,
          `Map formulas & review core derivations for ${topic}`
        ],
        apply: [
          `Implement a code demo or problem set on ${topic}`,
          `Solve 2 exam-style analytical problems on ${topic}`
        ],
        review: [
          `Summarize doubts and edge-cases for ${topic}`
        ]
      };
      setGeneratedPlan(plan);
      setIsGeneratingAi(false);
    }, 700);
  };

  const adoptAiTasks = async () => {
    if (!generatedPlan || !log || !user) return;
    const newTasks: any[] = [];
    for (const title of generatedPlan.learn) {
      newTasks.push({ daily_log_id: log.id, user_id: user.id, tier: 'LEARN', scope: selectedScope, title, is_completed: false });
    }
    for (const title of generatedPlan.apply) {
      newTasks.push({ daily_log_id: log.id, user_id: user.id, tier: 'APPLY', scope: selectedScope, title, is_completed: false });
    }
    for (const title of generatedPlan.review) {
      newTasks.push({ daily_log_id: log.id, user_id: user.id, tier: 'REVIEW', scope: selectedScope, title, is_completed: false });
    }
    const { data } = await supabase.from('tasks').insert(newTasks).select();
    if (data) {
      setTasks([...tasks, ...data]);
      setGeneratedPlan(null);
      setAiTopicInput('');
      setActiveToolDrawer('none');
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      alert(`AI study targets adopted into ${selectedScope} roadmap!`);
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
    if (user) await supabase.from('live_study_presence').delete().eq('user_id', user.id);
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

  // Add Task with Scope, Due Time, and Target Date
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
        scope: selectedScope,
        title: newTaskTitle.trim(),
        due_time: selectedScope === 'daily' ? (newTaskDueTime || null) : null,
        target_date: selectedScope !== 'daily' ? (newTaskTargetDate || null) : todayStr,
        is_completed: false,
      }])
      .select()
      .single();

    if (!error && data) {
      setTasks([...tasks, data]);
      setNewTaskTitle('');
      setNewTaskDueTime('');
      setNewTaskTargetDate('');
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

  const savePhoneAndGoal = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({ phone: phoneNumber, weekly_goal_hours: weeklyGoal }).eq('id', profile.id);
    alert('Profile parameters updated!');
  };

  const applyCustomSpotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSpotifyUrl.trim()) return;
    let rawUrl = customSpotifyUrl.trim().split('?')[0];

    if (rawUrl.includes('open.spotify.com/') && !rawUrl.includes('/embed/')) {
      const embedUrl = rawUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
      setSpotifyEmbedUrl(embedUrl);
      setCustomSpotifyUrl('');
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
    } else if (rawUrl.includes('/embed/')) {
      setSpotifyEmbedUrl(rawUrl);
      setCustomSpotifyUrl('');
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
    } else {
      alert('Please paste a valid Spotify link.');
    }
  };

  const getDeadlineStatus = (dueTime?: string, targetDate?: string, scope?: string) => {
    if (scope === 'weekly' || scope === 'monthly') {
      if (!targetDate) return null;
      return { text: `Target: ${targetDate}`, color: 'border-inherit opacity-75' };
    }

    if (!dueTime) return null;
    const [dueH, dueM] = dueTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(dueH, dueM, 0, 0);

    const diffMinutes = Math.round((target.getTime() - now.getTime()) / (1000 * 60));

    if (diffMinutes < 0) {
      return { text: `Overdue (${dueTime})`, color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    }
    if (diffMinutes <= 60) {
      return { text: `⏳ ${diffMinutes}m left (${dueTime})`, color: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' };
    }
    return { text: `Due ${dueTime}`, color: 'border-inherit opacity-75' };
  };

  // Group & Resource Vault Methods
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

    const { data: vaultData } = await supabase
      .from('group_resources')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });
    setGroupResources(vaultData || []);

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

  const uploadGroupResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceTitle.trim() || !newResourceUrl.trim() || !activeGroup || !user) return;
    const { data, error } = await supabase
      .from('group_resources')
      .insert([{
        group_id: activeGroup.id,
        user_id: user.id,
        sender_name: profile?.display_name || 'Scholar',
        title: newResourceTitle.trim(),
        resource_url: newResourceUrl.trim(),
        category: newResourceCat
      }])
      .select()
      .single();

    if (!error && data) {
      setGroupResources([data, ...groupResources]);
      setNewResourceTitle('');
      setNewResourceUrl('');
      await addPoints(10);
      alert('Resource pinned to vault! +10 XP');
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

  // Scoped Tasks Filter
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => (t.scope || 'daily') === selectedScope);
  }, [tasks, selectedScope]);

  const studentTotalHours = useMemo(() => {
    return myPastLogs.reduce((acc, curr) => acc + (curr.hours_studied || 0), 0);
  }, [myPastLogs]);

  const weeklyLoggedHours = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return myPastLogs
      .filter(l => l.date && new Date(l.date) >= sevenDaysAgo)
      .reduce((acc, curr) => acc + (curr.hours_studied || 0), 0);
  }, [myPastLogs]);

  const tierRatio = useMemo(() => {
    let learn = 0, apply = 0, review = 0;
    myPastLogs.forEach(l => {
      l.tasks?.forEach(t => {
        if (t.tier === 'LEARN') learn++;
        if (t.tier === 'APPLY') apply++;
        if (t.tier === 'REVIEW') review++;
      });
    });
    const total = learn + apply + review || 1;
    return {
      learn: Math.round((learn / total) * 100),
      apply: Math.round((apply / total) * 100),
      review: Math.round((review / total) * 100)
    };
  }, [myPastLogs]);

  const leagueRank = useMemo(() => {
    const pts = profile?.points || 0;
    if (pts >= 1000) return { name: 'Master 💎', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' };
    if (pts >= 500) return { name: 'Diamond 🔷', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' };
    if (pts >= 250) return { name: 'Gold 🏆', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' };
    if (pts >= 100) return { name: 'Silver 🥈', color: 'text-slate-300 border-slate-400/40 bg-slate-400/10' };
    return { name: 'Bronze 🥉', color: 'text-amber-700 border-amber-700/40 bg-amber-700/10' };
  }, [profile?.points]);

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

  const pomoMinutes = Math.floor(pomoSeconds / 60);
  const pomoSecs = pomoSeconds % 60;
  const formattedPomoTime = `${String(pomoMinutes).padStart(2, '0')}:${String(pomoSecs).padStart(2, '0')}`;

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

  const completedCount = filteredTasks.filter(t => t.is_completed).length;
  const weeklyPercent = Math.min(Math.round((weeklyLoggedHours / (weeklyGoal || 20)) * 100), 100);

  return (
    <div className={`min-h-screen ${curTheme.bg} flex flex-col font-sans transition-colors duration-200 antialiased`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-8 py-3 ${curTheme.header}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Synapse Logo" 
              className="w-7 h-7 object-contain rounded-md"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <span className="font-extrabold tracking-tight text-base sm:text-lg flex items-center gap-1.5">
              {theme === 'birthday' && <Cake className="w-4 h-4 text-pink-400" />}
              {APP_NAME}
            </span>
            <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
              <Flame className="w-3 h-3 fill-current" />
              <span>{profile?.points || 0} XP</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline-block ${leagueRank.color}`}>
              {leagueRank.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!notificationsAllowed && (
              <button
                onClick={requestNotificationAccess}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/20 transition"
                title="Enable 1-Hour Deadline Reminders"
              >
                <BellRing className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Alerts</span>
              </button>
            )}

            <span className="text-xs opacity-60 hidden md:inline-block font-mono">{displayNameDisplay}</span>
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
        <div className={`px-4 py-1.5 text-xs font-medium flex items-center justify-center gap-2 border-b ${isLight ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-blue-950/50 text-blue-200 border-blue-900/50'}`}>
          <Megaphone className="w-3.5 h-3.5 shrink-0" />
          <span>{announcements[0].message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto p-3.5 sm:p-8 pb-48 sm:pb-52 flex-1">
        
        {/* TAB 1: ROADMAP & FOCUS */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Top Stat Overview Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className={`p-3.5 sm:p-5 rounded-xl ${curTheme.card}`}>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Focus
                </span>
                <p className="text-xl sm:text-3xl font-bold mt-0.5">{hours} <span className="text-xs font-normal opacity-60">hrs</span></p>
              </div>

              <div className={`p-3.5 sm:p-5 rounded-xl ${curTheme.card}`}>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" /> Done
                </span>
                <p className="text-xl sm:text-3xl font-bold mt-0.5">{completedCount} <span className="text-xs font-normal opacity-60">/ {filteredTasks.length}</span></p>
              </div>

              <div className={`p-3.5 sm:p-5 rounded-xl ${curTheme.card}`}>
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Goal
                </span>
                <p className="text-xl sm:text-3xl font-bold mt-0.5">{weeklyPercent}%</p>
                <div className={`w-full rounded-full h-1 overflow-hidden mt-1.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                  <div className={`h-full ${isLight ? 'bg-blue-600' : 'bg-blue-500'}`} style={{ width: `${weeklyPercent}%` }} />
                </div>
              </div>

              {/* Pomodoro Focus Timer */}
              <div className={`p-3.5 sm:p-5 rounded-xl ${curTheme.card} flex flex-col justify-between border-blue-500/30`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1">
                    <Target className="w-3 h-3 text-blue-400" /> Sprint
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${pomoMode === 'focus' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {pomoMode}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-base sm:text-2xl font-black font-mono tracking-tight">{formattedPomoTime}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsPomoRunning(!isPomoRunning)}
                      className={`p-1.5 rounded-lg text-white font-bold transition shadow-sm ${isPomoRunning ? 'bg-amber-600' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                      {isPomoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsPomoRunning(false);
                        setPomoSeconds(25 * 60);
                        setPomoMode('focus');
                      }}
                      className="p-1.5 rounded-lg border border-inherit opacity-60 hover:opacity-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Tools Bar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveToolDrawer(activeToolDrawer === 'ai' ? 'none' : 'ai')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeToolDrawer === 'ai' ? 'bg-purple-600 text-white border-purple-500 shadow-sm' : `${curTheme.card} opacity-80 hover:opacity-100`
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">AI Mentor</span>
                {activeToolDrawer === 'ai' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveToolDrawer(activeToolDrawer === 'library' ? 'none' : 'library')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeToolDrawer === 'library' ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' : `${curTheme.card} opacity-80 hover:opacity-100`
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">Library ({livePeers.length})</span>
                {activeToolDrawer === 'library' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveToolDrawer(activeToolDrawer === 'spotify' ? 'none' : 'spotify')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeToolDrawer === 'spotify' ? 'bg-emerald-700 text-white border-emerald-600 shadow-sm' : `${curTheme.card} opacity-80 hover:opacity-100`
                }`}
              >
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">Spotify</span>
                {activeToolDrawer === 'spotify' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
              </button>
            </div>

            {/* Expandable AI Mentor Drawer */}
            {activeToolDrawer === 'ai' && (
              <div className={`p-4 rounded-xl border border-purple-500/30 ${curTheme.card} space-y-2.5 animate-in fade-in`}>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-purple-400">
                    AI Study Plan Generator
                  </h3>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Topic (e.g. Dynamic Programming, Transformers)..."
                    value={aiTopicInput}
                    onChange={(e) => setAiTopicInput(e.target.value)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs outline-none ${curTheme.input}`}
                  />
                  <button
                    onClick={generateAiStudyRoadmap}
                    disabled={isGeneratingAi}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90 transition shrink-0"
                  >
                    {isGeneratingAi ? '...' : 'Decompose'}
                  </button>
                </div>

                {generatedPlan && (
                  <div className={`p-3 rounded-lg border border-purple-500/30 space-y-2 text-xs ${isLight ? 'bg-purple-50/50' : 'bg-purple-950/20'}`}>
                    <div className="space-y-1">
                      <span className="font-bold text-blue-400 block">LEARN:</span>
                      {generatedPlan.learn.map((s, i) => <p key={i} className="opacity-80">• {s}</p>)}
                      <span className="font-bold text-emerald-400 block pt-1">APPLY:</span>
                      {generatedPlan.apply.map((s, i) => <p key={i} className="opacity-80">• {s}</p>)}
                    </div>
                    <button
                      onClick={adoptAiTasks}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-bold"
                    >
                      Adopt Targets ✨
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Expandable Virtual Library Drawer */}
            {activeToolDrawer === 'library' && (
              <div className={`p-4 rounded-xl border ${curTheme.card} space-y-3 animate-in fade-in`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Virtual Library
                  </h3>
                  <button
                    onClick={toggleLiveStudySession}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      isStudyingLive ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isStudyingLive ? 'Leave' : 'Go Live'}
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {livePeers.length === 0 ? (
                    <p className="text-xs italic opacity-40">No peers studying right now.</p>
                  ) : (
                    livePeers.map((p) => (
                      <div key={p.user_id} className={`p-2 rounded-lg border border-inherit shrink-0 flex items-center gap-2 text-xs ${isLight ? 'bg-slate-50' : 'bg-slate-950/60'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <div>
                          <p className="font-bold text-[11px]">{p.display_name}</p>
                          <p className="text-[9px] opacity-60 font-mono">{p.current_subject}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Expandable Spotify Focus Lounge */}
            {activeToolDrawer === 'spotify' && (
              <div className={`p-4 rounded-xl border border-emerald-500/30 ${curTheme.card} space-y-3 animate-in fade-in`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                    <Music className="w-3.5 h-3.5" /> Spotify Focus Lounge
                  </h3>
                  <a 
                    href="https://open.spotify.com" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] opacity-60 hover:opacity-100 flex items-center gap-1"
                  >
                    Open Web Player <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SPOTIFY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setSpotifyEmbedUrl(preset.embedUrl)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        spotifyEmbedUrl === preset.embedUrl ? 'bg-emerald-600 text-white border-emerald-500 font-bold' : 'border-inherit opacity-75 hover:opacity-100'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <form onSubmit={applyCustomSpotify} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste any Spotify song/playlist link..."
                    value={customSpotifyUrl}
                    onChange={(e) => setCustomSpotifyUrl(e.target.value)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs outline-none ${curTheme.input}`}
                  />
                  <button 
                    type="submit" 
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shrink-0"
                  >
                    Load Song
                  </button>
                </form>

                <div className="rounded-xl overflow-hidden border border-emerald-500/20 bg-black/40 shadow-inner">
                  <iframe
                    src={spotifyEmbedUrl}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Scope Navigation Switcher (Daily / Weekly / Monthly) */}
            <div className="flex border-b border-inherit gap-2 pb-1 text-xs font-semibold">
              {(['daily', 'weekly', 'monthly'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedScope(s)}
                  className={`px-3 py-1.5 rounded-lg uppercase font-mono tracking-wider transition ${
                    selectedScope === s 
                      ? `${curTheme.btnPrimary} font-bold shadow-sm` 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {s === 'daily' ? "Today's Targets" : s === 'weekly' ? 'Weekly Goals' : 'Monthly Milestones'}
                </button>
              ))}
            </div>

            {/* Main Laptop 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Left 2 Columns: Action Roadmap & Reflection */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                
                {/* Responsive Task Add Form with Mobile-Optimized Layout & Date Pickers */}
                <form onSubmit={addTask} className={`p-4 sm:p-5 rounded-xl ${curTheme.card} space-y-2.5`}>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={`Add ${selectedScope} target task...`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className={`w-full flex-1 rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                    />
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedScope === 'daily' ? (
                        <input
                          type="time"
                          title="Target Due Time"
                          value={newTaskDueTime}
                          onChange={(e) => setNewTaskDueTime(e.target.value)}
                          className={`flex-1 sm:flex-none rounded-lg px-2.5 py-2 text-xs outline-none ${curTheme.input}`}
                        />
                      ) : (
                        <input
                          type="date"
                          title="Target Deadline Date"
                          value={newTaskTargetDate}
                          onChange={(e) => setNewTaskTargetDate(e.target.value)}
                          className={`flex-1 sm:flex-none rounded-lg px-2.5 py-2 text-xs outline-none ${curTheme.input}`}
                        />
                      )}
                      <button 
                        type="submit" 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 shrink-0 ${curTheme.btnPrimary}`}
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
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

                {/* Scoped Task List with Live Deadline Status */}
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center justify-between">
                    <span>{selectedScope.toUpperCase()} ROADMAP ({filteredTasks.length})</span>
                    <span className="text-[10px] opacity-75 font-normal">
                      {selectedScope === 'daily' ? todayStr : `${selectedScope.toUpperCase()} PLAN`}
                    </span>
                  </h2>
                  {filteredTasks.length === 0 ? (
                    <div className={`text-xs italic p-5 rounded-xl text-center opacity-60 ${curTheme.card}`}>
                      No {selectedScope} objectives configured. Add your target tasks above!
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const deadline = getDeadlineStatus(task.due_time, task.target_date, task.scope);
                      return (
                        <div 
                          key={task.id} 
                          className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition ${                             task.is_completed ? 'opacity-40' : ''                           } ${curTheme.card}`}
                        >
                          <div onClick={() => toggleTask(task)} className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                            {task.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 opacity-40 hover:opacity-100 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className={`text-sm block truncate font-medium ${task.is_completed ? 'line-through' : ''}`}>
                                {task.title}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {deadline && !task.is_completed && (
                              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${deadline.color}`}>
                                {deadline.text}
                              </span>
                            )}
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-inherit opacity-60">
                              {task.tier}
                            </span>
                            <button onClick={() => deleteTask(task.id)} className="opacity-40 hover:opacity-100 hover:text-red-500 p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Evening Log & Reflection Form */}
                <section className={`p-4 sm:p-5 rounded-xl ${curTheme.card} space-y-3`}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Evening Reflection & Hours
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                        <AlertCircle className="w-3.5 h-3.5" /> Doubts & Blockers
                      </label>
                      <textarea
                        rows={1}
                        value={blockers}
                        onChange={(e) => setBlockers(e.target.value)}
                        placeholder="Any doubts today?"
                        className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none transition ${curTheme.input}`}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={saveDailyLog} 
                    className={`w-full py-2.5 font-bold rounded-xl text-sm transition shadow-md ${curTheme.btnPrimary}`}
                  >
                    Save Reflection & Claim XP 🔥
                  </button>
                </section>
              </div>

              {/* Right 1 Column: Tier Ratio Breakdown & Past Study Logs */}
              <div className="space-y-4">
                <div className={`p-4 sm:p-5 rounded-xl ${curTheme.card} space-y-2.5`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-75 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Study Ratio Distribution
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-blue-400">Learn (Theory)</span>
                        <span>{tierRatio.learn}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${tierRatio.learn}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-emerald-400">Apply (Practice/Code)</span>
                        <span>{tierRatio.apply}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${tierRatio.apply}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-0.5">
                        <span className="text-amber-400">Review (Doubts/Feynman)</span>
                        <span>{tierRatio.review}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: `${tierRatio.review}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-4 sm:p-5 rounded-xl ${curTheme.card} space-y-3`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-75 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> My Recent Study Logs
                  </h3>
                  
                  {myPastLogs.length === 0 ? (
                    <p className="text-xs italic opacity-40 py-3 text-center">No previous logs recorded yet.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                      {myPastLogs.map((past, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border border-inherit text-xs space-y-1 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                          <div className="flex justify-between font-mono font-semibold">
                            <span>{past.date}</span>
                            <span className={curTheme.accent}>{past.hours_studied} hrs</span>
                          </div>
                          {past.blockers && (
                            <p className="text-[11px] opacity-75 italic">Blocker: {past.blockers}</p>
                          )}
                          <div className="space-y-0.5 pt-0.5">
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
          <div className="space-y-5 max-w-4xl mx-auto">
            <div className={`p-4 sm:p-5 rounded-xl ${curTheme.card} space-y-3`}>
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 opacity-70" /> Schedule Study Milestones & Exam Deadlines
              </h2>
              <form onSubmit={addEvent} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Event goal (e.g. Deep Learning Module 4 Exam Prep)"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition ${curTheme.input}`}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="datetime-local"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none transition ${curTheme.input}`}
                  />
                  <select
                    value={newEventTag}
                    onChange={(e) => setNewEventTag(e.target.value)}
                    className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
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
                  Add to Study Calendar
                </button>
              </form>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">
                Upcoming Milestones ({events.length})
              </h3>
              {events.length === 0 ? (
                <p className={`text-xs italic p-5 rounded-xl text-center opacity-60 ${curTheme.card}`}>
                  No calendar milestones scheduled.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {events.map((ev) => (
                    <div key={ev.id} className={`p-3.5 rounded-xl flex items-center justify-between ${curTheme.card}`}>
                      <div>
                        <h4 className="text-sm font-semibold">{ev.title}</h4>
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DISCUSSION GROUPS & NOTES VAULT */}
        {activeTab === 'discussions' && (
          <div className="max-w-5xl mx-auto space-y-5">
            {!activeGroup ? (
              <div className="space-y-4">
                {profile?.role === 'admin' && (
                  <form onSubmit={createGroup} className={`p-4 sm:p-5 rounded-xl ${curTheme.card} space-y-2.5`}>
                    <h3 className="text-xs font-mono uppercase font-semibold opacity-75">
                      Admin: Create New Community Hub
                    </h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Deep Learning Discussion Room)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <input
                      type="text"
                      placeholder="Hub Description"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-sm outline-none ${curTheme.input}`}
                    />
                    <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-medium ${curTheme.btnPrimary}`}>
                      Launch Community
                    </button>
                  </form>
                )}

                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">Active Study Communities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {groups.map((grp) => {
                    const membership = myMemberships[grp.id];
                    const isApproved = isGlobalAdmin || membership?.status === 'approved';
                    const isMod = isGlobalAdmin || membership?.role === 'moderator';

                    return (
                      <div key={grp.id} className={`p-4 rounded-xl flex flex-col justify-between space-y-3 ${curTheme.card}`}>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-base font-bold">{grp.title}</h4>
                            {isMod && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-950/60 text-blue-300 border-blue-800'}`}>
                                Moderator
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-60">{grp.description || 'Community Q&A and notes repository.'}</p>
                        </div>
                        <div className="pt-2.5 border-t border-inherit flex items-center justify-between">
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessagesAndMembers(grp)}
                              className={`w-full py-1.5 rounded-lg text-xs font-medium transition text-center ${curTheme.btnPrimary}`}
                            >
                              Enter Discussion & Vault
                            </button>
                          ) : membership?.status === 'pending' ? (
                            <span className="text-xs text-amber-500 font-mono mx-auto">Pending Approval</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className={`w-full py-1.5 border rounded-lg text-xs font-medium transition ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'}`}
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm flex items-center gap-1.5">
                        {activeGroup.title}
                        {isGroupModerator && <span className="text-[10px] opacity-60 font-mono">(Mod)</span>}
                      </h3>
                      <div className="flex rounded-lg border border-inherit p-0.5 text-xs">
                        <button
                          onClick={() => setGroupActiveSubTab('chat')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition ${groupActiveSubTab === 'chat' ? curTheme.btnPrimary : 'opacity-60'}`}
                        >
                          Chat
                        </button>
                        <button
                          onClick={() => setGroupActiveSubTab('vault')}
                          className={`px-2 py-0.5 rounded-md font-semibold transition flex items-center gap-1 ${groupActiveSubTab === 'vault' ? curTheme.btnPrimary : 'opacity-60'}`}
                        >
                          Vault ({groupResources.length})
                        </button>
                      </div>
                    </div>
                    <p className="text-xs opacity-60 mt-0.5">{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className="text-xs border border-inherit px-2.5 py-1 rounded-lg opacity-75 hover:opacity-100">
                    Back
                  </button>
                </div>

                {/* SubTab 1: Chat Stream */}
                {groupActiveSubTab === 'chat' && (
                  <>
                    <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5">
                      {groupMessages.length === 0 ? (
                        <p className="text-center text-xs italic my-auto opacity-40">No messages yet in this group.</p>
                      ) : (
                        groupMessages.map((msg) => (
                          <div key={msg.id} className={`p-2.5 rounded-xl max-w-[85%] text-xs ${msg.sender_name === displayNameDisplay ? (isLight ? 'ml-auto bg-blue-50 border border-blue-200' : 'ml-auto bg-blue-950/60 border border-blue-800') : (isLight ? 'bg-slate-50 border border-slate-200' : 'bg-slate-900 border border-slate-800')}`}>
                            <div className="flex justify-between items-center gap-3 mb-0.5">
                              <span className="font-bold opacity-90">{msg.sender_name}</span>
                              <span className="text-[9px] opacity-50">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={postGroupMessage} className="p-2.5 border-t border-inherit flex gap-2">
                      <input
                        type="text"
                        placeholder={isApprovedMember ? "Type message..." : "Join group to participate"}
                        disabled={!isApprovedMember}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                      />
                      <button type="submit" disabled={!isApprovedMember} className={`px-3.5 py-1.5 rounded-lg ${curTheme.btnPrimary}`}>
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                )}

                {/* SubTab 2: Resource & Notes Vault */}
                {groupActiveSubTab === 'vault' && (
                  <div className="flex-1 p-3.5 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {groupResources.length === 0 ? (
                        <p className="text-center text-xs italic my-auto opacity-40">No notes or cheat-sheets uploaded yet.</p>
                      ) : (
                        groupResources.map((res) => (
                          <div key={res.id} className={`p-3 rounded-xl border border-inherit flex items-center justify-between gap-2.5 ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold truncate">{res.title}</h4>
                                <p className="text-[10px] opacity-60 truncate">By {res.sender_name} • {res.category}</p>
                              </div>
                            </div>
                            <a
                              href={res.resource_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg border border-inherit text-xs font-semibold hover:bg-blue-600 hover:text-white transition flex items-center gap-1 shrink-0"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className={`p-5 rounded-xl text-center ${curTheme.card}`}>
              <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-1.5" />
              <h2 className="text-base font-bold">Monthly Rankings & Tiered Leagues</h2>
              <p className="text-xs opacity-60">Consistency scores computed by completed study tasks and logged focus hours.</p>
            </div>

            <div className="space-y-2">
              {leaderboard.map((student, idx) => {
                const pts = student.points || 0;
                const tierTag = pts >= 1000 ? 'Master' : pts >= 500 ? 'Diamond' : pts >= 250 ? 'Gold' : pts >= 100 ? 'Silver' : 'Bronze';
                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border ${
                      student.id === user.id ? (isLight ? 'bg-blue-50 border-blue-300 font-medium' : 'bg-slate-800/80 border-slate-700 font-medium') : curTheme.card
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm w-5 font-bold opacity-60">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold">
                          {student.display_name || student.email.split('@')[0]} {student.id === user.id && <span className={`text-xs ${curTheme.accent}`}>(You)</span>}
                        </h4>
                        <p className="text-[11px] opacity-60 capitalize">{student.role} • <span className="font-semibold text-amber-400">{tierTag}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-sm opacity-90">
                      <Flame className="w-4 h-4 text-amber-500 fill-current" />
                      <span>{student.points} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className={`p-5 rounded-xl ${curTheme.card} flex flex-col sm:flex-row items-center justify-between gap-3`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border ${isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-100 border-slate-700'}`}>
                  {avatarLetter}
                </div>
                <div>
                  <h2 className="text-base font-bold">{displayNameDisplay}</h2>
                  <p className="text-xs opacity-60">{profile?.email}</p>
                </div>
              </div>
              <div className="flex gap-3 text-center">
                <div className="px-3 py-1.5 rounded-lg border border-inherit">
                  <span className="text-[9px] font-mono opacity-60 block">XP</span>
                  <span className="text-base font-bold text-amber-500">{profile?.points || 0}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg border border-inherit">
                  <span className="text-[9px] font-mono opacity-60 block">FOCUS</span>
                  <span className="text-base font-bold">{studentTotalHours.toFixed(1)} hrs</span>
                </div>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className={`p-4 rounded-xl border border-inherit ${curTheme.card} space-y-2.5`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-75 flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-amber-400" /> Milestone Badges
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${studentTotalHours >= 1 ? 'border-amber-500/40 bg-amber-500/10' : 'opacity-40'}`}>
                  <span className="text-base">🚀</span>
                  <p className="font-bold text-[11px]">First Step</p>
                </div>
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${studentTotalHours >= 10 ? 'border-amber-500/40 bg-amber-500/10' : 'opacity-40'}`}>
                  <span className="text-base">⚡</span>
                  <p className="font-bold text-[11px]">10h Club</p>
                </div>
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${studentTotalHours >= 50 ? 'border-amber-500/40 bg-amber-500/10' : 'opacity-40'}`}>
                  <span className="text-base">🔥</span>
                  <p className="font-bold text-[11px]">50h Pro</p>
                </div>
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${studentTotalHours >= 100 ? 'border-amber-500/40 bg-amber-500/10' : 'opacity-40'}`}>
                  <span className="text-base">👑</span>
                  <p className="font-bold text-[11px]">Century</p>
                </div>
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${(profile?.points || 0) >= 200 ? 'border-amber-500/40 bg-amber-500/10' : 'opacity-40'}`}>
                  <span className="text-base">🎯</span>
                  <p className="font-bold text-[11px]">Grinder</p>
                </div>
                <div className={`p-2.5 rounded-xl border space-y-0.5 ${(profile?.points || 0) >= 500 ? 'border-amber-500/40 bg-amber-500/10' : 'opacity-40'}`}>
                  <span className="text-base">💎</span>
                  <p className="font-bold text-[11px]">Diamond</p>
                </div>
              </div>
            </div>

            {/* GitHub Heatmap */}
            <div className={`p-4 rounded-xl border border-inherit ${curTheme.card} space-y-2`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-75 flex items-center gap-1.5">
                <FlameKindling className="w-3.5 h-3.5 text-emerald-400" /> Activity Heatmap (Past 60 Days)
              </h3>
              <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-black/20 border border-inherit">
                {Array.from({ length: 60 }).map((_, idx) => {
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() - (59 - idx));
                  const dateStr = targetDate.toISOString().split('T')[0];
                  const matchedLog = myPastLogs.find(l => l.date === dateStr);
                  const hrs = matchedLog?.hours_studied || 0;
                  const intensity = hrs >= 4 ? 'bg-emerald-500' : hrs >= 2 ? 'bg-emerald-600' : hrs > 0 ? 'bg-emerald-800' : 'bg-slate-800/60';

                  return (
                    <div
                      key={idx}
                      title={`${dateStr}:${hrs} hrs studied`}
                      className={`w-3 h-3 rounded-xs transition-all hover:scale-125 cursor-pointer ${intensity}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Appearance Preferences */}
            <div className={`p-4 rounded-xl border border-inherit ${curTheme.card} space-y-2.5`}>
              <label className="text-xs font-semibold font-mono uppercase opacity-75 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Appearance Preferences
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => changeTheme('slate')}
                  className={`p-2.5 rounded-lg border text-left transition ${theme === 'slate' ? 'border-blue-500 bg-blue-500/10 font-bold' : 'border-inherit opacity-70'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-600" />
                    <span className="text-xs">Deep Slate</span>
                  </div>
                  <p className="text-[9px] opacity-50">Dark 1</p>
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('obsidian')}
                  className={`p-2.5 rounded-lg border text-left transition ${theme === 'obsidian' ? 'border-emerald-500 bg-emerald-500/10 font-bold' : 'border-inherit opacity-70'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-950 border border-neutral-700" />
                    <span className="text-xs">Obsidian</span>
                  </div>
                  <p className="text-[9px] opacity-50">Dark 2</p>
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('porcelain')}
                  className={`p-2.5 rounded-lg border text-left transition ${theme === 'porcelain' ? 'border-blue-600 bg-blue-50 font-bold text-slate-900' : 'border-inherit opacity-70'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300" />
                    <span className="text-xs">Porcelain</span>
                  </div>
                  <p className="text-[9px] opacity-50">Light 1</p>
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('nordic')}
                  className={`p-2.5 rounded-lg border text-left transition ${theme === 'nordic' ? 'border-amber-700 bg-amber-50 font-bold text-stone-900' : 'border-inherit opacity-70'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f4f0eb] border border-stone-300" />
                    <span className="text-xs">Nordic Sand</span>
                  </div>
                  <p className="text-[9px] opacity-50">Light 2</p>
                </button>
              </div>
            </div>

            {/* Target Goals & Contact */}
            <div className={`p-4 rounded-xl border border-inherit ${curTheme.card} space-y-2.5`}>
              <h3 className="text-xs font-semibold font-mono opacity-75 uppercase">Target Goals & WhatsApp Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] opacity-75 block mb-0.5">Weekly Goal (Hours)</label>
                  <input
                    type="number"
                    value={weeklyGoal}
                    onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] opacity-75 block mb-0.5">WhatsApp (+91...)</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91..."
                    className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                  />
                </div>
              </div>
              <button onClick={savePhoneAndGoal} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">
                Save Profile Parameters
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN */}
        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <div className={`p-4 rounded-xl flex items-center justify-between border ${isLight ? 'bg-red-50 border-red-200 text-red-900' : 'bg-red-950/30 border-red-900/50 text-red-200'}`}>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold">Admin Control Center</h3>
                  <p className="text-xs opacity-75">Manage student permissions, assign moderators, and broadcast alerts.</p>
                </div>
              </div>
            </div>

            <form onSubmit={createBroadcastAnnouncement} className={`p-4 rounded-xl ${curTheme.card} space-y-2`}>
              <h4 className="text-xs font-mono uppercase font-semibold opacity-75 flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5" /> Broadcast Announcement
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Broadcast message to all students..."
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm outline-none ${curTheme.input}`}
                />
                <button type="submit" className={`px-4 py-1.5 rounded-lg text-xs font-medium ${curTheme.btnPrimary}`}>
                  Publish
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider font-mono opacity-60">
                Registered Students Directory ({allUsers.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {allUsers.map((student) => (
                  <div key={student.id} className={`p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${curTheme.card}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{student.display_name || student.email.split('@')[0]}</p>
                        {student.is_blocked && <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">BLOCKED</span>}
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded uppercase border border-inherit">
                          {student.role}
                        </span>
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
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name || student.email.split('@')[0])}
                        className="px-2 py-1 bg-emerald-600/20 text-emerald-600 rounded-md text-xs font-medium border border-emerald-500/30 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3" /> Remind
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspector Modal */}
            {viewingStudent && (
              <div className={`p-4 sm:p-5 rounded-xl space-y-3.5 border shadow-xl ${curTheme.card}`}>
                <div className="flex justify-between items-center border-b border-inherit pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold">Inspector: {viewingStudent.display_name || viewingStudent.email.split('@')[0]}</h3>
                    <p className="text-xs opacity-60">{viewingStudent.email} | Phone: {viewingStudent.phone || 'N/A'}</p>
                  </div>
                  <button onClick={() => setViewingStudent(null)} className="text-xs border border-inherit px-2 py-1 rounded-md">
                    Close
                  </button>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg border border-inherit ${isLight ? 'bg-slate-50' : 'bg-slate-950/40'}`}>
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
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
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