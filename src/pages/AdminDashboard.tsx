import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CreditCard, Search, 
  Trash2, Gamepad2, Gift, Activity, ChevronRight, 
  BookOpen, ExternalLink, Globe, Lock, ArrowLeft, Plus, Eye, DollarSign, Ban, X
} from 'lucide-react';
import TutorialModal from '../components/TutorialModal';

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

export default function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games' | 'tutorials' | 'billing'>('overview');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-emerald-500/30">
      
      {errorMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl z-50 shadow-2xl font-bold flex items-center gap-2">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-4 hover:opacity-70"><X className="w-4 h-4"/></button>
        </div>
      )}
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-zinc-950 flex flex-col shrink-0 h-full relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <span className="text-zinc-950 font-bold">G</span>
          </div>
          <span className="font-display font-bold text-lg">Admin Panel</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarButton icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <SidebarButton icon={Users} label="User Management" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <SidebarButton icon={Gamepad2} label="Games Moderation" active={activeTab === 'games'} onClick={() => setActiveTab('games')} />
          <SidebarButton icon={BookOpen} label="Tutorials" active={activeTab === 'tutorials'} onClick={() => setActiveTab('tutorials')} />
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
          {activeTab === 'tutorials' && <TabTutorials user={user} onError={setErrorMsg} />}
          {activeTab === 'billing' && <TabBilling user={user} onError={setErrorMsg} />}
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5" /> {label}
      {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
    </button>
  );
}

