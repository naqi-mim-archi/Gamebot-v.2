import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, Gamepad2, Code2, Zap, Mic, MicOff, Wand2, Loader2, Paperclip } from 'lucide-react';
import TopNav from './TopNav';
import { motion } from 'motion/react';
import { enhancePrompt } from '../services/geminiService';

interface WelcomeScreenProps {
  onStart: (prompt: string) => void;
  onLogin: () => void;
  user: any;
  userProfile?: any;
  onLogout: () => void;
}

export default function WelcomeScreen({ onStart, onLogin, user, userProfile, onLogout }: WelcomeScreenProps) {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const navigate = useNavigate();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setPrompt(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setPrompt('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (error) {
      console.error("Failed to enhance prompt", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStart(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim()) {
        onStart(prompt);
      }
    }
  };

  const suggestions = [
    "A neon cyberpunk snake game",
    "A physics-based platformer with gravity inversion",
    "A retro space shooter with boss fights"
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden selection:bg-emerald-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      <div className="glow-orb glow-orb-emerald w-[600px] h-[600px] top-[-200px] left-[-100px]"></div>
      <div className="glow-orb glow-orb-violet w-[500px] h-[500px] bottom-[-100px] right-[-100px]"></div>

      <TopNav 
        user={user} 
        userProfile={userProfile} 
        onLogin={onLogin} 
        onLogout={onLogout} 
        transparent={true}
      />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-5xl mx-auto w-full relative z-10 mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-6 mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-sm font-medium mb-4 backdrop-blur-md">
            <Sparkles className="w-4 h-4" />
            <span>GameBot Engine v2.0</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent font-display leading-tight">
            Describe a game.<br />Play it instantly.
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light">
            The world's first AI game engine. Generate, compile, and run complete browser games from your imagination in seconds.
          </p>
        </motion.div>

        {/* Prompt Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-3xl relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <form onSubmit={handleSubmit} className="relative glass-panel rounded-2xl overflow-hidden flex flex-col transition-all duration-300 focus-within:glass-panel-active">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g., A retro platformer where you play as a neon cat collecting stars..."
              className="w-full bg-transparent p-6 pb-16 text-lg resize-none focus:outline-none min-h-[180px] placeholder:text-zinc-600 text-white font-display"
              autoFocus
            />
            
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                title="Voice Input"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                className="p-2 bg-white/5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                title="Enhance Prompt"
              >
                {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Enhance</span>
              </button>
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              <span className="text-xs text-zinc-500 font-mono hidden sm:inline flex items-center gap-1">
                Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-zinc-300">↵</kbd> to generate
              </span>
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]"
              >
                Generate
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>

        {/* Suggestions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mt-8 max-w-3xl"
        >
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(sug)}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-medium"
            >
              {sug}
            </button>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full"
        >
          <div className="p-6 rounded-2xl glass-panel hover:glass-panel-active transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-6 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2 text-white">Instant Play</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">Your game is compiled and runs directly in the browser. No setup, no waiting, pure creation.</p>
          </div>
          <div className="p-6 rounded-2xl glass-panel hover:glass-panel-active transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-6 group-hover:scale-110 transition-transform">
              <Code2 className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2 text-white">Full Source Code</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">Get a complete multi-file project structure. Edit the code live in our premium IDE or download it.</p>
          </div>
          <div className="p-6 rounded-2xl glass-panel hover:glass-panel-active transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2 text-white">Iterative Design</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">Chat with the engine to refine mechanics, add features, or fix bugs instantly in real-time.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
