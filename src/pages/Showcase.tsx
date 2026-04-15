import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Heart, Gamepad2, Loader2,
  Search, ChevronDown, GitFork,
  Trophy, TrendingUp, Sparkles, MessageSquare, BookOpen, Users,
  Star, Flame, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame, toggleLike, getUserLikedGameIds } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', '2D', 'Casual', 'Funny', 'Arcade', 'Puzzle', 'Cute', 'Adventure', 'Relaxing', 'Simulation', 'Survival'];

const COLLECTIONS = [
  { id: 'deep-gameplay', name: 'Deep Gameplay', icon: Gamepad2, bg: 'bg-[#0A251E]', activeBorder: 'border-[#10B981]', text: 'text-[#10B981]' },
  { id: '3d-immersive', name: '3D & Immersive', icon: Trophy, bg: 'bg-[#0F172A]', activeBorder: 'border-[#3B82F6]', text: 'text-[#3B82F6]' },
  { id: 'story-driven', name: 'Story-Driven', icon: MessageSquare, bg: 'bg-[#2E1A0F]', activeBorder: 'border-[#F59E0B]', text: 'text-[#F59E0B]' },
  { id: 'educational', name: 'Educational', icon: BookOpen, bg: 'bg-[#1E102A]', activeBorder: 'border-[#A855F7]', text: 'text-[#A855F7]' },
  { id: 'multiplayer', name: 'Multiplayer', icon: Users, bg: 'bg-[#2A0F1A]', activeBorder: 'border-[#F43F5E]', text: 'text-[#F43F5E]' },
];

