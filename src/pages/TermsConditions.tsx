import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsConditions({ user, userProfile, onLogout }: { user?: any, userProfile?: any, onLogout?: () => void }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  },[]);

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sora relative overflow-hidden flex flex-col">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00AFFF]/10 blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF00C0]/10 blur-[120px] pointer-events-none -z-10"></div>

      {/* ✅ Navbar now receives the user props */}
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="flex-1 max-w-[800px] mx-auto px-6 pt-32 pb-20 w-full z-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-[#00AFFF] to-[#FF00C0] text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(255,0,192,0.3)] py-2">
          Terms & Conditions
        </h1>
        <p className="text-[#B3B6CB] mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-[#B3B6CB] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">1.</span>
              Agreement to Terms
            </h2>
            <p>
              By accessing our website and using the GameBot Studio services, you agree to be bound by these Terms and Conditions 
              and our Privacy Policy. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">2.</span>
              Intellectual Property Rights
            </h2>
            <p>
              The games you generate using GameBot Studio are subject to our licensing terms. While you retain the rights to the 
              prompts and specific creative direction you provide, the underlying AI engine, website code, design, and assets remain 
              the exclusive property of GameBot Studio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">3.</span>
              User Representations
            </h2>
            <p>
              By using GameBot Studio, you represent and warrant that:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>All registration information you submit will be true, accurate, current, and complete.</li>
              <li>You will maintain the accuracy of such information and promptly update it as necessary.</li>
              <li>You have the legal capacity to agree to these Terms and Conditions.</li>
              <li>You will not use the platform for any illegal or unauthorized purpose (e.g., generating hateful, explicit, or copyright-infringing content).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">4.</span>
              Token & Credit System
            </h2>
            <p>
              GameBot Studio uses a token/credit system for generating games. Credits purchased or granted are non-refundable. 
              We reserve the right to modify the cost of generations, subscription tiers, and token allocations at any time with prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">5.</span>
              Modifications and Interruptions
            </h2>
            <p>
              We reserve the right to change, modify, or remove the contents of the site at any time or for any reason at our sole 
              discretion without notice. We also reserve the right to modify or discontinue all or part of our services without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">6.</span>
              Governing Law
            </h2>
            <p>
              These conditions are governed by and interpreted following the laws of your jurisdiction, and the use of the United Nations 
              Convention of Contracts for the International Sale of Goods is expressly excluded.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}