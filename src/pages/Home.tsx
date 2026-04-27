import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, Loader2, Sparkles, Swords, Puzzle, Car, Shield, Gamepad2, Coffee, Wand2, GitFork } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame, toggleLike, getUserLikedGameIds } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import HomePromptInput from '../components/HomePromptInput';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Types & Helpers ────────────────────────────────────────────────────────
interface ShowcaseGame extends SavedGame {
  creatorName?: string;
  creatorPhoto?: string;
  displayCategory?: string;
}

const CATEGORIES =[
  { id: 'Action', icon: Swords },
  { id: 'Puzzle', icon: Puzzle },
  { id: 'Racing', icon: Car },
  { id: 'RPG', icon: Shield },
  { id: 'Arcade', icon: Gamepad2 },
  { id: 'Casual', icon: Coffee },
];

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

async function fetchCreatorInfo(uid: string): Promise<{ displayName?: string; photoURL?: string }> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return {};
    const data = snap.data();
    return { displayName: data.displayName, photoURL: data.photoURL };
  } catch {
    return {};
  }
}

// ── Lazy iframe preview ────────────────────────────────────────────────────
function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [transform, setTransform] = useState({ scale: 0.25, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: NodeJS.Timeout;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setVisible(true), 300);
        } else {
          clearTimeout(timer);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const targetW = 1280;
        const targetH = 720;
        const scaleX = width / targetW;
        const scaleY = height / targetH;
        const scale = Math.max(scaleX, scaleY);
        setTransform({ scale, offsetX: (width - (targetW * scale)) / 2, offsetY: (height - (targetH * scale)) / 2 });
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
  },[visible, files]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#05050A] overflow-hidden pointer-events-none border-b border-white/5">
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left bg-black"
          style={{ width: '1280px', height: '720px', transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})` }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A10]">
          <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />
        </div>
      )}
    </div>
  );
}

// ── Game Card ──────────────────────────────────────────────────────────────
function GameCard({ game, onClick, onLike, isLiked, onSpinOff }: any) {
  const displayTitle = game.title || game.prompt.substring(0, 30);

  return (
    <div
      className="group cursor-pointer flex flex-col relative rounded-[20px] bg-[#0A0A10] border border-white/5 hover:border-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden h-full"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black">
        <GamePreview files={game.files} />
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-[0_0_24px_rgba(255,0,192,0.5)]">
            <Play className="w-6 h-6 text-white ml-0.5 fill-white" />
          </div>
        </div>

        <div className="absolute top-3 left-3 z-20">
          <span className="px-2.5 py-1 rounded-full bg-[#FF00C0] text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
            {game.displayCategory}
          </span>
        </div>
      </div>

      <div className="flex flex-col p-4 gap-2 flex-1">
        {/* Fixed-height title area: always 2 lines */}
        <h3 className="text-[15px] font-bold text-white group-hover:text-[#00AFFF] transition-colors leading-snug line-clamp-2 min-h-[2.5rem]">
          {displayTitle}
        </h3>

        {/* Play · Like on left, Spin Off on right */}
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#00AFFF]">
              <Play className="w-3 h-3 fill-[#00AFFF]" />{(game.playCount ?? 0)}
            </span>
            <button
              onClick={onLike}
              className={`flex items-center gap-1 transition-colors hover:text-[#FF00C0] ${isLiked ? 'text-[#FF00C0]' : ''}`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />{(game.likes ?? 0)}
            </button>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSpinOff?.(game); }}
            className="flex items-center gap-1 text-zinc-500 transition-all group/spin hover:text-[#FF00C0]"
          >
            <GitFork className="w-3 h-3 transition-colors" />
            <span className="group-hover/spin:text-transparent group-hover/spin:bg-clip-text group-hover/spin:bg-gradient-to-r group-hover/spin:from-[#FF00C0] group-hover/spin:to-[#00AFFF]">Spin Off</span>
          </button>
        </div>

        {/* Creator — pinned to bottom */}
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

// ── Main Home Component ────────────────────────────────────────────────────
interface HomeProps {
  user?: any;
  userProfile?: any;
  onSignIn?: () => void;
  onLogout?: () => void;
}