// ─── TAB 1: OVERVIEW ────────────────────────────────────────────────────────
function TabOverview({ user, onError }: any) {
  const [stats, setStats] = useState({ users: 0, games: 0, recentUsers: [] });
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-16 h-16 text-blue-400"/></div>
          <p className="text-sm text-zinc-400 uppercase tracking-widest font-bold mb-2">Total Users</p>
          <p className="text-5xl font-display font-bold text-white">{stats.users}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Gamepad2 className="w-16 h-16 text-emerald-400"/></div>
          <p className="text-sm text-zinc-400 uppercase tracking-widest font-bold mb-2">Games Built</p>
          <p className="text-5xl font-display font-bold text-white">{stats.games}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-16 h-16 text-emerald-400"/></div>
          <p className="text-sm text-emerald-400 uppercase tracking-widest font-bold mb-2">Est. MRR</p>
          <p className="text-5xl font-display font-bold text-white">${(mrr / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400"/> Recent Signups</h2>
          <div className="space-y-4">
            {stats.recentUsers.map((u: any) => (
              <div key={u.uid} className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400">
                    {(u.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <Link to={`/profile/${u.uid}`} target="_blank" className="font-bold text-white hover:text-emerald-400 transition-colors">
                      {u.displayName || 'Anonymous User'}
                    </Link>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white/5 text-xs font-bold rounded-lg text-emerald-400 uppercase tracking-wider border border-white/10">
                  {u.tier || 'Trial'}
                </span>
              </div>
            ))}
            {stats.recentUsers.length === 0 && <p className="text-zinc-500 text-sm">No recent users found.</p>}
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
           <Activity className="w-16 h-16 text-emerald-500/50 mb-4 animate-pulse" />
           <h3 className="text-xl font-bold">System Health Normal</h3>
           <p className="text-zinc-500 text-sm max-w-sm mt-2">All services are operational. Firebase and Stripe webhooks are actively listening.</p>
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
      alert('User updated!');
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

  const filtered = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold">User Management</h1>
          <p className="text-zinc-400 mt-2">Edit credits, tiers, or delete accounts.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" placeholder="Search email or name..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950 border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-5 font-bold w-full">User</th>
              <th className="px-6 py-5 font-bold">Tier</th>
              <th className="px-6 py-5 font-bold">Credits</th>
              <th className="px-6 py-5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(u => (
              <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-normal">
                  <Link to={`/profile/${u.uid}`} target="_blank" className="font-bold text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5 w-fit">
                    {u.displayName || 'Anonymous'} <ExternalLink className="w-3 h-3 opacity-50" />
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">{u.email}</p>
                </td>
                <td className="px-6 py-4">
                  <select 
                    defaultValue={u.tier || '14-day-trial'} 
                    onChange={(e) => handleUpdate(u.uid, u.credits, e.target.value)}
                    className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500 text-white cursor-pointer"
                  >
                    <option value="14-day-trial">Trial</option>
                    <option value="creator">Creator</option>
                    <option value="pro">Pro</option>
                    <option value="studio">Studio</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" defaultValue={u.credits || 0} id={`credits-${u.uid}`}
                      className="w-24 bg-zinc-800 border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500 text-white"
                    />
                    <button 
                      onClick={() => handleUpdate(u.uid, Number((document.getElementById(`credits-${u.uid}`) as HTMLInputElement).value), u.tier)}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >Save</button>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/profile/${u.uid}`} target="_blank" className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="View Profile">
                      <Eye className="w-4 h-4"/>
                    </Link>
                    <button onClick={() => handleDelete(u.uid)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors" title="Delete/Block User">
                      <Ban className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No users found.</td></tr>
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

  const load = async () => {
    try {
      const token = await user.getIdToken();
      const data = await fetchAdminData('/api/admin/games', token);
      setGames(data.games);
    } catch (e: any) { onError(e.message); }
  };

  useEffect(() => { load(); }, [user]);

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/games/${id}/visibility`, token, 'PATCH', { isPublic: !currentStatus });
      load();
    } catch (e: any) { onError(e.message); }
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
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold">Games Moderation</h1>
        <p className="text-zinc-400 mt-2">Review generated games. Toggle visibility or delete inappropriate content.</p>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950 border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-5 font-bold w-full">Game Info</th>
              <th className="px-6 py-5 font-bold">Creator</th>
              <th className="px-6 py-5 font-bold text-center">Visibility</th>
              <th className="px-6 py-5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {games.map(g => (
              <tr key={g.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-normal min-w-[300px]">
                  <p className="font-bold text-white mb-1 line-clamp-1">{g.title || 'Untitled'}</p>
                  <p className="text-xs text-zinc-500 line-clamp-2">{g.prompt}</p>
                </td>
                <td className="px-6 py-4">
                  <Link to={`/profile/${g.userId}`} target="_blank" className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-emerald-400 hover:underline text-xs">
                    View Profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => handleToggleVisibility(g.id, g.isPublic)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                      g.isPublic ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {g.isPublic ? <><Globe className="w-3 h-3"/> Public</> : <><Lock className="w-3 h-3"/> Private</>}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a href={`/play/${g.id}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Play Game">
                      <ExternalLink className="w-4 h-4"/>
                    </a>
                    <button onClick={() => handleDelete(g.id)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors" title="Delete Game">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No games found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB 4: TUTORIALS MODERATION ─────────────────────────────────────────────
function TabTutorials({ user, onError }: any) {
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [modalState, setModalState] = useState<{isOpen: boolean, mode: 'create'|'view', tutorial?: any}>({isOpen: false, mode: 'create'});

  const load = async () => {
    try {
      const token = await user.getIdToken();
      const data = await fetchAdminData('/api/admin/tutorials', token);
      setTutorials(data.tutorials);
    } catch (e: any) { onError(e.message); }
  };

  useEffect(() => { load(); }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this tutorial permanently?")) return;
    try {
      const token = await user.getIdToken();
      await fetchAdminData(`/api/admin/tutorials/${id}`, token, 'DELETE');
      load();
    } catch (e: any) { onError(e.message); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold">Tutorials Moderation</h1>
          <p className="text-zinc-400 mt-2">Manage community tutorials or post official ones.</p>
        </div>
        <button 
          onClick={() => setModalState({isOpen: true, mode: 'create'})}
          className="px-5 py-2.5 bg-emerald-500 text-black font-bold flex items-center gap-2 rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] w-fit"
        >
          <Plus className="w-4 h-4" /> Create Tutorial
        </button>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-zinc-950 border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-5 font-bold w-full">Title</th>
              <th className="px-6 py-5 font-bold">Author</th>
              <th className="px-6 py-5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tutorials.map(t => (
              <tr key={t.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                  <p className="font-bold text-white line-clamp-2">{t.title}</p>
                </td>
                <td className="px-6 py-4">
                  <Link to={`/profile/${t.userId}`} target="_blank" className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-emerald-400 hover:underline text-xs">
                    {t.authorName} <ExternalLink className="w-3 h-3 opacity-50" />
                  </Link>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setModalState({isOpen: true, mode: 'view', tutorial: t})} className="p-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="View/Edit">
                      <Eye className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tutorials.length === 0 && <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500">No tutorials found.</td></tr>}
          </tbody>
        </table>
      </div>

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

// ─── TAB 5: BILLING & PROMOS ────────────────────────────────────────────────
function TabBilling({ user, onError }: any) {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(20);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const token = await user.getIdToken();
        const data = await fetchAdminData('/api/admin/transactions', token);
        if (data.transactions) setTransactions(data.transactions);
      } catch (e: any) { onError(e.message); }
    }
    load();
  }, [user]);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await user.getIdToken();
      await fetchAdminData('/api/admin/create-promo', token, 'POST', { code: promoCode, discountPercent: discount });
      alert('Promo Code Created!'); 
      setPromoCode('');
    } catch (e: any) { onError(e.message); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold">Billing & Stripe</h1>
        <p className="text-zinc-400 mt-2">Manage promo codes and monitor Stripe transactions.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Promo Creator */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 lg:col-span-1 h-fit">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Gift className="w-6 h-6 text-purple-400"/> Create Promo Code</h2>
          <form onSubmit={handleCreatePromo} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Code Name</label>
              <input type="text" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase().trim())} placeholder="e.g. LAUNCH20" required className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Discount %</label>
              <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min="1" max="100" required className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-purple-500 text-white" />
            </div>
            <button type="submit" className="w-full py-3.5 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)] mt-2">
              Deploy Promo Code
            </button>
          </form>
        </div>

        {/* Transactions Table */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-x-auto lg:col-span-2">
          <div className="p-6 border-b border-white/5">
             <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-emerald-400"/> Recent Stripe Transactions</h2>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-950/50 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Amount</th>
                <th className="px-6 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 ? (
                <tr><td colSpan={3} className="p-12 text-center text-zinc-500">No Recent Transactions</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-zinc-300 font-medium">{t.email}</td>
                  <td className="px-6 py-4 font-bold text-white text-base">${(t.amount / 100).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md border ${t.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}