'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Escribe el contenido del artículo…',
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[240px] rounded-md border bg-white px-3 py-2 focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {[
          { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
          { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
          { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
          { label: '•', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
          { label: '🔗', action: () => {
            const url = window.prompt('URL del enlace');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }, active: editor.isActive('link') },
        ].map((btn) => (
          <Button
            key={btn.label}
            type="button"
            size="sm"
            variant={btn.active ? 'default' : 'outline'}
            className="h-8 px-2"
            onClick={btn.action}
          >
            {btn.label}
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function BlogImageUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  async function handleFile(file: File) {
    const form = new FormData();
    form.append('imagen', file);
    const res = await fetch('/api/admin/blog/upload-imagen', { method: 'POST', body: form });
    const data = await res.json();
    if (data.url) onUploaded(data.url);
  }

  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-primary underline')}>
      Subir imagen
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </label>
  );
}
