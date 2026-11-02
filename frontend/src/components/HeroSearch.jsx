import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { Calendar, Search } from 'lucide-react';

export default function HeroSearch({ className = '' }) {
  const navigate = useNavigate();
  const { searchParams, setSearchParams } = useBooking();

  const [formState, setFormState] = useState({
    destination: searchParams.destination || '',
    checkIn: searchParams.checkIn,
    checkOut: searchParams.checkOut,
    guests: (searchParams.adults || 2) + (searchParams.children || 0),
    rooms: searchParams.rooms || 1,
  });

  const [error, setError] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');

    const start = new Date(formState.checkIn);
    const end = new Date(formState.checkOut);

    if (end <= start) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (nights > 30) {
      setError('Maximum stay is 30 consecutive nights.');
      return;
    }

    const adultsCount = Math.max(1, formState.guests || 2);
    const updatedParams = {
      ...searchParams,
      destination: formState.destination,
      checkIn: formState.checkIn,
      checkOut: formState.checkOut,
      adults: adultsCount,
      children: 0,
      rooms: formState.rooms || 1
    };

    setSearchParams(updatedParams);
    const query = new URLSearchParams({
      checkIn: formState.checkIn,
      checkOut: formState.checkOut,
      adults: adultsCount,
      children: 0,
      rooms: formState.rooms || 1,
      ...(formState.destination ? { destination: formState.destination } : {})
    });

    navigate(`/availability?${query.toString()}`);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl px-5 py-4 border border-slate-200 text-slate-800 w-full max-w-5xl mx-auto ${className}`}>
      {error && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3 md:gap-4 w-full">
        
        {/* Destination */}
        <div className="w-full md:flex-[1.4] text-left">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Destination
          </label>
          <input
            type="text"
            placeholder="Type here"
            value={formState.destination}
            onChange={(e) => setFormState({ ...formState, destination: e.target.value })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        {/* Check in */}
        <div className="w-full md:flex-1 text-left">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Check in
          </label>
          <input
            type="date"
            min={todayStr}
            value={formState.checkIn}
            onChange={(e) => setFormState({ ...formState, checkIn: e.target.value })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            required
          />
        </div>

        {/* Check out */}
        <div className="w-full md:flex-1 text-left">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Check out
          </label>
          <input
            type="date"
            min={formState.checkIn || todayStr}
            value={formState.checkOut}
            onChange={(e) => setFormState({ ...formState, checkOut: e.target.value })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
            required
          />
        </div>

        {/* Guests */}
        <div className="w-full md:w-24 text-left">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Guests
          </label>
          <input
            type="number"
            min="1"
            max="12"
            value={formState.guests}
            onChange={(e) => setFormState({ ...formState, guests: parseInt(e.target.value) || 1 })}
            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>

        {/* Search Button */}
        <div className="w-full md:w-auto self-end pt-1 md:pt-0">
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-black hover:bg-slate-900 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>

      </form>
    </div>
  );
}
