import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Code, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function Showcase({ user }: { user?: any }) {
  const navigate = useNavigate();
  
  const initialExamples = [
    {
      id: "neon-racer",
      title: "Neon Racer",
      description: "A high-speed endless runner with cyberpunk aesthetics and synthwave music.",
      image: "https://picsum.photos/seed/neonracer/800/600",
      tags: ["Action", "3D", "Physics"],
      color: "from-fuchsia-500 to-purple-600",
      creator: "Alex_NY92",
      basePlays: 245
    },
    {
      id: "cosmic-defender",
      title: "Cosmic Defender",
      description: "Classic arcade shooter reimagined with particle effects and boss battles.",
      image: "https://picsum.photos/seed/cosmic/800/600",
      tags: ["Arcade", "Shooter", "Retro"],
      color: "from-cyan-400 to-blue-500",
      creator: "SarahGamer_TX",
      basePlays: 182
    },
    {
      id: "physics-puzzle",
      title: "Physics Puzzle",
      description: "Solve complex puzzles using gravity, magnetism, and momentum.",
      image: "https://picsum.photos/seed/physics/800/600",
      tags: ["Puzzle", "Logic", "2D"],
      color: "from-emerald-400 to-green-500",
      creator: "Mike_Dev_CA",
      basePlays: 310
    },
    {
      id: "dungeon-crawler",
      title: "Dungeon Crawler",
      description: "Procedurally generated RPG with loot, combat, and exploration.",
      image: "https://picsum.photos/seed/dungeon/800/600",
      tags: ["RPG", "Adventure", "Roguelike"],
      color: "from-amber-400 to-orange-500",
      creator: "EmilyPlays_WA",
      basePlays: 156
    },
    {
      id: "rhythm-jump",
      title: "Rhythm Jump",
      description: "Platformer where you must jump to the beat of the music.",
      image: "https://picsum.photos/seed/rhythm/800/600",
      tags: ["Music", "Platformer", "Casual"],
      color: "from-rose-400 to-red-500",
      creator: "Chris_Music_FL",
      basePlays: 289
    },
    {
      id: "space-tycoon",
      title: "Space Tycoon",
      description: "Manage a space station, trade resources, and expand your empire.",
      image: "https://picsum.photos/seed/tycoon/800/600",
      tags: ["Strategy", "Simulation", "Sci-Fi"],
      color: "from-indigo-400 to-violet-500",
      creator: "David_Strategy_IL",
      basePlays: 198
    }
  ];

  const [examples, setExamples] = useState(initialExamples);

  useEffect(() => {
    // Load dynamic playcounts from local storage
    const updatedExamples = initialExamples.map(ex => {
      const localPlays = parseInt(localStorage.getItem(`playcount_${ex.id}`) || '0');
      return {
        ...ex,
        plays: ex.basePlays + localPlays
      };
    });
    setExamples(updatedExamples);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      <SEO 
        title="Showcase - GameBot" 
        description="Explore games created with GameBot. From retro arcades to modern physics puzzlers, see what's possible with AI-generated code."
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

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {examples.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="group relative bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(`/play/${item.id}`)}
              >
                {/* Image */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 z-10`} />
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 z-20 backdrop-blur-sm">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/play/${item.id}`); }}
                      className="w-12 h-12 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                    >
                      <Play className="w-5 h-5 fill-current ml-1" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate('/app'); }}
                      className="w-12 h-12 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg border border-white/10"
                    >
                      <Code className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 rounded-md bg-white/5 text-xs font-medium text-zinc-400 border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 font-display">{item.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {item.creator.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-zinc-300">@{item.creator}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span>{item.plays} plays</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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
                Join thousands of creators building the future of gaming with AI. No coding experience required.
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
