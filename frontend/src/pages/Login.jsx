import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import { Crown, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      const staffRoles = ['receptionist', 'housekeeping', 'manager', 'admin'];
      navigate(staffRoles.includes(user.role) ? '/staff/dashboard' : '/');
    } catch (err) {
      setError(
        err.response?.data?.message || 
        (err.code === 'ERR_NETWORK' || !err.response 
          ? 'Cannot connect to backend server. Please verify port 5000 is active.' 
          : 'Login failed. Please check your email and password.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleKey) => {
    const demo = DEMO_USERS[roleKey];
    if (!demo) return;
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);
    setError('');
    try {
      const user = await login(demo.email, demo.password);
      const staffRoles = ['receptionist', 'housekeeping', 'manager', 'admin'];
      navigate(staffRoles.includes(user.role) ? '/staff/dashboard' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 mt-5">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to access your reservations and profile</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="accent-amber-600 rounded" /> Remember me
              </label>
              <Link to="/forgot-password" className="text-amber-600 hover:text-amber-700 font-semibold">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In</span>
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-600 font-bold hover:text-amber-700">Create Account</Link>
          </div>
        </div>

        {/* Quick Demo Login */}
        <div className="bg-slate-900 rounded-2xl p-5 space-y-3 border border-slate-800">
          <h4 className="text-[11px] uppercase font-bold tracking-widest text-amber-400 text-center">
            Quick Demo Login — Select a Role
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(DEMO_USERS).map(([key, val]) => (
              <button key={key} onClick={() => handleQuickLogin(key)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 hover:border-amber-500/50 capitalize">
                {val.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
