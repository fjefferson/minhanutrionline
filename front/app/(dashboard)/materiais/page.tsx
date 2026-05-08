"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import {
  Search,
  Eye,
  Download,
  Play,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  _count?: { materials: number };
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: "PDF" | "VIDEO" | "DOCUMENT" | "IMAGE" | "OTHER";
  url: string;
  thumbnailUrl: string | null;
  fileSize: number | null;
  featured: boolean;
  views: number;
  downloads: number;
  category: { id: string; name: string; color: string; icon: string | null };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TypeIcon({ type }: { type: Material["type"] }) {
  if (type === "VIDEO") return <Play size={18} className="text-red-500" />;
  if (type === "PDF") return <FileText size={18} className="text-orange-500" />;
  if (type === "IMAGE")
    return <ImageIcon size={18} className="text-blue-500" />;
  return <File size={18} className="text-gray-500" />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MateriaisPage() {
  const router = useRouter();
  const { hasActivePlan } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const loadAll = (catId?: string, q?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (catId) params.set("categoryId", catId);
    if (q?.trim()) params.set("search", q.trim());
    api
      .get(`/materials?${params.toString()}`)
      .then((r) => setMaterials(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!hasActivePlan()) {
      router.push("/planos");
      return;
    }
    const timeout = setTimeout(() => {
      api.get("/materials/categories").then((r) => setCategories(r.data));
      loadAll();
    }, 0);
    return () => clearTimeout(timeout);
  }, [hasActivePlan, router]);

  const handleCatFilter = (id: string | null) => {
    setActiveCat(id);
    setSearch("");
    loadAll(id ?? undefined);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    loadAll(activeCat ?? undefined, q);
  };

  const handleOpen = (m: Material) => {
    router.push(`/materiais/${m.id}`);
  };

  const featured = materials.filter((m) => m.featured);
  const rest = materials.filter((m) => !m.featured);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Materiais de Apoio</h1>
        <p className="text-gray-500 text-sm mt-1">
          Guias, PDFs e vídeos para apoiar sua jornada de saúde.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar materiais…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
        />
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => handleCatFilter(null)}
            className={`text-sm px-4 py-1.5 rounded-full border transition font-medium ${
              activeCat === null
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
            }`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCatFilter(c.id)}
              className={`text-sm px-4 py-1.5 rounded-full border transition font-medium flex items-center gap-1.5 ${
                activeCat === c.id
                  ? "text-white border-transparent"
                  : "bg-white text-gray-600 border-gray-200 hover:border-current"
              }`}
              style={
                activeCat === c.id
                  ? { backgroundColor: c.color, borderColor: c.color }
                  : { color: c.color }
              }
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
              {c._count && (
                <span className="opacity-70 text-xs">
                  ({c._count.materials})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Carregando…</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum material encontrado.</p>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && !search && !activeCat && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Em destaque
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featured.map((m) => (
                  <MaterialCard key={m.id} material={m} onOpen={handleOpen} />
                ))}
              </div>
            </div>
          )}

          {/* All / rest */}
          {(search || activeCat ? materials : rest).length > 0 && (
            <div>
              {!search && !activeCat && featured.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Todos os materiais
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(search || activeCat ? materials : rest).map((m) => (
                  <MaterialCard key={m.id} material={m} onOpen={handleOpen} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function MaterialCard({
  material: m,
  onOpen,
}: {
  material: Material;
  onOpen: (m: Material) => void;
}) {
  return (
    <button
      onClick={() => onOpen(m)}
      className="text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all overflow-hidden group"
    >
      {/* Thumbnail */}
      {m.thumbnailUrl ? (
        <div className="relative">
          <img
            src={m.thumbnailUrl}
            alt={m.title}
            className="w-full h-40 object-cover"
          />
          {m.type === "VIDEO" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play size={20} className="text-red-500 ml-1" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-full h-40 flex flex-col items-center justify-center gap-2"
          style={{ backgroundColor: m.category.color + "18" }}
        >
          <TypeIcon type={m.type} />
          <span className="text-xs text-gray-400">{m.type}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: m.category.color + "22",
              color: m.category.color,
            }}
          >
            {m.category.icon} {m.category.name}
          </span>
        </div>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug">
          {m.title}
        </h3>
        {m.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {m.description}
          </p>
        )}
        {m.fileSize && (
          <p className="text-xs text-gray-300 mt-0.5">
            {formatSize(m.fileSize)}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye size={11} /> {m.views}
            </span>
            {m.type !== "VIDEO" && (
              <span className="flex items-center gap-1">
                <Download size={11} /> {m.downloads}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-green-600">
            Ver detalhes →
          </span>
        </div>
      </div>
    </button>
  );
}
