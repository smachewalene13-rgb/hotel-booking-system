import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function DemoSwitcherBar() {
  const { user, switchRoleDemo } = useAuth();

  return (
    <div className="bg-slate-900 text-slate-300 text-xs py-1 px-4 border-b border-slate-800 flex items-center justify-end shadow-sm">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => switchRoleDemo('visitor')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            !user ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          Visitor
        </button>

        <button
          onClick={() => switchRoleDemo('guest')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            user?.role === 'guest' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          Guest
        </button>

        <button
          onClick={() => switchRoleDemo('receptionist')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            user?.role === 'receptionist' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          Front Desk
        </button>

        <button
          onClick={() => switchRoleDemo('housekeeping')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            user?.role === 'housekeeping' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          Housekeeping
        </button>

        <button
          onClick={() => switchRoleDemo('manager')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            user?.role === 'manager' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          Manager
        </button>

        <button
          onClick={() => switchRoleDemo('admin')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
            user?.role === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          Admin
        </button>
      </div>
    </div>
  );
}
