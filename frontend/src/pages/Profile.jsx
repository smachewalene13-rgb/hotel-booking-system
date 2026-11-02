import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, ShieldCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMsg('');
    try {
      const res = await api.put('/users/me', form);
      setUser(res.data.user);
      setEditing(false);
      setMsg('Profile updated successfully.');
    } catch (err) { setError(err.response?.data?.message || 'Failed to update profile.'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (pwForm.new_password !== pwForm.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.put('/users/me/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setShowPw(false);
      setMsg('Password changed successfully.');
    } catch (err) { setError(err.response?.data?.message || 'Failed to change password.'); }
    finally { setLoading(false); }
  };

  if (!user) return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-500">Please sign in to view your profile.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <span className="text-xs uppercase font-bold tracking-widest text-amber-600 block mb-1">My Account</span>
        <h1 className="font-serif text-3xl font-bold text-slate-900">Guest Profile</h1>
      </div>

      {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2"><CheckCircle className="w-4 h-4" />{msg}</div>}
      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-serif font-bold">
            {user.full_name?.[0]?.toUpperCase() || 'G'}
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-slate-900">{user.full_name}</h2>
            <span className="text-xs text-slate-500">{user.email}</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">{user.role}</span>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-amber-600" /><div><span className="text-[11px] text-slate-400 font-bold block uppercase">Email</span><span>{user.email}</span></div></div>
            <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-amber-600" /><div><span className="text-[11px] text-slate-400 font-bold block uppercase">Phone</span><span>{user.phone || 'Not provided'}</span></div></div>
            <div className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-amber-600" /><div><span className="text-[11px] text-slate-400 font-bold block uppercase">Account Status</span><span className="capitalize">{user.status}</span></div></div>
            <button onClick={() => setEditing(true)} className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm">Edit Profile</button>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" /></div>
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" /></div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-stone-100 transition">Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-5">
        <h3 className="font-serif text-lg font-bold text-slate-900 flex items-center gap-2"><Lock className="w-5 h-5 text-amber-600" /> Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Password</label>
            <input type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password</label>
              <input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required /></div>
            <div><label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm New</label>
              <input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" required /></div>
          </div>
          <button type="submit" disabled={loading} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Update Password</button>
        </form>
      </div>
    </div>
  );
}
