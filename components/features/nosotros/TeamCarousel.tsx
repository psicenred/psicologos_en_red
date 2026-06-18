'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TEAM = [
  { name: 'Lucy Contreras', role: 'Directora', img: '/images/lucy.jpeg' },
  { name: 'Alejandra Azuara', role: 'Coordinadora', img: '/images/alejandra_con_fondo.jpeg' },
  { name: 'Equipo PER', role: 'Psicólogos en Red', img: '/images/nuestros_psicologos.jpg' },
];

export function TeamCarousel() {
  const [index, setIndex] = useState(0);
  const member = TEAM[index];

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % TEAM.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-full">
          <Image src={member.img} alt={member.name} fill className="object-cover" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => (i - 1 + TEAM.length) % TEAM.length)}
        >
          ←
        </Button>
        <div className="flex gap-2">
          {TEAM.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a slide ${i + 1}`}
              className={cn(
                'h-2 w-2 rounded-full',
                i === index ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => (i + 1) % TEAM.length)}
        >
          →
        </Button>
      </div>
    </div>
  );
}
