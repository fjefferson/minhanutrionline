"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

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
    load();
    api
      .get("/admin/symptoms")
      .then((r) => setSymptoms(r.data))
      .catch(() => {});
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

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
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
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              rows={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Descreva as orientações nutricionais..."
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
              disabled={saving || !form.title.trim() || !form.content.trim()}
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
                    {item.content}
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
