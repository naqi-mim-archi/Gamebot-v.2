import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Gamepad2, ArrowLeft, Trophy } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getPublicGames, SavedGame } from '../services/db';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

interface Creator {
  userId: string;
  name: string;
  photo: string;
  gameCount: number;
  totalPlays: number;
  totalLikes: number;
}

async function fetchCreatorInfo(uid: string): Promise<{ displayName?: string; photoURL?: string }> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return {};
    const data = snap.data();
    return { displayName: data.displayName, photoURL: data.photoURL };
  } catch { return {}; }
}

interface Props { user?: any; userProfile?: any; onLogout?: () => void; }

export default function AllCreators({ user, userProfile, onLogout }: Props) {
  const navigate = useNavigate();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const raw = await getPublicGames(200);
      if (cancelled) return;
      const uniqueUids = [...new Set(raw.map(g => g.userId))];
      const creatorMap: Record<string, { displayName?: string; photoURL?: string }> = {};
      await Promise.all(uniqueUids.map(async uid => { creatorMap[uid] = await fetchCreatorInfo(uid); }));
      if (cancelled) return;
      setGames(raw.map(g => ({ ...g, creatorName: creatorMap[g.userId]?.displayName, creatorPhoto: creatorMap[g.userId]?.photoURL } as any)));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const creators = useMemo(() => {
    const stats: Record<string, Creator> = {};
    games.forEach((g: any) => {
      if (!stats[g.userId]) {
        stats[g.userId] = { userId: g.userId, name: g.creatorName || 'Anonymous', photo: g.creatorPhoto || '', gameCount: 0, totalPlays: 0, totalLikes: 0 };
      }
      stats[g.userId].gameCount++;
      stats[g.userId].totalPlays += g.playCount || 0;
      stats[g.userId].totalLikes += g.likes || 0;
    });
    return Object.values(stats).sort((a, b) => b.gameCount - a.gameCount);
  }, [games]);

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sans">
      <SEO title="Top Creators - GameBot" description="All game creators on GameBot." />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="pt-32 pb-20 px-6 md:px-10 max-w-[1200px] mx-auto">
        <div className="mb-10">
        
          <span className="text-[#FF00C0] text-[10px] font-black tracking-widest uppercase mb-2 block">PROLIFIC GAME BUILDERS</span>
          <h1 className="text-4xl font-display font-light text-white">Top Creators</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-[#FF00C0] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {creators.map((creator, idx) => (
              <button
                key={creator.userId}
                onClick={() => navigate(`/profile/${creator.userId}`)}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#0A0A10] border border-white/5 hover:border-[#FF00C0]/40 hover:shadow-[0_0_20px_rgba(255,0,192,0.1)] transition-all duration-300 hover:-translate-y-1 text-center"
              >
                {/* Rank badge */}
                <div className="relative">
                  {creator.photo ? (
                    <img src={creator.photo} alt={creator.name} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#FF00C0]/30 group-hover:ring-[#FF00C0]/60 transition-all" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] flex items-center justify-center text-xl font-bold text-white">
                      {creator.name[0].toUpperCase()}
                    </div>
                  )}
                  {idx < 3 && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-zinc-400' : 'bg-amber-700'}`}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                <div>
                  <p className="font-bold text-white text-sm group-hover:text-[#00AFFF] transition-colors">{creator.name}</p>
                  <p className="text-zinc-500 text-[11px] mt-0.5">{creator.gameCount} game{creator.gameCount !== 1 ? 's' : ''}</p>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-zinc-500 border-t border-white/5 pt-3 w-full justify-center">
                  <span className="flex items-center gap-1 text-[#00AFFF]">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    {creator.totalPlays.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-[#FF00C0]">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {creator.totalLikes.toLocaleString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
