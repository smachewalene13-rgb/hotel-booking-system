import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import WriteReviewModal from '../components/WriteReviewModal';
import { 
  Calendar, 
  MapPin, 
  BedDouble, 
  Star, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'upcoming', 'past', 'cancelled'

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/me');
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Failed to load guest bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'Checked-in':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> Checked-in</span>;
      case 'Checked-out':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending Hold</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const filtered = bookings.filter((b) => {
    if (filterTab === 'upcoming') return ['Confirmed', 'Pending'].includes(b.status);
    if (filterTab === 'past') return ['Checked-out', 'Checked-in'].includes(b.status);
    if (filterTab === 'cancelled') return ['Cancelled', 'Expired', 'No-Show'].includes(b.status);
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-600 block mb-1">
            Guest Portal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900">
            My Reservations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your stays, view transparent billing, download tax invoices, and review past visits.
          </p>
        </div>

        <Link
          to="/availability"
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition self-start sm:self-auto"
        >
          Book Another Stay
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold pb-2">
        {[
          { key: 'all', label: 'All Stays' },
          { key: 'upcoming', label: 'Upcoming & Holds' },
          { key: 'past', label: 'Current & Past' },
          { key: 'cancelled', label: 'Cancelled' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 rounded-xl transition ${
              filterTab === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading your reservations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-slate-800">No Reservations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any reservations under this category. Plan your luxury getaway today!
          </p>
          <Link
            to="/rooms"
            className="inline-block mt-2 px-5 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
          >
            Browse Suites
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              {/* Room & Stay Details */}
              <div className="flex items-start gap-4">
                <img
                  src={b.room_image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80'}
                  alt={b.room_type_name}
                  className="w-24 h-24 rounded-2xl object-cover shrink-0 bg-slate-900 shadow-inner"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {b.code}
                    </span>
                    {getStatusBadge(b.status)}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-900 pt-0.5">
                    {b.room_type_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      {b.check_in} → {b.check_out}
                    </span>
                    {b.room_number && (
                      <span className="font-bold text-slate-800 bg-stone-100 px-2 py-0.5 rounded">
                        Room {b.room_number}
                      </span>
                    )}
                    <span>•</span>
                    <span>{b.adults} Adults, {b.children} Children</span>
                  </div>
                </div>
              </div>

              {/* Price & Action Buttons */}
              <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 gap-3">
                <div className="text-left md:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed</span>
                  <span className="font-serif text-lg font-bold text-slate-900">
                    ETB {parseFloat(b.total_amount).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Paid: <strong className="text-emerald-700">ETB {parseFloat(b.paid_amount).toFixed(2)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/my-bookings/${b.id}`}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </Link>

                  <a
                    href={`/api/v1/bookings/${b.id}/invoice.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-stone-50 transition"
                    title="Download Official PDF Invoice"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {/* Write review button if checked-out and no review yet (BR-38) */}
                  {b.status === 'Checked-out' && !b.review_id && (
                    <button
                      onClick={() => setSelectedBookingForReview(b)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1 transition shadow-sm"
                    >
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Review</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {selectedBookingForReview && (
        <WriteReviewModal
          booking={selectedBookingForReview}
          onSuccess={() => {
            setSelectedBookingForReview(null);
            fetchBookings();
          }}
          onClose={() => setSelectedBookingForReview(null)}
        />
      )}

    </div>
  );
}
