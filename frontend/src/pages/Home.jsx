import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import HeroSearch from '../components/HeroSearch';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const FALLBACK_HERO_IMG = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=85';

export default function Home() {
  const [featuredRooms, setFeaturedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadHomeData = async () => {
      try {
        const roomsRes = await api.get('/room-types');
        if (isMounted) {
          const list = roomsRes.data?.roomTypes || [];
          setFeaturedRooms(list.slice(0, 3));
          setLoadError(false);
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadHomeData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-20 pb-20">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.jpg"
            alt="The Grand Horizon Resort"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=85';
            }}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
          
          <div className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-widest uppercase mb-6 backdrop-blur-md">
            The Premier Luxury Retreat
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl drop-shadow-lg">
            Where Timeless Elegance Meets Contemporary Comfort
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 font-light max-w-2xl leading-relaxed">
            Discover an oasis of lavish suites, private infinity terraces, bespoke wellness treatments, and Michelin-inspired dining.
          </p>

          {/* Search Bar matching screenshot */}
          <div className="mt-10 w-full max-w-4xl">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* 2. Featured Suites & Villas Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-amber-600 font-bold text-xs uppercase tracking-[0.2em] block mb-2">
              Sanctuary of Refinement
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Featured Luxury Accommodations
            </h2>
          </div>
          <Link
            to="/rooms"
            className="text-sm font-bold text-amber-700 hover:text-amber-800 transition tracking-wide underline underline-offset-4"
          >
            Explore All Luxury Suites
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="font-bold">Connecting to Cloud API...</p>
            <p className="text-sm text-amber-700 mt-1">If the backend was sleeping, please refresh in a few seconds.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredRooms.map((room) => (
              <RoomCard key={room.id} roomType={room} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Luxury Amenities Section - Editorial Numbered Cards */}
      <section className="bg-slate-950 text-white py-20 relative overflow-hidden" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-amber-400 font-bold text-xs uppercase tracking-[0.25em] block mb-2">
              Unrivalled Comforts
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight">
              Why Choose The Grand Horizon
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base">
              Every detail is tailored to indulge your senses, from custom acoustic architecture to panoramic private infinity pools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: '20% Deposit Guarantee', desc: 'Secure any suite or villa immediately with just a 20% deposit in ETB.' },
              { num: '02', title: '48-Hour Free Cancellation', desc: 'Full 100% automated refund if plans change up to 48 hours before check-in.' },
              { num: '03', title: '15-Min Guaranteed Hold', desc: 'Atomic inventory locking ensures nobody takes your suite during checkout.' },
              { num: '04', title: '24/7 Dedicated Concierge', desc: 'Bespoke airport shuttles, Michelin dining, and verified tour guides.' },
            ].map((am, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition duration-300">
                <div className="font-serif text-2xl font-bold text-amber-400 mb-4 tracking-wider">
                  {am.num}
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-100 mb-2">{am.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{am.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Newsletter Subscription Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl border border-amber-900/30">
          <div className="space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              Stay Informed
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold">
              Subscribe for VIP Rates & New Retreat Openings
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
              Receive secret promotional codes, weekend discounts across Ethiopia, and priority suite access directly in your inbox.
            </p>
          </div>

          {subscribedSuccess ? (
            <div className="p-5 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-emerald-300 flex items-center gap-3.5 shadow-lg animate-fade-in w-full md:w-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-200">
                  Thank you for subscribing!
                </p>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Exclusive VIP discount codes and retreat offers will be sent to <span className="font-semibold text-emerald-100">{subscriberEmail}</span>.
                </p>
              </div>
            </div>
          ) : (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (subscriberEmail && subscriberEmail.includes('@')) {
                  setSubscribedSuccess(true);
                }
              }} 
              className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0"
            >
              <input
                type="email"
                required
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                placeholder="Enter your email address"
                className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-72"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}
