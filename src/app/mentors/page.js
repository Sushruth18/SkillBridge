'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { Search, UserRoundSearch } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import MentorCard from '@/components/MentorCard';
import GlassCard from '@/components/ui/GlassCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

export default function MentorsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [skill, setSkill] = useState('');
  const [mentors, setMentors] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bookingMentor, setBookingMentor] = useState(null);
  const [bookingData, setBookingData] = useState({ scheduledAt: '', price: 30 });
  const [bookingError, setBookingError] = useState('');

  useEffect(() => { if (!isLoaded || !user) router.push('/login'); }, [user, isLoaded, router]);

  const search = async () => {
    setSearchError('');
    setSearching(true);
    try {
      const res = await fetch(`/api/matching?skill=${encodeURIComponent(skill)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch mentors');
      }
      const data = await res.json();
      setMentors(data.mentors || []);
    } catch (err) {
      setMentors([]);
      setSearchError(err.message || 'Something went wrong while searching mentors');
    } finally { setSearching(false); }
  };

  const bookSession = async () => {
    setBookingError('');
    if (!bookingData.scheduledAt) { setBookingError('Please select a date and time'); return; }
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: bookingMentor._id, skill: skill || bookingMentor.skills?.[0]?.name || 'General', scheduledAt: bookingData.scheduledAt, price: bookingData.price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookingMentor(null);
      router.push('/sessions');
    } catch (err) { setBookingError(err.message); }
  };

  if (!isLoaded || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="saas-shell">
      <Sidebar />
      <main className="saas-main">
        <h1 className="saas-heading mb-2">Find Mentors</h1>
        <p className="saas-subtext mb-6">Search by skill and book sessions from your top-matched mentors.</p>
        <div className="flex gap-3 mb-8">
          <input type="text" value={skill} onChange={e => setSkill(e.target.value)} placeholder="Search by skill (e.g. Python, React, ML...)"
            onKeyDown={e => e.key === 'Enter' && search()}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300/20 outline-none text-sm" />
          <motion.button whileTap={{ scale: 0.96 }} onClick={search} disabled={searching}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors text-sm">
            <Search className="h-4 w-4" />
            {searching ? 'Searching...' : 'Search'}
          </motion.button>
        </div>

        {searchError && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {searchError}
          </div>
        )}

        {searching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassCard><SkeletonLoader lines={4} /></GlassCard>
            <GlassCard><SkeletonLoader lines={4} /></GlassCard>
            <GlassCard><SkeletonLoader lines={4} /></GlassCard>
          </div>
        ) : mentors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map(m => <MentorCard key={m._id} mentor={m} onBook={setBookingMentor} />)}
          </div>
        ) : (
          <GlassCard className="p-12 text-center">
            <UserRoundSearch className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="text-slate-300 text-lg">Search for a skill to find matched mentors</p>
            <p className="text-slate-500 text-sm mt-1">Try: React, Python, Data Science, UI Design</p>
          </GlassCard>
        )}

        {bookingMentor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card bg-slate-900 p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-1">Book Session</h3>
              <p className="text-sm text-slate-400 mb-4">with {bookingMentor.name}</p>
              {bookingError && <div className="mb-3 p-2 bg-red-50 text-red-600 rounded text-sm">{bookingError}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Date & Time</label>
                  <input type="datetime-local" value={bookingData.scheduledAt} onChange={e => setBookingData({ ...bookingData, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Price (SkillCoins)</label>
                  <input type="number" value={bookingData.price} onChange={e => setBookingData({ ...bookingData, price: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm" />
                </div>
                <p className="text-xs text-slate-500">Coins will be held in escrow until session completion.</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setBookingMentor(null)} className="flex-1 px-4 py-2 border border-slate-700 rounded-lg text-sm hover:bg-slate-800 text-slate-200">Cancel</button>
                <button onClick={bookSession} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Confirm Booking</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


