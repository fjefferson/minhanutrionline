"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Eye,
  PenLine,
} from "lucide-react";

// ─── Inline renderer (same logic as detail page) ─────────────────────────────

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          className="bg-gray-100 text-green-700 px-1 py-0.5 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function RichPreview({ text }: { text: string }) {
  if (!text.trim())
    return (
      <p className="text-gray-400 text-sm italic">Nenhum conteúdo ainda…</p>
    );
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-gray-700 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith("### "))
          return (
            <h3 key={i} className="text-sm font-bold text-gray-800 mt-3">
              {inline(line.slice(4))}
            </h3>
          );
        if (line.startsWith("## "))
          return (
            <h2 key={i} className="text-base font-bold text-gray-800 mt-4">
              {inline(line.slice(3))}
            </h2>
          );
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="text-lg font-bold text-gray-900 mt-5">
              {inline(line.slice(2))}
            </h1>
          );
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-green-500 shrink-0">•</span>
              <span>{inline(line.slice(2))}</span>
            </div>
          );
        const numbered = line.match(/^(\d+)\.\s(.+)/);
        if (numbered)
          return (
            <div key={i} className="flex gap-2">
              <span className="text-green-600 font-semibold shrink-0 w-5">
                {numbered[1]}.
              </span>
              <span>{inline(numbered[2])}</span>
            </div>
          );
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function TB({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Escreva uma descrição… Suporta **negrito**, *itálico*, ## títulos, - listas",
  rows = 8,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  // Wrap selection or insert at cursor
  const wrap = (before: string, after: string = before) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    // Restore cursor after React re-render
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };

  // Prepend to current line
  const prepend = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const pos = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = value.indexOf("\n", pos);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const line = value.slice(lineStart, end);
    // Toggle off if already has the prefix
    const next = line.startsWith(prefix)
      ? value.slice(0, lineStart) + line.slice(prefix.length) + value.slice(end)
      : value.slice(0, lineStart) + prefix + line + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos + prefix.length, pos + prefix.length);
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50">
        <TB onClick={() => wrap("**")} title="Negrito (Ctrl+B)">
          <Bold size={14} />
        </TB>
        <TB onClick={() => wrap("*")} title="Itálico">
          <Italic size={14} />
        </TB>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <TB onClick={() => prepend("## ")} title="Título H2">
          <Heading2 size={14} />
        </TB>
        <TB onClick={() => prepend("### ")} title="Título H3">
          <Heading3 size={14} />
        </TB>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <TB onClick={() => prepend("- ")} title="Lista com marcador">
          <List size={14} />
        </TB>
        <TB onClick={() => prepend("1. ")} title="Lista numerada">
          <ListOrdered size={14} />
        </TB>

        {/* Preview toggle */}
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition ${
              preview
                ? "bg-green-100 text-green-700"
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {preview ? (
              <>
                <PenLine size={12} /> Editar
              </>
            ) : (
              <>
                <Eye size={12} /> Preview
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div className="px-3 py-2 min-h-40 bg-white">
          <RichPreview text={value} />
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-y bg-white"
        />
      )}
    </div>
  );
}
