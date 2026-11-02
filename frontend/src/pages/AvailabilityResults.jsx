import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import HeroSearch from '../components/HeroSearch';
import RoomCard from '../components/RoomCard';
import { Calendar, Users, SlidersHorizontal, AlertCircle, Sparkles, BedDouble } from 'lucide-react';

export default function AvailabilityResults() {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const destination = queryParams.get('destination') || '';
  const checkIn = queryParams.get('checkIn') || new Date().toISOString().split('T')[0];
  const checkOut = queryParams.get('checkOut');
  const adults = queryParams.get('adults') || 2;
  const children = queryParams.get('children') || 0;
  const rooms = queryParams.get('rooms') || 1;

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSearchEdit, setShowSearchEdit] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoading(true);
      setError('');
      try {
        const destQuery = destination ? `&destination=${encodeURIComponent(destination)}` : '';
        const res = await api.get(`/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${rooms}${destQuery}`);
        setResults(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to check room availability.');
      } finally {
        setLoading(false);
      }
    };

    if (checkIn && checkOut) {
      fetchAvailability();
    } else {
      setError('Please specify both check-in and check-out dates.');
      setLoading(false);
    }
  }, [destination, checkIn, checkOut, adults, children, rooms]);

  const handleSelectRoom = (room) => {
    navigate(`/checkout?roomTypeId=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${rooms}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Search Header Summary */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-900/30">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
            Real-Time Availability & Rates
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            Available Suites & Villas
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-300 pt-1">
            {destination && (
              <>
                <span className="font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                  Destination: {destination}
                </span>
                <span>•</span>
              </>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {checkIn} to {checkOut} ({results?.nights || 1} nights)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              {adults} Adult{adults > 1 ? 's' : ''}, {children} Children, {rooms} Room{rooms > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSearchEdit(!showSearchEdit)}
          className="px-5 py-2.5 rounded-xl border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-semibold hover:bg-slate-800 transition"
        >
          {showSearchEdit ? 'Hide Date Editor' : 'Modify Dates / Guests'}
        </button>
      </div>

      {/* Expandable Search Editor */}
      {showSearchEdit && (
        <div className="animate-fadeIn">
          <HeroSearch />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Querying real-time inventory and pricing overrides...</p>
        </div>
      )}

      {/* Results List */}
      {!loading && results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Found <strong>{results.availableCount}</strong> available room types matching your stay dates
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Instant Confirmation Guaranteed
            </span>
          </div>

          {results.availableCount === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-3">
              <BedDouble className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-serif text-xl font-bold text-slate-800">No Vacancy for Chosen Dates</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All rooms are fully reserved or blocked for maintenance for this date range. Please select alternative dates or contact concierge.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {results.roomTypes.map((room) => (
                <RoomCard
                  key={room.id}
                  roomType={room}
                  searchContext={results}
                  onSelect={handleSelectRoom}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
