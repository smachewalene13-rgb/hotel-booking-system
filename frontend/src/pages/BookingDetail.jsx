import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, Users, MapPin, Download, AlertCircle, CheckCircle2, 
  Clock, ShieldAlert, CreditCard, ChevronLeft, BedDouble, 
  FileText, Star, XCircle, ArrowRight, Sparkles, Plus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PaymentSimulatorModal from '../components/PaymentSimulatorModal';
import WriteReviewModal from '../components/WriteReviewModal';
import ConciergeAddonsModal from '../components/ConciergeAddonsModal';

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals & Action states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAddonsModal, setShowAddonsModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data.booking);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id]);

  const handleCancelBooking = async () => {
    try {
      setCancelling(true);
      const res = await api.post(`/bookings/${id}/cancel`, {
        reason: cancelReason || 'Guest requested cancellation',
      });
      setCancelFeedback(res.data);
      setShowCancelPrompt(false);
      fetchBooking();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel reservation');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Confirmed
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> In-House (Checked In)
          </span>
        );
      case 'checked_out':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Completed (Checked Out)
          </span>
        );
      case 'hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Temporary Hold (Awaiting Payment)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Retrieving booking reservation...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Reservation Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'Unable to locate this reservation.'}</p>
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Return to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const checkInRaw = booking.check_in || booking.check_in_date;
  const checkOutRaw = booking.check_out || booking.check_out_date;
  const checkInDate = checkInRaw ? (typeof checkInRaw === 'string' ? parseISO(checkInRaw.split('T')[0]) : new Date(checkInRaw)) : null;
  const checkOutDate = checkOutRaw ? (typeof checkOutRaw === 'string' ? parseISO(checkOutRaw.split('T')[0]) : new Date(checkOutRaw)) : null;
  const nights = checkInDate && checkOutDate ? Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))) : 1;
  const balanceDue = Math.max(0, (Number(booking.total_amount) || 0) - (Number(booking.paid_amount) || 0));

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/my-bookings"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to My Bookings
          </Link>

          <div className="flex items-center gap-3">
            {/* PDF Invoice Button */}
            <a
              href={`/api/v1/bookings/${booking.id}/invoice.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" /> Download PDF Folio
            </a>

            {/* Review Button for Checked-Out */}
            {booking.status === 'checked_out' && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-all shadow-sm"
              >
                <Star className="w-3.5 h-3.5 fill-current" /> Write Stay Review
              </button>
            )}
          </div>
        </div>

        {/* Cancel Feedback Banner */}
        {cancelFeedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm">
            <h4 className="font-semibold">{cancelFeedback.message}</h4>
            {cancelFeedback.refundAmount > 0 && (
              <p className="text-xs mt-1">
                A refund of <strong>ETB {cancelFeedback.refundAmount.toFixed(2)}</strong> has been initiated according to our cancellation policy.
              </p>
            )}
          </div>
        )}

        {/* Main Booking Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                  Reservation #{booking.booking_code}
                </h1>
                {getStatusBadge(booking.status)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Booked on {booking.created_at ? format(parseISO(booking.created_at), 'MMMM dd, yyyy') : 'N/A'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Amount</span>
              <span className="text-2xl sm:text-3xl font-serif font-bold text-amber-700">
                ETB {Number(booking.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dates & Guests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> Check-In
              </div>
              <div className="text-base font-bold text-slate-900">
                {checkInDate ? format(checkInDate, 'EEE, MMM dd, yyyy') : 'N/A'}
              </div>
              <span className="text-xs text-slate-500">From 3:00 PM</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> Check-Out
              </div>
              <div className="text-base font-bold text-slate-900">
                {checkOutDate ? format(checkOutDate, 'EEE, MMM dd, yyyy') : 'N/A'}
              </div>
              <span className="text-xs text-slate-500">Until 11:00 AM ({nights} {nights === 1 ? 'Night' : 'Nights'})</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Users className="w-3.5 h-3.5 text-amber-600" /> Occupancy
              </div>
              <div className="text-base font-bold text-slate-900">
                {booking.adults} {booking.adults === 1 ? 'Adult' : 'Adults'}
                {booking.children > 0 ? `, ${booking.children} ${booking.children === 1 ? 'Child' : 'Children'}` : ''}
              </div>
              <span className="text-xs text-slate-500">Room Type: {booking.room_type_name || 'Standard'}</span>
            </div>
          </div>

          {/* Room & Property Details */}
          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <BedDouble className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {booking.room_type_name || 'Luxury Suite'}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  {booking.room_type_location ? `📍 ${booking.room_type_location}` : '📍 The Grand Horizon Luxury Resort & Spa • Bole District, Addis Ababa'}
                </p>
                {booking.assigned_room_number && (
                  <p className="text-xs font-semibold text-amber-800 mt-0.5">
                    Assigned Room #{booking.assigned_room_number} (Floor {booking.assigned_floor || 1})
                  </p>
                )}
              </div>
            </div>

            {booking.room_type_id && (
              <Link
                to={`/rooms/${booking.room_type_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 underline self-start md:self-auto"
              >
                View Room Amenities & Photos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Guest Contact Details */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Guest Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Guest Full Name</span>
                <span className="font-semibold text-slate-800">
                  {booking.guest_name || `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`.trim() || 'Guest'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Email Address</span>
                <span className="font-semibold text-slate-800">{booking.guest_email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Phone Number</span>
                <span className="font-semibold text-slate-800">{booking.guest_phone || 'None provided'}</span>
              </div>
            </div>
            {booking.special_requests && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                <span className="font-semibold text-slate-700">Special Requests: </span>
                {booking.special_requests}
              </div>
            )}
          </div>

          {/* Concierge & In-Stay Add-Ons Section */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Concierge & In-Stay Add-Ons
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request luxury Mercedes airport transfer, private spa, champagne setup, or gourmet breakfast.
                </p>
              </div>
              {['pending', 'confirmed', 'checked_in', 'checked-in', 'hold'].includes(booking.status?.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => setShowAddonsModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Concierge Service</span>
                </button>
              )}
            </div>

            {booking.extras && booking.extras.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {booking.extras.map((extra, idx) => (
                  <div key={idx} className="p-3.5 bg-stone-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{extra.name}</h4>
                      <span className="text-[11px] text-slate-500">
                        Qty: {extra.quantity} × ETB {Number(extra.unit_price).toFixed(2)}
                      </span>
                    </div>
                    <span className="font-serif font-bold text-xs text-amber-700">
                      ETB {Number(extra.total_price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                No extra concierge services added yet. Click &quot;Add Concierge Service&quot; above to elevate your retreat!
              </div>
            )}
          </div>

          {/* Billing & Folio Breakdown */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Financial & Folio Breakdown</h3>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Room Charges ({nights} {nights === 1 ? 'Night' : 'Nights'})</span>
                <span className="font-medium text-slate-900">
                  ETB {(Number(booking.base_rate_per_night || booking.total_amount / (nights || 1)) * nights).toFixed(2)}
                </span>
              </div>
              {Number(booking.extras_amount || booking.addons_total) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Selected Add-on Amenities & Services</span>
                  <span className="font-medium text-slate-900">ETB {Number(booking.extras_amount || booking.addons_total).toFixed(2)}</span>
                </div>
              )}
              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Promotional Discount</span>
                  <span>-ETB {Number(booking.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(booking.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Applicable VAT / Hotel Taxes</span>
                  <span className="font-medium text-slate-900">ETB {Number(booking.tax_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-base text-slate-900">
                <span>Total Folio Amount</span>
                <span>ETB {Number(booking.total_amount).toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Amount Paid</span>
                <span>ETB {Number(booking.paid_amount || 0).toFixed(2)}</span>
              </div>

              {balanceDue > 0 && (
                <div className="flex justify-between text-amber-700 font-bold border-t border-dashed border-amber-200 pt-2">
                  <span>Outstanding Balance Due</span>
                  <span>ETB {balanceDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Pay Outstanding Balance CTA */}
            {balanceDue > 0 && booking.status !== 'cancelled' && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl gap-3">
                <div className="text-xs text-amber-800">
                  <span className="font-bold">Pending Payment: </span>
                  An outstanding balance of <strong>ETB {balanceDue.toFixed(2)}</strong> remains on this folio.
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                >
                  Pay Outstanding Balance
                </button>
              </div>
            )}
          </div>

          {/* Cancellation Policy & Action */}
          {['confirmed', 'hold'].includes(booking.status) && (
            <div className="border-t border-slate-100 pt-6">
              {!showCancelPrompt ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">Need to cancel your reservation?</p>
                    <p>Free cancellation applies up to 48 hours before check-in date.</p>
                  </div>
                  <button
                    onClick={() => setShowCancelPrompt(true)}
                    className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancel Reservation
                  </button>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-900 text-sm">Confirm Reservation Cancellation</h4>
                      <p className="text-xs text-rose-700 mt-1">
                        Are you sure you want to cancel booking #{booking.booking_code}? Depending on when you cancel, standard cancellation fees may apply.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-rose-800 mb-1">
                      Reason for Cancellation (Optional)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Let us know why you need to cancel..."
                      rows={2}
                      className="w-full text-xs p-3 border border-rose-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowCancelPrompt(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                    >
                      Keep Reservation
                    </button>
                    <button
                      onClick={handleCancelBooking}
                      disabled={cancelling}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                    >
                      {cancelling ? 'Cancelling...' : 'Confirm & Cancel Booking'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentSimulatorModal
          bookingId={booking.id}
          bookingCode={booking.booking_code}
          amount={balanceDue}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchBooking();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <WriteReviewModal
          bookingId={booking.id}
          roomTypeId={booking.room_type_id}
          onSuccess={() => {
            setShowReviewModal(false);
            alert('Thank you for submitting your review!');
          }}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      {/* Concierge Addons Modal */}
      {showAddonsModal && (
        <ConciergeAddonsModal
          booking={booking}
          onClose={() => setShowAddonsModal(false)}
          onSuccess={() => {
            fetchBooking();
          }}
        />
      )}
    </div>
  );
}
