import React, { useState } from 'react';
import api from '../api/client';
import { CreditCard, Smartphone, CheckCircle, ShieldCheck, X, AlertCircle, Loader2 } from 'lucide-react';

export default function PaymentSimulatorModal({
  booking,
  onSuccess,
  onClose
}) {
  const [method, setMethod] = useState('credit_card'); // 'credit_card', 'chapa', 'telebirr', 'pay_at_hotel'
  const [payType, setPayType] = useState('full'); // 'full' or 'deposit'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = parseFloat(booking.total_amount);
  const depositAmount = Math.round((totalAmount * 0.2) * 100) / 100;
  const amountToCharge = payType === 'deposit' ? depositAmount : totalAmount;

  const handleProcessPayment = async () => {
    setLoading(true);
    setError('');

    try {
      if (method === 'pay_at_hotel') {
        const res = await api.post('/payments/initiate', {
          booking_id: booking.id,
          method: 'pay_at_hotel'
        });
        onSuccess(res.data);
        return;
      }

      // Simulate payment gateway completion with server validation (FR-PAY-03)
      const res = await api.post('/payments/simulate-success', {
        booking_id: booking.id,
        method,
        amount: amountToCharge
      });

      if (res.data.success) {
        onSuccess(res.data);
      } else {
        setError(res.data.message || 'Payment simulation failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-serif font-bold text-lg text-amber-300">Secure Payment Checkout</h3>
              <p className="text-xs text-slate-400">Reservation #{booking.code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Type Selection (Full vs Deposit) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Payment Option (FR-PAY-02)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPayType('full')}
                className={`p-3 rounded-xl border text-left transition ${
                  payType === 'full'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-stone-50'
                }`}
              >
                <span className="block text-xs text-slate-500">Pay Full Amount</span>
                <span className="block text-base font-bold text-slate-900 mt-0.5">
                  ETB {totalAmount.toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPayType('deposit')}
                className={`p-3 rounded-xl border text-left transition ${
                  payType === 'deposit'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-stone-50'
                }`}
              >
                <span className="block text-xs text-slate-500">Pay 20% Deposit</span>
                <span className="block text-base font-bold text-slate-900 mt-0.5">
                  ETB {depositAmount.toFixed(2)}
                </span>
              </button>
            </div>
          </div>

          {/* Gateway Provider Selection (FR-PAY-01: Chapa, Telebirr, Stripe) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payment Gateway
            </label>
            <div className="space-y-2.5">
              
              {/* Credit Card / Stripe */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  method === 'credit_card'
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="credit_card"
                    checked={method === 'credit_card'}
                    onChange={() => setMethod('credit_card')}
                    className="accent-amber-600"
                  />
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Credit / Debit Card (Stripe PCI Gateway)</span>
                    <span className="block text-[11px] text-slate-500">Visa, Mastercard, American Express</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Instant</span>
              </label>

              {/* Chapa Payment */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  method === 'chapa'
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="chapa"
                    checked={method === 'chapa'}
                    onChange={() => setMethod('chapa')}
                    className="accent-amber-600"
                  />
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Chapa Gateway (Local & Int'l)</span>
                    <span className="block text-[11px] text-slate-500">Seamless mobile money & bank transfer</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Ethiopia</span>
              </label>

              {/* Telebirr */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  method === 'telebirr'
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="telebirr"
                    checked={method === 'telebirr'}
                    onChange={() => setMethod('telebirr')}
                    className="accent-amber-600"
                  />
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Telebirr SuperApp Pay</span>
                    <span className="block text-[11px] text-slate-500">Direct mobile wallet checkout</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Quick QR</span>
              </label>

              {/* Pay At Hotel */}
              <label
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  method === 'pay_at_hotel'
                    ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                    : 'border-slate-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="pay_at_hotel"
                    checked={method === 'pay_at_hotel'}
                    onChange={() => setMethod('pay_at_hotel')}
                    className="accent-amber-600"
                  />
                  <CheckCircle className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Pay at Hotel Front Desk (BR-21)</span>
                    <span className="block text-[11px] text-slate-500">Pay on arrival. Validated at 18:00 cutoff</span>
                  </div>
                </div>
              </label>

            </div>
          </div>

          {/* Amount Summary */}
          <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Total Due Now:</span>
              <span className="text-xl font-bold font-serif text-slate-900">
                ETB {amountToCharge.toFixed(2)}
              </span>
            </div>
            {payType === 'deposit' && (
              <span className="text-xs text-slate-500">
                Remaining: ETB {(totalAmount - depositAmount).toFixed(2)} at check-in
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-stone-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-stone-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Confirm & Complete (ETB {amountToCharge.toFixed(2)})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
