// LiveFeed — bottom scrolling event ticker from Realtime DB
'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribeToLiveEvents } from '@/lib/realtimeDb';
import type { LiveEvent } from '@/types';

const FONT = "'Press Start 2P', monospace";
const MAX_EVENTS = 30;

function formatEvent(event: LiveEvent): string {
  switch (event.type) {
    case 'join':
      return `📡 ${event.login} joined the city`;
    case 'grow':
      return `📈 ${event.login}'s building grew taller`;
    case 'rankUp':
      return `🏆 ${event.login} ranked up!`;
    default:
      return `📡 ${event.login}: ${event.detail}`;
  }
}

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLiveEvents((event) => {
      setEvents((prev) => {
        const next = [...prev, event];
        if (next.length > MAX_EVENTS) next.shift();
        return next;
      });
    }, 20);
    return unsubscribe;
  }, []);

  // Auto-scroll animation
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      el.scrollLeft += 1;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0;
      }
    }, 30);
    return () => clearInterval(id);
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="bg-[#0d0d1aee] border-t-2 border-[#333] px-3 py-1 text-center">
        <span className="text-[7px] text-[#444]" style={{ fontFamily: FONT }}>
          📡 Waiting for live events...
        </span>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="bg-[#0d0d1aee] border-t-2 border-[#333] px-3 py-1 overflow-x-hidden whitespace-nowrap"
    >
      {events.map((event, i) => (
        <span
          key={`${event.timestamp}-${i}`}
          className="text-[7px] text-[#aaa] mr-8 inline-block"
          style={{ fontFamily: FONT }}
        >
          {formatEvent(event)}
        </span>
      ))}
    </div>
  );
}
