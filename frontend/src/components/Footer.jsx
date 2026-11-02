import React from 'react';
import { Crown, Mail, Phone, MapPin, Award, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-amber-900/20 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-slate-900">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center">
                <Crown className="w-5 h-5 text-slate-950" />
              </div>
              <span className="font-serif text-xl tracking-wider text-amber-300 font-bold">
                GRAND HORIZON
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Experience the pinnacle of Ethiopian luxury, bespoke hospitality, and scenic retreats across Addis Ababa, Bishoftu, Gondar, and Lalibela.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-500 font-medium">
              <Award className="w-4 h-4" /> Forbes 5-Star Luxury Resort & Heritage Stays 2026
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 className="text-white font-serif text-base mb-4 tracking-wide">Accommodations</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/rooms" className="hover:text-amber-400 transition">Hotels & Suites</Link></li>
              <li><Link to="/availability" className="hover:text-amber-400 transition">Check Availability</Link></li>
              <li><Link to="/lookup" className="hover:text-amber-400 transition">Find Reservation</Link></li>
            </ul>
          </div>

          {/* Col 3: Support & Help */}
          <div>
            <h4 className="text-white font-serif text-base mb-4 tracking-wide">Resort Policies</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>Free Cancellation: <span className="text-amber-400 font-medium">Up to 48h prior</span></li>
              <li>Deposit: <span className="text-slate-200 font-medium">20% to confirm</span></li>
              <li>Check-in: <span className="text-slate-200">2:00 PM</span></li>
              <li>Check-out: <span className="text-slate-200">11:00 AM</span></li>
            </ul>
          </div>

          {/* Col 4: Contact & Concierge */}
          <div>
            <h4 className="text-white font-serif text-base mb-4 tracking-wide">Concierge</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Bole Sub-City, Africa Avenue, Addis Ababa, Ethiopia</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>+251 11 661 8899</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>concierge@grandhorizon.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} The Grand Horizon Resort & Spa. All rights reserved.</p>
          <p className="text-slate-600">Luxury Hospitality & Bespoke Stays</p>
        </div>
      </div>
    </footer>
  );
}
