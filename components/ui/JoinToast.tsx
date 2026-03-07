// JoinToast — shows a pop-up notification when a new user joins the city
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToLiveEvents } from '@/lib/supabaseDb';

const FONT = "'Press Start 2P', monospace";
const TOAST_DURATION = 4000;
const MAX_VISIBLE = 3;

interface Toast {
  id: number;
  login: string;
  detail: string;
  exiting: boolean;
}

let nextId = 0;

export function JoinToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const channelRef = useRef<ReturnType<typeof subscribeToLiveEvents> | null>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    channelRef.current = subscribeToLiveEvents((event) => {
      if (event.type !== 'join') return;
      const id = nextId++;
      setToasts((prev) => {
        const next = [...prev, { id, login: event.login, detail: event.detail, exiting: false }];
        // Keep only the most recent toasts
        return next.slice(-MAX_VISIBLE);
      });
      setTimeout(() => removeToast(id), TOAST_DURATION);
    });
    return () => { channelRef.current?.unsubscribe(); };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-3 z-30 flex flex-col gap-1.5 select-none pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-3 py-2 bg-[#0d0d1af0] border border-[#4ade80] rounded pointer-events-auto"
          style={{
            fontFamily: FONT,
            animation: toast.exiting ? 'toastOut 300ms ease-in forwards' : 'toastIn 300ms ease-out',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px]">🏗️</span>
            <span className="text-[7px] text-[#4ade80]">{toast.login}</span>
            <span className="text-[6px] text-[#666]">joined Git World</span>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(60px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(60px); }
        }
      `}</style>
    </div>
  );
}