function getCategoryForGame(game: ShowcaseGame): string {
  const text = ((game.prompt || '') + ' ' + (game.title || '')).toLowerCase();
  if (text.includes('funny') || text.includes('joke') || text.includes('silly') || text.includes('meme') || text.includes('barbie') || text.includes('weird') || text.includes('cursed')) return 'Funny';
  if (text.includes('survival') || text.includes('survive') || text.includes('wave') || text.includes('horde')) return 'Survival';
  if (text.includes('puzzle') || text.includes('logic') || text.includes('match') || text.includes('memory') || text.includes('maze') || text.includes('sliding tile')) return 'Puzzle';
  if (text.includes('relaxing') || text.includes('relax') || text.includes('calm') || text.includes('peaceful') || text.includes('clicker') || text.includes('idle')) return 'Relaxing';
  if (text.includes('simulation') || text.includes('simulator') || text.includes('farm') || text.includes('city') || text.includes('tycoon') || text.includes('build')) return 'Simulation';
  if (text.includes('cute') || text.includes('pet') || text.includes('animal') || text.includes('kawaii') || text.includes('bunny') || text.includes('cat')) return 'Cute';
  if (text.includes('adventure') || text.includes('explore') || text.includes('dungeon') || text.includes('quest') || text.includes('rpg')) return 'Adventure';
  if (text.includes('arcade') || text.includes('shooter') || text.includes('shoot') || text.includes('flappy') || text.includes('runner') || text.includes('dodge') || text.includes('space')) return 'Arcade';
  if (text.includes('2d') || text.includes('platform') || text.includes('side scroll') || text.includes('jump') || text.includes('mario') || text.includes('side-scroll')) return '2D';
  if (text.includes('casual') || text.includes('simple') || text.includes('tap') || text.includes('click') || text.includes('easy')) return 'Casual';
  const hash = (game.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ['Casual', 'Arcade', '2D', 'Funny'][hash % 4];
}

function getCollectionForGame(game: ShowcaseGame): string {
  const p = (game.prompt || '').toLowerCase();
  if (p.includes('multiplayer') || p.includes('2 player') || p.includes('co-op') || p.includes('versus') || p.includes('pvp') || p.includes('two player')) return 'multiplayer';
  if (p.includes('story') || p.includes('narrative') || p.includes('rpg') || p.includes('quest') || p.includes('dungeon') || p.includes('dialogue') || p.includes('npc')) return 'story-driven';
  if (p.includes('3d') || p.includes('three.js') || p.includes('threejs') || p.includes('fps') || p.includes('first person') || p.includes('immersive') || p.includes('voxel')) return '3d-immersive';
  if (p.includes('learn') || p.includes('educat') || p.includes('math') || p.includes('quiz') || p.includes('trivia') || p.includes('spelling') || p.includes('typing')) return 'educational';
  return 'deep-gameplay';
}

// ── Lazy iframe preview ────────────────────────────────────────────────────────
function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [transform, setTransform] = useState({ scale: 0.25, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
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
        const scaledW = targetW * scale;
        const scaledH = targetH * scale;
        const offsetX = (width - scaledW) / 2;
        const offsetY = (height - scaledH) / 2;
        setTransform({ scale, offsetX, offsetY });
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
    <div ref={containerRef} className="absolute inset-0 bg-[#09090b] overflow-hidden pointer-events-none">
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left bg-black"
          style={{
            width: '1280px',
            height: '720px',
            transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`
          }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />
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
  collectionId?: string;
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

// ── Trending Accordion ─────────────────────────────────────────────────────────
function TrendingAccordion({ games, likedIds, handleLike, navigate, handleSpinOff }: any) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!games || games.length === 0) return null;
  const top5 = games.slice(0, 5);

  return (
    <div className="w-full h-[400px] flex rounded-[2rem] overflow-hidden bg-[#111113] border border-white/5 shadow-2xl">
      {top5.map((game: ShowcaseGame, idx: number) => {
        const isActive = activeIndex === idx;
        const rank = idx + 1;
        const displayTitle = game.title || game.prompt.substring(0, 30);

        return (
          <motion.div
            key={game.id}
            layout
            onMouseEnter={() => setActiveIndex(idx)}
            onClick={() => navigate(`/play/${game.id}`)}
            initial={false}
            animate={{
              width: isActive ? '60%' : '10%',
              backgroundColor: isActive ? '#1c1c1f' : '#161618'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex flex-col cursor-pointer border-r border-black/80 last:border-r-0 overflow-hidden group"
          >
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="absolute inset-0 flex flex-row items-center p-8 gap-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1c1c1f] via-[#1c1c1f]/80 to-transparent z-0" />
                <div className="relative z-10 flex flex-col justify-center w-1/2 h-full">
                  <span className="text-6xl font-display font-black text-white drop-shadow-md mb-2">{rank}</span>
                  <h2 className="text-3xl font-bold text-white mb-3 line-clamp-2 leading-tight">{displayTitle}</h2>
                  <div className="flex items-center gap-4 text-xs font-medium text-zinc-300 mb-4">
                    <span className="flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> {(game.playCount ?? 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> {(game.likes ?? 0).toLocaleString()}</span>
                  </div>
                  <p className="text-zinc-400 text-sm mb-6 line-clamp-2 max-w-sm">{game.prompt}</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLike(e, game.id!); }}
                      className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${likedIds.has(game.id!) ? 'bg-rose-500/20 text-rose-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      <Heart className={`w-4 h-4 ${likedIds.has(game.id!) ? 'fill-current' : ''}`} />
                      Like
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/play/${game.id}`); }}
                      className="px-5 py-2.5 rounded-xl flex items-center gap-2 bg-[#1aa5a5] hover:bg-[#158f8f] text-white text-sm font-bold transition-all shadow-lg shadow-[#1aa5a5]/20"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Play Now
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSpinOff(e, game); }}
                    className="mt-3 w-fit px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    <GitFork className="w-3 h-3" />
                    Spin Off
                  </button>
                </div>
                <div className="relative z-10 w-1/2 h-full flex items-center justify-center">
                  <div className="w-full aspect-video overflow-hidden border border-white/10">
                    <GamePreview files={game.files} />
                  </div>
                </div>
              </motion.div>
            )}

            {!isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col h-full bg-[#161618]"
              >
                <div className="flex-1 flex items-end p-4 lg:p-6 pb-2">
                  <span className="text-6xl font-serif font-black text-white/30">{rank}</span>
                </div>
                <div className="w-full h-[35%] relative bg-black overflow-hidden flex-shrink-0 border-y border-black/40">
                  <GamePreview files={game.files} />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                <div className="flex-1 p-4 lg:p-6 pt-3 bg-gradient-to-t from-[#111113] to-transparent">
                  <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-cyan-400 transition-colors">
                    {displayTitle}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-2">
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {(game.playCount ?? 0)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Standard Grid Card ─────────────────────────────────────────────────────────
function GameCard({ game, onClick, onLike, isLiked, onSpinOff, className = '' }: any) {
  const displayTitle = game.title || game.prompt.substring(0, 30);

  return (
    <div
      className={`group cursor-pointer flex flex-col gap-0 relative rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 [transition:transform_200ms_ease,box-shadow_200ms_ease,border-color_200ms_ease] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 [transform:translateZ(0)] ${className}`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-zinc-950">
        <GamePreview files={game.files} />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 [transition:opacity_200ms_ease] flex items-center justify-center z-10">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-black ml-0.5" />
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="flex flex-col p-3 gap-1.5">
        <h3 className="text-sm font-semibold text-zinc-100 truncate leading-snug group-hover:text-white transition-colors">
          {displayTitle}
        </h3>
        <div className="flex items-center gap-1.5">
          {game.creatorPhoto ? (
            <img src={game.creatorPhoto} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
              {(game.creatorName || 'A')[0].toUpperCase()}
            </div>
          )}
          <span className="text-[11px] text-zinc-500 truncate">{game.creatorName || 'Anonymous'}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5 border-t border-white/5">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-zinc-400"><Play className="w-3 h-3 fill-zinc-500" />{(game.playCount ?? 0).toLocaleString()}</span>
            <button
              onClick={onLike}
              className={`flex items-center gap-1 transition-colors hover:text-rose-400 ${isLiked ? 'text-rose-400' : 'text-zinc-400'}`}
            >
              <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />{(game.likes ?? 0).toLocaleString()}
            </button>
          </div>
          <button
            onClick={onSpinOff}
            title="Spin Off"
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <GitFork className="w-3 h-3" /> Spin Off
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Horizontal Game Row ────────────────────────────────────────────────────────
function HorizontalGameRow({
  games,
  likedIds,
  handleLike,
  navigate,
  getBadge,
  onSpinOff,
}: {
  games: ShowcaseGame[];
  likedIds: Set<string>;
  handleLike: (e: React.MouseEvent, id: string) => void;
  navigate: (path: string) => void;
  getBadge?: (game: ShowcaseGame, idx: number) => React.ReactNode;
  onSpinOff?: (e: React.MouseEvent, game: ShowcaseGame) => void;
}) {
  if (!games || games.length === 0) return null;

  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-3 px-0.5">
      {games.map((game, idx) => {
        const displayTitle = game.title || game.prompt.substring(0, 30);
        const badge = getBadge?.(game, idx);

        return (
          <div
            key={game.id}
            className="flex-shrink-0 w-64 cursor-pointer group rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 [transition:transform_200ms_ease,box-shadow_200ms_ease,border-color_200ms_ease] hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 [transform:translateZ(0)]"
            onClick={() => navigate(`/play/${game.id}`)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden rounded-t-xl bg-zinc-950">
              <GamePreview files={game.files} />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 [transition:opacity_200ms_ease] flex items-center justify-center z-10">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                </div>
              </div>
              {badge && (
                <div className="absolute top-2 left-2 z-20">
                  {badge}
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-3 flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white transition-colors leading-snug">
                {displayTitle}
              </h3>
              <div className="flex items-center gap-1.5">
                {game.creatorPhoto ? (
                  <img src={game.creatorPhoto} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">
                    {(game.creatorName || 'A')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] text-zinc-500 truncate">{game.creatorName || 'Anonymous'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-0.5 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-zinc-400"><Play className="w-3 h-3 fill-zinc-500" />{(game.playCount ?? 0).toLocaleString()}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(e, game.id!); }}
                    className={`flex items-center gap-1 transition-colors hover:text-rose-400 ${likedIds.has(game.id!) ? 'text-rose-400' : 'text-zinc-400'}`}
                  >
                    <Heart className={`w-3 h-3 ${likedIds.has(game.id!) ? 'fill-current' : ''}`} />
                    {(game.likes ?? 0).toLocaleString()}
                  </button>
                </div>
                {onSpinOff && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSpinOff(e, game); }}
                    title="Spin Off"
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    <GitFork className="w-3 h-3" /> Spin Off
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Top Creators Row (auto-scrolling marquee) ─────────────────────────────────
function TopCreatorsRow({ creators, navigate }: { creators: { userId: string; name: string; photo: string; gameCount: number }[]; navigate: (p: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const ranks = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  // Duplicate the list so it loops seamlessly
  const doubled = [...creators, ...creators];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const step = () => {
      if (!pausedRef.current) {
        posRef.current += 1.2; // px per frame — adjust for speed
        const halfWidth = track.scrollWidth / 2;
        if (posRef.current >= halfWidth) posRef.current = 0;
        track.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [creators]);

  return (
    <section className="mb-16">
      <SectionHeader
        icon={Crown}
        iconClass="bg-yellow-500/10 text-yellow-400"
        title="Top Creators"
        subtitle="Most prolific game builders"
      />
      <div
        className="bg-zinc-900 border border-white/10 rounded-2xl py-3 overflow-hidden"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-zinc-900 to-transparent z-10 pointer-events-none rounded-l-2xl" />
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-zinc-900 to-transparent z-10 pointer-events-none rounded-r-2xl" />
        <div ref={trackRef} className="flex gap-2.5 w-max px-4">
          {doubled.map((creator, idx) => (
            <button
              key={`${creator.userId}-${idx}`}
              onClick={() => navigate(`/profile/${creator.userId}`)}
              className="flex items-center gap-2.5 flex-shrink-0 bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 rounded-xl px-3.5 py-2 whitespace-nowrap transition-colors"
            >
              <span className="text-[11px] font-bold text-zinc-500 w-6 text-left">{ranks[idx % ranks.length]}</span>
              {creator.photo ? (
                <img src={creator.photo} alt={creator.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                  {creator.name[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-white">{creator.name}</span>
              <span className="text-[11px] text-zinc-500 ml-0.5">{creator.gameCount}g</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconClass, title, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
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
  const [activeCollection, setActiveCollection] = useState<string>(COLLECTIONS[0].id);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [raw, liked] = await Promise.all([
        getPublicGames(100),
        user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;

      const processed = raw.map(g => ({
        ...g,
        displayCategory: getCategoryForGame(g as ShowcaseGame),
        collectionId: getCollectionForGame(g as ShowcaseGame)
      }));
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

  // ── Derived sections ───────────────────────────────────────────────────────
  const trendingGames = useMemo(() =>
    [...games].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10),
    [games]);

  const topCreators = useMemo(() => {
    const stats: Record<string, { userId: string; name: string; photo: string; gameCount: number }> = {};
    games.forEach(g => {
      if (!stats[g.userId]) {
        stats[g.userId] = { userId: g.userId, name: g.creatorName || 'Anonymous', photo: g.creatorPhoto || '', gameCount: 0 };
      }
      stats[g.userId].gameCount++;
    });
    return Object.values(stats).sort((a, b) => b.gameCount - a.gameCount).slice(0, 10);
  }, [games]);

  const risingGames = useMemo(() => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recent = games.filter(g => (g.createdAt?.toMillis?.() || 0) > twoWeeksAgo);
    const pool = recent.length >= 3 ? recent : games.slice(5, 17);
    return [...pool].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 12);
  }, [games]);

  const allTimeFaves = useMemo(() =>
    [...games].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 12),
    [games]);

  const collectionGames = useMemo(() =>
    games.filter(g => g.collectionId === activeCollection),
    [games, activeCollection]);

  const filteredAllGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch = (g.title || g.prompt).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'All' || g.displayCategory === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [games, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <SEO title="Showcase - GameBot" description="Discover trending AI-generated games." />
      <Navbar user={user} />

      <main className="pt-32 pb-20 px-6 md:px-10 max-w-[1400px] mx-auto w-full">

        {/* ── Hero Header ─────────────────────────────────────────────────── */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight flex items-center gap-3 mb-3">
            <Star className="w-8 h-8 text-cyan-400 fill-cyan-400/20 flex-shrink-0" />
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Featured
            </span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Discover the most popular and creative games built by the GameBot community.
          </p>
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <p className="text-zinc-500 font-medium">Booting arcade...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <Gamepad2 className="w-16 h-16 text-zinc-800 mb-6" />
            <h2 className="text-2xl font-bold mb-2">No Games Yet</h2>
            <p className="text-zinc-500 mb-6">Be the first to create and publish a game!</p>
            <button onClick={() => navigate('/app')} className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors">
              Start Building
            </button>
          </div>
        ) : (
          <>
            {/* ── Top Trending (desktop accordion) ────────────────────────── */}
            <section className="mb-16 hidden md:block">
              <SectionHeader
                icon={Flame}
                iconClass="bg-orange-500/10 text-orange-400"
                title="Top Trending"
                subtitle="Most played games right now"
              />
              <TrendingAccordion
                games={trendingGames}
                likedIds={likedIds}
                handleLike={handleLike}
                navigate={navigate}
                handleSpinOff={handleSpinOff}
              />
            </section>

            {/* ── Top Trending (mobile fallback) ──────────────────────────── */}
            <section className="mb-14 md:hidden">
              <SectionHeader
                icon={Flame}
                iconClass="bg-orange-500/10 text-orange-400"
                title="Top Trending"
                subtitle="Most played games right now"
              />
              <HorizontalGameRow
                games={trendingGames.slice(0, 5)}
                likedIds={likedIds}
                handleLike={handleLike}
                navigate={navigate}
                onSpinOff={handleSpinOff}
                getBadge={(_, idx) => (
                  <span className="text-xs font-black text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-lg">
                    #{idx + 1}
                  </span>
                )}
              />
            </section>

            {/* ── Top Creators ─────────────────────────────────────────────── */}
            {topCreators.length > 0 && (
              <TopCreatorsRow creators={topCreators} navigate={navigate} />
            )}

            {/* ── Collections ──────────────────────────────────────────────── */}
            <section className="mb-16">
              <SectionHeader
                icon={TrendingUp}
                iconClass="bg-cyan-500/10 text-cyan-400"
                title="Collections"
                subtitle="Curated by genre and style"
              />

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {COLLECTIONS.map(col => {
                  const Icon = col.icon;
                  const isActive = activeCollection === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setActiveCollection(col.id)}
                      className={`relative flex items-center justify-between w-full rounded-xl border p-4 transition-all duration-300 group ${col.bg} ${isActive ? col.activeBorder : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <span className={`font-bold text-lg relative z-10 ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {col.name}
                      </span>
                      <Icon className={`w-8 h-8 ${col.text} relative z-10 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none overflow-hidden h-full flex items-center">
                        <Icon className="w-20 h-20 -mr-4 text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCollection}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {collectionGames.slice(0, 5).map(game => (
                      <GameCard
                        key={game.id}
                        game={game}
                        onClick={() => navigate(`/play/${game.id}`)}
                        onLike={(e: React.MouseEvent) => handleLike(e, game.id!)}
                        isLiked={likedIds.has(game.id!)}
                        onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)}
                      />
                    ))}
                    {collectionGames.length === 0 && (
                      <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-white/5">
                        No games currently available in this collection.
                      </div>
                    )}
                  </div>
                  {collectionGames.length > 0 && (
                    <div className="mt-8 flex flex-col items-center">
                      <div className="w-full h-px bg-white/10 mb-4" />
                      <button className="flex items-center gap-1 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        Show all <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </section>

            {/* ── Rising Talent ────────────────────────────────────────────── */}
            {risingGames.length > 0 && (
              <section className="mb-16">
                <SectionHeader
                  icon={Sparkles}
                  iconClass="bg-purple-500/10 text-purple-400"
                  title="Rising Talent"
                  subtitle="New games gaining traction fast"
                />
                <HorizontalGameRow
                  games={risingGames}
                  likedIds={likedIds}
                  handleLike={handleLike}
                  navigate={navigate}
                  onSpinOff={handleSpinOff}
                  getBadge={(game) => {
                    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    const isNew = (game.createdAt?.toMillis?.() || 0) > sevenDaysAgo;
                    if (!isNew) return null;
                    return (
                      <span className="text-[10px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded-md tracking-wide">
                        NEW
                      </span>
                    );
                  }}
                />
              </section>
            )}

            {/* ── All Time Favorites ───────────────────────────────────────── */}
            {allTimeFaves.length > 0 && (
              <section className="mb-16">
                <SectionHeader
                  icon={Heart}
                  iconClass="bg-rose-500/10 text-rose-400"
                  title="All Time Favorites"
                  subtitle="Most loved games of all time"
                />
                <HorizontalGameRow
                  games={allTimeFaves}
                  likedIds={likedIds}
                  handleLike={handleLike}
                  navigate={navigate}
                  onSpinOff={handleSpinOff}
                  getBadge={(_, idx) => {
                    if (idx > 2) return null;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <span className="text-base leading-none bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-lg">
                        {medals[idx]}
                      </span>
                    );
                  }}
                />
              </section>
            )}

            <div className="w-full h-px bg-white/10 mb-16" />

            {/* ── All Games Grid ───────────────────────────────────────────── */}
            <section>
              <div className="flex items-start justify-between mb-6 gap-4">
                <SectionHeader
                  icon={Gamepad2}
                  iconClass="bg-zinc-700/50 text-zinc-300"
                  title="All Games"
                  subtitle={`${filteredAllGames.length} game${filteredAllGames.length !== 1 ? 's' : ''} found`}
                />
              </div>

              {/* Search + filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-white/25 transition-all placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Category pills */}
              <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-7 pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      activeCategory === cat
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredAllGames.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-white/5">
                  <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-lg text-zinc-400">No games found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-8">
                  {filteredAllGames.map(game => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onClick={() => navigate(`/play/${game.id}`)}
                      onLike={(e: React.MouseEvent) => handleLike(e, game.id!)}
                      isLiked={likedIds.has(game.id!)}
                      onSpinOff={(e: React.MouseEvent) => handleSpinOff(e, game)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
