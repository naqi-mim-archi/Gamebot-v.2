import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Mic, MicOff, Paperclip, Wand2, X, FileText, Loader2, LayoutTemplate } from 'lucide-react';
import { getEnhanceQuestions, finalizeEnhancedPrompt, EnhanceQuestion, FileAttachment } from '../services/geminiService';
import { motion } from 'motion/react';
import GameTemplatesModal from './GameTemplatesModal';
import SteamLibraryModal from './SteamLibraryModal';

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
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) setPrompt(prev => prev + (prev ? ' ' : '') + finalTranscript);
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
    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
      });
      reader.readAsDataURL(file);
      newAttachments.push({ name: file.name, mimeType: file.type || 'application/octet-stream', data: await base64Promise });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { await processFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhanceAnswers({});
    setEnhanceModal('loading');
    try {
      const questions = await getEnhanceQuestions(prompt);
      setEnhanceQuestions(questions);
      setEnhanceModal('questions');
    } catch (error) {
      console.error(error);
      setEnhanceModal('closed');
    }
  };

  const handleEnhanceFinalize = async () => {
    setEnhanceModal('finalizing');
    try {
      const answersMap: Record<string, string> = {};
      enhanceQuestions.forEach(q => { if (enhanceAnswers[q.id]) answersMap[q.question] = enhanceAnswers[q.id]; });
      const enhanced = await finalizeEnhancedPrompt(prompt, answersMap);
      setPrompt(enhanced);
      setEnhanceModal('closed');
    } catch (error) {
      console.error(error);
      setEnhanceModal('closed');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && attachments.length === 0) return;
    navigate('/app', { state: { initialPrompt: prompt, initialAttachments: attachments } });
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative z-20">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
        <div className="relative bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 mb-2 border-b border-white/5">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-xs text-zinc-300">
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span className="max-w-[100px] truncate">{file.name}</span>
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-start gap-2 px-3 pt-4 pb-2">
            <Sparkles className="w-5 h-5 text-zinc-400 mt-1.5 shrink-0" />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
              placeholder="Describe a game to build..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder-zinc-500 py-1 text-base sm:text-lg resize-none leading-relaxed overflow-y-auto"
              style={{ minHeight: '5rem', maxHeight: '10rem' }}
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              <button type="button" onClick={toggleListening}
                className={`p-2 transition-colors rounded-lg ${isListening ? 'text-red-400 bg-red-400/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button type="button" onClick={handleEnhancePrompt}
                disabled={!prompt.trim() || enhanceModal !== 'closed'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-emerald-400 rounded-lg transition-all border border-white/5 disabled:opacity-50">
                <Wand2 className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Enhance</span>
              </button>
              <button type="button" onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-violet-400 rounded-lg transition-all border border-white/5">
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Templates</span>
              </button>
              <button type="button"
                onClick={() => userProfile?.steamId ? setSteamLibraryOpen(true) : setSteamConnectOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 ${userProfile?.steamId ? 'text-sky-400' : 'text-zinc-500 hover:text-sky-400'}`}
                title={userProfile?.steamId ? 'Steam Library' : 'Connect Steam'}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
                </svg>
                <span className="text-[10px] uppercase font-bold tracking-wider">Library</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
            </div>
            <button type="submit"
              disabled={(!prompt.trim() && attachments.length === 0) || enhanceModal !== 'closed'}
              className="p-2.5 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {['Flappy Bird clone', 'Space Invaders', '3D Racing Game', 'Physics Puzzle'].map((suggestion) => (
          <button key={suggestion} onClick={() => setPrompt(suggestion)}
            className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 hover:text-white transition-colors">
            {suggestion}
          </button>
        ))}
      </div>

      {/* Templates Modal */}
      {templatesOpen && (
        <GameTemplatesModal
          onSelect={(templatePrompt) => setPrompt(templatePrompt)}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {/* Steam Library Modal */}
      {steamLibraryOpen && userProfile?.steamId && (
        <SteamLibraryModal
          steamId={userProfile.steamId}
          steamUsername={userProfile.steamUsername}
          onSelect={(inspirationPrompt) => { setPrompt(inspirationPrompt); setSteamLibraryOpen(false); }}
          onClose={() => setSteamLibraryOpen(false)}
        />
      )}

      {/* Steam Connect Popup */}
      {steamConnectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setSteamConnectOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Connect Steam</p>
                <p className="text-xs text-zinc-500">Use your library as inspiration</p>
              </div>
              <button onClick={() => setSteamConnectOpen(false)} className="ml-auto p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              Connect your Steam account in Settings to browse your game library and use your favourite games as creative inspiration.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setSteamConnectOpen(false)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={() => { setSteamConnectOpen(false); navigate('/settings'); }}
                className="flex-1 py-2 text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl transition-all"
              >
                Go to Settings
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Enhance Modal */}
      {enhanceModal !== 'closed' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-zinc-100">Enhance your idea</span>
              </div>
              <button onClick={() => setEnhanceModal('closed')}
                className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-1">Your idea</p>
              <p className="text-sm text-zinc-300 bg-zinc-800/60 rounded-xl px-3 py-2 border border-zinc-700 line-clamp-2">{prompt}</p>
            </div>

            {(enhanceModal === 'loading') && (
              <div className="flex flex-col items-center gap-3 py-12 px-6">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-sm text-zinc-400">Thinking about your game...</p>
              </div>
            )}

            {enhanceModal === 'questions' && (
              <div className="px-6 py-4 space-y-4">
                <p className="text-xs text-zinc-400 mt-1">Answer a few quick questions so I can write the perfect prompt. All fields are optional.</p>
                {enhanceQuestions.map((q, i) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-200">
                      <span className="text-emerald-500 mr-1.5">{i + 1}.</span>{q.question}
                    </label>
                    <input
                      type="text"
                      value={enhanceAnswers[q.id] || ''}
                      onChange={e => setEnhanceAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={q.placeholder}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEnhanceModal('closed')}
                    className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-medium">
                    Cancel
                  </button>
                  <button onClick={handleEnhanceFinalize}
                    className="flex-1 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Wand2 className="w-3.5 h-3.5" />
                    Enhance Prompt
                  </button>
                </div>
              </div>
            )}

            {enhanceModal === 'finalizing' && (
              <div className="flex flex-col items-center gap-3 py-12 px-6">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-sm text-zinc-400">Writing your enhanced prompt...</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
