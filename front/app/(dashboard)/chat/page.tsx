"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Plus,
  Star,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import ImageLightbox from "@/components/ImageLightbox";

interface Message {
  id: string;
  content: string;
  fileUrl: string | null;
  fileType: string | null;
  senderRole: "USER" | "ADMIN";
  createdAt: string;
  readAt: string | null;
}

interface Session {
  id: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  messages: Message[];
  rating: number | null;
  ratingComment: string | null;
}

function MessageAttachment({
  fileUrl,
  fileType,
  isUser,
}: {
  fileUrl: string;
  fileType: string | null;
  isUser: boolean;
}) {
  const [lightbox, setLightbox] = useState(false);
  const isImage = fileType?.startsWith("image/");
  if (isImage) {
    return (
      <>
        <button onClick={() => setLightbox(true)} className="block mt-2">
          <img
            src={fileUrl}
            alt="Imagem enviada"
            className="max-w-50 rounded-xl object-cover hover:opacity-90 transition cursor-zoom-in"
          />
        </button>
        {lightbox && (
          <ImageLightbox src={fileUrl} onClose={() => setLightbox(false)} />
        )}
      </>
    );
  }
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs transition ${
        isUser
          ? "bg-white/15 hover:bg-white/25 text-white"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      }`}
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate max-w-45">
        {decodeURIComponent(fileUrl.split("/").pop() ?? "documento")}
      </span>
    </a>
  );
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function dateSeparatorLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type GroupItem =
  | { type: "date"; label: string }
  | { type: "msg"; msg: Message; isFirst: boolean; isLast: boolean };

function buildGroups(messages: Message[]): GroupItem[] {
  const groups: GroupItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || !isSameDay(prev.createdAt, msg.createdAt)) {
      groups.push({ type: "date", label: dateSeparatorLabel(msg.createdAt) });
    }
    const isFirst =
      !prev ||
      prev.senderRole !== msg.senderRole ||
      !isSameDay(prev.createdAt, msg.createdAt);
    const isLast =
      !next ||
      next.senderRole !== msg.senderRole ||
      !isSameDay(msg.createdAt, next.createdAt);
    groups.push({ type: "msg", msg, isFirst, isLast });
  }
  return groups;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSending, setRatingSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadAllSessions = async () => {
    try {
      const res = await api.get("/chat/sessions");
      const sessions: Session[] = res.data;
      setAllSessions(sessions);
      // Abre automaticamente a sessão OPEN se existir, senão a mais recente
      const open = sessions.find((s) => s.status === "OPEN");
      const toOpen = open ?? sessions[0] ?? null;
      if (toOpen) {
        setActiveSession(toOpen);
        setMessages(toOpen.messages);
      }
    } catch {
      setAllSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    setStartingNew(true);
    try {
      const res = await api.post("/chat/session");
      const newSession: Session = { ...res.data, messages: [] };
      setAllSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession);
      setMessages([]);
      setMobileView("chat");
    } finally {
      setStartingNew(false);
    }
  };

  const selectSession = (s: Session) => {
    setActiveSession(s);
    setMessages(s.messages);
    setText("");
    clearFile();
    setRatingValue(0);
    setRatingHover(0);
    setRatingComment("");
    setMobileView("chat");
  };

  const pollMessages = async () => {
    if (!activeSession) return;
    try {
      const [msgRes, sessionsRes] = await Promise.all([
        api.get(`/chat/session/${activeSession.id}/messages`),
        api.get("/chat/sessions"),
      ]);
      const updatedSessions: Session[] = sessionsRes.data;
      setAllSessions(updatedSessions);
      const updated = updatedSessions.find((s) => s.id === activeSession.id);
      if (updated) {
        setActiveSession((prev) =>
          prev ? { ...prev, status: updated.status } : prev,
        );
      }
      setMessages(msgRes.data);
    } catch {
      /**/
    }
  };

  useEffect(() => {
    loadAllSessions();
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeSession || activeSession.status === "CLOSED") return;
    pollRef.current = setInterval(pollMessages, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeSession?.id, activeSession?.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFilePreview(
      f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    );
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  const send = async () => {
    if (!activeSession || (!text.trim() && !file)) return;
    setSending(true);
    const content = text.trim();
    const fileToSend = file;
    setText("");
    clearFile();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      const form = new FormData();
      if (content) form.append("content", content);
      if (fileToSend) form.append("file", fileToSend);
      const res = await api.post(
        `/chat/session/${activeSession.id}/messages`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setMessages((prev) => [...prev, res.data]);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const openSessions = allSessions.filter((s) => s.status === "OPEN");
  const closedSessions = allSessions.filter((s) => s.status === "CLOSED");
  const isViewingActive = activeSession?.status === "OPEN";
  const canRate = activeSession?.status === "CLOSED" && !activeSession.rating;

  const submitRating = async () => {
    if (!activeSession || ratingValue === 0) return;
    setRatingSending(true);
    try {
      await api.post(`/chat/session/${activeSession.id}/rating`, {
        rating: ratingValue,
        ratingComment: ratingComment.trim() || undefined,
      });
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              rating: ratingValue,
              ratingComment: ratingComment.trim() || null,
            }
          : prev,
      );
      setAllSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, rating: ratingValue } : s,
        ),
      );
    } catch {
      /**/
    } finally {
      setRatingSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Nenhuma sessão — tela inicial
  if (allSessions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="relative w-24 h-24 mx-auto mb-5">
          <Image
            src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
            alt="Elane Oliveira"
            fill
            className="rounded-full object-cover object-top"
            sizes="96px"
          />
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Elane Oliveira</h2>
        <p className="text-sm text-green-600 font-semibold mb-4">
          Nutricionista · CRN-14533
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Tire suas dúvidas diretamente com a especialista.
          <br />
          As mensagens são respondidas em até 24h.
        </p>
        <button
          onClick={startSession}
          disabled={startingNew}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60"
        >
          <MessageCircle className="w-4 h-4" />
          {startingNew ? "Iniciando..." : "Iniciar conversa"}
        </button>
      </div>
    );
  }

  const groups = buildGroups(messages);

  return (
    <div className="flex -mx-4 -my-4 sm:-mx-6 sm:-my-6 md:-mx-8 md:-my-8 h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Left panel ─────────────────────────────────────────────── */}
      <div
        className={`w-full md:w-72 md:shrink-0 flex flex-col border-r border-gray-100 bg-white ${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Nutri card */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden">
              <Image
                src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                alt="Elane Oliveira"
                width={44}
                height={44}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              Elane Oliveira
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Nutricionista · CRN-14533
            </p>
          </div>
        </div>

        {/* Header + new button */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Conversas
          </p>
          {openSessions.length === 0 && (
            <button
              onClick={startSession}
              disabled={startingNew}
              title="Nova conversa"
              className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center transition disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {openSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSession(s)}
              className={`w-full text-left px-3 py-3 rounded-xl transition ${
                activeSession?.id === s.id ? "bg-green-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    <Image
                      src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                      alt="Elane"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p
                      className={`text-sm font-semibold truncate ${
                        activeSession?.id === s.id
                          ? "text-green-700"
                          : "text-gray-900"
                      }`}
                    >
                      Elane Oliveira
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatSessionDate(s.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {s.messages.length > 0
                      ? s.messages[s.messages.length - 1].content ||
                        "Arquivo enviado"
                      : "Conversa em andamento"}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {closedSessions.length > 0 && (
            <>
              {openSessions.length > 0 && (
                <div className="h-px bg-gray-100 mx-3 my-2" />
              )}
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 pt-1 pb-2">
                Histórico
              </p>
              {closedSessions.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition ${
                    activeSession?.id === s.id
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden opacity-60 shrink-0">
                      <Image
                        src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                        alt="Elane"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-sm font-medium text-gray-600 truncate">
                          Conversa {closedSessions.length - i}
                        </p>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatSessionDate(s.createdAt)}
                        </span>
                      </div>
                      {s.rating ? (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= s.rating!
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Encerrada</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ─── Chat area ──────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 bg-[#f7f8fa] ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-100 px-4 flex items-center gap-3 shrink-0 shadow-sm">
          <button
            onClick={() => setMobileView("list")}
            className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden">
              <Image
                src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                alt="Elane Oliveira"
                width={36}
                height={36}
                className="w-full h-full object-cover object-top"
              />
            </div>
            {isViewingActive && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              Elane Oliveira
            </p>
            <p className="text-xs leading-tight">
              {isViewingActive ? (
                <span className="text-green-500 font-medium">Online agora</span>
              ) : (
                <span className="text-gray-400">Sessão encerrada</span>
              )}
            </p>
          </div>
          {!isViewingActive && openSessions.length === 0 && (
            <button
              onClick={startSession}
              disabled={startingNew}
              className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-60 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova conversa
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400 text-center">
                Nenhuma mensagem ainda.
                <br />
                <span className="text-xs">
                  Envie uma mensagem para começar.
                </span>
              </p>
            </div>
          )}
          <div className="space-y-0.5 max-w-2xl mx-auto">
            {groups.map((item, idx) => {
              if (item.type === "date") {
                return (
                  <div
                    key={`date-${idx}`}
                    className="flex items-center gap-3 py-4"
                  >
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[11px] text-gray-400 font-medium bg-[#f7f8fa] px-2">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                );
              }

              const { msg, isFirst, isLast } = item;
              const isUser = msg.senderRole === "USER";

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  } ${isFirst ? "mt-4" : "mt-0.5"}`}
                >
                  {/* Nutri avatar (left) */}
                  <div
                    className={`w-7 h-7 shrink-0 ${!isUser ? (isLast ? "visible" : "invisible") : "hidden"}`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden">
                      <Image
                        src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                        alt="Elane"
                        width={28}
                        height={28}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  </div>

                  {/* Bubble */}
                  <div className="max-w-[70%]">
                    {isUser ? (
                      <div
                        className={`px-4 py-2.5 text-sm text-white leading-relaxed bg-green-600 shadow-sm ${
                          isFirst && isLast
                            ? "rounded-2xl"
                            : isFirst
                              ? "rounded-2xl rounded-br-md"
                              : isLast
                                ? "rounded-2xl rounded-tr-md"
                                : "rounded-2xl rounded-r-md"
                        }`}
                      >
                        {msg.content && (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.fileUrl && (
                          <MessageAttachment
                            fileUrl={msg.fileUrl}
                            fileType={msg.fileType}
                            isUser={true}
                          />
                        )}
                        {isLast && (
                          <p className="text-[10px] text-green-100 mt-1 text-right">
                            {formatTime(msg.createdAt)}
                            {msg.readAt && " · Lida"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`px-4 py-2.5 text-sm text-gray-800 leading-relaxed bg-white shadow-sm border border-gray-100 ${
                          isFirst && isLast
                            ? "rounded-2xl"
                            : isFirst
                              ? "rounded-2xl rounded-bl-md"
                              : isLast
                                ? "rounded-2xl rounded-tl-md"
                                : "rounded-2xl rounded-l-md"
                        }`}
                      >
                        {msg.content && (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.fileUrl && (
                          <MessageAttachment
                            fileUrl={msg.fileUrl}
                            fileType={msg.fileType}
                            isUser={false}
                          />
                        )}
                        {isLast && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            {formatTime(msg.createdAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User avatar (right) */}
                  <div
                    className={`w-7 h-7 shrink-0 ${isUser ? (isLast ? "visible" : "invisible") : "hidden"}`}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs">
                      {user?.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt="Você"
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (user?.name?.[0]?.toUpperCase() ?? "U")
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Rating bar (session closed) */}
        {!isViewingActive && (
          <div className="bg-white border-t border-gray-100 px-6 py-4 shrink-0">
            {canRate ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-700">
                  Como foi seu atendimento?
                </p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingValue(star)}
                      onMouseEnter={() => setRatingHover(star)}
                      onMouseLeave={() => setRatingHover(0)}
                    >
                      <Star
                        className={`w-8 h-8 transition ${
                          star <= (ratingHover || ratingValue)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {ratingValue > 0 && (
                  <>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Deixe um comentário (opcional)"
                      rows={2}
                      className="w-full max-w-sm border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    <button
                      onClick={submitRating}
                      disabled={ratingSending}
                      className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60"
                    >
                      {ratingSending ? "Enviando..." : "Enviar avaliação"}
                    </button>
                  </>
                )}
                {openSessions.length === 0 && (
                  <button
                    onClick={startSession}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Iniciar nova conversa
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                {activeSession?.rating ? (
                  <>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= (activeSession.rating ?? 0)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      Obrigada pelo seu feedback!
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">
                    Esta conversa foi encerrada.{" "}
                    {openSessions.length === 0 && (
                      <button
                        onClick={startSession}
                        className="text-green-600 font-medium hover:underline"
                      >
                        Iniciar nova conversa
                      </button>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {isViewingActive && (
          <div className="bg-white border-t border-gray-100 px-4 md:px-6 py-3 shrink-0">
            {file && (
              <div className="mb-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="preview"
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                )}
                <span className="text-xs text-gray-600 truncate flex-1">
                  {file.name}
                </span>
                <button
                  onClick={clearFile}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition shrink-0"
                title="Anexar arquivo"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 flex items-end gap-2 min-h-11">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none leading-relaxed"
                  style={{ maxHeight: "100px" }}
                />
              </div>
              <button
                onClick={send}
                disabled={sending || (!text.trim() && !file)}
                className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center transition disabled:opacity-40 shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
