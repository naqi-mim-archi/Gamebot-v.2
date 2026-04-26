import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Heart, Gamepad2, Loader2,
  Search, GitFork,
  Trophy, Sparkles, Users,
  Star, Flame, Crown, Swords, Puzzle, Car, ArrowRight, Shield, Coffee
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, deleteDoc, onSnapshot, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame, toggleLike, getUserLikedGameIds } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Helpers ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'Action', icon: Swords },
  { id: 'Puzzle', icon: Puzzle },
  { id: 'Racing', icon: Car },
  { id: 'RPG', icon: Shield },
  { id: 'Arcade', icon: Gamepad2 },
  { id: 'Casual', icon: Coffee },
];

const ALL_GAMES_FILTERS = ['All', 'Action', 'Racing', 'Puzzle', 'RPG', 'Arcade', 'Casual', 'Cute', 'Adventure'];

function formatCount(num: number | undefined): string {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getCategoryForGame(game: ShowcaseGame): string {
  const text = ((game.prompt || '') + ' ' + (game.title || '')).toLowerCase();
  if (text.includes('race') || text.includes('car') || text.includes('drive') || text.includes('drift')) return 'Racing';
  if (text.includes('rpg') || text.includes('quest') || text.includes('dungeon') || text.includes('knight') || text.includes('magic')) return 'RPG';
  if (text.includes('puzzle') || text.includes('logic') || text.includes('match') || text.includes('memory') || text.includes('maze')) return 'Puzzle';
  if (text.includes('shoot') || text.includes('fight') || text.includes('action') || text.includes('survival') || text.includes('ninja')) return 'Action';
  if (text.includes('arcade') || text.includes('retro') || text.includes('score') || text.includes('coin') || text.includes('pixel')) return 'Arcade';
  if (text.includes('cute') || text.includes('barbie') || text.includes('kawaii') || text.includes('pink')) return 'Cute';
  if (text.includes('adventure') || text.includes('explore') || text.includes('journey') || text.includes('platformer')) return 'Adventure';
  if (text.includes('relax') || text.includes('chill') || text.includes('peaceful') || text.includes('garden')) return 'Relaxing';
  if (text.includes('simulat') || text.includes('tycoon') || text.includes('manage') || text.includes('build')) return 'Simulation';
  return 'Casual';
}

// ── Lazy iframe preview ────────────────────────────────────────────────────────
function GamePreview({ files, initialDelay = 300 }: { files: Record<string, string>; initialDelay?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [transform, setTransform] = useState({ scale: 0.25, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timeoutId: NodeJS.Timeout;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { timeoutId = setTimeout(() => setShouldLoad(true), 300); }
        else clearTimeout(timeoutId);
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(timeoutId); };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const scale = Math.max(width / 1280, height / 720);
        setTransform({ scale, offsetX: (width - 1280 * scale) / 2, offsetY: (height - 720 * scale) / 2 });
      }
    });
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    const html = bundleForPreview(files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [shouldLoad, files]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden pointer-events-none">
      {shouldLoad ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left bg-black"
          style={{ width: '1280px', height: '720px', transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})` }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#FF00C0] animate-spin" />
        </div>
      )}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ShowcaseGame extends SavedGame {
  creatorName?: string;
  creatorPhoto?: string;
  displayCategory?: string;
}

async function fetchCreatorInfo(uid: string): Promise<{ displayName?: string; photoURL?: string }> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return {};
    const data = snap.data();
    return { displayName: data.displayName, photoURL: data.photoURL };
  } catch { return {}; }
}

// ── Featured Hero Grid ──────────────────────────────────────────────────────────
function FeaturedHero({ games, navigate }: { games: ShowcaseGame[]; navigate: (p: string) => void }) {
  if (!games || games.length === 0) return null;
  const top5 = games.slice(0, 5);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-2 gap-4 lg:h-[480px]">
      {top5.map((game, idx) => {
        const isLarge = idx === 0;
        const displayTitle = game.title || game.prompt.substring(0, 30);
        return (
          <div
            key={game.id}
            onClick={() => navigate(`/play/${game.id}`)}
            className={`group cursor-pointer relative rounded-3xl overflow-hidden bg-[#0A0A10] border border-white/5 hover:border-[#FF00C0]/40 hover:shadow-[0_0_30px_rgba(255,0,192,0.15)] transition-all duration-300 ${isLarge ? 'lg:col-span-2 lg:row-span-2' : ''}`}
          >
            <div className="absolute inset-0 z-0 bg-black"><GamePreview files={game.files} /></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A10] via-[#0A0A10]/40 to-transparent z-10" />
            <div className="absolute top-4 left-5 z-20">
              <span className={`font-black drop-shadow-lg ${isLarge ? 'text-6xl text-[#FF00C0]/60' : 'text-3xl text-white/50'}`}>{idx + 1}</span>
            </div>
            <div className={`absolute bottom-0 left-0 w-full z-20 flex flex-col ${isLarge ? 'p-8' : 'p-4'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-[#FF00C0] text-white text-[9px] font-black uppercase tracking-wider rounded">{game.displayCategory}</span>
              </div>
              <h3 className={`font-bold text-white leading-tight truncate group-hover:text-[#00AFFF] transition-colors ${isLarge ? 'text-4xl mb-2' : 'text-lg mb-1'}`}>{displayTitle}</h3>
              {isLarge && <p className="text-zinc-300 text-sm mb-5 line-clamp-2 max-w-md">{game.prompt}</p>}
              <div className="flex items-center justify-between mt-auto">
                {isLarge ? (
                  <button className="bg-[#FF00C0] hover:bg-[#FF00C0]/90 text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,192,0.4)] transition-all">
                    <Play className="w-4 h-4 fill-current" /> Play Now
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                    {game.creatorPhoto ? (
                      <img src={game.creatorPhoto} alt="" className="w-4 h-4 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] flex items-center justify-center text-[8px] font-bold text-white">
                        {(game.creatorName || 'A')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="truncate max-w-[80px]">{game.creatorName || 'Anonymous'}</span>
                  </div>
                )}
                <div className={`flex items-center gap-3 ${isLarge ? 'text-sm text-zinc-300' : 'text-[10px] text-zinc-400'}`}>
                  <span className="flex items-center gap-1 text-[#00AFFF]"><Play className="w-3 h-3 fill-current" />{(game.playCount ?? 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1 hover:text-[#FF00C0] transition-colors"><Heart className="w-3 h-3" />{(game.likes ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Game Card ──────────────────────────────────────────────────────────────────
function GameCard({ game, onClick, onLike, isLiked, onSpinOff, className = '', initialDelay }: any) {
  const displayTitle = game.title || game.prompt.substring(0, 30);
  return (
    <div
      className={`group cursor-pointer flex flex-col relative rounded-[20px] bg-[#0A0A10] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden h-full ${className}`}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        <GamePreview files={game.files} initialDelay={initialDelay} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-[0_0_24px_rgba(255,0,192,0.5)]">
            <Play className="w-6 h-6 text-white ml-0.5 fill-white" />
          </div>
        </div>
        <div className="absolute top-3 left-3 z-20">
          <span className="px-2.5 py-1 rounded-full bg-[#FF00C0] text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">{game.displayCategory}</span>
        </div>
      </div>
      <div className="flex flex-col p-4 gap-2 flex-1">
        <h3 className="text-[15px] font-bold text-white group-hover:text-[#00AFFF] transition-colors leading-snug line-clamp-2 min-h-[2.5rem]">{displayTitle}</h3>
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#00AFFF]"><Play className="w-3 h-3 fill-[#00AFFF]" />{formatCount(game.playCount)}</span>
            <button onClick={onLike} className={`flex items-center gap-1 transition-colors hover:text-[#FF00C0] ${isLiked ? 'text-[#FF00C0]' : ''}`}>
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />{formatCount(game.likes)}
            </button>
          </div>
          <button onClick={e => { e.stopPropagation(); onSpinOff?.(e, game); }} className="flex items-center gap-1 text-zinc-500 transition-all group/spin hover:text-[#FF00C0]">
            <GitFork className="w-3 h-3 transition-colors" />
            <span className="group-hover/spin:text-transparent group-hover/spin:bg-clip-text group-hover/spin:bg-gradient-to-r group-hover/spin:from-[#FF00C0] group-hover/spin:to-[#00AFFF]">Spin Off</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 mt-auto">
          {game.creatorPhoto ? (
            <img src={game.creatorPhoto} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#00AFFF]/20 border border-[#00AFFF]/30 flex items-center justify-center text-[9px] font-bold text-[#00AFFF] shrink-0">
              {(game.creatorName || 'A')[0].toUpperCase()}
            </div>
          )}
          <span className="text-[11px] text-zinc-500 truncate">{game.creatorName || 'Anonymous'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Top Creators Marquee ───────────────────────────────────────────────────────
function TopCreatorsMarquee({ creators, navigate }: { creators: { userId: string; name: string; photo: string; gameCount: number }[]; navigate: (p: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const doubled = [...creators, ...creators, ...creators];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = () => {
      if (!pausedRef.current) {
        posRef.current += 0.6;
        const thirdWidth = track.scrollWidth / 3;
        if (posRef.current >= thirdWidth) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [creators]);

  return (
    <div
      className="bg-[#0A0A10] border-y border-[#FF00C0]/20 py-3 overflow-hidden relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-[#05050A] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-[#05050A] to-transparent z-10 pointer-events-none" />
      <div ref={trackRef} className="flex gap-4 w-max px-4">
        {doubled.map((creator, idx) => (
          <button
            key={`${creator.userId}-${idx}`}
            onClick={() => navigate(`/profile/${creator.userId}`)}
            className="flex items-center gap-3 flex-shrink-0 hover:bg-white/5 rounded-full pr-4 pl-2 py-1.5 transition-colors"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FF00C0]/20 text-[#FF00C0] text-[10px] font-bold border border-[#FF00C0]/30">
              {(idx % creators.length) + 1}
            </span>
            {creator.photo ? (
              <img src={creator.photo} alt={creator.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00AFFF]/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] flex items-center justify-center text-[12px] font-bold text-white">
                {creator.name[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-white leading-tight">{creator.name}</span>
              <span className="text-[10px] text-zinc-500 leading-tight">{creator.gameCount} games</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ pill, title, rightElement }: { pill?: string; title: string; rightElement?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col items-start w-full">
      {pill && <span className="text-[#FF00C0] text-[10px] font-black tracking-widest uppercase mb-1">{pill}</span>}
      <div className="flex items-center justify-between w-full">
        <h2 className="text-2xl md:text-3xl font-display font-light text-white tracking-tight">{title}</h2>
        {rightElement}
      </div>
    </div>
  );
}

// ── Show All Button with gradient line ────────────────────────────────────────
function ShowAllButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FF00C0]/40 to-transparent" />
      <button
        onClick={onClick}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors group"
      >
        <span>Show all {count}</span>
        <ChevronDownIcon className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
      </button>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface ShowcaseProps {
  user?: any;
  userProfile?: any;
  onLogout?: () => void;
}

export default function Showcase({ user, userProfile, onLogout }: ShowcaseProps) {
  const navigate = useNavigate();
  const [games, setGames] = useState<ShowcaseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('All');
  const [allGamesFilter, setAllGamesFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [showAllGames, setShowAllGames] = useState(false);

  // ── Live user presence ─────────────────────────────────────────────────────
  useEffect(() => {
    let presenceDocRef: any = null;
    const presenceCol = collection(db, 'presence');

    addDoc(presenceCol, { lastSeen: serverTimestamp(), page: 'showcase' })
      .then(ref => { presenceDocRef = ref; })
      .catch(() => {});

    const cutoff = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const q = query(presenceCol, where('lastSeen', '>=', cutoff));
    const unsub = onSnapshot(q, snap => setLiveCount(snap.size), () => {});

    const heartbeat = setInterval(() => {
      if (presenceDocRef) {
        import('firebase/firestore').then(({ updateDoc, serverTimestamp: st }) => {
          updateDoc(presenceDocRef, { lastSeen: st() }).catch(() => {});
        });
      }
    }, 120000);

    return () => {
      unsub();
      clearInterval(heartbeat);
      if (presenceDocRef) deleteDoc(presenceDocRef).catch(() => {});
    };
  }, []);

  // ── Load games ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [raw, liked] = await Promise.all([
        getPublicGames(100),
        user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;
      const processed = raw.map(g => ({ ...g, displayCategory: getCategoryForGame(g as ShowcaseGame) }));
      setGames(processed);
      setLikedIds(liked);
      setLoading(false);

      const uniqueUids = [...new Set(processed.map(g => g.userId))];
      const creatorMap: Record<string, { displayName?: string; photoURL?: string }> = {};
      await Promise.all(uniqueUids.map(async uid => { creatorMap[uid] = await fetchCreatorInfo(uid); }));
      if (cancelled) return;
      setGames(prev => prev.map(g => ({
        ...g,
        creatorName: creatorMap[g.userId]?.displayName,
        creatorPhoto: creatorMap[g.userId]?.photoURL,
      })));
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const handleLike = useCallback(async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (!user) { navigate('/app'); return; }
    const wasLiked = likedIds.has(gameId);
    setLikedIds(prev => { const n = new Set(prev); wasLiked ? n.delete(gameId) : n.add(gameId); return n; });
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, likes: Math.max(0, (g.likes ?? 0) + (wasLiked ? -1 : 1)) } : g));
    await toggleLike(gameId, user.uid);
  }, [user, likedIds, navigate]);

  const handleSpinOff = useCallback((e: React.MouseEvent, game: ShowcaseGame) => {
    e.stopPropagation();
    if (!user) { navigate('/app'); return; }
    navigate('/app', { state: { loadGame: game, isSpinOff: true } });
  }, [user, navigate]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const trendingGames = useMemo(() =>
    [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 15), [games]);

  const topCreators = useMemo(() => {
    const stats: Record<string, { userId: string; name: string; photo: string; gameCount: number }> = {};
    games.forEach(g => {
      if (!stats[g.userId]) stats[g.userId] = { userId: g.userId, name: g.creatorName || 'Anonymous', photo: g.creatorPhoto || '', gameCount: 0 };
      stats[g.userId].gameCount++;
    });
    return Object.values(stats).sort((a, b) => b.gameCount - a.gameCount).slice(0, 12);
  }, [games]);

  // 4 most recently created games
  const risingGames = useMemo(() => {
    return [...games]
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, 4);
  }, [games]);

  // Top 8 most played (2 rows)
  const allTimeFaves = useMemo(() =>
    [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 8), [games]);

  const categoryGames = useMemo(() => {
    if (activeCategory === 'All') return [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 8);
    return games.filter(g => g.displayCategory === activeCategory);
  }, [games, activeCategory]);

  const filteredAllGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch = (g.title || g.prompt).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = allGamesFilter === 'All' || g.displayCategory === allGamesFilter;
      return matchesSearch && matchesCat;
    });
  }, [games, allGamesFilter, searchQuery]);

  const displayedAllGames = showAllGames ? filteredAllGames : filteredAllGames.slice(0, 12);

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans selection:bg-[#FF00C0]/30 overflow-x-hidden">
      <SEO title="Explore - GameBot" description="Discover trending AI-generated games." />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="pt-32 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto w-full">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF00C0]/30 bg-[#FF00C0]/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF00C0] animate-pulse" />
            <span className="text-[#FF00C0] text-[11px] font-black tracking-widest uppercase">
              Live · {Math.max(1, liveCount).toLocaleString()} Playing Now
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-light text-white tracking-tight mb-3">Featured</h1>
          <p className="text-zinc-400 text-sm">A living gallery of AI-made worlds. Jump in, remix, or describe your own. No engine, no setup — just vibes.</p>
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-[#FF00C0] animate-spin" />
            <p className="text-zinc-500 font-medium">Booting arcade...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <Gamepad2 className="w-16 h-16 text-zinc-800 mb-6" />
            <h2 className="text-2xl font-bold mb-2">No Games Yet</h2>
            <p className="text-zinc-500 mb-6">Be the first to create and publish a game!</p>
            <button onClick={() => navigate('/app')} className="px-6 py-3 bg-[#FF00C0] text-white font-bold rounded-full hover:bg-[#FF00C0]/80 transition-colors">
              Start Building
            </button>
          </div>
        ) : (
          <>
            {/* ── Featured Hero ────────────────────────────────────────────── */}
            <section className="mb-12">
              <FeaturedHero games={trendingGames.slice(0, 5)} navigate={navigate} />
            </section>

            {/* ── Top Creators ─────────────────────────────────────────────── */}
            {topCreators.length > 0 && (
              <section className="mb-4">
                <SectionHeader
                  pill="PROLIFIC GAME BUILDERS"
                  title="Top Creators"
                  rightElement={
                    <button
                      onClick={() => navigate('/creators')}
                      className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      See all <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                />
                <TopCreatorsMarquee creators={topCreators} navigate={navigate} />
              </section>
            )}

            {/* ── Trending Worlds ───────────────────────────────────────────── */}
            <section className="mb-16 mt-10">
              <SectionHeader
                pill="HOT RIGHT NOW"
                title="Trending worlds"
                rightElement={
                  <button
                    onClick={() => navigate('/trending')}
                    className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    See all <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {trendingGames.slice(5, 9).map(game => (
                  <GameCard key={game.id} game={game} onClick={() => navigate(`/play/${game.id}`)} onLike={(e: React.MouseEvent) => handleLike(e, game.id!)} isLiked={likedIds.has(game.id!)} onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)} className="w-full" />
                ))}
              </div>
            </section>

            {/* ── Browse by Category ───────────────────────────────────────── */}
            <section className="mb-16">
              <div className="mb-6">
                <p className="text-[#FF00C0] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Pick a vibe</p>
                <h2 className="text-2xl font-bold text-white">Browse by category</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[...CATEGORIES].sort((a, b) => {
                  const aHas = games.some(g => g.displayCategory === a.id);
                  const bHas = games.some(g => g.displayCategory === b.id);
                  if (aHas === bHas) return 0;
                  return aHas ? -1 : 1;
                }).map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  const hasGames = games.some(g => g.displayCategory === cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => hasGames && setActiveCategory(isActive ? 'All' : cat.id)}
                      disabled={!hasGames}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[24px] border transition-all duration-300 ${
                        isActive
                          ? 'bg-[#2A0F20] border-[#FF00C0] shadow-[0_0_20px_rgba(255,0,192,0.2)]'
                          : hasGames
                            ? 'bg-[#120810] border-white/5 hover:border-[#FF00C0]/50 cursor-pointer'
                            : 'bg-[#0A0A0E] border-white/[0.03] opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <Icon className={`w-8 h-8 ${isActive ? 'text-[#FF00C0]' : hasGames ? 'text-white' : 'text-zinc-600'}`} strokeWidth={1.5} />
                      <span className={`text-sm font-bold ${isActive ? 'text-white' : hasGames ? 'text-zinc-400' : 'text-zinc-700'}`}>{cat.id}</span>
                    </button>
                  );
                })}
              </div>

              {/* Game grid — shows top games by default, filtered when category active */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={activeCategory}
              >
                {categoryGames.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No {activeCategory} games yet — be the first!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categoryGames.slice(0, 8).map(game => (
                      <GameCard key={game.id} game={game} onClick={() => navigate(`/play/${game.id}`)} onLike={(e: React.MouseEvent) => handleLike(e, game.id!)} isLiked={likedIds.has(game.id!)} onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)} className="w-full" />
                    ))}
                  </div>
                )}
              </motion.div>
            </section>

            {/* ── Rising Talent ─────────────────────────────────────────────── */}
            {risingGames.length > 0 && (
              <section className="mb-16">
                <SectionHeader pill="NEW GAMES" title="Rising Talent" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {risingGames.map(game => (
                    <GameCard key={game.id} game={game} onClick={() => navigate(`/play/${game.id}`)} onLike={(e: React.MouseEvent) => handleLike(e, game.id!)} isLiked={likedIds.has(game.id!)} onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)} className="w-full" />
                  ))}
                </div>
              </section>
            )}

            {/* ── All Time Favourite ────────────────────────────────────────── */}
            {allTimeFaves.length > 0 && (
              <section className="mb-16">
                <SectionHeader pill="MOST PLAYED" title="All Time Favourite" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {allTimeFaves.map(game => (
                    <GameCard key={game.id} game={game} onClick={() => navigate(`/play/${game.id}`)} onLike={(e: React.MouseEvent) => handleLike(e, game.id!)} isLiked={likedIds.has(game.id!)} onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)} className="w-full" />
                  ))}
                </div>
              </section>
            )}

            <div className="w-full h-px bg-white/10 mb-16" />

            {/* ── All Games ────────────────────────────────────────────────── */}
            <section>
              <div className="mb-6">
                <span className="text-[#FF00C0] text-[10px] font-black tracking-widest uppercase mb-1 block">BROWSE LIBRARY</span>
                <h2 className="text-2xl md:text-3xl font-display font-light text-white tracking-tight">All Games</h2>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                {/* Filter pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {ALL_GAMES_FILTERS.map(f => (
                    <button
                      key={f}
                      onClick={() => setAllGamesFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                        allGamesFilter === f
                          ? 'bg-[#FF00C0]/20 border-[#FF00C0] text-[#FF00C0]'
                          : 'bg-transparent border-white/10 text-zinc-400 hover:border-[#FF00C0]/50 hover:text-[#FF00C0]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0B0B14] border border-[#FF00C0]/20 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[#FF00C0]/50 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {filteredAllGames.length === 0 ? (
                <div className="text-center py-20 bg-[#0B0B14] rounded-3xl border border-white/5">
                  <Search className="w-12 h-12 text-[#FF00C0]/30 mx-auto mb-4" />
                  <p className="text-lg text-zinc-400">No games found.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {displayedAllGames.map(game => (
                      <GameCard key={game.id} game={game} onClick={() => navigate(`/play/${game.id}`)} onLike={(e: React.MouseEvent) => handleLike(e, game.id!)} isLiked={likedIds.has(game.id!)} onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)} className="w-full" />
                    ))}
                  </div>
                  {filteredAllGames.length > 12 && (
                    <ShowAllButton count={filteredAllGames.length} onClick={() => setShowAllGames(v => !v)} />
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
