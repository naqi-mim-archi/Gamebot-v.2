import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Play, Heart, GitFork, ArrowLeft, Search } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame, toggleLike, getUserLikedGameIds } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useRef } from 'react';

interface ShowcaseGame extends SavedGame { creatorName?: string; creatorPhoto?: string; displayCategory?: string; }

function getCategoryForGame(game: ShowcaseGame): string {
  const text = ((game.prompt || '') + ' ' + (game.title || '')).toLowerCase();
  if (text.includes('race') || text.includes('car') || text.includes('drive')) return 'Racing';
  if (text.includes('rpg') || text.includes('quest') || text.includes('dungeon')) return 'RPG';
  if (text.includes('puzzle') || text.includes('logic') || text.includes('match')) return 'Puzzle';
  if (text.includes('shoot') || text.includes('fight') || text.includes('action')) return 'Action';
  return 'Casual';
}

function formatCount(n?: number) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

async function fetchCreatorInfo(uid: string) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return {};
    const d = snap.data();
    return { displayName: d.displayName, photoURL: d.photoURL };
  } catch { return {}; }
}

function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [transform, setTransform] = useState({ scale: 0.25, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    let t: NodeJS.Timeout;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { t = setTimeout(() => setShouldLoad(true), 1500); } else clearTimeout(t); }, { threshold: 0.3 });
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(t); };
  }, []);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        const scale = Math.max(width / 1280, height / 720);
        setTransform({ scale, offsetX: (width - 1280 * scale) / 2, offsetY: (height - 720 * scale) / 2 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
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
        <iframe ref={iframeRef} sandbox="allow-scripts allow-same-origin" className="absolute top-0 left-0 border-none pointer-events-none origin-top-left bg-black"
          style={{ width: '1280px', height: '720px', transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})` }} title="game preview" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#FF00C0] animate-spin" /></div>
      )}
    </div>
  );
}

function GameCard({ game, onClick, onLike, isLiked, onSpinOff }: any) {
  const title = game.title || game.prompt.substring(0, 30);
  return (
    <div className="group cursor-pointer flex flex-col relative rounded-[20px] bg-[#0A0A10] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden h-full" onClick={onClick}>
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        <GamePreview files={game.files} />
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
        <h3 className="text-[15px] font-bold text-white group-hover:text-[#00AFFF] transition-colors leading-snug line-clamp-2 min-h-[2.5rem]">{title}</h3>
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#00AFFF]"><Play className="w-3 h-3 fill-[#00AFFF]" />{formatCount(game.playCount)}</span>
            <button onClick={onLike} className={`flex items-center gap-1 transition-colors hover:text-[#FF00C0] ${isLiked ? 'text-[#FF00C0]' : ''}`}>
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />{formatCount(game.likes)}
            </button>
          </div>
          <button onClick={e => { e.stopPropagation(); onSpinOff?.(e, game); }} className="flex items-center gap-1 text-zinc-500 hover:text-[#FF00C0] transition-all group/spin">
            <GitFork className="w-3 h-3" />
            <span className="group-hover/spin:text-transparent group-hover/spin:bg-clip-text group-hover/spin:bg-gradient-to-r group-hover/spin:from-[#FF00C0] group-hover/spin:to-[#00AFFF]">Spin Off</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 mt-auto">
          {game.creatorPhoto ? <img src={game.creatorPhoto} alt="" className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0" /> : <div className="w-5 h-5 rounded-full bg-[#00AFFF]/20 border border-[#00AFFF]/30 flex items-center justify-center text-[9px] font-bold text-[#00AFFF] shrink-0">{(game.creatorName || 'A')[0].toUpperCase()}</div>}
          <span className="text-[11px] text-zinc-500 truncate">{game.creatorName || 'Anonymous'}</span>
        </div>
      </div>
    </div>
  );
}

interface Props { user?: any; userProfile?: any; onLogout?: () => void; }

export default function TrendingGames({ user, userProfile, onLogout }: Props) {
  const navigate = useNavigate();
  const [games, setGames] = useState<ShowcaseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [raw, liked] = await Promise.all([
        getPublicGames(100),
        user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;
      const processed = raw.map(g => ({ ...g, displayCategory: getCategoryForGame(g as ShowcaseGame) }));
      setGames(processed); setLikedIds(liked); setLoading(false);
      const uids = [...new Set(processed.map(g => g.userId))];
      const map: Record<string, any> = {};
      await Promise.all(uids.map(async uid => { map[uid] = await fetchCreatorInfo(uid); }));
      if (cancelled) return;
      setGames(prev => prev.map(g => ({ ...g, creatorName: map[g.userId]?.displayName, creatorPhoto: map[g.userId]?.photoURL })));
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const handleLike = useCallback(async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (!user) return;
    const wasLiked = likedIds.has(gameId);
    setLikedIds(prev => { const n = new Set(prev); wasLiked ? n.delete(gameId) : n.add(gameId); return n; });
    await toggleLike(gameId, user.uid);
  }, [user, likedIds]);

  const handleSpinOff = useCallback((e: React.MouseEvent, game: ShowcaseGame) => {
    e.stopPropagation();
    navigate('/app', { state: { loadGame: game, isSpinOff: true } });
  }, [navigate]);

  const trending = useMemo(() =>
    [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .filter(g => !search || (g.title || g.prompt).toLowerCase().includes(search.toLowerCase())),
    [games, search]);

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans">
      <SEO title="Trending - GameBot" description="The most played games on GameBot." />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />
      <main className="pt-32 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto">
        <div className="mb-10">
          <span className="text-[#FF00C0] text-[10px] font-black tracking-widest uppercase mb-2 block">HOT RIGHT NOW</span>
          <div className="flex items-end justify-between">
            <h1 className="text-4xl font-display font-light text-white">Trending worlds</h1>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0B0B14] border border-[#FF00C0]/20 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-[#FF00C0]/50 placeholder:text-zinc-600" />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-32"><Loader2 className="w-10 h-10 text-[#FF00C0] animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trending.map(game => (
              <GameCard key={game.id} game={game} onClick={() => navigate(`/play/${game.id}`)}
                onLike={(e: React.MouseEvent) => handleLike(e, game.id!)} isLiked={likedIds.has(game.id!)}
                onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
