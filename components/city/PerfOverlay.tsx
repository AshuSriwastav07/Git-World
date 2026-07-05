// PerfOverlay — dev-only stats readout, enabled with ?debug=perf
// Zero dependencies: reads renderer.info + rAF-derived FPS, updates DOM imperatively.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export function isPerfDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === 'perf';
}

export function PerfOverlay() {
  const gl = useThree((s) => s.gl);
  const [enabled, setEnabled] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEnabled(isPerfDebugEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    let fps = 0;

    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        fps = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
        if (elRef.current) {
          const info = gl.info;
          elRef.current.textContent =
            `FPS ${fps} | calls ${info.render.calls} | tris ${info.render.triangles.toLocaleString()}` +
            ` | geo ${info.memory.geometries} | tex ${info.memory.textures}`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, gl]);

  if (!enabled) return null;

  return (
    <Html fullscreen zIndexRange={[100, 100]} style={{ pointerEvents: 'none' }}>
      <div
        ref={elRef}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#7CFC00',
          background: 'rgba(0,0,0,0.7)',
          padding: '4px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        measuring...
      </div>
    </Html>
  );
}
