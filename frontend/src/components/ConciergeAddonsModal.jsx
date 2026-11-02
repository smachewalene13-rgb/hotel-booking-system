import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { 
  Car, 
  Utensils, 
  Sparkles, 
  Clock, 
  Heart, 
  Shirt, 
  BedDouble, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Calendar,
  Send,
  Loader2,
  ChevronRight
} from 'lucide-react';

export default function ConciergeAddonsModal({ booking, onClose, onSuccess }) {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Custom specific fields
  const [flightNumber, setFlightNumber] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Default fallback services if DB returns empty
  const defaultServices = [
    {
      id: 2,
      name: 'Chauffeured Luxury Airport Transfer',
      price: 55.00,
      pricing_type: 'per_booking',
      icon: 'car',
      category: 'Transport',
      description: 'Private Mercedes-Benz airport pickup and drop-off with chilled refreshments.'
    },
    {
      id: 1,
      name: 'Gourmet Artisanal Breakfast Buffet',
      price: 28.00,
      pricing_type: 'per_guest',
      icon: 'utensils',
      category: 'Dining',
      description: 'Fresh bakery pastries, made-to-order eggs, organic juices and Ethiopian specialty coffees.'
    },
    {
      id: 3,
      name: 'Therapeutic Full-Body Spa Massage (60 min)',
      price: 95.00,
      pricing_type: 'per_booking',
      icon: 'sparkles',
      category: 'Wellness',
      description: 'Relaxing aromatherapy ritual with essential oils in the private spa retreat.'
    },
    {
      id: 4,
      name: 'VIP Early Check-in (from 11:00 AM)',
      price: 45.00,
      pricing_type: 'per_booking',
      icon: 'clock',
      category: 'Convenience',
      description: 'Guaranteed access to your suite 3 hours prior to standard check-in time.'
    },
    {
      id: 5,
      name: 'VIP Late Check-out (until 3:00 PM)',
      price: 45.00,
      pricing_type: 'per_booking',
      icon: 'clock',
      category: 'Convenience',
      description: 'Extended suite relaxation until 3:00 PM on departure day.'
    },
    {
      id: 6,
      name: 'Romantic Welcome Package',
      price: 75.00,
      pricing_type: 'per_booking',
      icon: 'heart',
      category: 'Celebration',
      description: 'Chilled bottle of French Champagne, artisanal chocolate truffles, and fresh rose arrangement.'
    },
    {
      id: 7,
      name: 'Same-Day Express Laundry & Valet Pressing',
      price: 25.00,
      pricing_type: 'per_booking',
      icon: 'shirt',
      category: 'Convenience',
      description: 'Professional laundering, steaming, and hanger-ready garment care.'
    }
  ];

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await api.get('/services');
        if (res.data?.services?.length > 0) {
          // Merge with early/late check-in options if not in DB
          const hasEarly = res.data.services.some(s => s.name.toLowerCase().includes('early check'));
          let combined = [...res.data.services];
          if (!hasEarly) {
            combined.push(
              {
                id: 101,
                name: 'VIP Early Check-in (from 11:00 AM)',
                price: 45.00,
                pricing_type: 'per_booking',
                icon: 'clock',
                description: 'Guaranteed access to your suite 3 hours prior to standard check-in time.'
              },
              {
                id: 102,
                name: 'VIP Late Check-out (until 3:00 PM)',
                price: 45.00,
                pricing_type: 'per_booking',
                icon: 'clock',
                description: 'Extended suite relaxation until 3:00 PM on departure day.'
              }
            );
          }
          setServices(combined);
          setSelectedService(combined[0]);
        } else {
          setServices(defaultServices);
          setSelectedService(defaultServices[0]);
        }
      } catch (err) {
        setServices(defaultServices);
        setSelectedService(defaultServices[0]);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const getServiceIcon = (name, icon) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('airport') || lower.includes('transfer') || icon === 'car') return <Car className="w-5 h-5 text-amber-500" />;
    if (lower.includes('breakfast') || lower.includes('dining') || icon === 'utensils') return <Utensils className="w-5 h-5 text-amber-500" />;
    if (lower.includes('spa') || lower.includes('massage') || icon === 'sparkles') return <Sparkles className="w-5 h-5 text-amber-500" />;
    if (lower.includes('check-in') || lower.includes('check-out') || icon === 'clock') return <Clock className="w-5 h-5 text-amber-500" />;
    if (lower.includes('romantic') || lower.includes('champagne') || icon === 'heart') return <Heart className="w-5 h-5 text-rose-500" />;
    if (lower.includes('laundry') || icon === 'shirt') return <Shirt className="w-5 h-5 text-indigo-500" />;
    return <BedDouble className="w-5 h-5 text-amber-500" />;
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    setSubmitting(true);
    setError('');

    try {
      // Build notes string from sub-fields
      const noteParts = [];
      if (flightNumber) noteParts.push(`Flight: ${flightNumber.trim()}`);
      if (preferredTime) noteParts.push(`Scheduled Time: ${preferredTime.trim()}`);
      if (notes) noteParts.push(notes.trim());
      const compiledNotes = noteParts.join(' | ') || null;

      const payload = {
        service_id: selectedService.id < 100 ? selectedService.id : null,
        name: selectedService.name,
        unit_price: parseFloat(selectedService.price),
        quantity: parseInt(quantity) || 1,
        notes: compiledNotes
      };

      const res = await api.post(`/bookings/${booking.id}/extras`, payload);
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add service to reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = selectedService ? (parseFloat(selectedService.price) * (parseInt(quantity) || 1)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">Resort Concierge & Add-On Services</h3>
              <p className="text-xs text-slate-400">Personalize reservation #{booking.code || booking.booking_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-xs">Loading resort services...</p>
            </div>
          ) : (
            <form onSubmit={handleAddService} className="space-y-6">
              
              {/* Service Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Select Concierge Service
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {services.map((s) => {
                    const isSelected = selectedService?.name === s.name;
                    return (
                      <div
                        key={s.id || s.name}
                        onClick={() => setSelectedService(s)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-start gap-3 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                          {getServiceIcon(s.name, s.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{s.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{s.description}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-serif font-bold text-xs text-amber-700">
                              ETB {parseFloat(s.price).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {s.pricing_type?.replace('_', ' ') || 'Per item'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Service Inputs based on selection */}
              {selectedService && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Configuration for {selectedService.name}
                    </span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      ETB {parseFloat(selectedService.price).toFixed(2)} each
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Quantity / Count</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Airport Flight Number */}
                    {selectedService.name.toLowerCase().includes('airport') && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Flight Number (Optional)</label>
                        <input
                          type="text"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. ET 702 or LH 590"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
                        />
                      </div>
                    )}

                    {/* Preferred Time (for Spa, Chauffeur, or Check-in/out) */}
                    {(selectedService.name.toLowerCase().includes('spa') ||
                      selectedService.name.toLowerCase().includes('massage') ||
                      selectedService.name.toLowerCase().includes('airport') ||
                      selectedService.name.toLowerCase().includes('check-in') ||
                      selectedService.name.toLowerCase().includes('check-out')) && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Time / Slot</label>
                        <input
                          type="text"
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                          placeholder="e.g. 11:30 AM or 16:00"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Special Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Special Requests / Preferences
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Dietary allergies, greeting card message, or luggage count..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Total & Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">Total Added to Folio:</span>
                  <span className="font-serif text-xl font-bold text-amber-700">
                    ETB {totalPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition w-1/2 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedService}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer w-1/2 sm:w-auto disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <span>Add to Reservation</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
