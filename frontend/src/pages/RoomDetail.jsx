import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useBooking } from '../context/BookingContext';
import { 
  Users, 
  Bed, 
  Maximize2, 
  Star, 
  CheckCircle, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Award
} from 'lucide-react';

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { searchParams, setSearchParams } = useBooking();

  const [room, setRoom] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Card Form State
  const [checkIn, setCheckIn] = useState(searchParams.checkIn);
  const [checkOut, setCheckOut] = useState(searchParams.checkOut);
  const [adults, setAdults] = useState(searchParams.adults);
  const [children, setChildren] = useState(searchParams.children);
  const [roomsCount, setRoomsCount] = useState(1);

  useEffect(() => {
    const fetchRoomAndReviews = async () => {
      try {
        const [rRes, revRes] = await Promise.all([
          api.get(`/room-types/${id}`),
          api.get(`/room-types/${id}/reviews`).catch(() => ({ data: { reviews: [] } }))
        ]);
        setRoom(rRes.data.roomType);
        setReviews(revRes.data.reviews || []);
      } catch (err) {
        setError('Room type details could not be loaded.');
      } finally {
        setLoading(false);
      }
    };
    fetchRoomAndReviews();
  }, [id]);

  const handleBookNow = (e) => {
    e.preventDefault();
    let validCheckOut = checkOut;
    if (!checkIn || !validCheckOut || new Date(validCheckOut) <= new Date(checkIn)) {
      const nextDay = new Date(checkIn || new Date());
      nextDay.setDate(nextDay.getDate() + 2);
      validCheckOut = nextDay.toISOString().split('T')[0];
      setCheckOut(validCheckOut);
    }
    setSearchParams({
      checkIn,
      checkOut: validCheckOut,
      adults,
      children,
      rooms: roomsCount,
    });
    navigate(`/checkout?roomTypeId=${id}&checkIn=${checkIn}&checkOut=${validCheckOut}&adults=${adults}&children=${children}&rooms=${roomsCount}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Loading suite presentation...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold font-serif text-slate-800 mb-2">Room Not Found</h2>
        <p className="text-slate-500 text-sm mb-6">{error || 'This room type does not exist.'}</p>
        <Link to="/rooms" className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">
          Return to All Rooms
        </Link>
      </div>
    );
  }

  const images = room.images?.length > 0
    ? room.images
    : [{ url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80' }];

  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const estimatedTotal = parseFloat(room.base_price) * nights * roomsCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Back Button & Title */}
      <div>
        <Link to="/rooms" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-600 transition mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Rooms & Suites
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              {room.name}
            </h1>
            {room.location && (
              <p className="text-xs sm:text-sm font-semibold text-amber-800 mt-1">
                📍 {room.location}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {parseFloat(room.avg_rating || 5.0).toFixed(1)} ({room.review_count || 0} reviews)
              </span>
              <span>•</span>
              <span>{room.bed_type}</span>
              <span>•</span>
              <span>{room.size_sqm} m² Luxury Space</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Base Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-serif font-bold text-slate-900">
                ETB {parseFloat(room.base_price).toFixed(0)}
              </span>
              <span className="text-xs text-slate-500">/ night</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Showcase */}
      <div className="space-y-4">
        {/* Main Large Image */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden shadow-xl bg-slate-950">
          <img
            src={images[activeImgIndex]?.url || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'}
            alt={images[activeImgIndex]?.caption || room.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80';
            }}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />
          
          {images.length > 1 && (
            <>
              <button
                onClick={() => setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveImgIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {images[activeImgIndex]?.caption && (
            <div className="absolute bottom-4 left-6 right-6 text-white text-xs sm:text-sm font-medium drop-shadow-md">
              {images[activeImgIndex].caption}
            </div>
          )}
        </div>

        {/* Thumbnails Row */}
        {images.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImgIndex(idx)}
                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                  activeImgIndex === idx ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={img.url}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80';
                  }}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content & Sticky Booking Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Left Column (2 cols): Details & Amenities */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Key Specs Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Occupancy</span>
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800">
                <Users className="w-4 h-4 text-amber-600" />
                <span>{room.max_adults} Adults, {room.max_children} Kids</span>
              </div>
            </div>

            <div className="space-y-1 border-l border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Bedding</span>
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800">
                <Bed className="w-4 h-4 text-amber-600" />
                <span>{room.bed_type}</span>
              </div>
            </div>

            <div className="space-y-1 border-l border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Suite Size</span>
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800">
                <Maximize2 className="w-4 h-4 text-amber-600" />
                <span>{room.size_sqm} m² / {Math.round(room.size_sqm * 10.764)} sq ft</span>
              </div>
            </div>

            <div className="space-y-1 border-l border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Physical Inventory</span>
              <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-800">
                <Award className="w-4 h-4 text-amber-600" />
                <span>{room.total_rooms || 4} Total Rooms</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-slate-900">About this Accommodation</h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base whitespace-pre-line">
              {room.description}
            </p>
          </div>

          {/* Included Amenities Checklist */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <h2 className="font-serif text-2xl font-bold text-slate-900">Suite Amenities & Conveniences</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.amenities?.map((am) => (
                <div key={am.id || am.name} className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-50 border border-slate-200/60 text-xs font-semibold text-slate-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{am.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resort Policies Reminder */}
          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2 text-xs">
            <h4 className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Reservation & Cancellation Assurance (BR-24)
            </h4>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>100% full refund for cancellations up to 48 hours prior to check-in.</li>
              <li>20% deposit locks your room; remainder settled at arrival or check-out.</li>
              <li>Standard Check-In begins at 14:00; Check-Out is at 12:00.</li>
            </ul>
          </div>

          {/* Guest Reviews Section */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold text-slate-900">Guest Reviews ({reviews.length})</h2>
              <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{parseFloat(room.avg_rating || 5.0).toFixed(1)} / 5.0</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No reviews yet for this room type. Be the first to share your experience after checkout!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          {rev.author_name?.[0] || 'G'}
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{rev.author_name || 'Verified Guest'}</span>
                          <span className="block text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{rev.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    {rev.reply && (
                      <div className="mt-3 p-3 bg-stone-50 rounded-xl border-l-2 border-amber-500 text-xs text-slate-700 space-y-1">
                        <span className="font-bold text-[11px] text-amber-900 block">General Manager Response:</span>
                        <p>{rev.reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Sticky Booking Card */}
        <div className="sticky top-28 bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-5">
          <div className="pb-4 border-b border-slate-100 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Nightly Rate</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-serif font-bold text-slate-900">
                  ETB {parseFloat(room.base_price).toFixed(0)}
                </span>
                <span className="text-xs text-slate-500">/ night</span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Best Rate
            </div>
          </div>

          <form onSubmit={handleBookNow} className="space-y-4">
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Check-In</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Check-Out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Guests & Rooms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Adults</label>
                <select
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {[...Array(room.max_adults)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} Adult{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Rooms</label>
                <select
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Preview */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ETB {parseFloat(room.base_price).toFixed(0)} × {nights} nights ({roomsCount} room)</span>
                <span>ETB {estimatedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes & Service (approx 25%)</span>
                <span>ETB {(estimatedTotal * 0.25).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span>Est. Total</span>
                <span>ETB {(estimatedTotal * 1.25).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98] text-sm"
            >
              Reserve Room (15-Min Hold)
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider pt-2 border-t border-slate-100">
            <span>Instant Confirmation</span>
            <span>•</span>
            <span>No Booking Fees</span>
          </div>

        </div>

      </div>

    </div>
  );
}
