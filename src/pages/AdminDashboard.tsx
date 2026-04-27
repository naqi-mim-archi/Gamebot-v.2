import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Search,
  Trash2, Gamepad2, Gift, Activity, ChevronRight,
  BookOpen, ExternalLink, Globe, Lock, ArrowLeft, Plus, Eye, DollarSign, Ban, X,
  CheckCircle2, XCircle, Clock, Youtube, Users2, ThumbsUp, Tag, Zap
} from 'lucide-react';
import TutorialModal from '../components/TutorialModal';
import { getPendingTutorials, approveTutorial, rejectTutorial, Tutorial } from '../services/db';

// Helper function to safely fetch JSON
async function fetchAdminData(endpoint: string, token: string, method = 'GET', body?: any) {
  const res = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error('API Request Failed');
  return res.json();
}

// Shared avatar component
function Avatar({ photoURL, displayName, size = 'md' }: { photoURL?: string; displayName?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${dim} rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0`}>
      {photoURL
        ? <img src={photoURL} alt="" className="w-full h-full object-cover" />
        : <span className="font-bold text-zinc-400">{(displayName || 'U')[0].toUpperCase()}</span>
      }
    </div>
  );
}

// Compact profile chip: avatar + first name + external link
function ProfileChip({ uid, photoURL, displayName }: { uid: string; photoURL?: string; displayName?: string }) {
  const firstName = (displayName || 'User').split(' ')[0];
  return (
    <Link
      to={`/profile/${uid}`}
      target="_blank"
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#FF00C0]/30 transition-all group"
    >
      <Avatar photoURL={photoURL} displayName={displayName} size="sm" />
      <span className="text-xs font-medium text-zinc-300 group-hover:text-white">{firstName}</span>
      <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-[#FF00C0]" />
    </Link>
  );
}

export default function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'tutorials' | 'billing'>('overview');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingTutorialCount, setPendingTutorialCount] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-[#FF00C0]/30">

      {errorMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl z-50 shadow-2xl font-bold flex items-center gap-2">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-4 hover:opacity-70"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-zinc-950 flex flex-col shrink-0 h-full relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF00C0] to-[#7C3AED] flex items-center justify-center shadow-[0_0_15px_rgba(255,0,192,0.35)]">
            <span className="text-white font-black text-sm">G</span>
          </div>
          <span className="font-display font-bold text-lg">Admin Panel</span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <SidebarButton icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <SidebarButton icon={Users} label="User Management" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarButton icon={Gamepad2} label="Games" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
          <SidebarButton icon={BookOpen} label="Tutorials" active={activeTab === 'tutorials'} onClick={() => setActiveTab('tutorials')} badge={pendingTutorialCount} />
          <SidebarButton icon={CreditCard} label="Billing & Stripe" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-5 h-5" /> Back to GameBot
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-[#0a0a0a] relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="p-10 max-w-7xl mx-auto relative z-10">
          {activeTab === 'overview' && <TabOverview user={user} onError={setErrorMsg} />}
          {activeTab === 'users' && <TabUsers user={user} onError={setErrorMsg} />}
          {activeTab === 'games' && <TabGames user={user} onError={setErrorMsg} />}
          {activeTab === 'tutorials' && <TabTutorials user={user} onError={setErrorMsg} onPendingCount={setPendingTutorialCount} />}
          {activeTab === 'billing' && <TabBilling user={user} onError={setErrorMsg} />}
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, active, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-[#FF00C0]/10 text-[#FF00C0] border border-[#FF00C0]/25 shadow-[0_0_12px_rgba(255,0,192,0.08)]'
          : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold min-w-[18px] text-center leading-tight">
          {badge}
        </span>
      )}
      {active && !badge && <ChevronRight className="w-4 h-4 opacity-40" />}
    </button>
  );
}

// ─── TAB 1: OVERVIEW ────────────────────────────────────────────────────────
function TabOverview({ user, onError }: any) {
  const [stats, setStats] = useState<{ users: number; games: number; recentUsers: any[] }>({ users: 0, games: 0, recentUsers: [] });
  const [mrr, setMrr] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const token = await user.getIdToken();
        const statData = await fetchAdminData('/api/admin/stats', token);
        setStats(statData);
        const stripeData = await fetchAdminData('/api/admin/transactions', token);
        if (stripeData.mrr) setMrr(stripeData.mrr);
      } catch (e: any) { onError(e.message); }
    }
    load();
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold">Overview</h1>
        <p className="text-zinc-400 mt-2">Platform performance at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-[0.06] group-hover:opacity-10 transition-opacity"><Users className="w-20 h-20 text-blue-400"/></div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Total Users</p>
          <p className="text-5xl font-display font-bold text-white">{stats.users}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-[#FF00C0]/20 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-[0.06] group-hover:opacity-10 transition-opacity"><Gamepad2 className="w-20 h-20 text-[#FF00C0]"/></div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-3">Games Built</p>
          <p className="text-5xl font-display font-bold text-white">{stats.games}</p>
        </div>
        <div className="bg-gradient-to-br from-[#FF00C0]/8 to-[#7C3AED]/8 border border-[#FF00C0]/15 p-6 rounded-2xl relative overflow-hidden group hover:border-[#FF00C0]/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-[0.08] group-hover:opacity-15 transition-opacity"><DollarSign className="w-20 h-20 text-[#FF00C0]"/></div>
          <p className="text-xs text-[#FF00C0]/80 uppercase tracking-widest font-bold mb-3">Est. MRR</p>
          <p className="text-5xl font-display font-bold text-white">${(mrr / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2 text-zinc-300">
            <Activity className="w-4 h-4 text-[#FF00C0]"/> Recent Signups
          </h2>
          <div className="space-y-3">
            {stats.recentUsers.map((u: any) => (
              <div key={u.uid} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar photoURL={u.photoURL} displayName={u.displayName} size="md" />
                  <div className="min-w-0">
                    <ProfileChip uid={u.uid} photoURL={u.photoURL} displayName={u.displayName} />
                    <p className="text-[11px] text-zinc-600 mt-1 truncate max-w-[160px]">{u.email}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white/5 text-[10px] font-bold rounded-lg text-zinc-400 uppercase tracking-wider border border-white/8 shrink-0 ml-2">
                  {u.tier || 'Trial'}
                </span>
              </div>
            ))}
            {stats.recentUsers.length === 0 && <p className="text-zinc-600 text-sm py-4 text-center">No recent users found.</p>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
          <div className="w-14 h-14 rounded-full bg-[#FF00C0]/10 border border-[#FF00C0]/20 flex items-center justify-center mb-4">
            <Activity className="w-6 h-6 text-[#FF00C0] animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white">System Health Normal</h3>
          <p className="text-zinc-500 text-sm max-w-xs mt-2 leading-relaxed">All services operational. Firebase and Stripe webhooks are actively listening.</p>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: USER MANAGEMENT ──────────────────────────────────────────────────
function TabUsers({ user, onError }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const token = await user.getIdToken();
      const data = await fetchAdminData('/api/admin/users', token);
      setUsers(data.users);
    } catch (e: any) { onError(e.message); }
  };

  useEffect(() => { load(); }, [user]);

  const handleUpdate = async (targetUid: string, credits: number, tier: string) => {
    try {
      const token = await user.getIdToken();
      await fetchAdminData('/api/admin/update-user', token, 'POST', { targetUid, credits, tier });
      load();
    } catch (e: any) { onError(e.message); }
  };

  const handleDelete = async (targetUid: string) => {
    if (!window.confirm("Are you SURE you want to delete this user and all their data? This cannot be undone.")) return;
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/users/${targetUid}`, token, 'DELETE');
      load();
    } catch (e: any) { onError(e.message); }
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-display font-bold">User Management</h1>
          <p className="text-zinc-400 mt-2">Edit credits, tiers, or remove accounts.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text" placeholder="Search email or name…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#FF00C0]/50 transition-colors"
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 border-b border-white/5 text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-4 font-bold">User</th>
              <th className="px-5 py-4 font-bold">Tier</th>
              <th className="px-5 py-4 font-bold">Credits</th>
              <th className="px-5 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(u => (
              <tr key={u.uid} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar photoURL={u.photoURL} displayName={u.displayName} size="md" />
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm leading-snug truncate max-w-[160px]">
                        {u.displayName || 'Anonymous'}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate max-w-[160px]">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <select
                    defaultValue={u.tier || '14-day-trial'}
                    onChange={e => handleUpdate(u.uid, u.credits, e.target.value)}
                    className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#FF00C0]/50 text-white cursor-pointer"
                  >
                    <option value="14-day-trial">Trial</option>
                    <option value="creator">Creator</option>
                    <option value="pro">Pro</option>
                    <option value="studio">Studio</option>
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" defaultValue={u.credits || 0} id={`credits-${u.uid}`}
                      className="w-20 bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#FF00C0]/50 text-white"
                    />
                    <button
                      onClick={() => handleUpdate(u.uid, Number((document.getElementById(`credits-${u.uid}`) as HTMLInputElement).value), u.tier)}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                    >Save</button>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ProfileChip uid={u.uid} photoURL={u.photoURL} displayName={u.displayName} />
                    <button
                      onClick={() => handleDelete(u.uid)}
                      className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                      title="Delete User"
                    >
                      <Ban className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-600">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB 3: GAMES MODERATION ─────────────────────────────────────────────────
