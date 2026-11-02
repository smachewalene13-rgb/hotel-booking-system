import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function RoomCard({ roomType, searchContext = null, onSelect = null }) {
  const images = roomType.images?.length > 0
    ? roomType.images
    : [{ url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80' }];

  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const pricing = roomType.pricing;
  const isLowInventory = roomType.availableRoomsCount !== undefined && roomType.availableRoomsCount <= 2;

  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('hotel_favorites') || '[]');
      return favs.includes(roomType.id);
    } catch {
      return false;
    }
  });

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col group">
      
      {/* Image Container with Slider */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <img
          src={images[activeImgIndex]?.url || images[0]?.url}
          alt={roomType.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

        {/* Image Nav Arrows if multiple */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center font-bold text-xs backdrop-blur-sm transition opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              &lsaquo;
            </button>
            <button
              onClick={nextImage}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center font-bold text-xs backdrop-blur-sm transition opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              &rsaquo;
            </button>
          </>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {roomType.featured && (
            <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow-sm">
              Signature Suite
            </span>
          )}
          {isLowInventory && (
            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-semibold text-[10px] uppercase tracking-wider shadow-sm animate-pulse">
              Only {roomType.availableRoomsCount} Left
            </span>
          )}
        </div>

        {/* Favorite Heart & Rating overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const favs = JSON.parse(localStorage.getItem('hotel_favorites') || '[]');
              const newFavs = favs.includes(roomType.id)
                ? favs.filter(id => id !== roomType.id)
                : [...favs, roomType.id];
              localStorage.setItem('hotel_favorites', JSON.stringify(newFavs));
              setIsFavorite(!isFavorite);
            }}
            aria-label="Add to favorites"
            className="w-7 h-7 rounded-full bg-slate-900/80 backdrop-blur-md flex items-center justify-center transition hover:scale-110 cursor-pointer shadow-sm"
          >
            <span className={`text-xs ${isFavorite ? 'text-rose-500 scale-125' : 'text-white/80 hover:text-white'}`}>
              {isFavorite ? '❤️' : '🤍'}
            </span>
          </button>

          <Link
            to={`/rooms/${roomType.id}`}
            className="px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-amber-400 font-bold text-[11px] tracking-wider uppercase hover:text-amber-300 transition"
          >
            ★ {parseFloat(roomType.avg_rating || 5.0).toFixed(1)} ({roomType.review_count || 12})
          </Link>
        </div>

        {/* Title on image bottom */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="font-serif text-lg sm:text-xl font-bold leading-tight drop-shadow-md">
            {roomType.name}
          </h3>
          {roomType.location && (
            <p className="text-[11px] text-amber-200 font-medium tracking-wide mt-0.5 truncate drop-shadow-sm">
              {roomType.location}
            </p>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        
        {/* Specs Row */}
        <div>
          {roomType.location && (
            <div className="text-[11px] font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 rounded-lg mb-2.5 block truncate">
              {roomType.location}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pb-3 border-b border-slate-100 font-medium">
            <span>Up to {roomType.max_adults} Adults</span>
            <span className="text-slate-300">•</span>
            <span>{roomType.bed_type}</span>
            <span className="text-slate-300">•</span>
            <span>{roomType.size_sqm} m²</span>
          </div>

          <p className="text-slate-600 text-xs mt-3 line-clamp-2 leading-relaxed">
            {roomType.description}
          </p>

          {/* Key Amenities */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {roomType.amenities?.slice(0, 4).map((am) => (
              <span
                key={am.id || am.name}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-slate-700 text-[11px] font-medium"
              >
                {am.name}
              </span>
            ))}
            {roomType.amenities?.length > 4 && (
              <span className="px-1.5 py-0.5 rounded-md bg-stone-100 text-slate-500 text-[10px]">
                +{roomType.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            {pricing ? (
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                  Total for {pricing.nights} night{pricing.nights > 1 ? 's' : ''} (incl. taxes)
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                    ETB {pricing.totalAmount.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({(pricing.roomSubtotal / pricing.nights).toFixed(0)} ETB/nt)
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">From</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                    ETB {parseFloat(roomType.base_price).toFixed(0)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ night</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              to={`/rooms/${roomType.id}`}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-xs transition"
            >
              Details
            </Link>

            {onSelect ? (
              <button
                onClick={() => onSelect(roomType)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                Select Suite
              </button>
            ) : (() => {
              const today = new Date();
              const defIn = new Date(today);
              defIn.setDate(today.getDate() + 1);
              const defOut = new Date(today);
              defOut.setDate(today.getDate() + 3);
              const cInParam = searchContext?.checkIn || defIn.toISOString().split('T')[0];
              const cOutParam = searchContext?.checkOut || defOut.toISOString().split('T')[0];
              return (
                <Link
                  to={`/checkout?roomTypeId=${roomType.id}&checkIn=${cInParam}&checkOut=${cOutParam}&adults=1&rooms=1`}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                >
                  Book Now
                </Link>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
