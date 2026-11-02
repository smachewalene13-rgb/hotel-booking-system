import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crown, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8 || !/\d/.test(form.password) || !/[A-Za-z]/.test(form.password)) {
      setError('Password must be at least 8 characters with both letters and numbers.'); return;
    }
    setLoading(true);
    try {
      await register({ full_name: form.full_name, email: form.email, phone: form.phone, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-slate-900 mt-5">Create Your Account</h1>
          <p className="text-sm text-slate-500 mt-1">Join The Grand Horizon loyalty experience</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+251 91 234 5678"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                    placeholder="Min 8 chars"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                    placeholder="Re-enter"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-slate-500 hover:text-amber-600 font-medium flex items-center gap-1">
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Hide' : 'Show'} passwords
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Account</span>
            </button>
          </form>
          <div className="text-center text-xs text-slate-500">
            Already have an account? <Link to="/login" className="text-amber-600 font-bold hover:text-amber-700">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
