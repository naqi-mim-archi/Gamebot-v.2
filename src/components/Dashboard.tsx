import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUserGames, SavedGame, UserProfile, toggleLike, getUserLikedGameIds, toggleGamePublic, updateGameTitle, deleteUserGame } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import {
  Sparkles, CreditCard, Clock, Play, Gamepad2, CheckCircle2, Loader2,
  Settings, Coins, Heart, Globe, Lock, ExternalLink, Pencil, Check, X, Trash2
} from 'lucide-react';
import TopNav from './TopNav';
import { motion, AnimatePresence } from 'motion/react';

// ── Discord icon (not in lucide) ───────────────────────────────────────────────
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

// ── Lazy iframe preview ────────────────────────────────────────────────────────
// 1. Replace your GamePreview function completely:
function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.25); // Default scale fallback

  // 1. Observe when it comes into view so we don't load 50 iframes at once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 2. Observe the container's exact pixel width to mathematically scale the 1280x720 game
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (let entry of entries) {
        // Our games are generated assuming a 1280x720 screen.
        // We divide the card's real pixel width by 1280 to get the exact perfect scale.
        setScale(entry.contentRect.width / 1280);
      }
    });
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  }, []);

  // 3. Inject the bundled game code
  useEffect(() => {
    if (!visible) return;
    const html = bundleForPreview(files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [visible, files]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-zinc-950 overflow-hidden">
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left"
          style={{ 
            width: '1280px', 
            height: '720px', 
            transform: `scale(${scale})` 
          }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-zinc-700" />
        </div>
      )}
    </div>
  );
}

