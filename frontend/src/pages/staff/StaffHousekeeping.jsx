import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, Clock, AlertTriangle, RefreshCw, Filter, ShieldAlert, DoorClosed, Layers } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function StaffHousekeeping() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/housekeeping/rooms');
      setRooms(res.data.rooms || []);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load housekeeping room board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      setUpdatingId(roomId);
      const res = await api.put(`/housekeeping/rooms/${roomId}/status`, { status: newStatus });
      const updatedStatus = res.data?.room?.status || newStatus;
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: updatedStatus } : r))
      );
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update room housekeeping status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Clean / Available
          </span>
        );
      case 'cleaning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> In Cleaning
          </span>
        );
      case 'dirty':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Dirty / Needs Turnover
          </span>
        );
      case 'occupied':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Occupied
          </span>
        );
      case 'maintenance':
      case 'out of service':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-800 border border-gray-300">
            <ShieldAlert className="w-3.5 h-3.5" /> Maintenance / OOO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
            {status}
          </span>
        );
    }
  };

  // Unique floors
  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  const filteredRooms = rooms.filter((r) => {
    const s = (r.status || '').toLowerCase();
    const filterS = statusFilter.toLowerCase();
    const matchesStatus = filterS === 'all' || s === filterS;
    const matchesFloor = floorFilter === 'ALL' || String(r.floor) === String(floorFilter);
    return matchesStatus && matchesFloor;
  });

  const stats = {
    total: rooms.length,
    dirty: rooms.filter((r) => (r.status || '').toLowerCase() === 'dirty').length,
    cleaning: rooms.filter((r) => (r.status || '').toLowerCase() === 'cleaning').length,
    available: rooms.filter((r) => (r.status || '').toLowerCase() === 'available').length,
    maintenance: rooms.filter((r) => ['maintenance', 'out of service'].includes((r.status || '').toLowerCase())).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Housekeeping & Turndown Board
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
              Room Turnover & Housekeeping
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time room cleanliness, inspection, and housekeeping status monitoring.
            </p>
          </div>

          <button
            onClick={fetchRooms}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all shadow-sm active:scale-95 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            Refresh Board
          </button>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Rooms</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-rose-50/60 border border-rose-100 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Dirty / Needs Clean</span>
            <div className="text-2xl font-bold text-rose-700 mt-1">{stats.dirty}</div>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">In Cleaning</span>
            <div className="text-2xl font-bold text-amber-800 mt-1">{stats.cleaning}</div>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Inspected & Ready</span>
            <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.available}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {['ALL', 'dirty', 'cleaning', 'available', 'maintenance'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  statusFilter.toLowerCase() === st.toLowerCase()
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Floor:
            </span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              {floors.map((fl) => (
                <option key={fl} value={fl}>
                  Floor {fl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Room Grid */}
        {error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
            {error}
          </div>
        ) : loading && rooms.length === 0 ? (
          <div className="text-center py-24 text-slate-400">Loading housekeeping room board...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-24 text-slate-400 bg-white rounded-3xl border border-slate-100">
            No rooms match the selected filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredRooms.map((room) => {
              const currentStatus = (room.status || '').toLowerCase();
              return (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm">
                          <DoorClosed className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base leading-tight">
                            Room {room.room_number}
                          </h3>
                          <p className="text-xs text-slate-400">Floor {room.floor}</p>
                        </div>
                      </div>
                      {getStatusBadge(room.status)}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Type:</span>
                        <span className="font-semibold text-slate-800">{room.room_type_name || room.room_type}</span>
                      </div>
                      {room.current_occupant && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Guest:</span>
                          <span className="font-semibold text-amber-700">{room.current_occupant.guest_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Set Status
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleStatusChange(room.id, 'Dirty')}
                        disabled={updatingId === room.id || currentStatus === 'dirty'}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                          currentStatus === 'dirty'
                            ? 'bg-rose-600 text-white opacity-80'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
                        }`}
                      >
                        Dirty
                      </button>
                      <button
                        onClick={() => handleStatusChange(room.id, 'Cleaning')}
                        disabled={updatingId === room.id || currentStatus === 'cleaning'}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                          currentStatus === 'cleaning'
                            ? 'bg-amber-600 text-white opacity-80'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                        }`}
                      >
                        Clean
                      </button>
                      <button
                        onClick={() => handleStatusChange(room.id, 'Available')}
                        disabled={updatingId === room.id || currentStatus === 'available'}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                          currentStatus === 'available'
                            ? 'bg-emerald-600 text-white opacity-80'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                        }`}
                      >
                        Ready
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
