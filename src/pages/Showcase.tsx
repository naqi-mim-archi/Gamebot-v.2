import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, ArrowRight, Heart, Gamepad2, Loader2, 
  Zap, GitFork, Search, ChevronRight, ChevronLeft,
  Trophy, TrendingUp, Sparkles, MessageSquare, BookOpen, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame, toggleLike, getUserLikedGameIds } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Constants & Mock Data for UI ───────────────────────────────────────────────
const CATEGORIES = ['All', '2D', 'Casual', 'Funny', 'Arcade', 'Puzzle', 'Cute', 'Adventure', 'Action'];

const COLLECTIONS = [
  { id: 'deep', name: 'Deep Gameplay', icon: Gamepad2, color: 'from-emerald-500/20 to-teal-900/40', text: 'text-emerald-400' },
  { id: '3d', name: '3D & Immersive', icon: Trophy, color: 'from-blue-500/20 to-indigo-900/40', text: 'text-blue-400' },
  { id: 'story', name: 'Story-Driven', icon: MessageSquare, color: 'from-amber-500/20 to-orange-900/40', text: 'text-amber-400' },
  { id: 'edu', name: 'Educational', icon: BookOpen, color: 'from-purple-500/20 to-fuchsia-900/40', text: 'text-purple-400' },
  { id: 'multi', name: 'Multiplayer', icon: Users, color: 'from-rose-500/20 to-pink-900/40', text: 'text-rose-400' },
];

