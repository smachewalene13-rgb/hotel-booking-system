import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Crown, 
  Calendar, 
  BedDouble, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  ClipboardList, 
  Sparkles,
  LayoutDashboard,
  Search
} from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const isStaff = ['receptionist', 'housekeeping', 'manager', 'admin'].includes(role);
  const isManagerOrAdmin = ['manager', 'admin'].includes(role);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-amber-900/30 text-white transition-all shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
              <Crown className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="block font-serif text-xl tracking-wider text-amber-300 font-bold group-hover:text-amber-200 transition">
                GRAND HORIZON
              </span>
              <span className="block text-[10px] tracking-[0.25em] text-slate-400 uppercase -mt-0.5">
                Luxury Resort & Spa
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Equal Spacing */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium">
            <Link 
              to="/" 
              className={`transition hover:text-amber-400 ${isActive('/') ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}
            >
              Home
            </Link>

            <Link 
              to="/rooms" 
              className={`transition hover:text-amber-400 ${isActive('/rooms') ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}
            >
              Hotels & Suites
            </Link>

            {/* Guest Bookings */}
            {user ? (
              <Link 
                to="/my-bookings" 
                className={`transition hover:text-amber-400 ${isActive('/my-bookings') ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}
              >
                My Bookings
              </Link>
            ) : (
              <Link 
                to="/lookup" 
                className={`transition hover:text-amber-400 ${isActive('/lookup') ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}
              >
                Find Booking
              </Link>
            )}

            {/* Staff Department Links - Equal Spacing */}
            {['receptionist', 'manager', 'admin'].includes(role) && (
              <Link
                to="/staff/dashboard"
                className={`transition hover:text-amber-400 ${
                  isActive('/staff/dashboard') ? 'text-amber-400 font-semibold' : 'text-slate-300'
                }`}
              >
                Front Desk
              </Link>
            )}

            {['housekeeping', 'receptionist', 'manager', 'admin'].includes(role) && (
              <Link
                to="/staff/housekeeping"
                className={`transition hover:text-amber-400 ${
                  isActive('/staff/housekeeping') ? 'text-amber-400 font-semibold' : 'text-slate-300'
                }`}
              >
                Housekeeping
              </Link>
            )}

            {isManagerOrAdmin && (
              <Link
                to="/admin/dashboard"
                className={`transition hover:text-amber-400 ${
                  isActive('/admin/dashboard') ? 'text-amber-400 font-semibold' : 'text-slate-300'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Desktop Right Actions (Auth / User) */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 hover:border-amber-500 transition text-sm"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-200">{user.full_name?.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-400 transition rounded-full hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-amber-300 hover:text-white transition rounded-xl border border-amber-500/30 hover:border-amber-400 hover:bg-slate-900"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md shadow-amber-600/20 transition hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-4 py-6 space-y-4">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-200 py-2 border-b border-slate-900 font-medium"
          >
            Home
          </Link>
          <Link
            to="/rooms"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-200 py-2 border-b border-slate-900 font-medium"
          >
            Hotels & Suites
          </Link>
          {user && (
            <Link
              to="/my-bookings"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 py-2 border-b border-slate-900 font-medium"
            >
              My Bookings
            </Link>
          )}
          {!user && (
            <Link
              to="/lookup"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 py-2 border-b border-slate-900 font-medium"
            >
              Find Booking
            </Link>
          )}

          {isStaff && (
            <div className="pt-2 space-y-2">
              <span className="text-xs uppercase text-amber-400 font-bold tracking-wider">Staff Controls</span>
              {['receptionist', 'manager', 'admin'].includes(role) && (
                <Link
                  to="/staff/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-amber-300 py-1"
                >
                  Front Desk Dashboard
                </Link>
              )}
              {['housekeeping', 'receptionist', 'manager', 'admin'].includes(role) && (
                <Link
                  to="/staff/housekeeping"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-emerald-400 py-1"
                >
                  Housekeeping Board
                </Link>
              )}
              {isManagerOrAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-indigo-400 py-1"
                >
                  Management & Admin
                </Link>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-800">
            {user ? (
              <div className="flex items-center justify-between">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-slate-200"
                >
                  Profile ({user.full_name})
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs text-rose-400 font-semibold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-slate-300 border border-slate-700 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 bg-amber-500 text-slate-950 font-semibold rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
