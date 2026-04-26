import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Heart, Plus, Search, X, ChevronRight, Play, User, Sparkles, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { getTutorials, likeTutorial, getUserLikedTutorialIds, deleteTutorial, Tutorial } from '../services/db';
import TutorialModal from '../components/TutorialModal';

const TAGS = ['all', 'beginner', 'platformer', 'shooter', 'puzzle', 'rpg', 'multiplayer', 'advanced'];

// Soft pastel gradients matching your design screenshot for placeholder thumbnails
const PASTEL_GRADIENTS = [
  'from-[#FFB8D2] to-[#FFD1E3]', // Pink
  'from-[#A0E8DF] to-[#B8F2E6]', // Mint
  'from-[#FFD5A5] to-[#FFE4C4]', // Peach
  'from-[#A5C0FF] to-[#C4D6FF]', // Blue
  'from-[#E2F0A5] to-[#EFF7C4]', // Yellow-Green
  'from-[#DDA5FF] to-[#EBC4FF]', // Purple
];

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
  const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null;

  // Predictable pseudo-random gradient based on tutorial ID
  const hash = tutorial.id ? tutorial.id.charCodeAt(0) + tutorial.id.charCodeAt(tutorial.id.length - 1) : 0;
  const gradient = PASTEL_GRADIENTS[hash % PASTEL_GRADIENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group cursor-pointer bg-[#0A0A10] border border-white/5 rounded-[24px] overflow-hidden hover:border-[#FF00C0]/30 hover:shadow-[0_0_30px_rgba(255,0,192,0.15)] transition-all duration-300 flex flex-col font-sora"
    >
      {/* Thumbnail */}
      <div className={`relative h-44 bg-gradient-to-br ${gradient} overflow-hidden flex items-center justify-center`}>
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt={tutorial.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        
<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <button className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,0,192,0.4)]">
            <Play className="w-6 h-6 fill-current ml-1" />
          </button>
        </div>
        {/* Tags */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {tutorial.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold tracking-wider text-white border border-white/10 uppercase">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-2.5">
        <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-2 group-hover:text-[#00AFFF] transition-colors">
          {tutorial.title}
        </h3>
        <p className="text-[#B3B6CB] text-[13px] leading-relaxed line-clamp-2 flex-1">
          {tutorial.description}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            {tutorial.authorPhoto ? (
              <img src={tutorial.authorPhoto} alt="" className="w-6 h-6 rounded-full shrink-0 border border-white/10" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#00AFFF]/20 border border-[#00AFFF]/30 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-[#00AFFF]" />
              </div>
            )}
            <span className="text-[12px] text-zinc-400 font-medium truncate">{tutorial.authorName || 'Anonymous'}</span>
            <span className="text-zinc-600 text-[11px] font-medium shrink-0">· {timeAgo(tutorial.createdAt)}</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                liked
                  ? 'text-[#FF00C0] bg-[#FF00C0]/10'
                  : 'text-zinc-500 hover:text-[#FF00C0] hover:bg-[#FF00C0]/10'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#FF00C0]' : ''}`} />
              {tutorial.likes || 0}
            </button>
            {isOwner && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete tutorial"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Tutorials({ user, userProfile, onLogout }: { user?: any, userProfile?: any, onLogout?: () => void }) {
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
    <div className="min-h-screen bg-[#05050A] text-white selection:bg-[#FF00C0]/30 font-sora flex flex-col">
      <SEO title="Tutorials - GameBot" description="Community tutorials for building games with AI prompts. Learn how to create platformers, shooters, RPGs and more." />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      {/* Hero */}
      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Learn from the{' '}
              <span className="bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] bg-clip-text text-transparent">
                Community
              </span>
            </h1>
            <p className="text-[#B3B6CB] text-[16px] max-w-xl mx-auto mb-10 leading-relaxed">
              Step-by-step prompting guides, game-building tips, and creative techniques shared by builders like you.
            </p>

            {/* Search + CTA row */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search tutorials…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 rounded-full bg-[#0A0A10] border border-white/10 text-[14px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF00C0]/50 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white font-bold text-[14px] rounded-full transition-opacity hover:opacity-90 shrink-0 shadow-[0_0_20px_rgba(255,0,192,0.3)]"
              >
                <Plus className="w-5 h-5" />
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
                  className="text-[#FF00C0] text-sm mt-4 font-medium"
                >
                  Sign in to create tutorials or like posts
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Tag filter pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-5 py-2 rounded-full text-[13px] font-bold capitalize transition-all ${
                  activeTag === tag
                    ? 'bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white shadow-[0_0_15px_rgba(255,0,192,0.3)] border-none'
                    : 'bg-[#0A0A10] border border-white/10 text-[#B3B6CB] hover:border-white/30 hover:text-white'
                }`}
              >
                {tag === 'all' ? 'All Tutorials' : tag}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-4 border-[#FF00C0]/30 border-t-[#FF00C0] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 max-w-md mx-auto"
            >
              <div className="w-20 h-20 rounded-[24px] bg-[#0A0A10] border border-white/5 flex items-center justify-center mx-auto mb-6 shadow-xl">
                <BookOpen className="w-10 h-10 text-zinc-600" />
              </div>
              <p className="text-white text-xl font-bold mb-2">No tutorials found</p>
              <p className="text-[#B3B6CB] text-[14px] mb-8">
                {search ? 'Try adjusting your search filters' : 'Be the first to share your knowledge with the community!'}
              </p>
              {!search && (
                <button
                  onClick={handleCreateClick}
                  className="px-6 py-3 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-white font-bold text-[14px] rounded-full transition-opacity hover:opacity-90 shadow-[0_0_20px_rgba(255,0,192,0.3)]"
                >
                  Create the First Tutorial
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </main>

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