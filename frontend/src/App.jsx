import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HoldCountdown from './components/HoldCountdown';

// Pages
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import AvailabilityResults from './pages/AvailabilityResults';
import Checkout from './pages/Checkout';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingLookup from './pages/BookingLookup';
import MyBookings from './pages/MyBookings';
import BookingDetail from './pages/BookingDetail';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

// Staff & Admin Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffHousekeeping from './pages/staff/StaffHousekeeping';
import AdminDashboard from './pages/admin/AdminDashboard';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Global Navigation Bar */}
      <Navbar />

      {/* 15-Minute Booking Hold Countdown Banner (if hold active) */}
      <HoldCountdown />

      {/* Main Content Area */}
      <main className="flex-grow">
        <Routes>
          {/* Public Guest Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/availability" element={<AvailabilityResults />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/booking-confirmation/:code" element={<BookingConfirmation />} />
          <Route path="/lookup" element={<BookingLookup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Authenticated Guest & Folio Routes */}
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings/:id"
            element={<BookingDetail />}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Staff & Front Desk Routes */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'manager', 'admin']}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/housekeeping"
            element={
              <ProtectedRoute allowedRoles={['housekeeping', 'receptionist', 'manager', 'admin']}>
                <StaffHousekeeping />
              </ProtectedRoute>
            }
          />

          {/* Administration & Executive Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
