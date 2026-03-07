// GitHubStars — top-right badge showing repo star count
'use client';

import { useState, useEffect } from 'react';

const FONT = "'Press Start 2P', monospace";
const REPO_URL = 'https://github.com/AshuSriwastav07/Git-World';
const API_URL = 'https://api.github.com/repos/AshuSriwastav07/Git-World';
const CACHE_KEY = 'gitworld-stars';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function GitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setStars(count);
          return;
        }
      }
    } catch { /* ignore */ }

    fetch(API_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.stargazers_count === 'number') {
          setStars(data.stargazers_count);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ count: data.stargazers_count, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* repo may be private still — show 0 */ });
  }, []);

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a2e] border-2 border-[#fbbf24] hover:bg-[#fbbf2411] transition-colors"
      title="Star Git-World on GitHub"
    >
      <span className="text-[10px]">⭐</span>
      <span className="text-[8px] text-[#fbbf24]" style={{ fontFamily: FONT }}>
        {stars !== null ? stars.toLocaleString() : '—'}
      </span>
    </a>
  );
}
