'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMxn } from '@/lib/academia/utils';

export function PayInstallmentButton({
  paymentId,
  amount,
  dueDate,
}: {
  paymentId: string;
  amount: number;
  dueDate: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/academia/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={pay} disabled={loading}>
        {loading ? 'Redirigiendo…' : `Pagar ${formatMxn(amount)}`}
      </Button>
      {dueDate ? (
        <span className="text-xs text-muted-foreground">Vence: {dueDate}</span>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