// Helper to pseudo-randomly assign a category based on prompt or ID for demonstration
function getCategoryForGame(game: ShowcaseGame): string {
  const p = (game.prompt || '').toLowerCase();
  if (p.includes('puzzle') || p.includes('logic')) return 'Puzzle';
  if (p.includes('2d') || p.includes('platform') || p.includes('mario')) return '2D';
  if (p.includes('shoot') || p.includes('action') || p.includes('fight')) return 'Action';
  if (p.includes('arcade') || p.includes('score') || p.includes('retro')) return 'Arcade';
  if (p.includes('cute') || p.includes('pet') || p.includes('animal')) return 'Cute';
  if (p.includes('adventure') || p.includes('explore') || p.includes('rpg')) return 'Adventure';
  
  // Fallback hash based on ID
  const hash = (game.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const fallback = ['Casual', 'Funny', 'Arcade', '2D'];
  return fallback[hash % fallback.length];
}

// ── Lazy iframe preview (Enhanced for multiple aspect ratios) ──────────────────
function GamePreview({ files, square = false }: { files: Record<string, string>, square?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [transform, setTransform] = useState({ scale: 0.25, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: '100px' } // Load slightly before scroll
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const scale = width / 1280; // Always scale to fit width
        const scaledHeight = 720 * scale;
        // If container is taller than scaled iframe (e.g. square), center it vertically
        const offsetY = height > scaledHeight ? (height - scaledHeight) / 2 : 0;
        setTransform({ scale, offsetY });
      }
    });
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const html = bundleForPreview(files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [visible, files]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full bg-[#0a0a0a] overflow-hidden ${square ? 'aspect-square rounded-2xl' : 'aspect-video rounded-xl'}`}
    >
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left bg-black"
          style={{ 
            width: '1280px', 
            height: '720px', 
            transform: `translateY(${transform.offsetY}px) scale(${transform.scale})` 
          }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
          <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />
        </div>
      )}
      {/* Overlay gradient for better text readability and sleek look */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />
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
  } catch {
    return {};
  }
}

// ── Components ─────────────────────────────────────────────────────────────────

// 1. Unified Game Card Component
function GameCard({ 
  game, 
  onClick, 
  onLike, 
  isLiked, 
  square = true,
  rank
}: { 
  game: ShowcaseGame, 
  onClick: () => void, 
  onLike: (e: React.MouseEvent) => void, 
  isLiked: boolean,
  square?: boolean,
  rank?: number
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group cursor-pointer flex flex-col gap-3 relative"
      onClick={onClick}
    >
      {/* Rank Badge for Hero section */}
      {rank !== undefined && (
        <div className="absolute -left-3 -top-3 z-20 text-6xl font-display font-black text-white/10 drop-shadow-md pointer-events-none">
          {rank}
        </div>
      )}

      <div className="relative">
        <GamePreview files={game.files} square={square} />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 backdrop-blur-[2px] rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-cyan-500 text-black flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <Play className="w-6 h-6 fill-current ml-1" />
          </div>
        </div>
      </div>

      <div className="flex flex-col px-1">
        <h3 className="text-sm font-bold text-zinc-100 truncate group-hover:text-cyan-400 transition-colors">
          {game.title || "Untitled Project"}
        </h3>
        
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3 fill-zinc-500" />
              {(game.playCount ?? 0).toLocaleString()}
            </span>
            <button 
              onClick={onLike}
              className={`flex items-center gap-1 hover:text-rose-400 transition-colors ${isLiked ? 'text-rose-400' : ''}`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
              {(game.likes ?? 0).toLocaleString()}
            </button>
          </div>
          
          {/* Creator Avatar */}
          {game.creatorPhoto ? (
            <img src={game.creatorPhoto} alt="" className="w-5 h-5 rounded-full bg-zinc-800 object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400">
              {(game.creatorName || game.userId || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// 2. Horizontal Scroll Section
function ScrollSection({ title, games, likedIds, handleLike, navigate }: any) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = dir === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!games?.length) return null;

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          {title} <ChevronRight className="w-5 h-5 text-zinc-500" />
        </h2>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} className="p-2 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-white/5">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-white/5">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4"
      >
        {games.map((game: ShowcaseGame) => (
          <div key={game.id} className="min-w-[200px] md:min-w-[240px] snap-start shrink-0">
            <GameCard 
              game={game}
              onClick={() => navigate(`/play/${game.id}`)}
              onLike={(e) => handleLike(e, game.id!)}
              isLiked={likedIds.has(game.id!)}
              square={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Main Component ─────────────────────────────────────────────────────────────
export default function Showcase({ user }: { user?: any }) {
  const navigate = useNavigate();
  const [games, setGames] = useState<ShowcaseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [raw, liked] = await Promise.all([
        getPublicGames(100), // Fetch more to populate sections
        user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;

      // Assign mock categories & sort initially by created date
      const processed = raw
        .map(g => ({ ...g, displayCategory: getCategoryForGame(g as ShowcaseGame) }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setGames(processed);
      setLikedIds(liked);
      setLoading(false);

      // Async Creator Info Enrichment
      const uniqueUids = [...new Set(processed.map(g => g.userId))];
      const creatorMap: Record<string, { displayName?: string; photoURL?: string }> = {};
      await Promise.all(
        uniqueUids.map(async uid => {
          creatorMap[uid] = await fetchCreatorInfo(uid);
        })
      );
      if (cancelled) return;
      setGames(prev =>
        prev.map(g => ({
          ...g,
          creatorName: creatorMap[g.userId]?.displayName,
          creatorPhoto: creatorMap[g.userId]?.photoURL,
        }))
      );
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

  // Derived state for sections
  const trendingGames = useMemo(() => [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 5), [games]);
  const risingGames = useMemo(() => [...games].slice(5, 15), [games]); // Just an arbitrary slice for demo
  const standoutGames = useMemo(() => [...games].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10), [games]);
  
  const filteredAllGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch = (g.title || g.prompt).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'All' || g.displayCategory === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [games, activeCategory, searchQuery]);


  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-cyan-500/30">
      <SEO title="Explore - GameBot" description="Discover trending AI-generated games." />
      <Navbar user={user} />

      {/* Main Content Area */}
      <main className="pt-24 pb-20 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
        
        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <p className="text-zinc-500 font-medium">Booting arcade...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
            <Gamepad2 className="w-16 h-16 text-zinc-800 mb-6" />
            <h2 className="text-2xl font-bold mb-2">No Games Yet</h2>
            <p className="text-zinc-500 mb-6">Be the first to create and publish a game!</p>
            <button onClick={() => navigate('/app')} className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200">
              Start Building
            </button>
          </div>
        ) : (
          <>
            {/* ── Top Trending Hero Section ── */}
            <section className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
                <h1 className="text-3xl font-display font-bold">Top Trending</h1>
              </div>

              {/* Responsive Hero Grid mimicking Verse8 layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 h-auto lg:h-[400px]">
                
                {/* Column 1 & 2 (Small items) */}
                <div className="hidden lg:flex flex-col gap-6 col-span-1">
                  {trendingGames[1] && <div className="flex-1"><GameCard game={trendingGames[1]} rank={2} onClick={() => navigate(`/play/${trendingGames[1].id}`)} onLike={e => handleLike(e, trendingGames[1].id!)} isLiked={likedIds.has(trendingGames[1].id!)} square={false} /></div>}
                </div>
                
                {/* Column 3: The Big Feature (Spans 2 cols on Desktop) */}
                {trendingGames[0] && (
                  <div className="col-span-1 md:col-span-3 lg:col-span-2 relative group cursor-pointer h-[300px] md:h-auto rounded-2xl overflow-hidden border border-white/10" onClick={() => navigate(`/play/${trendingGames[0].id}`)}>
                    <div className="absolute inset-0 bg-zinc-900">
                      <GamePreview files={trendingGames[0].files} square={false} />
                    </div>
                    {/* Dark gradient overlay for text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent flex flex-col justify-end p-6 md:p-8">
                      <div className="absolute top-4 left-4 text-8xl font-display font-black text-white/5 pointer-events-none">1</div>
                      
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold mb-4 backdrop-blur-md border border-cyan-500/20">
                          <Sparkles className="w-3 h-3" /> Featured Game
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 line-clamp-1">
                          {trendingGames[0].title || "Untitled Masterpiece"}
                        </h2>
                        <div className="flex items-center gap-4 text-sm text-zinc-300 mb-6">
                          <span className="flex items-center gap-1"><Play className="w-4 h-4" /> {(trendingGames[0].playCount ?? 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {(trendingGames[0].likes ?? 0).toLocaleString()}</span>
                          <span className="text-zinc-500">•</span>
                          <span>By {trendingGames[0].creatorName || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button className="px-6 py-2.5 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:scale-105 transition-transform">
                            <Play className="w-4 h-4 fill-current" /> Play Now
                          </button>
                          <button 
                            onClick={e => handleLike(e, trendingGames[0].id!)}
                            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors"
                          >
                            <Heart className={`w-5 h-5 ${likedIds.has(trendingGames[0].id!) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Column 4 & 5 (Small items) */}
                <div className="hidden lg:flex flex-col gap-6 col-span-1">
                  {trendingGames[2] && <div className="flex-1"><GameCard game={trendingGames[2]} rank={3} onClick={() => navigate(`/play/${trendingGames[2].id}`)} onLike={e => handleLike(e, trendingGames[2].id!)} isLiked={likedIds.has(trendingGames[2].id!)} square={false} /></div>}
                  {trendingGames[3] && <div className="flex-1"><GameCard game={trendingGames[3]} rank={4} onClick={() => navigate(`/play/${trendingGames[3].id}`)} onLike={e => handleLike(e, trendingGames[3].id!)} isLiked={likedIds.has(trendingGames[3].id!)} square={false} /></div>}
                </div>
                <div className="hidden lg:flex flex-col gap-6 col-span-1">
                   {/* If we had a 5th, put it here. Leaving empty or adding another looks good. Let's put 4th here and 5th below if we want, or just let it stack. */}
                   {trendingGames[4] && <div className="flex-1"><GameCard game={trendingGames[4]} rank={5} onClick={() => navigate(`/play/${trendingGames[4].id}`)} onLike={e => handleLike(e, trendingGames[4].id!)} isLiked={likedIds.has(trendingGames[4].id!)} square={false} /></div>}
                </div>

              </div>
            </section>

            {/* ── Standout / Rising Sections ── */}
            <ScrollSection 
              title="Rising Now" 
              games={risingGames} 
              likedIds={likedIds} 
              handleLike={handleLike} 
              navigate={navigate} 
            />
            
            {/* ── Collections Banner Area ── */}
            <section className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-6">Collections</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {COLLECTIONS.map(col => {
                  const Icon = col.icon;
                  return (
                    <div 
                      key={col.id} 
                      onClick={() => { setActiveCategory('All'); setSearchQuery(''); /* In a real app, this would filter by collection */ }}
                      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${col.color} border border-white/5 p-6 flex flex-col items-start justify-between min-h-[140px] cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all group`}
                    >
                      <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform">
                        <Icon className="w-24 h-24" />
                      </div>
                      <Icon className={`w-8 h-8 ${col.text} mb-4`} />
                      <span className="font-bold text-white text-lg relative z-10">{col.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <ScrollSection 
              title="Community Favorites" 
              games={standoutGames} 
              likedIds={likedIds} 
              handleLike={handleLike} 
              navigate={navigate} 
            />

            {/* Divider */}
            <div className="w-full h-px bg-white/10 my-16" />

            {/* ── All Games Filtered Grid ── */}
            <section>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <h2 className="text-3xl font-display font-bold">All Games</h2>
                
                {/* Search */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat 
                        ? 'bg-white text-black' 
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {filteredAllGames.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5">
                  <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-lg text-zinc-400">No games found for this category or search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
                  {filteredAllGames.map(game => (
                    <GameCard 
                      key={game.id}
                      game={game}
                      onClick={() => navigate(`/play/${game.id}`)}
                      onLike={e => handleLike(e, game.id!)}
                      isLiked={likedIds.has(game.id!)}
                      square={true} // Use square cards for the main grid to match reference
                    />
                  ))}
                </div>
              )}
            </section>

          </>
        )}
      </main>

      <Footer />

      {/* Global styles for hiding scrollbar added inline for portability */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}