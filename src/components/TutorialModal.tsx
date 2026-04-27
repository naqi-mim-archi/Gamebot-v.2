import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Heart, User, ChevronRight, Loader2, Youtube, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Tutorial, createTutorial, deleteTutorial } from '../services/db';

const TAG_OPTIONS = ['beginner', 'platformer', 'shooter', 'puzzle', 'rpg', 'multiplayer', 'advanced', 'tips'];

interface Props {
  user?: any;
  mode: 'create' | 'view';
  tutorial?: Tutorial;
  onClose: () => void;
  onCreated?: (t: Tutorial) => void;
  onDeleted?: (id: string) => void;
}

function timeAgo(ts: any): string {
  const ms = ts?.toMillis?.() || Date.now();
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Very simple markdown-like renderer (bold, code blocks, bullet lists)
function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-white mt-6 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-8 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="flex gap-2 text-zinc-300 text-sm mb-1">
          <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{line.slice(2)}</span>
        </li>
      );
    }
    if (line.startsWith('```') || line === '') return <div key={i} className="h-2" />;
    // Inline code: `code`
    const parts = line.split(/(`[^`]+`)/g);
    return (
      <p key={i} className="text-zinc-300 text-sm leading-relaxed mb-1">
        {parts.map((part, j) =>
          part.startsWith('`') && part.endsWith('`')
            ? <code key={j} className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 text-xs font-mono">{part.slice(1, -1)}</code>
            : part
        )}
      </p>
    );
  });
}

export default function TutorialModal({ user, mode, tutorial, onClose, onCreated, onDeleted }: Props) {
  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'approved' | 'pending'>('idle');

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Please add a title'); return; }
    if (!description.trim()) { setError('Please add a short description'); return; }
    if (!content.trim()) { setError('Please add some content — your steps, prompts, or tips'); return; }
    if (selectedTags.length === 0) { setError('Select at least one tag'); return; }
    if (!user) { setError('You must be signed in'); return; }

    setError('');
    setSaving(true);
    try {
      const data: Omit<Tutorial, 'id' | 'createdAt' | 'likes'> = {
        title: title.trim(),
        description: description.trim(),
        content: content.trim(),
        ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
        userId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        ...(user.photoURL ? { authorPhoto: user.photoURL } : {}),
        tags: selectedTags,
      };
      const { id, status } = await createTutorial(data);
      if (status === 'approved') {
        const newTutorial: Tutorial = { ...data, id, likes: 0, createdAt: null, status: 'approved' };
        onCreated?.(newTutorial);
        setSubmitStatus('approved');
      } else {
        setSubmitStatus('pending');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const ytId = tutorial?.videoUrl ? getYouTubeId(tutorial.videoUrl) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">
                {mode === 'create' ? 'Create a Tutorial' : tutorial?.title}
              </h2>
              {mode === 'view' && tutorial && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  {tutorial.authorPhoto ? (
                    <img src={tutorial.authorPhoto} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <User className="w-3 h-3" />
                  )}
                  <span>{tutorial.authorName || 'Anonymous'}</span>
                  <span>· {timeAgo(tutorial.createdAt)}</span>
                  <span>·</span>
                  <Heart className="w-3 h-3 text-rose-400" />
                  <span>{tutorial.likes || 0}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {mode === 'view' && user && tutorial && user.uid === tutorial.userId && (
              <button
                onClick={async () => {
                  if (!window.confirm(`Delete "${tutorial.title}"? This cannot be undone.`)) return;
                  await deleteTutorial(tutorial.id!);
                  onDeleted?.(tutorial.id!);
                  onClose();
                }}
                className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-lg"
                title="Delete tutorial"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {submitStatus === 'pending' ? (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Submitted for Review</h3>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                Your tutorial is under review by our team. We'll approve it shortly. Thanks for contributing!
              </p>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-xl transition-colors">
                Close
              </button>
            </div>
          ) : submitStatus === 'approved' ? (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Tutorial Published!</h3>
              <p className="text-zinc-400 text-sm max-w-xs leading-relaxed">
                Your tutorial passed our quality check and is now live for the community.
              </p>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition-colors">
                Done
              </button>
            </div>
          ) : mode === 'create' ? (
            <div className="p-6 flex flex-col gap-5">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Tutorial Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. How I built a multiplayer shooter in 5 prompts"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Short description */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Short Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="One line that explains what readers will learn"
                  maxLength={120}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-2 block">Tags * (pick at least one)</label>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:border-emerald-500/30 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Tutorial Content *
                  <span className="text-zinc-600 font-normal ml-1">— use # for headings, - for bullet points, `code` for inline code</span>
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder={`# Getting Started\n\nHere's the exact prompt I used to create my game:\n\n\`Create a top-down shooter where the player moves with WASD...\`\n\n## Step 2 — Add enemies\n\n- Type this in the chat:\n\`Add 3 types of enemies that chase the player...\``}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none font-mono leading-relaxed"
                />
              </div>

              {/* Video URL (optional) */}
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5 block">
                  <Youtube className="w-3.5 h-3.5 text-red-400" />
                  YouTube Video URL
                  <span className="text-zinc-600 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {error && (
                <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
            </div>
          ) : (
            // View mode
            <div className="p-6">
              {/* Tags */}
              {tutorial?.tags && tutorial.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {tutorial.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs capitalize">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              {tutorial?.description && (
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed border-l-2 border-emerald-500/40 pl-4">
                  {tutorial.description}
                </p>
              )}

              {/* YouTube embed */}
              {ytId && (
                <div className="mb-6 rounded-xl overflow-hidden aspect-video bg-zinc-900">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}`}
                    title="Tutorial video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Content */}
              <div className="prose-container">
                {tutorial?.content && renderContent(tutorial.content)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'create' && submitStatus === 'idle' && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between shrink-0 bg-zinc-950">
            <p className="text-xs text-zinc-600">Tutorial will be reviewed before going live</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm rounded-xl transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  'Publish Tutorial'
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
