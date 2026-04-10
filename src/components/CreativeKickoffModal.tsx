import React, { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GamePlan {
  aiMessage: string;
  summary: string;
  highlights: string[];
  setup: {
    dimension: '2D' | '3D';
    platform: 'desktop' | 'mobile' | 'both';
    players: 'single' | 'multi';
  };
}

interface Props {
  prompt: string;
  title?: string;
  isSpinOff?: boolean;
  onConfirm: (finalPrompt: string, title: string) => void;
  onCancel: () => void;
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border border-white/8 rounded-2xl overflow-hidden bg-zinc-950 shrink-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            value === opt.value
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function CreativeKickoffModal({ prompt, title: initialTitle = '', isSpinOff = false, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<GamePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState(initialTitle);
  const [titleError, setTitleError] = useState(false);
  const [changesPrompt, setChangesPrompt] = useState('');
  const [changesError, setChangesError] = useState(false);
  const [setup, setSetup] = useState<{ dimension: '2D' | '3D'; platform: 'desktop' | 'mobile' | 'both'; players: 'single' | 'multi' }>({
    dimension: '2D',
    platform: 'both',
    players: 'single',
  });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPlan() {
      try {
        const res = await fetch('/api/plan/kickoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error('Failed to analyze game idea');
        const data = await res.json();
        if (cancelled) return;
        setPlan(data);
        if (data.setup) {
          setSetup({
            dimension: data.setup.dimension || '2D',
            platform: data.setup.platform || 'both',
            players: data.setup.players || 'single',
          });
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPlan();
    return () => { cancelled = true; };
  }, [prompt]);

  const handleConfirm = () => {
    // Spin-off: require the changes description first
    if (isSpinOff && !changesPrompt.trim()) {
      setChangesError(true);
      setTimeout(() => setChangesError(false), 600);
      return;
    }
    if (!gameTitle.trim()) {
      setTitleError(true);
      setTimeout(() => setTitleError(false), 600);
      return;
    }

    const parts: string[] = [];
    if (setup.dimension !== '2D') parts.push(setup.dimension);
    if (setup.platform !== 'both') parts.push(setup.platform === 'desktop' ? 'Desktop' : 'Mobile');
    if (setup.players !== 'single') parts.push('Multiplayer');

    // Spin-off: generate using the user's described changes, not the original prompt
    const basePrompt = isSpinOff ? changesPrompt.trim() : prompt;
    const finalPrompt = parts.length > 0
      ? `${basePrompt} [${parts.join(' · ')}]`
      : basePrompt;

    onConfirm(finalPrompt, gameTitle.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
    >
      {/* Explicit style injection for scrollbars to guarantee they render correctly */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.25);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl relative"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-zinc-950 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
              {isSpinOff ? 'Spin Off Kickoff' : 'Creative Kickoff'}
            </span>
            <span className="text-[10px] text-zinc-600 hidden sm:inline">
              {isSpinOff ? '· Fork & improve' : '· Ready to create'}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Container */}
        <div className="overflow-y-auto flex-1 min-h-0 custom-scroll">
          {/* Inner Wrapper: Ensures elements can grow to their natural height safely */}
          <div className="p-5 flex flex-col gap-4">
            
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 shrink-0">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm text-zinc-400">
                  {isSpinOff ? 'Analyzing original game…' : 'Analyzing your game idea…'}
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3 flex items-center gap-2 shrink-0">
                <span className="text-red-400 text-xs">⚠</span>
                <p className="text-xs text-zinc-400">Couldn't load AI analysis — you can still configure setup and create below.</p>
              </div>
            )}

            {!loading && isSpinOff && (
              <div className="shrink-0">
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">
                  What changes would you like to make? <span className="text-red-400">*</span>
                </p>
                <textarea
                  value={changesPrompt}
                  onChange={e => setChangesPrompt(e.target.value)}
                  placeholder="e.g. Add powerups, make it multiplayer, change the theme to space..."
                  rows={3}
                  autoFocus
                  className={`w-full bg-white/5 border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all resize-none ${
                    changesError ? 'border-red-500 animate-[shake_0.4s_ease]' : 'border-white/10 focus:border-emerald-500/50'
                  }`}
                />
              </div>
            )}

            {!loading && (
              <div className="shrink-0">
                <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">Project Title <span className="text-red-400">*</span></p>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={e => setGameTitle(e.target.value)}
                  placeholder="Name your game..."
                  className={`w-full bg-white/5 border rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all ${titleError ? 'border-red-500 animate-[shake_0.4s_ease]' : 'border-white/10 focus:border-emerald-500/50'}`}
                  autoFocus={!isSpinOff && !plan}
                />
              </div>
            )}

            {plan && !loading && (
              <>
                <div className="flex items-start gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-4 h-4 text-zinc-950" />
                  </div>
                  <div className="bg-zinc-900 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
                    <p className="text-sm text-zinc-200 leading-relaxed">{plan.aiMessage}</p>
                  </div>
                </div>

                <Section title="Summary" open={summaryOpen} onToggle={() => setSummaryOpen(v => !v)}>
                  <p className="text-sm text-zinc-300 leading-relaxed">{plan.summary}</p>
                </Section>
                
                <Section title="Highlights" open={highlightsOpen} onToggle={() => setHighlightsOpen(v => !v)}>
                  <ul className="space-y-1.5">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <span className="text-emerald-400 mt-0.5 shrink-0">✦</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            )}

            {!loading && (
              <Section title="Setup" open={setupOpen} onToggle={() => setSetupOpen(v => !v)}>
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Dimension</p>
                    <ToggleGroup
                      options={[{ label: '2D', value: '2D' }, { label: '3D', value: '3D' }]}
                      value={setup.dimension}
                      onChange={v => setSetup(s => ({ ...s, dimension: v }))}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Platform</p>
                    <ToggleGroup
                      options={[{ label: 'Desktop', value: 'desktop' }, { label: 'Mobile', value: 'mobile' }, { label: 'Both', value: 'both' }]}
                      value={setup.platform}
                      onChange={v => setSetup(s => ({ ...s, platform: v }))}
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Players</p>
                    <ToggleGroup
                      options={[{ label: 'Single-player', value: 'single' }, { label: 'Multiplayer', value: 'multi' }]}
                      value={setup.players}
                      onChange={v => setSetup(s => ({ ...s, players: v }))}
                    />
                  </div>
                </div>
              </Section>
            )}
            
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5 shrink-0 bg-zinc-950 z-10">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
          >
            Keep iterating
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-sm"
          >
            Create
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}