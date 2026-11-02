import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList, Users, BedDouble, DollarSign, ArrowDownToLine, ArrowUpFromLine,
  Search, UserCheck, LogOut as LogOutIcon, Eye, AlertCircle, CheckCircle, Clock,
  PlusCircle, Loader2
} from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState('arrivals');

  // Check-in modal state
  const [checkinModal, setCheckinModal] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [idType, setIdType] = useState('Passport');
  const [idNumber, setIdNumber] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/staff/dashboard');
      setDashboard(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (searchStatus) params.set('status', searchStatus);
      const res = await api.get(`/staff/bookings?${params.toString()}`);
      setAllBookings(res.data.bookings || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { if (tab === 'all') fetchBookings(); }, [tab, searchQuery, searchStatus]);

  const openCheckInModal = async (booking) => {
    setCheckinModal(booking);
    try {
      const res = await api.get('/admin/rooms');
      const bTypeId = booking.room_type_id || booking.roomTypeId;
      const bTypeName = (booking.room_type_name || '').trim().toLowerCase();

      // Find all rooms that are Available or Clean for this room type
      let avail = (res.data.rooms || []).filter(r => {
        const isClean = ['Available', 'Clean', 'Inspected'].includes(r.status);
        const typeMatch = bTypeId 
          ? r.room_type_id === bTypeId 
          : (r.room_type_name || '').trim().toLowerCase() === bTypeName;
        return isClean && typeMatch;
      });

      // If no rooms matched specific type, offer all available clean rooms as upgrade options
      if (avail.length === 0) {
        avail = (res.data.rooms || []).filter(r => ['Available', 'Clean', 'Inspected'].includes(r.status));
      }

      setAvailableRooms(avail);
      if (avail.length > 0) setRoomId(avail[0].id);
      else setRoomId('');
    } catch (err) { 
      setAvailableRooms([]); 
      setRoomId('');
    }
  };

  const handleCheckIn = async () => {
    if (!roomId || !idNumber) { alert('Room and ID number are required.'); return; }
    setActionLoading('checkin');
    try {
      await api.post(`/staff/bookings/${checkinModal.id}/check-in`, { room_id: parseInt(roomId), id_type: idType, id_number: idNumber });
      setCheckinModal(null); setIdNumber(''); fetchDashboard();
    } catch (err) { alert(err.response?.data?.message || 'Check-in failed.'); }
    finally { setActionLoading(null); }
  };

  const handleCheckOut = async (bookingId) => {
    if (!confirm('Check out this guest? Room will be marked Dirty for housekeeping.')) return;
    setActionLoading(bookingId);
    try {
      await api.post(`/staff/bookings/${bookingId}/check-out`, { payment_method: 'cash' });
      fetchDashboard();
    } catch (err) { alert(err.response?.data?.message || 'Check-out failed.'); }
    finally { setActionLoading(null); }
  };

  const getStatusBadge = (s) => {
    const map = {
      'Confirmed': 'bg-emerald-100 text-emerald-800', 'Checked-in': 'bg-blue-100 text-blue-800',
      'Checked-out': 'bg-stone-100 text-stone-700', 'Pending': 'bg-amber-100 text-amber-800',
      'Cancelled': 'bg-rose-100 text-rose-800', 'Expired': 'bg-slate-100 text-slate-600',
      'No-Show': 'bg-red-100 text-red-800'
    };
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${map[s] || 'bg-slate-100 text-slate-700'}`}>{s}</span>;
  };

  if (loading) return <div className="py-20 text-center"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-600">Front Desk Operations</span>
          <h1 className="font-serif text-3xl font-bold text-slate-900">Staff Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Welcome, {user?.full_name}. Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link to="/staff/housekeeping" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm self-start">
          Housekeeping Board →
        </Link>
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><ArrowDownToLine className="w-5 h-5" /></div>
              <div><span className="text-[11px] text-slate-400 font-bold uppercase block">Today's Arrivals</span><span className="text-2xl font-bold text-slate-900">{dashboard.kpis.arrivalsCount}</span></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><ArrowUpFromLine className="w-5 h-5" /></div>
              <div><span className="text-[11px] text-slate-400 font-bold uppercase block">Departures</span><span className="text-2xl font-bold text-slate-900">{dashboard.kpis.departuresCount}</span></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><BedDouble className="w-5 h-5" /></div>
              <div><span className="text-[11px] text-slate-400 font-bold uppercase block">In-House</span><span className="text-2xl font-bold text-slate-900">{dashboard.kpis.inHouseCount}</span></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
              <div><span className="text-[11px] text-slate-400 font-bold uppercase block">Today Revenue</span><span className="text-2xl font-bold text-slate-900">ETB {dashboard.kpis.todayRevenue.toFixed(0)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Room Status Summary */}
      {dashboard && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Room Status Overview</h3>
          <div className="flex flex-wrap gap-3">
            {dashboard.roomStatuses.map((rs) => (
              <div key={rs.status} className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                rs.status === 'Available' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                rs.status === 'Occupied' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                rs.status === 'Dirty' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                rs.status === 'Cleaning' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {rs.status}: <strong>{rs.count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Arrivals / Departures / In-House / All Bookings */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold pb-2">
        {['arrivals', 'departures', 'inhouse', 'all'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl transition capitalize ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-stone-100'}`}>
            {t === 'inhouse' ? 'In-House Guests' : t === 'all' ? 'All Bookings' : `Today's ${t}`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'arrivals' && dashboard && (
        <div className="space-y-3">
          {dashboard.arrivals.length === 0 ? <p className="text-xs text-slate-500 py-8 text-center">No arrivals scheduled for today.</p> :
            dashboard.arrivals.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">{getStatusBadge(b.status)} <span className="font-mono text-xs text-amber-700 font-bold">{b.code}</span></div>
                  <h4 className="font-serif text-base font-bold text-slate-900">{b.guest_name}</h4>
                  <div className="text-xs text-slate-500">{b.room_type_name} • ETA: {b.estimated_arrival_time || 'N/A'} • {b.adults} Adults, {b.children} Kids</div>
                </div>
                <button onClick={() => openCheckInModal(b)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Check In
                </button>
              </div>
            ))}
        </div>
      )}

      {tab === 'departures' && dashboard && (
        <div className="space-y-3">
          {dashboard.departures.length === 0 ? <p className="text-xs text-slate-500 py-8 text-center">No departures for today.</p> :
            dashboard.departures.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">{getStatusBadge(b.status)} <span className="font-mono text-xs text-amber-700 font-bold">{b.code}</span></div>
                  <h4 className="font-serif text-base font-bold text-slate-900">{b.guest_name}</h4>
                  <div className="text-xs text-slate-500">{b.room_type_name} • Room {b.room_number || 'N/A'}</div>
                </div>
                <button onClick={() => handleCheckOut(b.id)} disabled={actionLoading === b.id}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50">
                  {actionLoading === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOutIcon className="w-4 h-4" />} Check Out
                </button>
              </div>
            ))}
        </div>
      )}

      {tab === 'inhouse' && dashboard && (
        <div className="space-y-3">
          {dashboard.inHouse.length === 0 ? <p className="text-xs text-slate-500 py-8 text-center">No in-house guests currently.</p> :
            dashboard.inHouse.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">{getStatusBadge(b.status)} <span className="font-mono text-xs text-amber-700 font-bold">{b.code}</span></div>
                  <h4 className="font-serif text-base font-bold text-slate-900">{b.guest_name}</h4>
                  <div className="text-xs text-slate-500">{b.room_type_name} • Room {b.room_number} • Floor {b.floor} • Checkout: {b.check_out}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCheckOut(b.id)} disabled={actionLoading === b.id}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50">
                    Check Out
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'all' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); }}
                placeholder="Search by code, guest name, phone, email, or room..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            </div>
            <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)}
              className="px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none">
              <option value="">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button onClick={fetchBookings} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition">Search</button>
          </div>
          <div className="space-y-2">
            {allBookings.map((b) => (
              <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {getStatusBadge(b.status)}
                  <span className="font-mono font-bold text-amber-700">{b.code}</span>
                  <span className="font-semibold text-slate-800">{b.guest_name}</span>
                  <span className="text-slate-500">{b.check_in} → {b.check_out}</span>
                  <span className="text-slate-500">{b.room_type_name}</span>
                  {b.room_number && <span className="font-bold text-slate-700 bg-stone-100 px-1.5 py-0.5 rounded">R{b.room_number}</span>}
                </div>
                <span className="font-bold text-slate-900">ETB {parseFloat(b.total_amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check-In Modal */}
      {checkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="font-serif font-bold text-lg text-amber-300">Check-In: {checkinModal.guest_name}</h3>
              <p className="text-xs text-slate-400">{checkinModal.code} • {checkinModal.room_type_name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Physical Room</label>
                <select 
                  value={roomId} 
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {availableRooms.length === 0 && <option value="">No available clean rooms for this suite</option>}
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} (Floor {r.floor}) • {r.room_type_name || r.status}
                    </option>
                  ))}
                </select>
                {availableRooms.length > 0 && availableRooms[0].room_type_id !== (checkinModal.room_type_id || checkinModal.roomTypeId) && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    ✨ Complimentary suite upgrade room assigned
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ID Type</label>
                  <select value={idType} onChange={(e) => setIdType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none">
                    <option value="Passport">Passport</option>
                    <option value="National ID">National ID</option>
                    <option value="Driver License">Driver License</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ID Number</label>
                  <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="PA123456789"
                    className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
                </div>
              </div>
            </div>
            <div className="p-5 bg-stone-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setCheckinModal(null)} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-stone-100 transition">Cancel</button>
              <button onClick={handleCheckIn} disabled={actionLoading === 'checkin'}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50">
                {actionLoading === 'checkin' && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Check-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
