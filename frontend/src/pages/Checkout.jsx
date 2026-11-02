import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import HoldCountdown from '../components/HoldCountdown';
import PaymentSimulatorModal from '../components/PaymentSimulatorModal';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Sparkles, 
  Tag, 
  CreditCard, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  PlusCircle,
  Car,
  Utensils,
  Heart,
  Shirt,
  BedDouble
} from 'lucide-react';

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { setActiveHold } = useBooking();

  const queryParams = new URLSearchParams(location.search);
  const roomTypeId = queryParams.get('roomTypeId');
  const rawCheckIn = queryParams.get('checkIn');
  const rawCheckOut = queryParams.get('checkOut');
  const adults = queryParams.get('adults') || 1;
  const children = queryParams.get('children') || 0;
  const roomCount = queryParams.get('rooms') || 1;

  // Normalize dates so checkOut is guaranteed to be strictly after checkIn
  const getGuaranteedDates = (inStr, outStr) => {
    const today = new Date();
    let start = inStr ? new Date(inStr) : new Date(today);
    if (isNaN(start.getTime())) {
      start = new Date(today);
      start.setDate(today.getDate() + 1);
    }
    let end = outStr ? new Date(outStr) : new Date(start);
    if (isNaN(end.getTime()) || end <= start) {
      end = new Date(start);
      end.setDate(start.getDate() + 2); // Default to a valid 2-night stay
    }
    return {
      cIn: start.toISOString().split('T')[0],
      cOut: end.toISOString().split('T')[0]
    };
  };

  const initialDates = getGuaranteedDates(rawCheckIn, rawCheckOut);
  const [checkIn, setCheckIn] = useState(initialDates.cIn);
  const [checkOut, setCheckOut] = useState(initialDates.cOut);

  // Checkout Steps: 1: Details, 2: Extras, 3: Hold & Review, 4: Payment
  const [currentStep, setCurrentStep] = useState(1);

  // Data states
  const [roomType, setRoomType] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');

  // Guest Details Form State
  const [guestName, setGuestName] = useState(user?.full_name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [specialRequests, setSpecialRequests] = useState('');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('15:00');
  
  // Custom Addon Detail States
  const [airportFlightNum, setAirportFlightNum] = useState('');
  const [airportPickupTime, setAirportPickupTime] = useState('');
  const [spaPreferredTime, setSpaPreferredTime] = useState('');

  // Booking Hold & Payment State
  const [createdBooking, setCreatedBooking] = useState(null);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Initialize room type and extra services
  useEffect(() => {
    if (!roomTypeId || !checkIn || !checkOut) {
      navigate('/rooms');
      return;
    }

    const loadData = async () => {
      try {
        const [rtRes, sRes] = await Promise.all([
          api.get(`/room-types/${roomTypeId}`),
          api.get('/services')
        ]);
        setRoomType(rtRes.data.roomType);
        setAvailableServices(sRes.data.services || []);
      } catch (err) {
        setError('Failed to initialize checkout information.');
      }
    };
    loadData();
  }, [roomTypeId, checkIn, checkOut, navigate]);

  // Sync user details if logged in
  useEffect(() => {
    if (user) {
      setGuestName(user.full_name || '');
      setGuestEmail(user.email || '');
      setGuestPhone(user.phone || '');
    }
  }, [user]);

  // Toggle service selection
  const toggleService = (serviceId) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Validate Promo Code
  const handleApplyPromo = async (codeToValidate) => {
    const targetCode = typeof codeToValidate === 'string' ? codeToValidate : promoCodeInput;
    if (!targetCode || !targetCode.trim()) {
      setPromoError('Please enter a promotional voucher code.');
      return;
    }
    setPromoError('');

    try {
      const res = await api.post('/promotions/validate', {
        code: targetCode.trim(),
        check_in: checkIn,
        nights: Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))),
        room_subtotal: parseFloat(roomType?.base_price || 0) * Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
      });
      setAppliedPromo(res.data.promo);
      setPromoCodeInput(res.data.promo.code);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Invalid or expired promotion voucher code.');
    }
  };

  // Create Atomic Booking Hold (Step 3 to 4)
  const handleCreateHold = async () => {
    setLoading(true);
    setError('');

    try {
      const enhancementNotes = [];
      if (airportFlightNum) enhancementNotes.push(`Chauffeur Flight: ${airportFlightNum.trim()}`);
      if (airportPickupTime) enhancementNotes.push(`Airport Pickup: ${airportPickupTime.trim()}`);
      if (spaPreferredTime) enhancementNotes.push(`Spa Time: ${spaPreferredTime.trim()}`);
      const compiledRequests = [specialRequests, ...enhancementNotes].filter(Boolean).join(' | ');

      const payload = {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        room_type_id: roomTypeId,
        room_count: roomCount,
        special_requests: compiledRequests,
        estimated_arrival_time: estimatedArrivalTime,
        promo_code: appliedPromo?.code || null,
        service_ids: selectedServiceIds
      };

      const res = await api.post('/bookings', payload);
      setCreatedBooking(res.data.booking);
      setPricingBreakdown(res.data.pricing);
      setHoldExpiresAt(res.data.holdExpiresAt);

      setActiveHold({
        bookingId: res.data.booking.id,
        bookingCode: res.data.booking.code,
        expiresAt: res.data.holdExpiresAt,
        totalAmount: res.data.pricing.totalAmount
      });

      setCurrentStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not place room on hold. It may have just been booked by another user.');
    } finally {
      setLoading(false);
    }
  };

  // Payment completed
  const handlePaymentSuccess = (paymentResult) => {
    setActiveHold(null);
    navigate(`/booking-confirmation/${createdBooking.code}`);
  };

  if (error && !roomType) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold font-serif text-slate-800">Checkout Error</h3>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* 4-Step Progress Indicator (NFR-07) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between max-w-3xl mx-auto text-xs font-bold">
          
          <button
            onClick={() => currentStep > 1 && setCurrentStep(1)}
            className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-amber-600' : 'text-slate-400'}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              currentStep >= 1 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 text-slate-500'
            }`}>1</span>
            <span>Guest Details</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <button
            onClick={() => currentStep > 2 && setCurrentStep(2)}
            className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-amber-600' : 'text-slate-400'}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              currentStep >= 2 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 text-slate-500'
            }`}>2</span>
            <span>Enhancements</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <button
            onClick={() => currentStep > 3 && setCurrentStep(3)}
            className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-amber-600' : 'text-slate-400'}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              currentStep >= 3 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 text-slate-500'
            }`}>3</span>
            <span>Locked Hold</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className={`flex items-center gap-2 ${currentStep === 4 ? 'text-amber-600' : 'text-slate-400'}`}>
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              currentStep === 4 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-200 text-slate-500'
            }`}>4</span>
            <span>Payment</span>
          </div>

        </div>
      </div>

      {/* Main Grid: Form Steps on Left, Order Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Form Area (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Guest Information */}
          {currentStep === 1 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-900">Step 1: Primary Guest Details</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Primary guest must be at least 18 years of age (BR-11). Confirmation will be sent here.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Legal Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+251 91 123 4567"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estimated Arrival Time</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="time"
                      value={estimatedArrivalTime}
                      onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Stay Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Check-In Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={checkIn}
                      onChange={(e) => {
                        const newIn = e.target.value;
                        setCheckIn(newIn);
                        setError('');
                        if (new Date(checkOut) <= new Date(newIn)) {
                          const nextDay = new Date(newIn);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setCheckOut(nextDay.toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Check-Out Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="date"
                      min={checkIn}
                      value={checkOut}
                      onChange={(e) => {
                        const newOut = e.target.value;
                        if (new Date(newOut) <= new Date(checkIn)) {
                          setError('Check-out date must be at least 1 night after check-in date.');
                          return;
                        }
                        setError('');
                        setCheckOut(newOut);
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Special Requests (Optional)</label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="High floor, quiet corner room, extra pillows, celebration cake, etc."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!guestName || !guestEmail || !guestPhone) {
                      setError('Please fill in your name, email, and phone number.');
                      return;
                    }
                    if (new Date(checkOut) <= new Date(checkIn)) {
                      setError('Check-out date must be at least 1 night after check-in date.');
                      return;
                    }
                    setError('');
                    setCurrentStep(2);
                  }}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Enhancements</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Extra Services */}
          {currentStep === 2 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                      Concierge Selection
                    </span>
                    <span className="text-xs text-slate-400">• Optional Luxury Enhancements</span>
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Step 2: Curated Enhancements & Services
                  </h2>
                </div>
                <div className="text-right self-start sm:self-auto">
                  <span className="text-[11px] text-slate-400 block uppercase font-medium">Selected Enhancements</span>
                  <span className="text-lg font-serif font-bold text-amber-700">
                    ETB {availableServices
                      .filter(s => selectedServiceIds.includes(s.id))
                      .reduce((acc, s) => acc + (s.pricing_type === 'per_night' ? parseFloat(s.price) * nights : parseFloat(s.price)), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableServices.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  const isAirport = service.name.toLowerCase().includes('airport') || service.name.toLowerCase().includes('transfer');
                  const isSpa = service.name.toLowerCase().includes('spa') || service.name.toLowerCase().includes('massage');
                  const isBreakfast = service.name.toLowerCase().includes('breakfast');
                  const isCelebration = service.name.toLowerCase().includes('romantic') || service.name.toLowerCase().includes('welcome');
                  const isLaundry = service.name.toLowerCase().includes('laundry');

                  return (
                    <div
                      key={service.id}
                      className={`p-4 rounded-2xl border transition space-y-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-xs'
                          : 'border-slate-200 hover:bg-stone-50/80'
                      }`}
                    >
                      <div
                        onClick={() => toggleService(service.id)}
                        className="cursor-pointer flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs' : 'bg-stone-100 text-slate-600 border-slate-200'
                          }`}>
                            {isAirport && <Car className="w-5 h-5" />}
                            {isSpa && <Sparkles className="w-5 h-5" />}
                            {isBreakfast && <Utensils className="w-5 h-5" />}
                            {isCelebration && <Heart className="w-5 h-5" />}
                            {isLaundry && <Shirt className="w-5 h-5" />}
                            {!isAirport && !isSpa && !isBreakfast && !isCelebration && !isLaundry && <BedDouble className="w-5 h-5" />}
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {service.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                              {service.description}
                            </p>
                            <span className="inline-block text-xs font-bold text-amber-700 font-serif pt-1">
                              +ETB {parseFloat(service.price).toFixed(2)} {service.pricing_type === 'per_night' ? `/ night (${nights} nights)` : ''}
                            </span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-amber-500 border-amber-600 text-slate-950' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Expandable configuration fields when selected */}
                      {isSelected && isAirport && (
                        <div className="pt-2 border-t border-amber-200/60 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Flight Number</label>
                            <input
                              type="text"
                              value={airportFlightNum}
                              onChange={(e) => setAirportFlightNum(e.target.value.toUpperCase())}
                              placeholder="e.g. ET 702"
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs uppercase focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Pickup Time</label>
                            <input
                              type="text"
                              value={airportPickupTime}
                              onChange={(e) => setAirportPickupTime(e.target.value)}
                              placeholder="e.g. 14:30"
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {isSelected && isSpa && (
                        <div className="pt-2 border-t border-amber-200/60 text-xs">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Preferred Treatment Time</label>
                          <input
                            type="text"
                            value={spaPreferredTime}
                            onChange={(e) => setSpaPreferredTime(e.target.value)}
                            placeholder="e.g. Afternoon 4:00 PM"
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selected Enhancements Pill Bar */}
              {selectedServiceIds.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span><strong>{selectedServiceIds.length}</strong> {selectedServiceIds.length === 1 ? 'service' : 'services'} added to your itinerary.</span>
                  </div>
                  <span className="font-bold text-amber-800 font-serif">
                    Included in 20% required deposit
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Review & Lock Hold</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Promo & Atomic Hold Lock */}
          {currentStep === 3 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-900">Step 3: Review & Lock Reservation Hold</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Apply promotional discounts and activate your atomic 15-minute hold to protect the room from other guests while paying.
                </p>
              </div>

              {/* Promo Code Input */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">Have a Promo Code?</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      placeholder="e.g. WELCOME10, SUMMER20, LUXURY50"
                      className="w-full pl-10 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPromo(promoCodeInput)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl transition"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick Demo Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Quick Apply:</span>
                  {[
                    { code: 'WELCOME10', label: 'WELCOME10 (10% off)' },
                    { code: 'WELLCOME10', label: 'WELLCOME10 (10% off)' },
                    { code: 'SUMMER20', label: 'SUMMER20 (20% off)' },
                    { code: 'LUXURY50', label: 'LUXURY50 (50 ETB off)' }
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        setPromoCodeInput(item.code);
                        handleApplyPromo(item.code);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold transition cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {promoError && <p className="text-xs text-rose-600 font-medium">{promoError}</p>}
                {appliedPromo && (
                  <div className="flex items-center justify-between text-xs text-emerald-800 font-bold bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Promo '{appliedPromo.code}' applied: {appliedPromo.type === 'percentage' ? `${appliedPromo.value}% off` : `${appliedPromo.value} ETB off`}!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromo(null);
                        setPromoCodeInput('');
                      }}
                      className="text-rose-600 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Policy Acceptance Notice */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
                <h4 className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Atomic Availability Engine Guarantee
                </h4>
                <p className="text-slate-600">
                  By clicking "Lock 15-Min Hold & Continue", the backend executes an atomic PostgreSQL row lock. This room type is immediately removed from public availability for 15 minutes, ensuring no one else can book it while you enter payment.
                </p>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-stone-100 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateHold}
                  disabled={loading}
                  className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Lock 15-Min Hold & Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Hold Active & Payment Options */}
          {currentStep === 4 && createdBooking && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              
              {/* Hold Countdown Component */}
              <HoldCountdown
                expiresAt={holdExpiresAt}
                onExpired={() => {
                  alert('Hold expired! The room has been unlocked.');
                  navigate('/availability');
                }}
              />

              <div>
                <span className="text-xs text-amber-600 font-bold uppercase tracking-wider block mb-1">
                  Hold Active • Code: {createdBooking.code}
                </span>
                <h2 className="font-serif text-2xl font-bold text-slate-900">
                  Step 4: Select Payment Method to Finalize
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose your preferred payment gateway to confirm this reservation immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="p-5 rounded-2xl border-2 border-amber-500 hover:bg-amber-50/40 text-left transition flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pay Online Gateway</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Credit Card, Chapa, Telebirr</p>
                    <span className="inline-block text-[10px] font-bold text-emerald-600 mt-1">Full or 20% Deposit</span>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    try {
                      await api.post('/payments/initiate', {
                        booking_id: createdBooking.id,
                        method: 'pay_at_hotel'
                      });
                      navigate(`/booking-confirmation/${createdBooking.code}`);
                    } catch (err) {
                      setError(err.response?.data?.message || 'Pay-at-hotel requires an active account (BR-21).');
                    }
                  }}
                  className="p-5 rounded-2xl border border-slate-200 hover:bg-stone-50 text-left transition flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pay at Hotel Front Desk</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Settle balance upon check-in</p>
                    <span className="inline-block text-[10px] text-amber-700 mt-1 font-semibold">Cutoff at 18:00 arrival</span>
                  </div>
                </button>

              </div>
            </div>
          )}

        </div>

        {/* Right Column: Order Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg space-y-6">
          
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Reservation Summary</span>
            <h3 className="font-serif text-xl font-bold text-slate-900 mt-1">
              {roomType?.name}
            </h3>
            {roomType?.location && (
              <p className="text-xs font-semibold text-amber-800 mt-1">
                📍 {roomType.location}
              </p>
            )}
            <span className="text-xs text-slate-500 block mt-1">
              {roomCount} Room • {adults} Adults, {children} Kids
            </span>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-slate-400 block font-semibold">Check-In</span>
              <strong className="text-slate-800">{checkIn}</strong>
              <span className="text-[10px] text-slate-500 block">From 14:00</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold">Check-Out</span>
              <strong className="text-slate-800">{checkOut}</strong>
              <span className="text-[10px] text-slate-500 block">By 12:00</span>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <span>{nights} nights stay</span>
              <span className="font-semibold text-slate-800">
                ETB {(parseFloat(roomType?.base_price || 0) * nights * roomCount).toFixed(2)}
              </span>
            </div>

            {selectedServiceIds.length > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Enhancements ({selectedServiceIds.length})</span>
                <span className="font-semibold">
                  +ETB {availableServices
                    .filter((s) => selectedServiceIds.includes(s.id))
                    .reduce((sum, s) => sum + parseFloat(s.price), 0)
                    .toFixed(2)}
                </span>
              </div>
            )}

            {appliedPromo && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Voucher Discount</span>
                <span>-ETB {appliedPromo.discountAmount?.toFixed(2) || '0.00'}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>VAT (15%)</span>
              <span>
                ETB {(
                  (parseFloat(roomType?.base_price || 0) * nights * roomCount * 0.15)
                ).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Resort Service Charge (10%)</span>
              <span>
                ETB {(
                  (parseFloat(roomType?.base_price || 0) * nights * roomCount * 0.10)
                ).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="pt-4 border-t border-slate-200 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Estimated Total</span>
              <span className="text-2xl font-serif font-bold text-slate-900">
                ETB {(() => {
                  if (pricingBreakdown?.totalAmount) return pricingBreakdown.totalAmount.toFixed(2);
                  const roomTotal = parseFloat(roomType?.base_price || 0) * nights * roomCount;
                  const extrasTotal = availableServices
                    .filter((s) => selectedServiceIds.includes(s.id))
                    .reduce((sum, s) => sum + parseFloat(s.price), 0);
                  const discount = appliedPromo ? (parseFloat(appliedPromo.discountAmount) || 0) : 0;
                  const taxable = Math.max(0, roomTotal - discount + extrasTotal);
                  const vat = taxable * 0.15;
                  const service = taxable * 0.10;
                  return (taxable + vat + service).toFixed(2);
                })()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-semibold">20% Deposit</span>
              <span className="text-sm font-bold text-amber-700">
                ETB {pricingBreakdown?.requiredDeposit
                  ? pricingBreakdown.requiredDeposit.toFixed(2)
                  : ((parseFloat(roomType?.base_price || 0) * nights * roomCount * 1.25 * 0.2)).toFixed(2)}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Payment Simulator Modal */}
      {showPaymentModal && createdBooking && (
        <PaymentSimulatorModal
          booking={createdBooking}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

    </div>
  );
}
