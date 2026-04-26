import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPolicy({ user, userProfile, onLogout }: { user?: any, userProfile?: any, onLogout?: () => void }) {
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
          Privacy Policy
        </h1>
        <p className="text-[#B3B6CB] mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 text-[#B3B6CB] text-[15px] leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">1.</span>
              Introduction
            </h2>
            <p>
              Welcome to GameBot Studio. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you visit our website 
              and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">2.</span>
              The Data We Collect About You
            </h2>
            <p>
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data:</strong> includes email address.</li>
              <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
              <li><strong>Usage Data:</strong> includes information about how you use our website, AI generation prompts, and created games.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">3.</span>
              How We Use Your Data
            </h2>
            <p>
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., generating your games).</li>
              <li>Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">4.</span>
              Data Security
            </h2>
            <p>
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, 
              used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data 
              to those employees, agents, contractors and other third parties who have a business need to know.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              <span className="text-[#FF00C0] drop-shadow-[0_0_8px_rgba(255,0,192,0.6)] mr-2">5.</span>
              Contact Us
            </h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact us through our Discord community 
              or via the contact information provided on our website.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}