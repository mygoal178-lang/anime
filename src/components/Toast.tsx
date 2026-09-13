import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export function Toast() {
  const { toast } = useAuth();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
      {isSuccess && <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />}
      {isError && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
      {!isSuccess && !isError && <Info className="h-5 w-5 text-cyan-400 shrink-0" />}
      <span className="font-medium">{toast.message}</span>
    </div>
  );
}
