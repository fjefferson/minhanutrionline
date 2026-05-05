"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  ArrowLeft,
  Eye,
  Download,
  Play,
  FileText,
  Image as ImageIcon,
  File,
  ExternalLink,
  Calendar,
  BookOpen,
  CheckCircle2,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  createdAt: string;
  category: { id: string; name: string; color: string; icon: string | null };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/,
  );
  return m ? m[1] : null;
}

function formatSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatRelativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d atrás`;
  return formatDate(iso);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const TYPE_CONFIG: Record<
  Material["type"],
  { label: string; icon: React.ReactNode; actionLabel: string; color: string }
> = {
  VIDEO: {
    label: "Vídeo",
    icon: <Play size={16} />,
    actionLabel: "Abrir no YouTube",
    color: "#ef4444",
  },
  PDF: {
    label: "PDF",
    icon: <FileText size={16} />,
    actionLabel: "Baixar PDF",
    color: "#f97316",
  },
  DOCUMENT: {
    label: "Documento",
    icon: <File size={16} />,
    actionLabel: "Baixar Documento",
    color: "#3b82f6",
  },
  IMAGE: {
    label: "Imagem",
    icon: <ImageIcon size={16} />,
    actionLabel: "Ver imagem",
    color: "#8b5cf6",
  },
  OTHER: {
    label: "Arquivo",
    icon: <File size={16} />,
    actionLabel: "Baixar Arquivo",
    color: "#6b7280",
  },
};

// ─── Rich text renderer ───────────────────────────────────────────────────────

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
          className="bg-gray-100 text-green-700 px-1 py-0.5 rounded text-sm font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith("### "))
          return (
            <h3 key={i} className="text-base font-bold text-gray-800 mt-4">
              {inline(line.slice(4))}
            </h3>
          );
        if (line.startsWith("## "))
          return (
            <h2 key={i} className="text-lg font-bold text-gray-800 mt-5">
              {inline(line.slice(3))}
            </h2>
          );
        if (line.startsWith("# "))
          return (
            <h1 key={i} className="text-xl font-bold text-gray-900 mt-6">
              {inline(line.slice(2))}
            </h1>
          );
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex gap-2">
              <span className="text-green-500 mt-0.5 shrink-0">•</span>
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

// ─── Reactions bar ───────────────────────────────────────────────────────────

function ReactionsBar({
  materialId,
  accentColor,
}: {
  materialId: string;
  accentColor: string;
}) {
  const [userReaction, setUserReaction] = useState<"LIKE" | "DISLIKE" | null>(
    null,
  );
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/materials/${materialId}/reaction`).then((r) => {
      setUserReaction(r.data.userReaction);
      setLikes(r.data.likes);
      setDislikes(r.data.dislikes);
    });
  }, [materialId]);

  const react = async (type: "LIKE" | "DISLIKE") => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/materials/${materialId}/reaction`, {
        type,
      });
      setUserReaction(data.userReaction);
      setLikes(data.likes);
      setDislikes(data.dislikes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => react("LIKE")}
        disabled={loading}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm border transition ${
          userReaction === "LIKE"
            ? "bg-green-50 border-green-400 text-green-700"
            : "bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600"
        }`}
      >
        <ThumbsUp
          size={16}
          className={
            userReaction === "LIKE" ? "fill-green-500 text-green-500" : ""
          }
        />
        <span>{likes}</span>
      </button>

      <button
        onClick={() => react("DISLIKE")}
        disabled={loading}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium text-sm border transition ${
          userReaction === "DISLIKE"
            ? "bg-red-50 border-red-400 text-red-600"
            : "bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
        }`}
      >
        <ThumbsDown
          size={16}
          className={
            userReaction === "DISLIKE" ? "fill-red-500 text-red-500" : ""
          }
        />
      </button>
    </div>
  );
}

// ─── Comments section ─────────────────────────────────────────────────────────

function CommentsSection({ materialId }: { materialId: string }) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api
      .get(`/materials/${materialId}/comments`)
      .then((r) => setComments(r.data));
  }, [materialId]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/materials/${materialId}/comments`, {
        content: trimmed,
      });
      setComments((prev) => [...prev, data]);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (commentId: string) => {
    await api.delete(`/materials/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="mt-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle size={18} className="text-gray-500" />
        <h2 className="text-base font-bold text-gray-800">
          Comentários
          {comments.length > 0 && (
            <span className="ml-1.5 text-gray-400 font-normal">
              ({comments.length})
            </span>
          )}
        </h2>
      </div>

      {/* Input */}
      <div className="flex gap-3 mb-8">
        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0 select-none">
          {user ? getInitials(user.name) : "?"}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            }}
            rows={2}
            placeholder="Deixe seu comentário…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Ctrl + Enter para enviar
            </span>
            <button
              onClick={submit}
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold shadow hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Send size={14} />
              Comentar
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {comments.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0 select-none">
                {c.user.avatarUrl ? (
                  <img
                    src={c.user.avatarUrl}
                    alt={c.user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(c.user.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">
                    {c.user.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatRelativeDate(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
                  {c.content}
                </p>
              </div>
              {(user?.id === c.user.id || user?.role === "ADMIN") && (
                <button
                  onClick={() => remove(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition shrink-0 self-start mt-0.5"
                  title="Excluir comentário"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    api
      .get(`/materials/${id}`)
      .then((r) => {
        setMaterial(r.data);
        api.post(`/materials/${id}/view`).catch(() => {});
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = () => {
    if (!material) return;
    if (material.type === "VIDEO") {
      window.open(material.url, "_blank", "noopener,noreferrer");
    } else if (material.type === "IMAGE") {
      setLightbox(true);
    } else {
      api.post(`/materials/${id}/download`).catch(() => {});
      setMaterial((m) => (m ? { ...m, downloads: m.downloads + 1 } : m));
      window.open(material.url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-400 text-sm">Carregando…</p>
      </div>
    );

  if (notFound || !material)
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-gray-500">Material não encontrado.</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-green-600 underline"
        >
          Voltar
        </button>
      </div>
    );

  const typeConfig = TYPE_CONFIG[material.type];

  return (
    <div className="py-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition"
      >
        <ArrowLeft size={15} />
        Voltar para Materiais
      </button>

      {material.type === "VIDEO" ? (
        /* ══ VIDEO: player full-width ══ */
        <div>
          {/* Player 16:9 */}
          <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-black mb-6">
            {getYoutubeId(material.url) ? (
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${getYoutubeId(material.url)}?rel=0&modestbranding=1`}
                  title={material.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-white/60">
                <Play size={48} />
                <span className="text-sm">URL inválida</span>
              </div>
            )}
          </div>

          {/* Info below player */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left: title + description + reactions + comments */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{
                    backgroundColor: material.category.color,
                    color: "#fff",
                  }}
                >
                  {material.category.icon && (
                    <span className="mr-1">{material.category.icon}</span>
                  )}
                  {material.category.name}
                </span>
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1"
                  style={{
                    backgroundColor: typeConfig.color + "18",
                    color: typeConfig.color,
                  }}
                >
                  {typeConfig.icon} {typeConfig.label}
                </span>
                {material.featured && (
                  <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Star size={11} fill="currentColor" /> Destaque
                  </span>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug mb-2">
                {material.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> Publicado em{" "}
                  {formatDate(material.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} /> {material.views.toLocaleString("pt-BR")}{" "}
                  visualizações
                </span>
              </div>

              {/* Reactions */}
              <ReactionsBar
                materialId={material.id}
                accentColor={typeConfig.color}
              />

              {material.description && (
                <div className="mt-6">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Sobre este vídeo
                  </h2>
                  <RichText text={material.description} />
                </div>
              )}

              <CommentsSection materialId={material.id} />
            </div>

            {/* Right: action card */}
            <div className="w-full lg:w-72 shrink-0">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
                <div className="space-y-2.5">
                  {[
                    "Acesso imediato",
                    "Disponível para o seu plano",
                    "Vídeo online",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2
                        size={15}
                        className="text-green-500 shrink-0"
                      />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAction}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm shadow transition hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: typeConfig.color }}
                >
                  <ExternalLink size={15} /> Abrir no YouTube
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ══ OUTROS TIPOS: imagem esquerda + info direita ══ */
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Imagem */}
          <div className="w-full lg:w-85 shrink-0">
            <div
              className="relative group cursor-zoom-in rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white"
              onClick={() => setLightbox(true)}
            >
              {material.thumbnailUrl ? (
                <>
                  <img
                    src={material.thumbnailUrl}
                    alt={material.title}
                    className="w-full object-contain"
                    style={{ maxHeight: 460 }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                      Ampliar imagem
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className="w-full flex flex-col items-center justify-center gap-4 py-20"
                  style={{
                    background: `linear-gradient(135deg, ${material.category.color}22 0%, ${material.category.color}0a 100%)`,
                    minHeight: 300,
                  }}
                >
                  <span style={{ color: material.category.color }}>
                    <BookOpen size={72} strokeWidth={1.2} />
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: material.category.color }}
                  >
                    {typeConfig.label}
                  </span>
                </div>
              )}
              {material.featured && (
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                    <Star size={11} fill="currentColor" /> Destaque
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Eye size={12} /> {material.views.toLocaleString("pt-BR")}
              </span>
              <span className="flex items-center gap-1">
                <Download size={12} />{" "}
                {material.downloads.toLocaleString("pt-BR")}
              </span>
              {formatSize(material.fileSize) && (
                <span className="flex items-center gap-1">
                  <File size={12} /> {formatSize(material.fileSize)}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{
                  backgroundColor: material.category.color,
                  color: "#fff",
                }}
              >
                {material.category.icon && (
                  <span className="mr-1">{material.category.icon}</span>
                )}
                {material.category.name}
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1"
                style={{
                  backgroundColor: typeConfig.color + "18",
                  color: typeConfig.color,
                }}
              >
                {typeConfig.icon} {typeConfig.label}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug mb-2">
              {material.title}
            </h1>

            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
              <Calendar size={12} /> Publicado em{" "}
              {formatDate(material.createdAt)}
            </p>

            {/* Reactions */}
            <ReactionsBar
              materialId={material.id}
              accentColor={typeConfig.color}
            />

            <div className="mt-6 mb-8">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Sobre este material
              </h2>
              {material.description ? (
                <RichText text={material.description} />
              ) : (
                <p className="text-gray-400 text-sm italic">
                  Sem descrição disponível.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 space-y-3">
              {[
                "Acesso imediato",
                "Disponível para o seu plano",
                "Arquivo para download",
                material.fileSize
                  ? `Tamanho do arquivo: ${formatSize(material.fileSize)}`
                  : null,
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="text-green-500 shrink-0"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
            </div>

            <button
              onClick={handleAction}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-base shadow-lg transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: typeConfig.color }}
            >
              <ExternalLink size={18} /> {typeConfig.actionLabel}
            </button>
            {material.type !== "IMAGE" && (
              <p className="text-center text-xs text-gray-400 mt-2">
                O arquivo abrirá em uma nova aba
              </p>
            )}

            <CommentsSection materialId={material.id} />
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xl"
          >
            ✕
          </button>
          <img
            src={material.thumbnailUrl ?? material.url}
            alt={material.title}
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
