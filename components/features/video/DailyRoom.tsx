'use client';

import { useEffect, useRef } from 'react';

type DailyFrame = {
  join: (opts: { url: string; token?: string }) => Promise<unknown>;
  destroy: () => void;
  on: (ev: string, fn: () => void) => void;
};

export function DailyRoom({
  url,
  token,
  onLeave,
}: {
  url: string;
  token: string;
  onLeave?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<DailyFrame | null>(null);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      const Daily = (await import('@daily-co/daily-js')).default;
      if (cancelled || !container) return;

      if (frameRef.current) {
        frameRef.current.destroy();
        frameRef.current = null;
      }

      const frame = Daily.createFrame(container, {
        showLeaveButton: true,
        iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '8px' },
      }) as DailyFrame;

      frameRef.current = frame;
      frame.on('left-meeting', () => onLeaveRef.current?.());

      try {
        await frame.join({ url, token: token || undefined });
      } catch (err) {
        console.error('Daily.co join:', err);
      }
    })();

    return () => {
      cancelled = true;
      frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, [url, token]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[min(70vh,600px)] w-full overflow-hidden rounded-lg bg-black"
      style={{ height: '100%', minHeight: 'min(70vh, 600px)' }}
    />
  );
}
