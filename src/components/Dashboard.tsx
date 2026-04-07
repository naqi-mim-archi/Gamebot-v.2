import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUserGames, SavedGame, UserProfile } from '../services/db';
import { Sparkles, CreditCard, Clock, Play, ArrowLeft, Gamepad2, CheckCircle2, Loader2, Settings, Coins } from 'lucide-react';
import TopNav from './TopNav';
import { motion } from 'motion/react';

interface DashboardProps {
  user: any;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Dashboard({ user, userProfile, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    if (searchParams.get('session_id')) {
      setShowSuccess(true);
      searchParams.delete('session_id');
      setSearchParams(searchParams);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams, setSearchParams]);

  const handleManageBilling = async () => {
    if (!userProfile?.stripeCustomerId) return;
    setLoadingPortal(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: userProfile.stripeCustomerId,
          returnUrl: window.location.href,
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal.');
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    getUserGames(user.uid).then(data => {
      setGames(data);
      setLoading(false);
    });
  }, [user, navigate]);

  if (!userProfile || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
      </div>
    );
  }

  const daysLeft = userProfile.trialEndDate 
    ? Math.max(0, Math.ceil((userProfile.trialEndDate - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans relative overflow-hidden pt-[72px]">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      <div className="glow-orb glow-orb-cyan w-[500px] h-[500px] top-[-100px] left-[-100px]"></div>
      
      <TopNav 
        user={user} 
        userProfile={userProfile} 
        onLogout={onLogout}
      />

      <main className="p-6 max-w-6xl mx-auto space-y-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button onClick={() => navigate('/')} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-display font-bold tracking-tight">Command Center</h1>
        </motion.div>

        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
          >
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold font-display">Neural Link Established: Payment Successful!</p>
              <p className="text-sm text-emerald-400/80">Your account is being updated. It may take a few seconds for your new credits to initialize.</p>
            </div>
          </motion.div>
        )}

          {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Coins className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Credits Balance</p>
              <p className="text-3xl font-display font-bold text-white">{userProfile.credits} <span className="text-lg text-zinc-500 font-normal">CR</span></p>
            </div>
          </motion.div>
          
          {userProfile.tier !== '14-day-trial' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <CreditCard className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Access Level</p>
                <p className="text-3xl font-display font-bold text-white capitalize">{userProfile.tier.replace(/-/g, ' ')}</p>
                {userProfile.stripeCustomerId && (
                  <button 
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                    className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-medium bg-cyan-500/10 px-2 py-1 rounded-md"
                  >
                    {loadingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                    Manage Billing
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-panel p-6 rounded-3xl flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shrink-0 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <Clock className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400 font-medium uppercase tracking-wider">System Trial</p>
                <p className="text-3xl font-display font-bold text-white">{daysLeft} <span className="text-lg text-zinc-500 font-normal">Days Left</span></p>
                {userProfile.stripeCustomerId && (
                  <button 
                    onClick={handleManageBilling}
                    disabled={loadingPortal}
                    className="mt-1 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors font-medium bg-violet-500/10 px-2 py-1 rounded-md"
                  >
                    {loadingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                    Manage Billing
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Saved Games */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-white">Project Cartridges</h2>
            <button 
              onClick={() => navigate('/app')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10 flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              New Project
            </button>
          </div>
          
          {games.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-3xl border-dashed border-2 border-white/10">
              <Gamepad2 className="w-16 h-16 text-zinc-600 mx-auto mb-6 opacity-50" />
              <p className="text-xl font-display text-zinc-400 mb-2">No projects found in the mainframe.</p>
              <p className="text-zinc-500 mb-8 max-w-md mx-auto">Start generating your first game to see it saved here automatically.</p>
              <button 
                onClick={() => navigate('/app')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Initialize Engine
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  key={game.id} 
                  className="glass-panel p-6 rounded-3xl hover:glass-panel-active transition-all duration-300 group cursor-pointer relative overflow-hidden" 
                  onClick={() => navigate('/app', { state: { loadGame: game } })}
                >
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors border border-white/10 group-hover:border-emerald-500/30">
                      <Play className="w-5 h-5 ml-1" />
                    </div>
                    <span className="text-xs font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {game.createdAt?.toDate ? game.createdAt.toDate().toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-3 mb-6 font-medium relative z-10">
                    "{game.prompt}"
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono relative z-10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                    {Object.keys(game.files).length} files generated
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
