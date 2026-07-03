'use client';

import { Label } from '@/components/ui/label';

type InstructorOption = { id: string; full_name: string | null; status: string };

export function AdminCourseInstructorPicker({
  instructors,
  selectedIds,
  primaryId,
  onChange,
}: {
  instructors: InstructorOption[];
  selectedIds: string[];
  primaryId: string;
  onChange: (selectedIds: string[], primaryId: string) => void;
}) {
  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((x) => x !== id);
      const nextPrimary = primaryId === id ? (next[0] ?? '') : primaryId;
      onChange(next, nextPrimary);
      return;
    }
    const next = [...selectedIds, id];
    onChange(next, primaryId || id);
  }

  if (instructors.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay instructores registrados. Agrégalos en Admin → Instructores.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-input p-3">
        {instructors.map((i) => (
          <label key={i.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={selectedIds.includes(i.id)}
              onChange={() => toggle(i.id)}
            />
            <span>
              {i.full_name || i.id}
              <span className="ml-1 text-xs text-muted-foreground">({i.status})</span>
            </span>
          </label>
        ))}
      </div>

      {selectedIds.length > 1 ? (
        <div className="space-y-2">
          <Label htmlFor="primary-instructor">Instructor principal (catálogo público)</Label>
          <select
            id="primary-instructor"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={primaryId}
            onChange={(e) => onChange(selectedIds, e.target.value)}
          >
            {selectedIds.map((id) => {
              const instructor = instructors.find((i) => i.id === id);
              return (
                <option key={id} value={id}>
                  {instructor?.full_name || id}
                </option>
              );
            })}
          </select>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Puedes asignar varios profesores al mismo curso. Todos tendrán acceso al panel de instructor.
      </p>
    </div>
  );
}
