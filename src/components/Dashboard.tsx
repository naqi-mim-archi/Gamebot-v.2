import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUserGames, SavedGame, UserProfile, toggleLike, getUserLikedGameIds, toggleGamePublic, updateGameTitle, deleteUserGame } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import {
  Sparkles, CreditCard, Clock, Play, Gamepad2, CheckCircle2, Loader2,
  Settings, Coins, Heart, Globe, Lock, ExternalLink, Pencil, Check, X, Trash2, Plus
} from 'lucide-react';
import Navbar from '../components/Navbar'; // <-- Switched from TopNav to your proper Navbar
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

// ── Discord icon ───────────────────────────────────────────────
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

// ── Lazy iframe preview ────────────────────────────────────────────────────────
function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const[visible, setVisible] = useState(false);
  const[scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  },[]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (let entry of entries) {
        setScale(entry.contentRect.width / 1280);
      }
    });
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  },[]);

  useEffect(() => {
    if (!visible) return;
    const html = bundleForPreview(files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [visible, files]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#0A0A10] overflow-hidden">
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left"
          style={{ width: '1280px', height: '720px', transform: `scale(${scale})` }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-zinc-800" />
        </div>
      )}
    </div>
  );
}

// ── Inline title editor ───────────────────────────────────────────────────────
function InlineTitle({ game, onSave }: { game: SavedGame; onSave: (id: string, title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const[value, setValue] = useState(game.title || game.prompt.slice(0, 50));
  const inputRef = useRef<HTMLInputElement>(null);

  const start = (e: React.MouseEvent) => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.select(), 30); };
  const cancel = (e: React.MouseEvent) => { e.stopPropagation(); setValue(game.title || game.prompt.slice(0, 50)); setEditing(false); };
  const save = (e?: React.MouseEvent) => { e?.stopPropagation(); if (value.trim() && game.id) onSave(game.id, value.trim()); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(e as any); }}
          maxLength={60}
          className="flex-1 bg-black/50 border border-[#FF00C0]/40 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#FF00C0]"
        />
        <button onClick={save} className="text-[#00AFFF] hover:text-[#00AFFF]/80 p-0.5"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group/title cursor-text" onClick={start}>
      <span className="text-[15px] font-bold text-white truncate flex-1">{value}</span>
      <Pencil className="w-3 h-3 text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

// ── Game Card ─────────────────────────────────────────────────────────────────
interface CardProps {
  game: SavedGame;
  liked: boolean;
  userProfile: UserProfile | null;
  userId: string;
  onNavigate: (game: SavedGame) => void;
  onLikeToggle: (gameId: string) => void;
  onPublicToggle: (gameId: string, current: boolean) => void;
  onDiscordShare: (game: SavedGame) => void;
  onTitleSave: (id: string, title: string) => void;
  onDelete: (gameId: string) => void;
}

