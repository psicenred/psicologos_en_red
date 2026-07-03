'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CourseExamQuestion, ExamOption, ExamQuestionType } from '@/lib/academia/types';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

type DraftOption = {
  id: string;
  text: string;
  is_correct: boolean;
};

export type ExamQuestionSavePayload = {
  id?: string;
  question_type: ExamQuestionType;
  question_text: string;
  options?: ExamOption[];
  points: number;
  order_index: number;
};

function makeOptionId(index: number): string {
  return String.fromCharCode(97 + index);
}

function defaultOptions(): DraftOption[] {
  return [
    { id: 'a', text: '', is_correct: true },
    { id: 'b', text: '', is_correct: false },
    { id: 'c', text: '', is_correct: false },
  ];
}

function optionsFromQuestion(question: CourseExamQuestion): DraftOption[] {
  const opts = question.options ?? [];
  if (opts.length === 0) return defaultOptions();
  return opts.map((o, i) => ({
    id: o.id || makeOptionId(i),
    text: o.text,
    is_correct: Boolean(o.is_correct),
  }));
}

interface ExamQuestionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionType: ExamQuestionType;
  initialQuestion?: CourseExamQuestion | null;
  orderIndex?: number;
  saving?: boolean;
  onSave: (payload: ExamQuestionSavePayload) => Promise<void>;
}

export function ExamQuestionEditorDialog({
  open,
  onOpenChange,
  questionType,
  initialQuestion,
  orderIndex = 0,
  saving = false,
  onSave,
}: ExamQuestionEditorDialogProps) {
  const isEditing = Boolean(initialQuestion?.id);
  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState('1');
  const [options, setOptions] = useState<DraftOption[]>(defaultOptions);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialQuestion) {
      setQuestionText(initialQuestion.question_text);
      setPoints(String(initialQuestion.points ?? (questionType === 'essay' ? 2 : 1)));
      setOptions(
        questionType === 'multiple_choice'
          ? optionsFromQuestion(initialQuestion)
          : defaultOptions(),
      );
    } else {
      setQuestionText('');
      setPoints(questionType === 'essay' ? '2' : '1');
      setOptions(defaultOptions());
    }
  }, [open, initialQuestion, questionType]);

  function setCorrectOption(optionId: string) {
    setOptions((prev) =>
      prev.map((o) => ({ ...o, is_correct: o.id === optionId })),
    );
  }

  function updateOptionText(optionId: string, text: string) {
    setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, text } : o)));
  }

  function addOption() {
    setOptions((prev) => {
      if (prev.length >= 6) return prev;
      const nextId = makeOptionId(prev.length);
      return [...prev, { id: nextId, text: '', is_correct: false }];
    });
  }

  function removeOption(optionId: string) {
    setOptions((prev) => {
      if (prev.length <= 2) return prev;
      const filtered = prev.filter((o) => o.id !== optionId);
      if (!filtered.some((o) => o.is_correct) && filtered.length > 0) {
        filtered[0] = { ...filtered[0], is_correct: true };
      }
      return filtered.map((o, i) => ({ ...o, id: makeOptionId(i) }));
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedText = questionText.trim();
    if (!trimmedText) {
      setError('Escribe el enunciado de la pregunta');
      return;
    }

    const parsedPoints = Number(points);
    if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      setError('Los puntos deben ser un número mayor a 0');
      return;
    }

    let payloadOptions: ExamOption[] | undefined;
    if (questionType === 'multiple_choice') {
      const filled = options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text);
      if (filled.length < 2) {
        setError('Agrega al menos 2 opciones con texto');
        return;
      }
      const correctCount = filled.filter((o) => o.is_correct).length;
      if (correctCount !== 1) {
        setError('Marca exactamente una opción como correcta');
        return;
      }
      payloadOptions = filled.map((o) => ({
        id: o.id,
        text: o.text,
        is_correct: o.is_correct,
      }));
    }

    try {
      await onSave({
        id: initialQuestion?.id,
        question_type: questionType,
        question_text: trimmedText,
        options: payloadOptions,
        points: parsedPoints,
        order_index: initialQuestion?.order_index ?? orderIndex,
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar la pregunta');
    }
  }

  const title =
    questionType === 'essay'
      ? isEditing
        ? 'Editar pregunta abierta'
        : 'Nueva pregunta abierta'
      : isEditing
        ? 'Editar pregunta de opción múltiple'
        : 'Nueva pregunta de opción múltiple';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="exam-question-text">Enunciado</Label>
            <Textarea
              id="exam-question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Escribe la pregunta que verá el alumno…"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="exam-question-points">Puntos</Label>
            <Input
              id="exam-question-points"
              type="number"
              min={1}
              max={100}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-24"
            />
            {questionType === 'multiple_choice' ? (
              <p className="text-xs text-muted-foreground">
                El alumno recibe estos puntos si elige la opción correcta.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Referencia para calificación manual del instructor.
              </p>
            )}
          </div>

          {questionType === 'multiple_choice' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Opciones de respuesta</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={options.length >= 6}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Agregar opción
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Marca cuál es la respuesta correcta. El examen se calificará automáticamente.
              </p>
              <ul className="space-y-2">
                {options.map((option, index) => (
                  <li
                    key={option.id}
                    className={`flex items-start gap-2 rounded-lg border p-2 ${
                      option.is_correct
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-[var(--color-arena)] bg-card'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCorrectOption(option.id)}
                      className="mt-1 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-primary"
                      title="Marcar como correcta"
                      aria-label={`Marcar opción ${index + 1} como correcta`}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          option.is_correct ? 'fill-primary text-primary' : ''
                        }`}
                      />
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Opción {String.fromCharCode(65 + index)}
                        {option.is_correct ? ' · Correcta' : ''}
                      </Label>
                      <Input
                        value={option.text}
                        onChange={(e) => updateOptionText(option.id, e.target.value)}
                        placeholder={`Texto de la opción ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-5 shrink-0 text-destructive"
                      onClick={() => removeOption(option.id)}
                      disabled={options.length <= 2}
                      title="Quitar opción"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Agregar pregunta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
