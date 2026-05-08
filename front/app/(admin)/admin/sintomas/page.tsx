"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Symptom {
  id: string;
  name: string;
  slug: string;
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function AdminSymptomsPage() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [editing, setEditing] = useState<Symptom | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/admin/symptoms")
      .then((r) => setSymptoms(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const openEdit = (s: Symptom) => {
    setEditing(s);
    setForm({ name: s.name, slug: s.slug });
    setError("");
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", slug: "" });
    setError("");
  };

  const handleNameChange = (val: string) => {
    setForm((f) => ({
      name: val,
      slug: editing ? f.slug : toSlug(val),
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/admin/symptoms/${editing.id}`, form);
      } else {
        await api.post("/admin/symptoms", form);
      }
      setEditing(null);
      setForm({ name: "", slug: "" });
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleteId(id);
    try {
      await api.delete(`/admin/symptoms/${id}`);
      load();
    } finally {
      setDeleteId(null);
    }
  };

  const isEditing = editing !== null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sintomas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">
            {isEditing ? "Editar sintoma" : "Novo sintoma"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Náusea"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug{" "}
                <span className="text-gray-400 font-normal text-xs">
                  (identificador único)
                </span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
                placeholder="Ex: nausea"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2 pt-1">
              {isEditing && (
                <button
                  onClick={openNew}
                  className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.slug.trim()}
                className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2">
          {loading ? (
            <p className="text-gray-500">Carregando...</p>
          ) : symptoms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
              Nenhum sintoma cadastrado.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Slug</th>
                    <th className="px-4 py-3 text-left w-24">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {symptoms.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-gray-50 ${editing?.id === s.id ? "bg-green-50" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400 text-xs">
                        {s.slug}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(s)}
                            className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 text-gray-600"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => remove(s.id)}
                            disabled={deleteId === s.id}
                            className="text-xs border border-red-200 text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            {deleteId === s.id ? "..." : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