// ── Game Card ─────────────────────────────────────────────────────────────────
// ── Inline title editor ───────────────────────────────────────────────────────
function InlineTitle({ game, onSave }: { game: SavedGame; onSave: (id: string, title: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(game.title || game.prompt.slice(0, 50));
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
          className="flex-1 bg-zinc-800 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/70"
        />
        <button onClick={save} className="text-emerald-400 hover:text-emerald-300 p-0.5"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group/title cursor-text" onClick={start}>
      <span className="text-sm font-semibold text-white truncate flex-1">{value}</span>
      <Pencil className="w-3 h-3 text-zinc-600 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPaidTier = ['creator', 'pro', 'studio'].includes(userProfile?.tier || '');
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

  const handleDiscord = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDiscordShare(game);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-3xl overflow-hidden hover:glass-panel-active transition-all duration-300 group relative flex flex-col"
    >
      {/* Preview area — click goes to game */}
      <div
        className="relative cursor-pointer aspect-video w-full"
        onClick={() => onNavigate(game)}
      >
        <GamePreview files={game.files} />
        {/* dark gradient overlay */}
         <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
        {/* play icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
        {/* date badge */}
        <span className="absolute top-2 right-2 text-[10px] font-mono text-zinc-400 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-white/5">
          {game.createdAt?.toDate ? game.createdAt.toDate().toLocaleDateString() : 'Recently'}
        </span>
      </div>

      {/* Card body — clicking the title/prompt area also opens the editor */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <InlineTitle game={game} onSave={(id, title) => onTitleSave(id, title)} />
        <p
          className="text-[10px] text-zinc-500 line-clamp-1 leading-relaxed cursor-pointer"
          onClick={() => onNavigate(game)}
        >
          {game.prompt}
        </p>

        {/* Bottom row: file count + actions */}
        <div className="flex items-center justify-between mt-auto">
          <span
            className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 cursor-pointer hover:text-zinc-300 transition-colors"
            onClick={() => onNavigate(game)}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            {Object.keys(game.files).length} files · open
          </span>

          <div className="flex items-center gap-1.5">
            {/* Discord icon — only when webhook exists */}
            {userProfile?.discordWebhookUrl && (
              <button
                onClick={handleDiscord}
                title="Share to Discord"
                className="w-7 h-7 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:text-indigo-300 transition-all"
              >
                <DiscordIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Public toggle — disabled for trial users */}
            <button
              onClick={isTrial ? undefined : handlePublic}
              title={isTrial ? 'Upgrade to make games private' : (game.isPublic ? 'Make private' : 'Make public (appears in Showcase)')}
              disabled={isTrial}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                isTrial
                  ? 'bg-white/3 border-white/5 text-zinc-700 cursor-not-allowed'
                  : game.isPublic
                    ? 'bg-sky-500/20 border-sky-500/30 text-sky-400 hover:bg-sky-500/30'
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {/* Trial users always show Globe (always public) */}
              {isTrial || game.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={likePending}
              title="Like"
              className={`flex items-center gap-1 px-2 h-7 rounded-lg border text-xs font-medium transition-all ${
                liked
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
                  : 'bg-white/5 border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10'
              }`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} />
              <span>{game.likes ?? 0}</span>
            </button>
            {/* Delete button — paid tiers only */}
            {isPaidTier && (
              confirmDelete ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-zinc-400">Sure?</span>
                  <button
                    onClick={e => { e.stopPropagation(); if (game.id) onDelete(game.id); }}
                    className="px-1.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-semibold hover:bg-red-500/30 transition-all"
                  >
                    Yes
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                    className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-semibold hover:text-white transition-all"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                  title="Delete project"
                  className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                >
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
function DiscordShareModal({
  game,
  webhookUrl,
  onClose,
}: {
  game: SavedGame;
  webhookUrl: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(game.title || game.prompt.slice(0, 60));
  const [promptText, setPromptText] = useState(game.prompt);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includePrompt, setIncludePrompt] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleShare = async () => {
    setSharing(true);
    setErr('');
    try {
      const res = await fetch('/api/discord/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          gameName: includeTitle ? title : null,
          message: includePrompt ? promptText : null,
          gameId: game.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to share');
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <DiscordIcon className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Share to Discord</h3>
          <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Check className="w-10 h-10 text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">Posted to Discord!</p>
            <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white mt-2">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Title field */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Game Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={60}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Checkboxes */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Include in post</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={includeTitle} onChange={e => setIncludeTitle(e.target.checked)} className="w-4 h-4 accent-indigo-500 rounded" />
                  <span className="text-sm text-zinc-300">Title</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[160px]">"{title}"</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={includePrompt} onChange={e => setIncludePrompt(e.target.checked)} className="w-4 h-4 accent-indigo-500 rounded" />
                  <span className="text-sm text-zinc-300">Prompt</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[160px]">"{promptText.slice(0, 40)}"</span>
                </label>
              </div>
            </div>

            {/* Prompt field */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Prompt</label>
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                rows={2}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            {err && <p className="text-xs text-red-400 flex items-center gap-1"><X className="w-3 h-3" />{err}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2 text-xs rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleShare}
                disabled={sharing || (!includeTitle && !includePrompt)}
                className="flex-1 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DiscordIcon className="w-3.5 h-3.5" />}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [discordModal, setDiscordModal] = useState<SavedGame | null>(null);

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
    if (!user) { navigate('/'); return; }
    
    Promise.all([
      getUserGames(user.uid),
      getUserLikedGameIds(user.uid),
    ])
      .then(([data, liked]) => {
        setGames(data);
        setLikedIds(liked);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading dashboard data:", error);
        setLoading(false); // <--- This prevents the infinite spinner
      });
  }, [user, navigate]);

  const handleLikeToggle = useCallback(async (gameId: string) => {
    if (!user) return;
    const wasLiked = likedIds.has(gameId);
    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(gameId) : next.add(gameId);
      return next;
    });
    setGames(prev => prev.map(g =>
      g.id === gameId ? { ...g, likes: Math.max(0, (g.likes ?? 0) + (wasLiked ? -1 : 1)) } : g
    ));
    await toggleLike(gameId, user.uid);
  }, [user, likedIds]);

  const handlePublicToggle = useCallback(async (gameId: string, current: boolean) => {
    await toggleGamePublic(gameId, !current);
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, isPublic: !current } : g));
  }, []);

  const handleTitleSave = useCallback(async (gameId: string, title: string) => {
    await updateGameTitle(gameId, title);
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, title } : g));
  }, []);

  const handleDelete = useCallback(async (gameId: string) => {
    await deleteUserGame(gameId);
    setGames(prev => prev.filter(g => g.id !== gameId));
  }, []);

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

      <TopNav user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="p-6 max-w-6xl mx-auto space-y-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <h1 className="text-3xl font-display font-bold tracking-tight">Command Center</h1>
          
          {/* Public Profile Button */}
          <button
            onClick={() => navigate(`/profile/${user.uid}`)}
            className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 rounded-xl transition-colors w-fit"
          >
            {userProfile.photoURL ? (
              <img src={userProfile.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                {(userProfile.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-bold text-white leading-tight">View Public Profile</p>
              <p className="text-xs text-zinc-400 leading-tight">See how others view you</p>
            </div>
          </button>
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
            </div>
          )}
        </motion.div>
      </main>

      {/* Modals */}
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
