import React, { useState } from 'react';
import api from '../api/client';
import { Search, AlertCircle, Calendar, BedDouble, CheckCircle } from 'lucide-react';

export default function BookingLookup() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setBooking(null);
    try {
      const res = await api.post('/bookings/lookup', { code: code.trim(), email: email.trim() });
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.message || 'No reservation found.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="text-center">
        <span className="text-amber-600 font-bold text-xs uppercase tracking-[0.25em] block mb-2">Guest Lookup</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">Find Your Reservation</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Enter the confirmation code from your email and the guest email address to retrieve your booking details.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirmation Code</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. HB-2026-001001"
              className="w-full px-4 py-3 bg-stone-50 border border-slate-300 rounded-xl text-sm font-mono font-semibold uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Guest Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
              className="w-full px-4 py-3 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50">
            <Search className="w-4 h-4" /> Look Up Reservation
          </button>
        </form>
      </div>

      {booking && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">Reservation Found</h3>
              <span className="font-mono text-xs text-amber-700 font-bold">{booking.code}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[11px] text-slate-400 font-bold block uppercase">Guest</span><span className="text-slate-800 font-semibold">{booking.guest_name}</span></div>
            <div><span className="text-[11px] text-slate-400 font-bold block uppercase">Status</span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${booking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : booking.status === 'Checked-in' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>{booking.status}</span>
            </div>
            <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-amber-600 mt-0.5" /><div><span className="text-[11px] text-slate-400 font-bold block uppercase">Dates</span><span>{booking.check_in} → {booking.check_out}</span></div></div>
            <div className="flex items-start gap-2"><BedDouble className="w-4 h-4 text-amber-600 mt-0.5" /><div><span className="text-[11px] text-slate-400 font-bold block uppercase">Room</span><span>{booking.room_type_name}{booking.room_number ? ` (Room ${booking.room_number})` : ''}</span></div></div>
            <div><span className="text-[11px] text-slate-400 font-bold block uppercase">Total</span><span className="font-serif font-bold text-slate-900">ETB {parseFloat(booking.total_amount).toFixed(2)}</span></div>
            <div><span className="text-[11px] text-slate-400 font-bold block uppercase">Paid</span><span className="font-semibold text-emerald-700">ETB {parseFloat(booking.paid_amount).toFixed(2)}</span></div>
          </div>
          {booking.room_image && <img src={booking.room_image} alt={booking.room_type_name} className="w-full h-48 object-cover rounded-2xl mt-4" />}
        </div>
      )}
    </div>
  );
}
