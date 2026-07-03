'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toDatetimeLocalValue } from '@/lib/academia/datetime-local';

export function DateTimeInlineEditor({
  value,
  label = 'Fecha y hora',
  emptyLabel = 'Sin fecha',
  onSave,
}: {
  value: string | null;
  label?: string;
  emptyLabel?: string;
  onSave: (iso: string) => Promise<void>;
}) {
  const [local, setLocal] = useState(() => toDatetimeLocalValue(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocal(toDatetimeLocalValue(value));
  }, [value]);

  const currentLocal = toDatetimeLocalValue(value);
  const dirty = local !== currentLocal;

  async function handleSave() {
    if (!local) {
      setError('Selecciona una fecha y hora');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(new Date(local).toISOString());
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="datetime-local"
          className="h-9 w-auto min-w-[12rem] text-xs"
          value={local}
          onChange={(e) => {
            setLocal(e.target.value);
            setError(null);
          }}
        />
        {dirty ? (
          <Button type="button" size="sm" variant="outline" disabled={saving} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        ) : null}
      </div>
      {!local && !value ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
