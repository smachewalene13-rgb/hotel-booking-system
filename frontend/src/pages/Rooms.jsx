import React, { useState, useEffect } from 'react';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import { Filter, SlidersHorizontal, BedDouble, Users, DollarSign, Star } from 'lucide-react';

export default function Rooms() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [priceFilter, setPriceFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [bedFilter, setBedFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('price-asc');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/room-types');
        setRoomTypes(res.data.roomTypes || []);
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // Filter & Sort logic
  const filteredRooms = roomTypes
    .filter((room) => {
      const price = parseFloat(room.base_price);
      if (priceFilter === 'under-150' && price >= 150) return false;
      if (priceFilter === '150-300' && (price < 150 || price > 300)) return false;
      if (priceFilter === '300-plus' && price <= 300) return false;

      const totalCap = room.max_adults + room.max_children;
      if (capacityFilter === '1-2' && totalCap > 2) return false;
      if (capacityFilter === '3-plus' && totalCap < 3) return false;

      if (bedFilter !== 'all') {
        if (!room.bed_type.toLowerCase().includes(bedFilter.toLowerCase())) return false;
      }

      if (locationFilter !== 'all') {
        if (!room.location || !room.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return parseFloat(a.base_price) - parseFloat(b.base_price);
      if (sortBy === 'price-desc') return parseFloat(b.base_price) - parseFloat(a.base_price);
      if (sortBy === 'rating') return parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0);
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Page Title */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-amber-600 font-bold text-xs uppercase tracking-[0.25em] block mb-2">
          Distinctive Living Spaces
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">
          Suites, Rooms & Private Villas
        </h1>
        <p className="mt-3 text-slate-500 text-sm">
          Select from our carefully crafted collection of waterfront penthouses, grand presidential villas, and boutique luxury rooms.
        </p>
      </div>

      {/* Filter & Sort Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 text-slate-700 text-xs font-bold uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          <span>Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          
          {/* Price Range */}
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
          >
            <option value="all">All Prices</option>
            <option value="under-150">Under 150 ETB / night</option>
            <option value="150-300">150 - 300 ETB / night</option>
            <option value="300-plus">300+ ETB / night</option>
          </select>

          {/* Capacity */}
          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
          >
            <option value="all">Any Capacity</option>
            <option value="1-2">1 to 2 Guests</option>
            <option value="3-plus">3+ Guests / Families</option>
          </select>

          {/* Bed Type */}
          <select
            value={bedFilter}
            onChange={(e) => setBedFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
          >
            <option value="all">Any Bed Type</option>
            <option value="King">King Bed</option>
            <option value="Queen">Queen Bed</option>
            <option value="Twin">Twin / Double</option>
          </select>

          {/* Location Destination */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
          >
            <option value="all">All Locations (12 Properties)</option>
            <option value="Addis Ababa">Addis Ababa (Entoto, Bole, Piassa)</option>
            <option value="Bishoftu">Lake Bishoftu</option>
            <option value="Langano">Lake Langano (Rift Valley)</option>
            <option value="Gondar">Gondar (Simien & Castles)</option>
            <option value="Lalibela">Lalibela (Rock Monoliths)</option>
            <option value="Bale">Bale Mountains (Cloud Forest)</option>
            <option value="Tana">Lake Tana (Bahir Dar)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>

        </div>

        <span className="text-xs text-slate-500">
          Showing <strong>{filteredRooms.length}</strong> room types
        </span>

      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Room Types Match Your Criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try relaxing some of your filter parameters above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRooms.map((room) => (
            <RoomCard key={room.id} roomType={room} />
          ))}
        </div>
      )}

    </div>
  );
}
