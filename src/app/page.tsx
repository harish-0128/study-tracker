'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle2, Circle, Plus, Trash2, BookOpen, Code2, RotateCcw, 
  Clock, AlertCircle, LogOut, Trophy, Calendar as CalendarIcon, 
  LayoutDashboard, User, ShieldAlert, Flame, MessageSquare, 
  Users, Send, Check, X, PhoneCall, ExternalLink
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

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  profiles?: Profile;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_name: string;
  message: string;
  created_at: string;
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

  // Phone update state
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
      else alert('Account registered! Please sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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
    alert('Log & Points Saved!');
  };

  const savePhone = async () => {
    if (!profile) return;
    await supabase.from('profiles').update({ phone: phoneNumber }).eq('id', profile.id);
    alert('Phone updated for WhatsApp reminders!');
  };

  // Group & Discussion System
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
      alert('Join request submitted to Admin!');
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

  // Admin Analytics & Request Control
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
      alert('Student has not configured their phone number yet.');
      return;
    }
    const cleanPhone = studentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hi ${studentName}! Friendly reminder from StudyQuest: Don't forget to complete your daily study tasks and log your study hours tonight! 🚀`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  useEffect(() => {
    if (activeTab === 'discussions') loadGroups();
    if (activeTab === 'admin' && profile?.role === 'admin') loadAdminControlData();
    if (activeTab === 'leaderboard') {
      supabase.from('profiles').select('*').order('points', { ascending: false }).limit(50).then(({ data }) => setLeaderboard(data || []));
    }
  }, [activeTab]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-cyan-400 font-mono">Loading StudyQuest...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[#07090e]">
        <div className="w-full max-w-sm rounded-2xl bg-slate-900/80 backdrop-blur-xl p-8 border border-slate-800 shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
              <Trophy className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-slate-100">StudyQuest</h1>
          <p className="text-xs text-center text-slate-400 mb-6">Social Study Tracker & Discussion Hub</p>
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
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <button
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-center text-xs text-slate-400 mt-4 hover:text-cyan-400 transition"
          >
            {authMode === 'login' ? "New student? Sign up" : "Existing student? Sign in"}
          </button>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-24">
      {/* Header */}
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
          <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-red-400 p-2 rounded-lg transition">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* TODAY'S DASHBOARD */}
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
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition flex items-center gap-1 shrink-0">
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
                      newTaskTier === tier ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'
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
                <p className="text-sm text-slate-500 italic bg-slate-900/20 p-4 rounded-lg border border-slate-800/60 text-center">No objectives added yet.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-900/50 border-slate-800 text-slate-200">
                    <div onClick={() => toggleTask(task)} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      {task.is_completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-slate-500 shrink-0" />}
                      <span className={`text-sm truncate ${task.is_completed ? 'line-through text-slate-500' : ''}`}>{task.title}</span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-slate-500 hover:text-red-400 p-1 transition ml-2 shrink-0">
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
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Doubts / Topics to Review
                </label>
                <textarea
                  rows={2}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>
              <button onClick={saveDailyLog} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium rounded-lg transition border border-slate-700">
                Save & Claim XP
              </button>
            </section>
          </div>
        )}

        {/* DISCUSSION GROUPS */}
        {activeTab === 'discussions' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {!activeGroup ? (
              <div className="space-y-4">
                {profile?.role === 'admin' && (
                  <form onSubmit={createGroup} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h3 className="text-xs font-mono uppercase text-cyan-400 font-bold">Admin: Create New Discussion Group</h3>
                    <input
                      type="text"
                      placeholder="Group Title (e.g. Deep Learning Discussion)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Group Description / Topics"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                    <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium">
                      Create Group
                    </button>
                  </form>
                )}

                <h3 className="text-xs font-mono uppercase text-slate-400">Available Discussion Groups</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((grp) => {
                    const status = myMemberships[grp.id];
                    const isApproved = status === 'approved' || profile?.role === 'admin';
                    return (
                      <div key={grp.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-100">{grp.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{grp.description || 'General study and Q&A group.'}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          {isApproved ? (
                            <button
                              onClick={() => loadGroupMessages(grp)}
                              className="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium hover:bg-cyan-600/30"
                            >
                              Enter Discussion
                            </button>
                          ) : status === 'pending' ? (
                            <span className="text-xs text-amber-400 font-mono">Approval Pending</span>
                          ) : (
                            <button
                              onClick={() => requestToJoinGroup(grp.id)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium hover:bg-slate-700"
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
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-100">{activeGroup.title}</h3>
                    <p className="text-xs text-slate-400">{activeGroup.description}</p>
                  </div>
                  <button onClick={() => setActiveGroup(null)} className="text-xs text-slate-400 hover:text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg">
                    Back to Groups
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {groupMessages.length === 0 ? (
                    <p className="text-center text-slate-500 text-xs italic my-auto">No questions yet. Post the first question!</p>
                  ) : (
                    groupMessages.map((msg) => (
                      <div key={msg.id} className={`p-3 rounded-xl max-w-[80%] ${msg.sender_name === profile?.display_name ? 'ml-auto bg-cyan-950/40 border border-cyan-500/30' : 'bg-slate-950 border border-slate-800'}`}>
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className="text-xs font-bold text-cyan-400">{msg.sender_name}</span>
                          <span className="text-[10px] text-slate-500">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-slate-200">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={postGroupMessage} className="p-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a question or reply..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                  <button type="submit" className="p-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
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
                    student.id === user.id ? 'bg-cyan-950/30 border-cyan-500/40 shadow-md' : 'bg-slate-900/40 border-slate-800/80'
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

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-mono">WhatsApp Number (with country code, e.g. +91...)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210"
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <button onClick={savePhone} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium">
                  Save Phone
                </button>
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
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-200">Admin Control Center</h3>
                  <p className="text-xs text-slate-400">Manage member join requests and inspect student analytics.</p>
                </div>
              </div>
            </div>

            {/* Join Requests */}
            <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-mono uppercase text-amber-400 font-bold">Pending Group Join Requests ({adminRequests.length})</h4>
              {adminRequests.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No pending requests right now.</p>
              ) : (
                adminRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                    <div>
                      <span className="text-xs font-bold text-slate-200">{req.profiles?.display_name}</span>
                      <span className="text-xs text-slate-400"> wants to join </span>
                      <span className="text-xs text-cyan-400 font-medium">{req.discussion_groups?.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateMemberStatus(req.id, 'approved')} className="p-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded hover:bg-emerald-600/30">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateMemberStatus(req.id, 'rejected')} className="p-1.5 bg-red-600/20 border border-red-500/40 text-red-400 rounded hover:bg-red-600/30">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Students List & WhatsApp trigger */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-slate-400">All Registered Students & Analytics ({allUsers.length})</h4>
              <div className="grid grid-cols-1 gap-2">
                {allUsers.map((student) => (
                  <div key={student.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{student.display_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{student.email} • {student.points} XP</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => inspectStudent(student)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-medium border border-slate-700"
                      >
                        View Logs
                      </button>
                      <button
                        onClick={() => triggerWhatsAppReminder(student.phone || '', student.display_name)}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/30 flex items-center gap-1"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> WhatsApp Reminder
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Analytics Modal/Section */}
            {viewingStudent && (
              <div className="bg-slate-900 border border-cyan-500/40 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-cyan-400">Recent Activity: {viewingStudent.display_name}</h4>
                  <button onClick={() => setViewingStudent(null)} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedStudentLogs.length === 0 ? (
                    <p className="text-xs text-slate-500">No recent logs recorded.</p>
                  ) : (
                    selectedStudentLogs.map((item, i) => (
                      <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between font-mono text-slate-400">
                          <span>{item.date}</span>
                          <span className="text-cyan-400 font-bold">{item.hours_studied} hrs</span>
                        </div>
                        {item.blockers && <p className="text-amber-400/90 italic">Blocker: {item.blockers}</p>}
                        <div className="pt-1">
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

      {/* Bottom Sticky Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 py-2 px-4">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Today</span>
          </button>
          <button onClick={() => setActiveTab('discussions')} className={`flex flex-col items-center gap-1 ${activeTab === 'discussions' ? 'text-cyan-400' : 'text-slate-400'}`}>
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">Groups</span>
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'leaderboard' ? 'text-cyan-400' : 'text-slate-400'}`}>
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] font-medium">Rankings</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-cyan-400' : 'text-slate-400'}`}>
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
          {profile?.role === 'admin' && (
            <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 ${activeTab === 'admin' ? 'text-red-400' : 'text-slate-400'}`}>
              <ShieldAlert className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}