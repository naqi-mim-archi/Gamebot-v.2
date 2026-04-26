import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Mic, MicOff, Paperclip,
  Wand2, X, FileText, Loader2, LayoutTemplate, Zap, ChevronDown,
} from 'lucide-react';
import { getEnhanceQuestions, finalizeEnhancedPrompt, EnhanceQuestion, FileAttachment } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import GameTemplatesModal from './GameTemplatesModal';
import SteamLibraryModal from './SteamLibraryModal';

const SUGGESTIONS = [
  'Flappy Bird clone', 'Space Invaders', '3D Racing Game',
  'Physics Puzzle', 'Endless Runner', 'Tower Defense',
];

// Steam icon inline so we don't add a dep
function SteamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  );
}

export default function HomePromptInput({ userProfile }: { userProfile?: any }) {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [enhanceModal, setEnhanceModal] = useState<'closed' | 'loading' | 'questions' | 'finalizing'>('closed');
  const [enhanceQuestions, setEnhanceQuestions] = useState<EnhanceQuestion[]>([]);
  const [enhanceAnswers, setEnhanceAnswers] = useState<Record<string, string>>({});
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [steamLibraryOpen, setSteamLibraryOpen] = useState(false);
  const [steamConnectOpen, setSteamConnectOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<'quick' | 'detailed'>(() =>
    (localStorage.getItem('gb_gen_mode') as 'quick' | 'detailed') || 'quick'
  );
  const [modeOpen, setModeOpen] = useState(false);
  const [modeError, setModeError] = useState('');
  const pendingSubmitRef = useRef(false);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
        }
        if (final) setPrompt(prev => prev + (prev ? ' ' : '') + final);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else { recognitionRef.current?.start(); setIsListening(true); }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const next: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const data = await new Promise<string>(res => {
        reader.onload = () => res((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      next.push({ name: file.name, mimeType: file.type || 'application/octet-stream', data });
    }
    setAttachments(prev => [...prev, ...next]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { await processFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhanceAnswers({});
    setEnhanceModal('loading');
    try {
      const qs = await getEnhanceQuestions(prompt);
      setEnhanceQuestions(qs);
      setEnhanceModal('questions');
    } catch (err) { console.error('enhance error', err); setEnhanceModal('closed'); }
  };

  const handleEnhanceFinalize = async () => {
    setEnhanceModal('finalizing');
    try {
      const map: Record<string, string> = {};
      enhanceQuestions.forEach(q => { if (enhanceAnswers[q.id]) map[q.question] = enhanceAnswers[q.id]; });
      const enhanced = await finalizeEnhancedPrompt(prompt, map);
      setPrompt(enhanced);
      setEnhanceModal('closed');
      if (pendingSubmitRef.current) {
        pendingSubmitRef.current = false;
        navigate('/app', { state: { initialPrompt: enhanced, initialAttachments: attachments } });
      }
    } catch (err) { console.error('finalize error', err); setEnhanceModal('closed'); }
  };

  // Auto-switch to Detailed when prompt is long/complex
  const isLongPrompt = prompt.trim().split(/\s+/).length > 15 || prompt.trim().length > 100;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() && attachments.length === 0) return;
    // If prompt is detailed but mode is Quick, block and show error
    if (isLongPrompt && generationMode === 'quick') {
      setModeError('Your prompt is too detailed for Quick mode — please switch to Detailed.');
      setTimeout(() => setModeError(''), 4000);
      return;
    }
    // In Detailed mode with a real prompt → auto-open Enhance first, then navigate after
    if (generationMode === 'detailed' && prompt.trim()) {
      pendingSubmitRef.current = true;
      handleEnhancePrompt();
      return;
    }
    navigate('/app', { state: { initialPrompt: prompt, initialAttachments: attachments } });
  };

  const setMode = (m: 'quick' | 'detailed') => {
    setModeError('');
    setGenerationMode(m);
    localStorage.setItem('gb_gen_mode', m);
    setModeOpen(false);
  };

  // Auto-switch to Detailed when prompt grows long
  useEffect(() => {
    if (isLongPrompt && generationMode === 'quick') {
      setGenerationMode('detailed');
      localStorage.setItem('gb_gen_mode', 'detailed');
    }
  }, [isLongPrompt]);

  return (
    <div className="w-full relative z-20">
      {/* Ambient glow — pink left, blue right */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#FF00C0]/20 to-[#00AFFF]/20 blur-[70px] -z-10 rounded-full pointer-events-none" />

      <form onSubmit={handleSubmit}>
        <div className="bg-[#15171C] border border-white/5 rounded-[24px] p-2 shadow-[0_0_40px_rgba(0,255,200,0.08)]">

          {/* Attachments row */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 border-b border-white/5">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-xs text-zinc-300">
                  <FileText className="w-3 h-3 text-[#FF00C0]" />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button type="button" onClick={() => setAttachments(p => p.filter((_, i) => i !== idx))} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="flex items-start px-4 pt-4 pb-2 gap-3">
            <Sparkles className="w-5 h-5 text-zinc-500 mt-1.5 shrink-0" />
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Describe a game to build..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder-zinc-500 resize-none text-[17px] leading-relaxed overflow-y-auto font-[inherit]"
              style={{ minHeight: '3.5rem', maxHeight: '10rem' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-2 pb-2 gap-2">
            {/* Left: action buttons */}
            <div className="flex items-center gap-1 flex-wrap">
              {/* Mic */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-colors ${isListening ? 'text-red-400 bg-red-400/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Attach */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Enhance — only in detailed mode */}
              {generationMode === 'detailed' && (
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={!prompt.trim() || enhanceModal !== 'closed'}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-zinc-400 hover:border-[#FF00C0]/70 hover:text-[#FF00C0] hover:bg-[#FF00C0]/8 hover:shadow-[0_0_12px_rgba(255,0,192,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Enhance</span>
                </button>
              )}

              {/* Templates */}
              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-zinc-400 hover:border-[#FF00C0]/70 hover:text-[#FF00C0] hover:bg-[#FF00C0]/8 hover:shadow-[0_0_12px_rgba(255,0,192,0.3)] transition-all"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Templates</span>
              </button>

              {/* Steam Library */}
              <button
                type="button"
                onClick={() => userProfile?.steamId ? setSteamLibraryOpen(true) : setSteamConnectOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-zinc-400 hover:border-[#00AFFF]/70 hover:text-[#00AFFF] hover:bg-[#00AFFF]/8 hover:shadow-[0_0_12px_rgba(0,175,255,0.3)] transition-all"
                title={userProfile?.steamId ? 'Steam Library' : 'Connect Steam'}
              >
                <SteamIcon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Library</span>
              </button>

              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            </div>

            {/* Right: mode + submit */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Mode dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModeOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A1628] hover:bg-[#0d1e38] border border-[#00AFFF]/35 hover:border-[#00AFFF]/60 text-[11px] font-semibold text-[#00AFFF] transition-all"
                >
                  {generationMode === 'quick'
                    ? <Zap className="w-3.5 h-3.5" fill="currentColor" />
                    : <Sparkles className="w-3.5 h-3.5" />}
                  {generationMode === 'quick' ? 'Quick' : 'Detailed'}
                  <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${modeOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {modeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.13 }}
                      className="absolute bottom-full right-0 mb-2 w-36 bg-[#1A1C23] border border-white/10 rounded-xl shadow-2xl z-50 p-1"
                    >
                      <button
                        type="button"
                        onClick={() => setMode('quick')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold rounded-lg transition-colors ${
                          generationMode === 'quick' ? 'bg-[#0D1B4B] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-[#00AFFF]" fill="currentColor" /> Quick
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('detailed')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold rounded-lg transition-colors ${
                          generationMode === 'detailed' ? 'bg-[#0D1B4B] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#00AFFF]" /> Detailed
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={(!prompt.trim() && attachments.length === 0) || enhanceModal !== 'closed'}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(255,0,192,0.35)]"
              >
                <ArrowRight className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Mode error */}
      {modeError && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF00C0]/10 border border-[#FF00C0]/30 text-[#FF00C0] text-sm font-medium">
          <span>⚠</span> {modeError}
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            className="shrink-0 px-3 py-1 rounded-full bg-[#0A0A10] border border-white/10 text-[11px] text-[#B3B6CB] hover:border-[#FF00C0]/40 hover:text-white transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Modals ── */}
      {templatesOpen && (
        <GameTemplatesModal
          onSelect={(_files, hint) => { setPrompt(hint); setTemplatesOpen(false); }}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {steamLibraryOpen && userProfile?.steamId && (
        <SteamLibraryModal
          steamId={userProfile.steamId}
          steamUsername={userProfile.steamUsername}
          onSelect={p => { setPrompt(p); setSteamLibraryOpen(false); }}
          onClose={() => setSteamLibraryOpen(false)}
        />
      )}

      {steamConnectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setSteamConnectOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#0A0A10] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#00AFFF]/10 border border-[#00AFFF]/20 flex items-center justify-center shrink-0">
                <SteamIcon className="w-5 h-5 text-[#00AFFF]" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Connect Steam</p>
                <p className="text-xs text-zinc-500">Use your library as inspiration</p>
              </div>
              <button onClick={() => setSteamConnectOpen(false)} className="ml-auto p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#B3B6CB] mb-5 leading-relaxed">
              Connect your Steam account in Settings to browse your library and use your favourite games as creative inspiration.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSteamConnectOpen(false)}
                className="flex-1 py-2 text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { setSteamConnectOpen(false); navigate('/settings'); }}
                className="flex-1 py-2 text-sm font-bold bg-[#00AFFF] hover:bg-[#0099e0] text-white rounded-xl transition-all"
              >
                Go to Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {enhanceModal !== 'closed' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[9999] pt-[88px] pb-4 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#0A0A10] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col relative overflow-hidden"
            style={{ maxHeight: 'calc(100vh - 108px)' }}
          >
            {/* Ambient corner glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#FF00C0]/15 blur-[100px] rounded-full" />
              <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#00AFFF]/15 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF00C0] to-[#00AFFF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,0,192,0.3)]">
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#FF00C0] via-[#A855F7] to-[#00AFFF]">Enhance your idea</span>
              </div>
              <button onClick={() => {
                const wasPending = pendingSubmitRef.current;
                pendingSubmitRef.current = false;
                setEnhanceModal('closed');
                if (wasPending) navigate('/app', { state: { initialPrompt: prompt, initialAttachments: attachments } });
              }} className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 relative z-10">
              <div className="px-6 pt-4">
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Your idea</p>
                <p className="text-sm text-zinc-300 bg-white/5 rounded-xl px-3 py-2 border border-white/8 line-clamp-2">{prompt}</p>
              </div>

              {enhanceModal === 'loading' && (
                <div className="flex flex-col items-center gap-3 py-12 px-6">
                  <Loader2 className="w-6 h-6 text-[#FF00C0] animate-spin" />
                  <p className="text-sm text-zinc-400">Thinking about your game...</p>
                </div>
              )}

              {enhanceModal === 'questions' && (
                <div className="px-6 py-4 space-y-4">
                  <p className="text-xs text-zinc-400 mt-1">Answer a few quick questions to write the perfect prompt. All optional.</p>
                  {enhanceQuestions.map((q, i) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-200">
                        <span className="text-[#FF00C0] mr-1.5">{i + 1}.</span>{q.question}
                      </label>
                      <input
                        type="text"
                        value={enhanceAnswers[q.id] || ''}
                        onChange={e => setEnhanceAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#FF00C0]/50 focus:ring-1 focus:ring-[#FF00C0]/20 transition-colors"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2 pb-2">
                    <button
                      onClick={() => {
                        const wasPending = pendingSubmitRef.current;
                        pendingSubmitRef.current = false;
                        setEnhanceModal('closed');
                        if (wasPending) navigate('/app', { state: { initialPrompt: prompt, initialAttachments: attachments } });
                      }}
                      className="flex-1 py-2 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-medium"
                    >
                      Skip & Build
                    </button>
                    <button
                      onClick={handleEnhanceFinalize}
                      className="flex-1 py-2 text-sm font-bold bg-gradient-to-r from-[#FF00C0] to-[#8B5CF6] text-white rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Enhance Prompt
                    </button>
                  </div>
                </div>
              )}

              {enhanceModal === 'finalizing' && (
                <div className="flex flex-col items-center gap-3 py-12 px-6">
                  <Loader2 className="w-6 h-6 text-[#FF00C0] animate-spin" />
                  <p className="text-sm text-zinc-400">Writing your enhanced prompt...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