export default function Home({ user, userProfile, onSignIn, onLogout }: HomeProps) {
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoSectionRef = useRef<HTMLDivElement>(null);

  // Always start at the top
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, []);

  // Autoplay video when scrolled into view
  useEffect(() => {
    const el = videoSectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVideoPlaying(true); },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  
  // Showcase Data
  const [games, setGames] = useState<ShowcaseGame[]>([]);
  const[loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const[raw, liked] = await Promise.all([
        getPublicGames(100),
        user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;

      const processed = raw.map(g => ({
        ...g,
        displayCategory: getCategoryForGame(g as ShowcaseGame)
      }));
      setGames(processed);
      setLikedIds(liked);
      setLoading(false);

      const uniqueUids =[...new Set(processed.map(g => g.userId))];
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
    if (!user) { onSignIn?.(); return; }
    const wasLiked = likedIds.has(gameId);
    setLikedIds(prev => { const n = new Set(prev); wasLiked ? n.delete(gameId) : n.add(gameId); return n; });
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, likes: Math.max(0, (g.likes ?? 0) + (wasLiked ? -1 : 1)) } : g));
    await toggleLike(gameId, user.uid);
  }, [user, likedIds, onSignIn]);

  const filteredGames = useMemo(() => {
    if (activeCategory === 'All') return games;
    return games.filter(g => g.displayCategory === activeCategory);
  }, [games, activeCategory]);

  return (
    <div className="min-h-screen bg-[#05050A] text-white selection:bg-emerald-500/30 font-sora overflow-x-hidden">
      <SEO title="GameBot | Build Games with AI in Seconds" description="Turn ideas into playable reality instantly." />
      <Navbar user={user} userProfile={userProfile} onSignIn={onSignIn} onLogout={onLogout} />

      <main className="pt-32 pb-20 px-6 max-w-[1200px] mx-auto w-full">

        {/* ── Hero Section ──────────────────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center min-h-[calc(100vh-130px)] relative">
          <div className="w-full max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-1.5 text-[#FF00C0] text-[11px] font-bold tracking-[0.25em] uppercase mb-6">
                <Sparkles className="w-3.5 h-3.5" /> Create
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
                Turn Ideas into<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF00C0] via-[#A855F7] to-[#00AFFF]">Playable Reality.</span>
              </h1>
              <p className="text-[16px] text-[#B3B6CB] mb-12 leading-relaxed">
                One sentence is enough. Add a vibe and a style if you're feeling fancy.
              </p>
            </motion.div>

            {/* ── Prompt Input ──────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <HomePromptInput userProfile={userProfile} />
            </motion.div>
          </div>
        </section>

        {/* ── Browse by Category ────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="mb-6">
            <p className="text-[#FF00C0] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Pick a vibe</p>
            <h2 className="text-2xl font-bold text-white">Browse by category</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...CATEGORIES].sort((a, b) => {
              const aCount = games.filter(g => g.displayCategory === a.id).length;
              const bCount = games.filter(g => g.displayCategory === b.id).length;
              return bCount - aCount;
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
        </section>

        {/* ── Games Grid ────────────────────────────────────────────────── */}
        <section className="mb-24 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-[#FF00C0] animate-spin" />
              <p className="text-zinc-500 text-sm">Loading arcade...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-20 bg-[#0A0A10] border border-white/5 rounded-[32px]">
              <Gamepad2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No games found</h3>
              <p className="text-zinc-500 text-sm">Be the first to create one in this category!</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredGames.slice(0, 8).map(game => (
                  <motion.div key={game.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                    <GameCard
                      game={game}
                      onClick={() => navigate(`/play/${game.id}`)}
                      onLike={(e: React.MouseEvent) => handleLike(e, game.id!)}
                      isLiked={likedIds.has(game.id!)}
                      onSpinOff={(g: any) => navigate('/app', { state: { loadGame: g, isSpinOff: true } })}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* ── Promo Video Banner (Exactly as Requested) ─────────────────── */}
        <motion.div
                 ref={videoSectionRef}
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.8, duration: 0.8 }}
                 className="mt-32 max-w-5xl mx-auto"
               >
                 <div className="relative rounded-[40px] bg-[#0A0A10] border border-white/5 p-10 md:p-14 overflow-hidden flex flex-col md:flex-row items-center gap-12 shadow-2xl">
                   
                   {/* Banner Background Glows */}
                   <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#FF00C0]/20 rounded-full blur-[100px] pointer-events-none" />
                   <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#00AFFF]/20 rounded-full blur-[100px] pointer-events-none" />
                   
                   <div className="flex-1 relative z-10">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00AFFF]/10 text-[#00AFFF] text-[10px] font-bold uppercase tracking-wider mb-6">
                       <Wand2 className="w-3 h-3" /> Build with words
                     </div>
                     
                     <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-[1.1]">
                       Your idea + <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#00AFFF]">one prompt</span> =<br /> a real game.
                     </h2>
                     
                     <p className="text-[#B3B6CB] text-[15px] leading-relaxed max-w-md mb-8">
                       Describe the vibe. Pick the genre. Hit play. GameBot ships your idea in under a minute.
                     </p>
                     
                     <div className="flex items-center gap-4">
                       <button
                         onClick={() => navigate('/')}
                         className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white text-[14px] font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,192,0.4)]"
                       >
                         <Sparkles className="w-4 h-4" /> Start creating
                       </button>
                       <button
                         onClick={() => navigate('/explore')}
                         className="px-6 py-3 rounded-full bg-black border border-white/10 text-white text-[14px] font-bold hover:border-[#FF00C0]/60 hover:shadow-[0_0_18px_rgba(255,0,192,0.35)] transition-all duration-200"
                       >
                         Explore games
                       </button>
                     </div>
                   </div>
       
                   {/* 👇 FIXED: Removed pink background (`bg-[#FF00C0]`) and changed to `bg-black` 👇 */}
                   <div className="w-full md:w-[45%] aspect-[4/3] rounded-[24px] bg-black border border-white/10 relative z-10 shadow-[0_0_40px_rgba(0,175,255,0.2)] overflow-hidden">
                     {isVideoPlaying ? (
                       <iframe
                         className="absolute top-0 left-0 w-full h-full"
                         // 👇 PASTE YOUR GOOGLE DRIVE FILE ID BELOW (from the share link: drive.google.com/file/d/FILE_ID/view) 👇
                         src="https://drive.google.com/file/d/PASTE_YOUR_DRIVE_FILE_ID_HERE/preview"
                         title="GameBot Demo Video"
                         frameBorder="0"
                         allow="autoplay"
                         allowFullScreen
                       ></iframe>
                     ) : (
                       <div 
                         className="absolute inset-0 flex items-center justify-center cursor-pointer group bg-black"
                         onClick={() => setIsVideoPlaying(true)}
                       >
                         {/* Subtle background text so it isn't completely empty before you hover */}
                         <span className="absolute text-white/20 font-mono text-sm tracking-widest z-0">play demo</span>
                         
                         {/* The exact hover overlay design you requested */}
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 pointer-events-none">
                           <button className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,0,192,0.4)] pointer-events-auto">
                             <Play className="w-6 h-6 fill-current ml-1" />
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                   
                 </div>
               </motion.div>

      </main>

      <Footer />
    </div>
  );
}