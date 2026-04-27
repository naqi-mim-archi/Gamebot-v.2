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
    <div className="rounded-2xl overflow-hidden bg-[#12121A] shrink-0 relative z-10 border border-white/5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-[11px] font-bold tracking-[0.15em] text-white uppercase">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
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
            <div className="px-5 pb-5 pt-1">{children}</div>
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
          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
            value === opt.value
              ? 'bg-[#FF00C0]/10 border border-[#FF00C0]/40 text-white'
              : 'bg-transparent border border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
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
  const[plan, setPlan] = useState<GamePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameTitle, setGameTitle] = useState(initialTitle);
  const[titleError, setTitleError] = useState(false);
  const [changesPrompt, setChangesPrompt] = useState('');
  const [changesError, setChangesError] = useState(false);
  const[setup, setSetup] = useState<{ dimension: '2D' | '3D'; platform: 'desktop' | 'mobile' | 'both'; players: 'single' | 'multi' }>({
    dimension: '2D',
    platform: 'both',
    players: 'single',
  });
  const[summaryOpen, setSummaryOpen] = useState(false);
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
  },[prompt]);

  const handleConfirm = () => {
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

    const parts: string[] =[];
    if (setup.dimension !== '2D') parts.push(setup.dimension);
    if (setup.platform !== 'both') parts.push(setup.platform === 'desktop' ? 'Desktop' : 'Mobile');
    if (setup.players !== 'single') parts.push('Multiplayer');

    const basePrompt = isSpinOff ? changesPrompt.trim() : prompt;
    const finalPrompt = parts.length > 0
      ? `${basePrompt}[${parts.join(' · ')}]`
      : basePrompt;

    onConfirm(finalPrompt, gameTitle.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sora"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#0A0A10] border border-white/10 rounded-3xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl relative"
        style={{ maxHeight: '90vh' }}
      >
        {/* Ambient Corner Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#FF00C0]/20 blur-[100px] rounded-full" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#00AFFF]/20 blur-[100px] rounded-full" />
        </div>

        {/* Top Close Button */}
        <div className="px-5 pt-5 pb-2 z-10 relative flex justify-start">
          <button
            onClick={onCancel}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header Titles & Icon */}
        <div className="flex items-center gap-4 px-6 pb-6 border-b border-white/5 shrink-0 z-10 relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF00C0] to-[#00AFFF] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,0,192,0.3)]">
            <Sparkles className="w-4 h-4 text-[#0A0A10]" strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold tracking-[0.15em] text-white uppercase">
              {isSpinOff ? 'Spin Off Kickoff' : 'Creative Kickoff'}
            </span>
            <span className="text-[12px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
              · {isSpinOff ? 'Fork & improve' : 'Ready to create'}
            </span>
          </div>
        </div>

        {/* Body Container */}
        <div className="overflow-y-auto flex-1 min-h-0 custom-scroll z-10 relative">
          <div className="p-6 flex flex-col gap-6">
            
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 shrink-0">
                <Loader2 className="w-8 h-8 text-[#FF00C0] animate-spin" />
                <p className="text-sm text-zinc-400">
                  {isSpinOff ? 'Analyzing original game…' : 'Analyzing your game idea…'}
                </p>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4 flex items-center gap-3 shrink-0">
                <span className="text-red-400 text-sm">⚠</span>
                <p className="text-sm text-red-200">Couldn't load AI analysis — you can still configure setup and create below.</p>
              </div>
            )}

            {!loading && isSpinOff && (
              <div className="shrink-0">
                <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase mb-2">
                  What changes would you like to make? <span className="text-[#FF00C0]">*</span>
                </p>
                <textarea
                  value={changesPrompt}
                  onChange={e => setChangesPrompt(e.target.value)}
                  placeholder="e.g. Add powerups, make it multiplayer, change the theme to space..."
                  rows={3}
                  autoFocus
                  className={`w-full bg-[#12121A] border rounded-2xl px-5 py-4 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none transition-all resize-none ${
                    changesError ? 'border-red-500 animate-[shake_0.4s_ease]' : 'border-white/5 focus:border-[#FF00C0]/50'
                  }`}
                />
              </div>
            )}

            {!loading && (
              <div className="shrink-0">
                <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-400 uppercase mb-2">
                  Project Title <span className="text-[#FF00C0]">*</span>
                </p>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={e => setGameTitle(e.target.value)}
                  placeholder="Name your game..."
                  className={`w-full bg-[#12121A] border rounded-2xl px-5 py-4 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none transition-all ${
                    titleError ? 'border-red-500 animate-[shake_0.4s_ease]' : 'border-white/5 focus:border-[#FF00C0]/50'
                  }`}
                  autoFocus={!isSpinOff && !plan}
                />
              </div>
            )}

            {plan && !loading && (
              <>
                <div className="flex items-start gap-4 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-transparent border-[1.5px] border-[#FF00C0] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,0,192,0.15)] mt-1">
                    <Sparkles className="w-4 h-4 text-[#FF00C0]" strokeWidth={2.5} />
                  </div>
                  <div className="bg-[#12121A] border border-white/5 rounded-[24px] px-6 py-5 flex-1">
                    <p className="text-[14px] text-zinc-300 leading-relaxed">{plan.aiMessage}</p>
                  </div>
                </div>

                <Section title="Summary" open={summaryOpen} onToggle={() => setSummaryOpen(v => !v)}>
                  <p className="text-[14px] text-zinc-300 leading-relaxed">{plan.summary}</p>
                </Section>
                
                <Section title="Highlights" open={highlightsOpen} onToggle={() => setHighlightsOpen(v => !v)}>
                  <ul className="space-y-2">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3 text-[14px] text-zinc-300">
                        <span className="text-[#00AFFF] mt-0.5 shrink-0">✦</span>
                        <span className="leading-relaxed">{h}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            )}

            {!loading && (
              <Section title="Setup" open={setupOpen} onToggle={() => setSetupOpen(v => !v)}>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] text-zinc-400 mb-3 uppercase tracking-[0.15em] font-bold">Dimension</p>
                    <ToggleGroup
                      options={[{ label: '2D', value: '2D' }, { label: '3D', value: '3D' }]}
                      value={setup.dimension}
                      onChange={v => setSetup(s => ({ ...s, dimension: v }))}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 mb-3 uppercase tracking-[0.15em] font-bold">Platform</p>
                    <ToggleGroup
                      options={[{ label: 'Desktop', value: 'desktop' }, { label: 'Mobile', value: 'mobile' }, { label: 'Both', value: 'both' }]}
                      value={setup.platform}
                      onChange={v => setSetup(s => ({ ...s, platform: v }))}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 mb-3 uppercase tracking-[0.15em] font-bold">Players</p>
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
        <div className="flex items-center justify-end gap-4 px-6 py-5 shrink-0 z-10 relative border-t border-white/5">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-7 py-3 bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] hover:opacity-90 text-zinc-950 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-[14px] shadow-[0_0_20px_rgba(255,0,192,0.3)]"
          >
            CREATE
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}