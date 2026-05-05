"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { MarkdownEditor } from "@/components/ui/MarkdownEditor";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  Eye,
  Download,
  X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  order: number;
  active: boolean;
  _count?: { materials: number };
}

interface Material {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  type: "PDF" | "VIDEO" | "DOCUMENT" | "IMAGE" | "OTHER";
  url: string;
  thumbnailUrl: string | null;
  fileSize: number | null;
  featured: boolean;
  order: number;
  active: boolean;
  views: number;
  downloads: number;
  category: { id: string; name: string; color: string };
}

const TYPE_LABELS: Record<Material["type"], string> = {
  PDF: "PDF",
  VIDEO: "Vídeo (YouTube)",
  DOCUMENT: "Documento",
  IMAGE: "Imagem",
  OTHER: "Outro",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CoverUploadField({
  matCover,
  coverInputRef,
  setMatCover,
}: {
  matCover: File | null;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  setMatCover: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Imagem de capa{" "}
        <span className="text-gray-400 font-normal">(opcional)</span>
      </label>
      <input
        ref={coverInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={(e) => setMatCover(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {matCover && (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={URL.createObjectURL(matCover)}
            alt="preview"
            className="w-16 h-10 object-cover rounded-lg border border-gray-200"
          />
          <p className="text-xs text-gray-400">{matCover.name}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminMateriaisPage() {
  // categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [catLoading, setCatLoading] = useState(true);

  // materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matLoading, setMatLoading] = useState(false);

  // category modal
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    description: "",
    icon: "",
    color: "#16a34a",
    order: 0,
  });
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);

  // material modal
  const [matModal, setMatModal] = useState(false);
  const [editingMat, setEditingMat] = useState<Material | null>(null);
  const [matForm, setMatForm] = useState({
    title: "",
    description: "",
    type: "PDF" as Material["type"],
    url: "",
    featured: false,
    order: 0,
  });
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matCover, setMatCover] = useState<File | null>(null);
  const [matSaving, setMatSaving] = useState(false);
  const [matError, setMatError] = useState("");
  const [deleteMatId, setDeleteMatId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadCategories = () => {
    setCatLoading(true);
    api
      .get("/admin/material-categories")
      .then((r) => setCategories(r.data))
      .finally(() => setCatLoading(false));
  };

  const loadMaterials = (catId: string) => {
    setMatLoading(true);
    api
      .get(`/admin/materials?categoryId=${catId}`)
      .then((r) => setMaterials(r.data))
      .finally(() => setMatLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCat) loadMaterials(selectedCat.id);
    else setMaterials([]);
  }, [selectedCat]);

  // ── Category CRUD ──────────────────────────────────────────────────────────

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({
      name: "",
      description: "",
      icon: "",
      color: "#16a34a",
      order: 0,
    });
    setCatError("");
    setCatModal(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({
      name: c.name,
      description: c.description ?? "",
      icon: c.icon ?? "",
      color: c.color,
      order: c.order,
    });
    setCatError("");
    setCatModal(true);
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) {
      setCatError("Nome é obrigatório.");
      return;
    }
    setCatSaving(true);
    setCatError("");
    try {
      const payload = {
        name: catForm.name.trim(),
        description: catForm.description.trim() || null,
        icon: catForm.icon.trim() || null,
        color: catForm.color,
        order: catForm.order,
      };
      if (editingCat) {
        await api.put(`/admin/material-categories/${editingCat.id}`, payload);
      } else {
        await api.post("/admin/material-categories", payload);
      }
      setCatModal(false);
      loadCategories();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setCatError(msg ?? "Erro ao salvar categoria.");
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = async (id: string) => {
    try {
      await api.delete(`/admin/material-categories/${id}`);
      setDeleteCatId(null);
      if (selectedCat?.id === id) setSelectedCat(null);
      loadCategories();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      alert(msg ?? "Erro ao excluir categoria.");
      setDeleteCatId(null);
    }
  };

  // ── Material CRUD ──────────────────────────────────────────────────────────

  const openNewMat = () => {
    setEditingMat(null);
    setMatForm({
      title: "",
      description: "",
      type: "PDF",
      url: "",
      featured: false,
      order: 0,
    });
    setMatFile(null);
    setMatCover(null);
    setMatError("");
    setMatModal(true);
  };

  const openEditMat = (m: Material) => {
    setEditingMat(m);
    setMatForm({
      title: m.title,
      description: m.description ?? "",
      type: m.type,
      url: m.url,
      featured: m.featured,
      order: m.order,
    });
    setMatFile(null);
    setMatCover(null);
    setMatError("");
    setMatModal(true);
  };

  const saveMat = async () => {
    if (!matForm.title.trim()) {
      setMatError("Título é obrigatório.");
      return;
    }
    if (matForm.type === "VIDEO" && !matForm.url.trim()) {
      setMatError("URL do YouTube é obrigatória.");
      return;
    }
    if (!editingMat && matForm.type !== "VIDEO" && !matFile) {
      setMatError("Selecione um arquivo.");
      return;
    }

    setMatSaving(true);
    setMatError("");
    try {
      if (editingMat) {
        const fd = new FormData();
        fd.append("title", matForm.title.trim());
        fd.append("description", matForm.description.trim());
        fd.append("featured", String(matForm.featured));
        fd.append("order", String(matForm.order));
        if (matForm.type === "VIDEO") fd.append("url", matForm.url.trim());
        if (matCover) fd.append("cover", matCover);
        await api.put(`/admin/materials/${editingMat.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const fd = new FormData();
        fd.append("categoryId", selectedCat!.id);
        fd.append("title", matForm.title.trim());
        fd.append("description", matForm.description.trim());
        fd.append("type", matForm.type);
        fd.append("featured", String(matForm.featured));
        fd.append("order", String(matForm.order));
        if (matForm.type === "VIDEO") {
          fd.append("url", matForm.url.trim());
        } else if (matFile) {
          fd.append("file", matFile);
        }
        if (matCover) {
          fd.append("cover", matCover);
        }
        await api.post("/admin/materials", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setMatModal(false);
      loadMaterials(selectedCat!.id);
      loadCategories();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setMatError(msg ?? "Erro ao salvar material.");
    } finally {
      setMatSaving(false);
    }
  };

  const deleteMat = async (id: string) => {
    try {
      await api.delete(`/admin/materials/${id}`);
      setDeleteMatId(null);
      loadMaterials(selectedCat!.id);
      loadCategories();
    } catch {
      alert("Erro ao excluir material.");
      setDeleteMatId(null);
    }
  };

  const toggleMatActive = async (m: Material) => {
    await api.put(`/admin/materials/${m.id}`, { active: !m.active });
    loadMaterials(selectedCat!.id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* ── Left panel: Categories ── */}
      <aside className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Categorias</h2>
          <button
            onClick={openNewCat}
            className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
          >
            <Plus size={14} /> Nova
          </button>
        </div>

        {catLoading ? (
          <p className="p-4 text-sm text-gray-400">Carregando…</p>
        ) : categories.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Nenhuma categoria.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedCat(c)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition ${
                    selectedCat?.id === c.id
                      ? "bg-green-50 border-r-2 border-green-600"
                      : ""
                  }`}
                >
                  {c.icon && <span className="text-lg">{c.icon}</span>}
                  {!c.icon && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c._count?.materials ?? 0} materiais
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 shrink-0" />
                </button>
                <div className="flex gap-1 px-4 pb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditCat(c);
                    }}
                    className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-0.5"
                  >
                    <Pencil size={11} /> editar
                  </button>
                  <span className="text-gray-200">·</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteCatId(c.id);
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-0.5"
                  >
                    <Trash2 size={11} /> excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Right panel: Materials ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!selectedCat ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Selecione uma categoria para gerenciar os materiais
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
              <div>
                <h1 className="text-lg font-semibold text-gray-800">
                  {selectedCat.name}
                </h1>
                {selectedCat.description && (
                  <p className="text-sm text-gray-400">
                    {selectedCat.description}
                  </p>
                )}
              </div>
              <button
                onClick={openNewMat}
                className="flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Plus size={14} /> Novo Material
              </button>
            </div>

            {matLoading ? (
              <p className="p-6 text-sm text-gray-400">Carregando…</p>
            ) : materials.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">
                Nenhum material nesta categoria.
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${
                        !m.active ? "opacity-60" : ""
                      }`}
                    >
                      {/* Thumbnail */}
                      {m.thumbnailUrl ? (
                        <img
                          src={m.thumbnailUrl}
                          alt={m.title}
                          className="w-full h-36 object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-36 flex items-center justify-center text-4xl"
                          style={{ backgroundColor: selectedCat.color + "22" }}
                        >
                          {m.type === "PDF"
                            ? "📄"
                            : m.type === "VIDEO"
                              ? "▶️"
                              : m.type === "IMAGE"
                                ? "🖼️"
                                : "📎"}
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: selectedCat.color + "22",
                                  color: selectedCat.color,
                                }}
                              >
                                {TYPE_LABELS[m.type]}
                              </span>
                              {m.featured && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                  destaque
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-800 truncate">
                              {m.title}
                            </h3>
                            {m.description && (
                              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                                {m.description}
                              </p>
                            )}
                            {m.fileSize && (
                              <p className="text-xs text-gray-300 mt-0.5">
                                {formatSize(m.fileSize)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Counters */}
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye size={12} /> {m.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download size={12} /> {m.downloads}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => openEditMat(m)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            onClick={() => toggleMatActive(m)}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              m.active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {m.active ? "ativo" : "inativo"}
                          </button>
                          <button
                            onClick={() => setDeleteMatId(m.id)}
                            className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Category Modal ── */}
      {catModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {editingCat ? "Editar Categoria" : "Nova Categoria"}
              </h3>
              <button
                onClick={() => setCatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Nutrição GLP-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={catForm.description}
                  onChange={(e) =>
                    setCatForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ícone (emoji)
                  </label>
                  <input
                    type="text"
                    value={catForm.icon}
                    onChange={(e) =>
                      setCatForm((f) => ({ ...f, icon: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="🥗"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="color"
                      value={catForm.color}
                      onChange={(e) =>
                        setCatForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="w-10 h-9 shrink-0 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={catForm.color}
                      onChange={(e) =>
                        setCatForm((f) => ({ ...f, color: e.target.value }))
                      }
                      className="min-w-0 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  value={catForm.order}
                  onChange={(e) =>
                    setCatForm((f) => ({ ...f, order: Number(e.target.value) }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {catError && <p className="text-sm text-red-500">{catError}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setCatModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveCat}
                disabled={catSaving}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
              >
                {catSaving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Material Modal ── */}
      {matModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-800">
                {editingMat ? "Editar Material" : "Novo Material"}
              </h3>
              <button
                onClick={() => setMatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={matForm.title}
                  onChange={(e) =>
                    setMatForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <MarkdownEditor
                  value={matForm.description}
                  onChange={(v) =>
                    setMatForm((f) => ({ ...f, description: v }))
                  }
                />
              </div>

              {!editingMat && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={matForm.type}
                    onChange={(e) =>
                      setMatForm((f) => ({
                        ...f,
                        type: e.target.value as Material["type"],
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {matForm.type === "VIDEO" || editingMat?.type === "VIDEO" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do YouTube *
                  </label>
                  <input
                    type="url"
                    value={matForm.url}
                    onChange={(e) =>
                      setMatForm((f) => ({ ...f, url: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://youtu.be/..."
                  />
                </div>
              ) : !editingMat ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arquivo *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(e) => setMatFile(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {matFile && (
                      <p className="text-xs text-gray-400 mt-1">
                        {matFile.name} ({formatSize(matFile.size)})
                      </p>
                    )}
                  </div>
                  {matForm.type !== "IMAGE" && (
                    <CoverUploadField
                      matCover={matCover}
                      coverInputRef={coverInputRef}
                      setMatCover={setMatCover}
                    />
                  )}
                </>
              ) : (
                /* Edit mode — allow changing cover */
                editingMat?.type !== "VIDEO" &&
                editingMat?.type !== "IMAGE" && (
                  <div>
                    {editingMat?.thumbnailUrl && !matCover && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">
                          Capa atual:
                        </p>
                        <img
                          src={editingMat.thumbnailUrl}
                          alt="capa atual"
                          className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                    <CoverUploadField
                      matCover={matCover}
                      coverInputRef={coverInputRef}
                      setMatCover={setMatCover}
                    />
                  </div>
                )
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={matForm.order}
                    onChange={(e) =>
                      setMatForm((f) => ({
                        ...f,
                        order: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={matForm.featured}
                      onChange={(e) =>
                        setMatForm((f) => ({
                          ...f,
                          featured: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-green-600"
                    />
                    <span className="text-sm text-gray-700">Destacado</span>
                  </label>
                </div>
              </div>

              {matError && <p className="text-sm text-red-500">{matError}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setMatModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveMat}
                disabled={matSaving}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
              >
                {matSaving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Category Confirm ── */}
      {deleteCatId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-2">
              Excluir categoria?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Remova todos os materiais desta categoria antes de excluí-la.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteCatId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteCat(deleteCatId)}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Material Confirm ── */}
      {deleteMatId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-gray-800 mb-2">
              Excluir material?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteMatId(null)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMat(deleteMatId)}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
