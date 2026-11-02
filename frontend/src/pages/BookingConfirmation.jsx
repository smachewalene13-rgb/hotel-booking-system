import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { CheckCircle, Calendar, User, Mail, Phone, BedDouble, Download, ArrowRight, Copy, Sparkles } from 'lucide-react';

export default function BookingConfirmation() {
  const { code } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await api.get(`/bookings/${code}`);
        setBooking(res.data.booking);
      } catch (err) {
        console.error('Failed to load booking:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [code]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(booking?.code || code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading confirmation details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Booking Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">Could not locate reservation with code: {code}</p>
        <Link to="/" className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">Return Home</Link>
      </div>
    );
  }

  const balance = Math.max(0, parseFloat(booking.total_amount) - parseFloat(booking.paid_amount));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

      {/* Success Banner */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 border border-emerald-200 shadow-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">Reservation {booking.status === 'Confirmed' ? 'Confirmed!' : 'Received'}</h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          {booking.status === 'Confirmed'
            ? 'Your luxury stay has been confirmed. A confirmation receipt will be sent to your email address.'
            : 'Your reservation is pending. Please complete payment to confirm your stay.'}
        </p>

        {/* Booking Code */}
        <div className="inline-flex items-center gap-3 mt-4 px-6 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confirmation Code</span>
            <span className="block text-xl font-mono font-black text-slate-900 tracking-wider">{booking.code}</span>
          </div>
          <button onClick={handleCopyCode} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-600 transition" title="Copy code">
            <Copy className="w-4 h-4" />
          </button>
          {copied && <span className="text-xs text-emerald-600 font-bold">Copied!</span>}
        </div>
      </div>

      {/* Reservation Details Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="font-serif text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">Reservation Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-[11px] text-slate-400 font-bold uppercase">Guest Name</span>
                <span className="font-semibold text-slate-900">{booking.guest_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-[11px] text-slate-400 font-bold uppercase">Email</span>
                <span className="text-slate-700">{booking.guest_email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-[11px] text-slate-400 font-bold uppercase">Phone</span>
                <span className="text-slate-700">{booking.guest_phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-[11px] text-slate-400 font-bold uppercase">Stay Dates</span>
                <span className="font-semibold text-slate-900">{booking.check_in} → {booking.check_out}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <BedDouble className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-[11px] text-slate-400 font-bold uppercase">Suite</span>
                <span className="font-semibold text-slate-900">{booking.room_type_name}</span>
                {booking.room_number && <span className="text-xs text-slate-500 block">Room {booking.room_number}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <div>
                <span className="block text-[11px] text-slate-400 font-bold uppercase">Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                  booking.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                  booking.status === 'Checked-in' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-700'
                }`}>{booking.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Room Subtotal</span>
            <span>ETB {parseFloat(booking.subtotal).toFixed(2)}</span>
          </div>
          {parseFloat(booking.extras_amount) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Extras & Services</span>
              <span>ETB {parseFloat(booking.extras_amount).toFixed(2)}</span>
            </div>
          )}
          {parseFloat(booking.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Promo Discount</span>
              <span>-ETB {parseFloat(booking.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Tax (15%)</span>
            <span>ETB {parseFloat(booking.tax_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Service Charge (10%)</span>
            <span>ETB {parseFloat(booking.service_charge).toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
            <span>Grand Total</span>
            <span>ETB {parseFloat(booking.total_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Paid</span>
            <span className="text-emerald-700 font-semibold">ETB {parseFloat(booking.paid_amount).toFixed(2)}</span>
          </div>
          {balance > 0 && (
            <div className="flex justify-between font-bold text-amber-800">
              <span>Balance Due at Check-in</span>
              <span>ETB {balance.toFixed(2)}</span>
            </div>
          )}
        </div>

        {booking.special_requests && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-bold uppercase block mb-1">Special Requests</span>
            <p className="text-xs text-slate-600 italic">{booking.special_requests}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={`/api/v1/bookings/${booking.id}/invoice.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs flex items-center gap-2 transition shadow-md"
        >
          <Download className="w-4 h-4" /> Download PDF Invoice
        </a>
        <Link
          to="/my-bookings"
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-md shadow-amber-500/20"
        >
          View All My Reservations <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
