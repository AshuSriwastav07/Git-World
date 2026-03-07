// SearchBar — search GitHub users, add to city, fly-to
'use client';

import { useState, useRef, useCallback } from 'react';
import { useCityStore } from '@/lib/cityStore';
import { addUserToCity } from '@/lib/cityStream';
import { lookupSlimUser } from '@/lib/supabaseDb';
import { slotToWorld } from '@/lib/cityLayout';

const FONT = "'Press Start 2P', monospace";

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'adding' | 'error' | 'notfound' | 'ratelimit'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getUserByLogin = useCityStore((s) => s.getUserByLogin);
  const setFlyTarget = useCityStore((s) => s.setFlyTarget);
  const setSelectedUser = useCityStore((s) => s.setSelectedUser);
  const addUser = useCityStore((s) => s.addUser);

  const flyToSlot = useCallback(
    (slot: number) => {
      const world = slotToWorld(slot);
      setFlyTarget({ x: world.x, y: 0, z: world.z });
    },
    [setFlyTarget]
  );

  const handleSearch = useCallback(async () => {
    const username = query.trim().toLowerCase();
    if (!username) return;

    // Check if already in city (local store — instant)
    const existing = getUserByLogin(username);
    if (existing) {
      setSelectedUser(existing);
      flyToSlot(existing.citySlot);
      setStatus('idle');
      setStatusMsg(`Found! Flying to ${existing.login}'s building — Slot #${existing.citySlot}`);
      setTimeout(() => setStatusMsg(''), 5000);
      return;
    }

    // Quick DB check — user may exist in Supabase but not loaded locally
    setStatus('searching');
    setStatusMsg('Searching...');
    const dbUser = await lookupSlimUser(username);
    if (dbUser) {
      addUser(dbUser);
      setSelectedUser(dbUser);
      flyToSlot(dbUser.citySlot);
      setStatus('idle');
      setStatusMsg(`Found! Flying to ${dbUser.login}'s building — Slot #${dbUser.citySlot}`);
      setTimeout(() => setStatusMsg(''), 5000);
      return;
    }

    // Not in DB — fetch from GitHub
    setStatusMsg('Searching GitHub...');

    try {
      const res = await fetch(`/api/github/${encodeURIComponent(username)}`);

      if (res.status === 404) {
        setStatus('notfound');
        setStatusMsg('GitHub user not found.');
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 4000);
        return;
      }

      if (res.status === 403 || res.status === 429) {
        setStatus('ratelimit');
        setStatusMsg('GitHub is busy — try again in a few seconds.');
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 5000);
        return;
      }

      if (res.status === 504) {
        setStatus('error');
        setStatusMsg('GitHub took too long — try again.');
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 3000);
        return;
      }

      if (!res.ok) {
        setStatus('error');
        setStatusMsg('Error fetching user.');
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 3000);
        return;
      }

      const profile = await res.json();

      // Add to city
      setStatus('adding');
      setStatusMsg('Adding to city...');

      const dev = await addUserToCity(profile);
      if (dev) {
        addUser(dev);
        setSelectedUser(dev);
        flyToSlot(dev.citySlot);
        setStatus('idle');
        setStatusMsg(`${dev.login} just joined Git World! Slot #${dev.citySlot} is theirs forever.`);
        setTimeout(() => setStatusMsg(''), 5000);
      } else {
        setStatus('error');
        setStatusMsg('Failed to add user.');
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 3000);
      }
    } catch {
      setStatus('error');
      setStatusMsg('Network error.');
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 3000);
    }
  }, [query, getUserByLogin, setSelectedUser, flyToSlot, addUser]);

  const handleRandom = useCallback(() => {
    const user = useCityStore.getState().getRandomUser();
    if (user) {
      setSelectedUser(user);
      flyToSlot(user.citySlot);
    }
  }, [setSelectedUser, flyToSlot]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const isSearching = status === 'searching' || status === 'adding';
  const borderColor =
    status === 'notfound' || status === 'error' ? '#cc342d'
      : status === 'ratelimit' ? '#f59e0b'
        : '#fbbf24';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center gap-0 bg-[#1a1a2e]"
        style={{ border: `3px solid ${borderColor}` }}
      >
        <span className="text-[10px] text-[#fbbf24] px-2" style={{ fontFamily: FONT }}>
          ⛏️
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search GitHub username..."
          disabled={isSearching}
          className="bg-transparent text-[9px] text-white placeholder-[#555] px-2 py-2 w-[200px] md:w-[280px] outline-none"
          style={{ fontFamily: FONT }}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-3 py-2 bg-[#238636] text-white text-[8px] hover:bg-[#2ea043] transition-colors disabled:opacity-50"
          style={{ fontFamily: FONT }}
        >
          {isSearching ? '...' : 'Find'}
        </button>
        <button
          onClick={handleRandom}
          disabled={isSearching}
          className="px-3 py-2 bg-[#3178c6] text-white text-[8px] hover:bg-[#4490e2] transition-colors disabled:opacity-50"
          style={{ fontFamily: FONT }}
        >
          🎲
        </button>
      </div>
      {statusMsg && (
        <p
          className="text-[7px] text-center"
          style={{
            fontFamily: FONT,
            color: status === 'notfound' || status === 'error' ? '#cc342d'
              : status === 'ratelimit' ? '#f59e0b'
                : '#4ade80',
          }}
        >
          {statusMsg}
        </p>
      )}
    </div>
  );
}
