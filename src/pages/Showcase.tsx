import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, ArrowRight, Sparkles, Heart, Gamepad2, Loader2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame, toggleLike, getUserLikedGameIds } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Lazy iframe preview (shared with Dashboard) ────────────────────────────────
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


// ── Types ──────────────────────────────────────────────────────────────────────
interface ShowcaseGame extends SavedGame {
  creatorName?: string;
  creatorPhoto?: string;
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function Showcase({ user }: { user?: any }) {
  const navigate = useNavigate();
  const [games, setGames] = useState<ShowcaseGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [raw, liked] = await Promise.all([
        getPublicGames(48),
        user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
      ]);
      if (cancelled) return;
      setGames(raw);
      setLikedIds(liked);
      setLoading(false);

      // Enrich with creator names (non-blocking)
      const uniqueUids = [...new Set(raw.map(g => g.userId))];
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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      <SEO
        title="Showcase - GameBot"
        description="Explore games created with GameBot. From retro arcades to modern physics puzzlers, see what's possible with AI-generated games."
      />

      <Navbar user={user} />

      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium mb-6 backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Made with GameBot</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent"
            >
              Built by AI.<br />Curated by Humans.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-zinc-400 max-w-2xl mx-auto"
            >
              Explore what's possible when you combine human creativity with our advanced generation engine. Every game here started with a simple prompt.
            </motion.p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-zinc-400 text-sm">Loading community games…</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && games.length === 0 && (
            <div className="text-center py-24 glass-panel rounded-3xl border border-white/5">
              <Gamepad2 className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
              <p className="text-xl font-display text-zinc-400 mb-2">No public games yet.</p>
              <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Be the first! Generate a game and toggle it public from your Command Center.</p>
              <button
                onClick={() => navigate('/app')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 rounded-xl font-bold transition-all"
              >
                Start Building
              </button>
            </div>
          )}

          {/* Grid */}
          {!loading && games.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {games.map((game, idx) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(idx, 8) }}
                  className="group relative bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
                  onClick={() => navigate(`/play/${game.id}`)}
                >
                  {/* Preview */}
                  <div className="relative overflow-hidden" style={{ height: '200px' }}>
                    <GamePreview files={game.files} />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 backdrop-blur-sm">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/play/${game.id}`); }}
                        className="w-12 h-12 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                    {/* Ranking badge */}
                    {idx < 3 && (
                      <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        idx === 0 ? 'bg-yellow-400/90 text-yellow-950' :
                        idx === 1 ? 'bg-zinc-300/90 text-zinc-900' :
                        'bg-amber-700/90 text-amber-100'
                      }`}>
                        #{idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div>
                      <p className="text-sm font-semibold text-white truncate">
                        {game.title || game.prompt.slice(0, 50)}
                      </p>
                      <p className="text-xs text-zinc-500 line-clamp-1 leading-relaxed mt-0.5">
                        {game.prompt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      {/* Creator */}
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/profile/${game.userId}`); }}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        {game.creatorPhoto ? (
                          <img
                            src={game.creatorPhoto}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {(game.creatorName || game.userId)?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-xs font-medium text-zinc-300 max-w-[100px] truncate">
                          {game.creatorName || 'Anonymous'}
                        </span>
                      </button>

                      {/* Stats */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={e => handleLike(e, game.id!)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
                            likedIds.has(game.id!)
                              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                              : 'bg-white/5 border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10'
                          }`}
                        >
                          <Heart className={`w-3 h-3 ${likedIds.has(game.id!) ? 'fill-current' : ''}`} />
                          {game.likes ?? 0}
                        </button>
                        <span className="flex items-center gap-1 text-xs text-zinc-500" title="Plays">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          {game.playCount ?? 0} plays
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-32 p-12 rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
            <div className="glow-orb glow-orb-emerald w-[500px] h-[500px] top-[-250px] left-1/2 -translate-x-1/2 opacity-30" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white">Ready to build your own?</h2>
              <p className="text-zinc-400 text-lg mb-8">
                Join creators building the future of gaming with AI. No coding experience required.
              </p>
              <a
                href="/app"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-950 rounded-xl font-bold hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] hover:-translate-y-1"
              >
                Start Creating <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
