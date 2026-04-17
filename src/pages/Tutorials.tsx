import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Heart, Plus, Search, X, ChevronRight, Play, User, Sparkles, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { getTutorials, likeTutorial, getUserLikedTutorialIds, deleteTutorial, Tutorial } from '../services/db';
import TutorialModal from '../components/TutorialModal';

const TAGS = ['all', 'beginner', 'platformer', 'shooter', 'puzzle', 'rpg', 'multiplayer', 'advanced'];

function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function timeAgo(ts: any): string {
  const ms = ts?.toMillis?.() || Date.now();
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function TutorialCard({
  tutorial,
  liked,
  onLike,
  onClick,
  isOwner,
  onDelete,
}: {
  tutorial: Tutorial;
  liked: boolean;
  onLike: (e: React.MouseEvent) => void;
  onClick: () => void;
  isOwner: boolean;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const ytId = getYouTubeId(tutorial.videoUrl);
  const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group cursor-pointer bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.08)] transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden flex items-center justify-center">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={tutorial.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 group-hover:from-emerald-500/20 group-hover:to-cyan-500/20 transition-all duration-500" />
            <BookOpen className="w-12 h-12 text-zinc-600 group-hover:text-emerald-500/60 transition-colors duration-300" />
          </>
        )}
        {/* Dark overlay + play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
            <Play className="w-5 h-5 text-emerald-400 ml-0.5 fill-emerald-400" />
          </div>
        </div>
        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1">
          {tutorial.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-xs text-zinc-200 border border-white/10 capitalize">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-emerald-300 transition-colors">
          {tutorial.title}
        </h3>
        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 flex-1">
          {tutorial.description}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            {tutorial.authorPhoto ? (
              <img src={tutorial.authorPhoto} alt="" className="w-5 h-5 rounded-full shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-emerald-400" />
              </div>
            )}
            <span className="text-xs text-zinc-500 truncate">{tutorial.authorName || 'Anonymous'}</span>
            <span className="text-zinc-700 text-xs shrink-0">· {timeAgo(tutorial.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onLike}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                liked
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-rose-400' : ''}`} />
              {tutorial.likes || 0}
            </button>
            {isOwner && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Delete tutorial"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Tutorials({ user }: { user?: any }) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState('all');
  const [search, setSearch] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTutorial, setViewTutorial] = useState<Tutorial | null>(null);
  const [showAuthHint, setShowAuthHint] = useState(false);

  useEffect(() => {
    loadTutorials();
  }, [activeTag]);

  useEffect(() => {
    if (user) {
      getUserLikedTutorialIds(user.uid).then(setLikedIds);
    }
  }, [user]);

  async function loadTutorials() {
    setLoading(true);
    try {
      const data = await getTutorials(activeTag === 'all' ? undefined : activeTag);
      setTutorials(data);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return tutorials;
    const q = search.toLowerCase();
    return tutorials.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
    );
  }, [tutorials, search]);

  async function handleDelete(e: React.MouseEvent, tutorial: Tutorial) {
    e.stopPropagation();
    if (!user || user.uid !== tutorial.userId) return;
    if (!window.confirm(`Delete "${tutorial.title}"? This cannot be undone.`)) return;
    setTutorials(prev => prev.filter(t => t.id !== tutorial.id));
    await deleteTutorial(tutorial.id!);
  }

  async function handleLike(e: React.MouseEvent, tutorial: Tutorial) {
    e.stopPropagation();
    if (!user) { setShowAuthHint(true); setTimeout(() => setShowAuthHint(false), 2500); return; }
    const id = tutorial.id!;
    const wasLiked = likedIds.has(id);
    // Optimistic
    setLikedIds(prev => { const n = new Set(prev); wasLiked ? n.delete(id) : n.add(id); return n; });
    setTutorials(prev => prev.map(t => t.id === id ? { ...t, likes: (t.likes || 0) + (wasLiked ? -1 : 1) } : t));
    await likeTutorial(id, user.uid);
  }

  function handleCreateClick() {
    if (!user) { setShowAuthHint(true); setTimeout(() => setShowAuthHint(false), 2500); return; }
    setCreateOpen(true);
  }

  function handleTutorialCreated(t: Tutorial) {
    setTutorials(prev => [t, ...prev]);
    setCreateOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500/30">
      <SEO title="Tutorials - Game Bot" description="Community tutorials for building games with AI prompts. Learn how to create platformers, shooters, RPGs and more." />
      <Navbar user={user} />

      {/* Hero */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Community Tutorials
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-4">
              Learn from the{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Community
              </span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-8">
              Step-by-step prompting guides, game-building tips, and creative techniques shared by builders like you.
            </p>

            {/* Search + CTA row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search tutorials…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition-colors shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <Plus className="w-4 h-4" />
                Create Tutorial
              </button>
            </div>

            {/* Auth hint */}
            <AnimatePresence>
              {showAuthHint && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-amber-400 text-sm mt-3"
                >
                  Sign in to create tutorials or like posts
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Tag filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
                  activeTag === tag
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:border-emerald-500/30 hover:text-white'
                }`}
              >
                {tag === 'all' ? 'All Tutorials' : tag}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-9 h-9 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium mb-2">No tutorials yet</p>
              <p className="text-zinc-600 text-sm mb-6">
                {search ? 'Try a different search term' : 'Be the first to share your knowledge!'}
              </p>
              {!search && (
                <button
                  onClick={handleCreateClick}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition-colors"
                >
                  Create the First Tutorial
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  liked={likedIds.has(tutorial.id!)}
                  onLike={e => handleLike(e, tutorial)}
                  onClick={() => setViewTutorial(tutorial)}
                  isOwner={!!user && user.uid === tutorial.userId}
                  onDelete={e => handleDelete(e, tutorial)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Create / View Modal */}
      <AnimatePresence>
        {(createOpen || viewTutorial) && (
          <TutorialModal
            user={user}
            mode={createOpen ? 'create' : 'view'}
            tutorial={viewTutorial || undefined}
            onClose={() => { setCreateOpen(false); setViewTutorial(null); }}
            onCreated={handleTutorialCreated}
            onDeleted={(id) => { setTutorials(prev => prev.filter(t => t.id !== id)); setViewTutorial(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
