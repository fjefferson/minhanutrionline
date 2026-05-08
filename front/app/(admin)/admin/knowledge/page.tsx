"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  symptoms: { symptom: { name: string; slug: string } }[];
  createdAt: string;
}

interface Symptom {
  slug: string;
  name: string;
}

const EMPTY_FORM = { title: "", content: "", symptoms: [] as string[] };
const TOOLBAR_ACTIONS = [
  {
    label: "H2",
    apply: (value: string) =>
      `${value ? `${value}\n\n` : ""}## Titulo da secao\n`,
  },
  {
    label: "Negrito",
    apply: (value: string) => `${value}**texto em destaque**`,
  },
  {
    label: "Lista",
    apply: (value: string) =>
      `${value}${value ? "\n" : ""}- Primeiro ponto\n- Segundo ponto`,
  },
  {
    label: "Passos",
    apply: (value: string) =>
      `${value}${value ? "\n" : ""}1. Primeiro passo\n2. Segundo passo`,
  },
  {
    label: "Dica",
    apply: (value: string) =>
      `${value}${value ? "\n\n" : ""}> Observacao importante para a conduta`,
  },
];

function stripMarkdown(text: string) {
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

function KnowledgeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const applyFormat = (formatter: (value: string) => string) => {
    const nextValue = formatter(value.trimEnd());
    onChange(nextValue);
  };

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => applyFormat(action.apply)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-green-300 hover:text-green-700"
          >
            {action.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          Markdown limpo para a IA
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-gray-200 lg:border-r lg:border-b-0">
          <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Edicao
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            className="min-h-80 w-full resize-y border-0 bg-white px-4 py-4 font-mono text-sm leading-6 text-gray-900 focus:outline-none focus:ring-0"
            placeholder="Escreva o conteudo com estrutura. Ex:\n\n## O que orientar\n- Comer devagar\n- Priorizar proteinas\n\n> Evite condutas alarmistas"
          />
        </div>

        <div>
          <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Pre-visualizacao
          </div>
          <div className="px-4 py-4 text-gray-700">
            {value.trim() ? (
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-3 text-2xl font-bold text-gray-900">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 text-xl font-bold text-gray-900">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 text-sm leading-7 text-gray-700">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-7 marker:text-green-600">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-7 marker:font-semibold marker:text-green-600">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="mb-3 rounded-r-xl border-l-4 border-green-300 bg-green-50 px-4 py-3 text-sm italic text-gray-600">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] text-green-700">
                      {children}
                    </code>
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-sm text-gray-400">
                A formatacao aparecera aqui conforme voce escreve.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/admin/knowledge");
      setItems(res.data);
    } catch {
      /**/
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
      api
        .get("/admin/symptoms")
        .then((r) => setSymptoms(r.data))
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: KnowledgeItem) => {
    setForm({
      title: item.title,
      content: item.content,
      symptoms: item.symptoms.map((s) => s.symptom.slug),
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const toggleSymptom = (slug: string) => {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(slug)
        ? f.symptoms.filter((s) => s !== slug)
        : [...f.symptoms, slug],
    }));
  };

  const canSave =
    !!form.title.trim() && !!form.content.trim() && form.symptoms.length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/knowledge/${editing}`, form);
      } else {
        await api.post("/admin/knowledge", form);
      }
      setShowForm(false);
      load();
    } catch {
      /**/
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    try {
      await api.delete(`/admin/knowledge/${id}`);
      load();
    } catch {
      /**/
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Base de Conhecimento
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Conteúdo usado pela IA para orientar os usuários
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition"
        >
          + Novo item
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-8">
          <h2 className="font-semibold text-gray-900 mb-5">
            {editing ? "Editar item" : "Novo item"}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Manejo da náusea com GLP-1"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conteúdo
            </label>
            <KnowledgeEditor
              value={form.content}
              onChange={(value) => setForm((f) => ({ ...f, content: value }))}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sintomas relacionados
            </label>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => toggleSymptom(s.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                    ${
                      form.symptoms.includes(s.slug)
                        ? "bg-green-600 text-white border-green-600"
                        : "border-gray-200 text-gray-600 hover:border-green-300"
                    }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving || !canSave}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum item cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {stripMarkdown(item.content)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.symptoms.length > 0 ? (
                      item.symptoms.map((s) => (
                        <span
                          key={s.symptom.slug}
                          className="bg-green-50 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-green-100"
                        >
                          {s.symptom.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Nenhum sintoma vinculado
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition text-gray-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