function GameCard({
  game, liked, userProfile, onNavigate, onLikeToggle, onPublicToggle,
  onDiscordShare, onTitleSave, onDelete
}: CardProps) {
  const [likePending, setLikePending] = useState(false);
  const[confirmDelete, setConfirmDelete] = useState(false);
  const isPaidTier =['creator', 'pro', 'studio'].includes(userProfile?.tier || '');
  const isTrial = userProfile?.tier === '14-day-trial';

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likePending || !game.id) return;
    setLikePending(true);
    await onLikeToggle(game.id);
    setLikePending(false);
  };

  const handlePublic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!game.id) return;
    onPublicToggle(game.id, !!game.isPublic);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0A0A10]/50 border border-white/5 rounded-[24px] overflow-hidden hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 group relative flex flex-col"
    >
      {/* Updated preview section exactly matching the user profile layout */}
      <div 
        className="relative overflow-hidden w-full aspect-[16/10] border-b border-white/5 bg-black cursor-pointer" 
        onClick={() => onNavigate(game)}
      >
        <GamePreview files={game.files} />
        
        {/* Glow Play Button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <button className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,0,192,0.4)]">
            <Play className="w-6 h-6 fill-current ml-1" />
          </button>
        </div>

        {/* Date Badge */}
        <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider uppercase text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-20">
          {game.createdAt?.toDate ? game.createdAt.toDate().toLocaleDateString() : 'Recently'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        <InlineTitle game={game} onSave={(id, title) => onTitleSave(id, title)} />
        <p className="text-[12px] text-[#B3B6CB] line-clamp-2 leading-relaxed cursor-pointer" onClick={() => onNavigate(game)}>
          {game.prompt}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-[11px] text-[#B3B6CB] font-medium flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors" onClick={() => onNavigate(game)}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF00C0]" />
            {Object.keys(game.files).length} files · Open
          </span>

          <div className="flex items-center gap-2">
            {userProfile?.discordWebhookUrl && (
              <button onClick={(e) => { e.stopPropagation(); onDiscordShare(game); }} title="Share to Discord" className="w-7 h-7 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 transition-all">
                <DiscordIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={isTrial ? undefined : handlePublic}
              title={isTrial ? 'Upgrade to make public' : (game.isPublic ? 'Make private' : 'Make public')}
              disabled={isTrial}
              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                isTrial ? 'bg-white/5 border-white/5 text-zinc-700' : game.isPublic ? 'bg-[#00AFFF]/20 border-[#00AFFF]/30 text-[#00AFFF]' : 'bg-white/5 border-white/10 text-[#B3B6CB] hover:text-white'
              }`}
            >
              {isTrial || game.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleLike}
              disabled={likePending}
              className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-xs font-bold transition-all ${
                liked ? 'bg-[#FF00C0]/20 border-[#FF00C0]/30 text-[#FF00C0]' : 'bg-white/5 border-white/10 text-[#B3B6CB] hover:text-[#FF00C0] hover:border-[#FF00C0]/30'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
              <span>{game.likes ?? 0}</span>
            </button>
            {isPaidTier && (
              confirmDelete ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={e => { e.stopPropagation(); if (game.id) onDelete(game.id); }} className="px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-all">Yes</button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[#B3B6CB] text-[10px] font-bold hover:text-white transition-all">No</button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} title="Delete project" className="w-7 h-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-[#B3B6CB] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Discord Share Modal ───────────────────────────────────────────────────────
function DiscordShareModal({ game, webhookUrl, onClose }: { game: SavedGame; webhookUrl: string; onClose: () => void; }) {
  const[title, setTitle] = useState(game.title || game.prompt.slice(0, 60));
  const [promptText, setPromptText] = useState(game.prompt);
  const[includeTitle, setIncludeTitle] = useState(true);
  const[includePrompt, setIncludePrompt] = useState(true);
  const [sharing, setSharing] = useState(false);
  const[done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleShare = async () => {
    setSharing(true);
    setErr('');
    try {
      const res = await fetch('/api/discord/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, gameName: includeTitle ? title : null, message: includePrompt ? promptText : null, gameId: game.id }),
      });
      if (!res.ok) throw new Error('Failed to share');
      setDone(true);
    } catch (e: any) { setErr(e.message); } finally { setSharing(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#05050A]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sora" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0A0A10] border border-white/10 rounded-[24px] p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <DiscordIcon className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Share to Discord</h3>
          <button onClick={onClose} className="ml-auto text-[#B3B6CB] hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-[#00AFFF]/20 flex items-center justify-center mb-2">
              <Check className="w-6 h-6 text-[#00AFFF]" />
            </div>
            <p className="text-sm text-white font-bold">Posted to Discord!</p>
            <button onClick={onClose} className="text-xs text-[#B3B6CB] hover:text-white mt-2">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3B6CB] mb-2">Game Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF00C0]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3B6CB] mb-3">Include in post</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={includeTitle} onChange={e => setIncludeTitle(e.target.checked)} className="w-4 h-4 accent-[#FF00C0] rounded bg-black/50 border-white/10" />
                  <span className="text-sm text-white group-hover:text-[#FF00C0] transition-colors">Title</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={includePrompt} onChange={e => setIncludePrompt(e.target.checked)} className="w-4 h-4 accent-[#FF00C0] rounded bg-black/50 border-white/10" />
                  <span className="text-sm text-white group-hover:text-[#FF00C0] transition-colors">Prompt</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B3B6CB] mb-2">Prompt</label>
              <textarea value={promptText} onChange={e => setPromptText(e.target.value)} rows={2} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#FF00C0]/50 transition-colors resize-none" />
            </div>
            {err && <p className="text-xs text-red-400 flex items-center gap-1"><X className="w-3 h-3" />{err}</p>}
            <div className="flex gap-3 pt-4">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-bold rounded-xl border border-white/10 text-[#B3B6CB] hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={handleShare} disabled={sharing || (!includeTitle && !includePrompt)} className="flex-1 py-3 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DiscordIcon className="w-4 h-4" />}
                {sharing ? 'Sharing…' : 'Share'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
interface DashboardProps {
  user: any;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export default function Dashboard({ user, userProfile, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const[searchParams, setSearchParams] = useSearchParams();
  const[games, setGames] = useState<SavedGame[]>([]);
  const[loading, setLoading] = useState(true);
  const[showSuccess, setShowSuccess] = useState(false);
  const[loadingPortal, setLoadingPortal] = useState(false);
  const[likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [discordModal, setDiscordModal] = useState<SavedGame | null>(null);

  // Discrete solid glows matching your aesthetic
  const pinkGlowStyle = { boxShadow: '0px 0px 15px 1px rgba(255, 0, 192, 0.4)' };
  const blueGlowStyle = { boxShadow: '0px 0px 15px 1px rgba(0, 175, 255, 0.4)' };

  useEffect(() => {
    if (searchParams.get('session_id')) {
      setShowSuccess(true);
      searchParams.delete('session_id');
      setSearchParams(searchParams);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  },[searchParams, setSearchParams]);

  const handleManageBilling = async () => {
    if (!userProfile?.stripeCustomerId) return;
    setLoadingPortal(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: userProfile.stripeCustomerId, returnUrl: window.location.href }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Failed to create portal session');
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal.');
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    Promise.all([getUserGames(user.uid), getUserLikedGameIds(user.uid)])
      .then(([data, liked]) => { setGames(data); setLikedIds(liked); setLoading(false); })
      .catch((error) => { console.error("Error loading dashboard data:", error); setLoading(false); });
  }, [user, navigate]);

  const handleLikeToggle = useCallback(async (gameId: string) => {
    if (!user) return;
    const wasLiked = likedIds.has(gameId);
    setLikedIds(prev => { const next = new Set(prev); wasLiked ? next.delete(gameId) : next.add(gameId); return next; });
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, likes: Math.max(0, (g.likes ?? 0) + (wasLiked ? -1 : 1)) } : g));
    await toggleLike(gameId, user.uid);
  },[user, likedIds]);

  const handlePublicToggle = useCallback(async (gameId: string, current: boolean) => {
    await toggleGamePublic(gameId, !current);
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, isPublic: !current } : g));
  },[]);

  const handleTitleSave = useCallback(async (gameId: string, title: string) => {
    await updateGameTitle(gameId, title);
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, title } : g));
  },[]);

  const handleDelete = useCallback(async (gameId: string) => {
    await deleteUserGame(gameId);
    setGames(prev => prev.filter(g => g.id !== gameId));
  },[]);

  if (!userProfile || loading) {
    return (
      <div className="min-h-screen bg-[#05050A] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FF00C0]/30 border-t-[#FF00C0] rounded-full animate-spin shadow-[0_0_15px_rgba(255,0,192,0.5)]" />
      </div>
    );
  }
  
  // Extract Name to replace "You"
  const displayName = userProfile.displayName || user.email?.split('@')[0] || 'Builder';

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sora flex flex-col pt-24 selection:bg-[#FF00C0]/30">
      {/* 
        Fixed Header: Using your custom global Navbar 
        instead of TopNav, hooking up the correct user properties.
      */}
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      {/* Main Content Area */}
      <main className="flex-grow max-w-[1200px] mx-auto w-full px-6 pb-24 pt-8">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-12">
          <div>
            <p className="text-[#FF00C0] text-[12px] font-bold tracking-[0.15em] uppercase mb-2">
              Welcome Back, {displayName}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Dashboard</h1>
          </div>
          
          <button onClick={() => navigate(`/profile/${user.uid}`)} className="flex items-center gap-4 py-2 pr-6 pl-2 bg-transparent hover:bg-white/[0.02] border border-white/10 rounded-full transition-all group shrink-0">
            {/* Profile Avatar Circle with Pink Glow */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-[#FF00C0] bg-white border border-white/20 shrink-0 overflow-hidden"
              style={pinkGlowStyle}
            >
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-black">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white leading-tight group-hover:text-[#FF00C0] transition-colors">View Public Profile</p>
              <p className="text-[11px] text-[#B3B6CB] flex items-center gap-1 mt-0.5">See how others view you <ExternalLink className="w-3 h-3" /></p>
            </div>
          </button>
        </motion.div>

        {showSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#00AFFF]/10 border border-[#00AFFF]/30 text-[#00AFFF] p-4 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(0,175,255,0.15)] mb-8">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">Neural Link Established: Payment Successful!</p>
              <p className="text-sm opacity-80">Your account is being updated. It may take a few seconds for your new credits to initialize.</p>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative bg-[#0A0A10]/80 border border-white/5 rounded-[32px] p-8 flex items-center justify-between overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#FF00C0]/10 to-transparent pointer-events-none group-hover:from-[#FF00C0]/20 transition-all duration-500" />
            
            <div className="flex items-center gap-5 relative z-10">
              {/* Credits Circle with Pink Glow */}
              <div 
                className="w-14 h-14 rounded-full border border-white/10 bg-[#05050A] flex items-center justify-center"
                style={pinkGlowStyle}
              >
                <Coins className="w-6 h-6 text-[#FF00C0]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[11px] text-[#B3B6CB] font-bold uppercase tracking-widest mb-1">Credits Balance</p>
                <p className="text-3xl font-bold text-white flex items-baseline gap-2">
                  {userProfile.credits} <span className="text-sm font-medium text-zinc-500">CR</span>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative bg-[#0A0A10]/80 border border-white/5 rounded-[32px] p-8 flex items-center justify-between overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#00AFFF]/10 to-transparent pointer-events-none group-hover:from-[#00AFFF]/20 transition-all duration-500" />

            <div className="flex items-center gap-5 relative z-10">
              {/* Access Level Circle with Blue Glow */}
              <div 
                className="w-14 h-14 rounded-full border border-white/10 bg-[#05050A] flex items-center justify-center"
                style={blueGlowStyle}
              >
                {userProfile.tier === '14-day-trial' ? <Clock className="w-6 h-6 text-[#00AFFF]" strokeWidth={2.5} /> : <CreditCard className="w-6 h-6 text-[#00AFFF]" strokeWidth={2.5} />}
              </div>
              <div>
                <p className="text-[11px] text-[#B3B6CB] font-bold uppercase tracking-widest mb-1">Access Level</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-bold text-white capitalize">
                    {userProfile.tier === '14-day-trial' ? 'Pro' : userProfile.tier.replace(/-/g, ' ')}
                  </p>
                </div>
                {userProfile.stripeCustomerId && (
                  <button onClick={handleManageBilling} disabled={loadingPortal} className="mt-2 text-xs text-[#00AFFF] hover:text-white flex items-center gap-1.5 transition-colors font-medium">
                    {loadingPortal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />} Manage Billing
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Saved Games */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">My Games</h2>
            {/* Clean solid white text */}
            <button 
              onClick={() => navigate('/app')} 
              className="px-5 py-2.5 bg-[#0A0A10]/80 hover:bg-[#0A0A10] text-white rounded-full font-bold transition-colors border border-white/10 flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-[#FF00C0]" /> 
              <span>New Project</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                liked={likedIds.has(game.id!)}
                userProfile={userProfile}
                userId={user.uid}
                onNavigate={g => navigate('/app', { state: { loadGame: g } })}
                onLikeToggle={handleLikeToggle}
                onPublicToggle={handlePublicToggle}
                onDiscordShare={g => setDiscordModal(g)}
                onTitleSave={handleTitleSave}
                onDelete={handleDelete}
              />
            ))}

            {/* "Start a new project" card at the end */}
            <div 
              onClick={() => navigate('/')}
              className="bg-[#0A0A10]/50 border border-white/5 rounded-[24px] flex flex-col items-center justify-center p-8 min-h-[320px] cursor-pointer hover:bg-white/[0.02] hover:border-white/10 transition-all text-center group"
            >
              {/* Plus Circle with Gradient Glow */}
              <div 
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                style={{ boxShadow: '0px 0px 20px 2px rgba(255, 0, 192, 0.4)' }}
              >
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Start a new project</h3>
              <p className="text-[#B3B6CB] text-sm max-w-[200px] leading-relaxed">Type an idea, watch it bloom into a game.</p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />

      <AnimatePresence>
        {discordModal && userProfile?.discordWebhookUrl && (
          <DiscordShareModal
            game={discordModal}
            webhookUrl={userProfile.discordWebhookUrl}
            onClose={() => setDiscordModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}