function TabGames({ user, onError }: any) {
  const [games, setGames] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    try {
      const token = await user.getIdToken();
      const data = await fetchAdminData('/api/admin/games', token);
      setGames(data.games);
    } catch (e: any) { onError(e.message); }
  };

  useEffect(() => { load(); }, [user]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/games/${id}/visibility`, token, 'PATCH', { isPublic: true });
      load();
    } catch (e: any) { onError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleHide = async (id: string) => {
    setActionLoading(id);
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/games/${id}/visibility`, token, 'PATCH', { isPublic: false });
      load();
    } catch (e: any) { onError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this game permanently?")) return;
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/games/${id}`, token, 'DELETE');
      load();
    } catch (e: any) { onError(e.message); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-4xl font-display font-bold">Games Moderation</h1>
        <p className="text-zinc-400 mt-2">Approve, hide, or remove community games.</p>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 border-b border-white/5 text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-5 py-4 font-bold">Game</th>
              <th className="px-5 py-4 font-bold">Creator</th>
              <th className="px-5 py-4 font-bold text-center">Status</th>
              <th className="px-5 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {games.map(g => (
              <tr key={g.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-4 min-w-[260px]">
                  <p className="font-semibold text-white mb-0.5 line-clamp-1">{g.title || 'Untitled'}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 max-w-xs">{g.prompt}</p>
                </td>
                <td className="px-5 py-4">
                  <ProfileChip uid={g.userId} photoURL={g.authorPhoto} displayName={g.authorName} />
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    g.isPublic
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}>
                    {g.isPublic ? <><Globe className="w-3 h-3"/> Public</> : <><Lock className="w-3 h-3"/> Hidden</>}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!g.isPublic ? (
                      <button
                        onClick={() => handleApprove(g.id)}
                        disabled={actionLoading === g.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {actionLoading === g.id ? '…' : 'Approve'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleHide(g.id)}
                        disabled={actionLoading === g.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {actionLoading === g.id ? '…' : 'Hide'}
                      </button>
                    )}
                    <a
                      href={`/play/${g.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      title="Play Game"
                    >
                      <ExternalLink className="w-4 h-4"/>
                    </a>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                      title="Delete Game"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-600">No games found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB 4: TUTORIALS MODERATION ─────────────────────────────────────────────
function TabTutorials({ user, onError, onPendingCount }: any) {
  const [pending, setPending] = useState<Tutorial[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingApproved, setLoadingApproved] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<Tutorial | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{isOpen: boolean, mode: 'create'|'view', tutorial?: any}>({isOpen: false, mode: 'create'});

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const items = await getPendingTutorials();
      setPending(items);
      onPendingCount?.(items.length);
    } catch (e: any) { onError(e.message); }
    finally { setLoadingPending(false); }
  };

  const loadApproved = async () => {
    setLoadingApproved(true);
    try {
      const token = await user.getIdToken();
      const data = await fetchAdminData('/api/admin/tutorials', token);
      setApproved(data.tutorials || []);
    } catch (e: any) { onError(e.message); }
    finally { setLoadingApproved(false); }
  };

  const load = () => { loadPending(); loadApproved(); };
  useEffect(() => { load(); }, [user]);

  const handleApprove = async (t: Tutorial) => {
    setActionLoading(t.id!);
    try {
      await approveTutorial(t.id!);
      await load();
    } catch (e: any) { onError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id!);
    try {
      await rejectTutorial(rejectTarget.id!, rejectReason.trim() || undefined);
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (e: any) { onError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this tutorial permanently?")) return;
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/tutorials/${id}`, token, 'DELETE');
      load();
    } catch (e: any) { onError(e.message); }
  };

  function formatCount(n?: number): string {
    if (!n) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Tutorials</h1>
          <p className="text-zinc-400 mt-2">Review pending submissions and manage approved tutorials.</p>
        </div>
        <button
          onClick={() => setModalState({isOpen: true, mode: 'create'})}
          className="px-5 py-2.5 bg-[#FF00C0] hover:bg-[#FF00C0]/80 text-white font-bold flex items-center gap-2 rounded-xl transition-colors shadow-[0_0_15px_rgba(255,0,192,0.3)] w-fit shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Tutorial
        </button>
      </div>

      {/* ── Pending Review ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white">Pending Review</h2>
          {pending.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold">
              {pending.length}
            </span>
          )}
        </div>

        {loadingPending ? (
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-10 text-center text-zinc-600 text-sm">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-10 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/30" />
            <p className="text-zinc-600 text-sm">No pending tutorials — you're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(t => (
              <div key={t.id} className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-base line-clamp-1">{t.title}</p>
                    <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {t.tags?.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 text-[10px] capitalize">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-4">
                  <ProfileChip uid={t.userId} photoURL={t.authorPhoto} displayName={t.authorName} />
                  {t.videoUrl ? (
                    <>
                      <a href={t.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors">
                        <Youtube className="w-3.5 h-3.5" /> Watch Video <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                      <span className="flex items-center gap-1.5 text-xs">
                        <Users2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-white font-semibold">{formatCount(t.channelSubscribers)}</span>
                        <span className="text-zinc-600">subs</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-white font-semibold">{formatCount(t.videoLikes)}</span>
                        <span className="text-zinc-600">likes</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-600 italic">No video attached</span>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setModalState({isOpen: true, mode: 'view', tutorial: t})}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button
                    onClick={() => handleApprove(t)}
                    disabled={actionLoading === t.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {actionLoading === t.id ? 'Working…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setRejectTarget(t); setRejectReason(''); }}
                    disabled={actionLoading === t.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Approved Tutorials ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Approved Tutorials</h2>
          {approved.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {approved.length}
            </span>
          )}
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 border-b border-white/5 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-4 font-bold">Title</th>
                <th className="px-5 py-4 font-bold">Author</th>
                <th className="px-5 py-4 font-bold text-center">Likes</th>
                <th className="px-5 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {approved.map(t => (
                <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-4 min-w-[220px]">
                    <p className="font-semibold text-white line-clamp-1">{t.title}</p>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{t.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <ProfileChip uid={t.userId} photoURL={t.authorPhoto} displayName={t.authorName} />
                  </td>
                  <td className="px-5 py-4 text-center text-zinc-400 text-xs font-semibold">{t.likes || 0}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModalState({isOpen: true, mode: 'view', tutorial: t})} className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="View">
                        <Eye className="w-4 h-4"/>
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loadingApproved && approved.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-600">No approved tutorials yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setRejectTarget(null)}>
          <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">Reject Tutorial</h3>
                <p className="text-zinc-500 text-sm mt-1 line-clamp-2">"{rejectTarget.title}"</p>
              </div>
              <button onClick={() => setRejectTarget(null)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Reason <span className="text-zinc-600">(optional — internal note)</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Content doesn't meet quality guidelines…"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleRejectConfirm}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {actionLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalState.isOpen && (
        <TutorialModal
          user={user}
          mode={modalState.mode}
          tutorial={modalState.tutorial}
          onClose={() => { setModalState({isOpen: false, mode: 'create'}); load(); }}
          onCreated={() => { setModalState({isOpen: false, mode: 'create'}); load(); }}
          onDeleted={() => { setModalState({isOpen: false, mode: 'create'}); load(); }}
        />
      )}
    </div>
  );
}

// ─── TAB 5: BILLING & PROMOS ─────────────────────────────────────────────────
function TabBilling({ user, onError }: any) {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(20);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [promoSaving, setPromoSaving] = useState(false);

  const loadAll = async () => {
    try {
      const token = await user.getIdToken();
      const [txData, promoData] = await Promise.allSettled([
        fetchAdminData('/api/admin/transactions', token),
        fetchAdminData('/api/admin/promos', token),
      ]);
      if (txData.status === 'fulfilled' && txData.value.transactions) setTransactions(txData.value.transactions);
      if (promoData.status === 'fulfilled' && promoData.value.promos) setPromos(promoData.value.promos);
    } catch (e: any) { onError(e.message); }
  };

  useEffect(() => { loadAll(); }, [user]);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoSaving(true);
    try {
      const token = await user.getIdToken();
      await fetchAdminData('/api/admin/create-promo', token, 'POST', { code: promoCode, discountPercent: discount });
      setPromoCode('');
      loadAll();
    } catch (e: any) { onError(e.message); }
    finally { setPromoSaving(false); }
  };

  const handleDeletePromo = async (id: string) => {
    if (!window.confirm('Delete this promo code?')) return;
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/promos/${id}`, token, 'DELETE');
      loadAll();
    } catch (e: any) { onError(e.message); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-4">
        <h1 className="text-4xl font-display font-bold">Billing & Stripe</h1>
        <p className="text-zinc-400 mt-2">Manage promo codes and monitor Stripe transactions.</p>
      </div>

      {/* Top row: promo creator + promos list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Create promo */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2 text-zinc-300">
            <Gift className="w-4 h-4 text-[#FF00C0]"/> Create Promo Code
          </h2>
          <form onSubmit={handleCreatePromo} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Code Name</label>
              <input
                type="text" value={promoCode}
                onChange={e => setPromoCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="e.g. LAUNCH20" required
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#FF00C0]/50 text-white text-sm transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Discount %</label>
              <input
                type="number" value={discount}
                onChange={e => setDiscount(Number(e.target.value))}
                min="1" max="100" required
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-[#FF00C0]/50 text-white text-sm transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={promoSaving}
              className="w-full py-3 bg-[#FF00C0] hover:bg-[#FF00C0]/80 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(255,0,192,0.25)] flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {promoSaving ? 'Creating…' : 'Deploy Promo Code'}
            </button>
          </form>
        </div>

        {/* Active promos list */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2 text-zinc-300">
            <Tag className="w-4 h-4 text-[#FF00C0]"/> Active Promo Codes
            {promos.length > 0 && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-[#FF00C0]/10 border border-[#FF00C0]/20 text-[#FF00C0] text-[10px] font-bold">{promos.length}</span>
            )}
          </h2>
          {promos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Tag className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-zinc-600 text-sm">No active promo codes</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {promos.map((p: any) => (
                <div key={p.id || p.code} className="flex items-center justify-between px-4 py-3 bg-zinc-950 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white text-sm tracking-wider">{p.code}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FF00C0]/10 border border-[#FF00C0]/20 text-[#FF00C0] text-[10px] font-bold">
                      {p.discountPercent || p.discount}% OFF
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePromo(p.id || p.code)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete promo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#FF00C0]" />
          <h2 className="text-base font-bold text-zinc-300">Recent Stripe Transactions</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/50 text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-4 font-bold">Email</th>
              <th className="px-6 py-4 font-bold">Amount</th>
              <th className="px-6 py-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 ? (
              <tr><td colSpan={3} className="p-12 text-center text-zinc-600">No recent transactions</td></tr>
            ) : transactions.map(t => (
              <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-6 py-4 text-zinc-300 font-medium text-sm">{t.email}</td>
                <td className="px-6 py-4 font-bold text-white">${(t.amount / 100).toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg border ${
                    t.status === 'succeeded'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
