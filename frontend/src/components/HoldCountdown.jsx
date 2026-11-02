import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

export default function HoldCountdown({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;

    const calculate = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, expired: true });
        if (onExpired) onExpired();
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSec / 60);
      const seconds = totalSec % 60;
      setTimeLeft({ minutes, seconds, expired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) return null;

  const isUrgent = timeLeft.minutes < 3;

  return (
    <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-sm transition-all ${
      timeLeft.expired
        ? 'bg-rose-50 border-rose-300 text-rose-800'
        : isUrgent
        ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse'
        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${timeLeft.expired ? 'bg-rose-200' : isUrgent ? 'bg-amber-200' : 'bg-emerald-200'}`}>
          {timeLeft.expired ? <ShieldAlert className="w-5 h-5 text-rose-700" /> : <Clock className="w-5 h-5 text-emerald-800" />}
        </div>
        <div>
          <h4 className="text-sm font-bold">
            {timeLeft.expired
              ? 'Hold Expired'
              : 'Room Guaranteed & Held in Cart'}
          </h4>
          <p className="text-xs opacity-80">
            {timeLeft.expired
              ? 'Your 15-minute hold expired and the room was released back to inventory.'
              : 'Complete your reservation before the timer expires to secure this locked rate.'}
          </p>
        </div>
      </div>

      {!timeLeft.expired && (
        <div className="text-right">
          <div className="font-mono text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Remaining</span>
        </div>
      )}
    </div>
  );
}
