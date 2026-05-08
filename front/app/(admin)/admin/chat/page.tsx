"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Star,
  Search,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import ImageLightbox from "@/components/ImageLightbox";

interface ChatSession {
  id: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  rating: number | null;
  ratingComment: string | null;
  user: { name: string; email: string; avatarUrl?: string | null };
  messages: { content: string; createdAt: string; senderRole: string }[];
}

interface Message {
  id: string;
  content: string;
  fileUrl: string | null;
  fileType: string | null;
  senderRole: "USER" | "ADMIN";
  createdAt: string;
  readAt: string | null;
}

function MessageAttachment({
  fileUrl,
  fileType,
  isAdmin,
}: {
  fileUrl: string;
  fileType: string | null;
  isAdmin: boolean;
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
            className="max-w-60 rounded-xl border border-white/20 object-cover hover:opacity-90 transition cursor-zoom-in"
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
      className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs transition ${isAdmin ? "bg-white/10 hover:bg-white/20" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
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

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [seenSessions, setSeenSessions] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = async () => {
    try {
      const res = await api.get("/admin/chat/sessions");
      setSessions(res.data);
    } catch {
      /**/
    }
  };

  const openSession = async (s: ChatSession) => {
    setActiveSession(s);
    setSeenSessions((prev) => new Set([...prev, s.id]));
    try {
      const res = await api.get(`/chat/session/${s.id}/messages`);
      setMessages(res.data);
    } catch {
      /**/
    }
  };

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

  const closeSession = async () => {
    if (!activeSession) return;
    try {
      await api.patch(`/admin/chat/sessions/${activeSession.id}/close`);
      setActiveSession((s) => (s ? { ...s, status: "CLOSED" } : s));
      loadSessions();
    } catch {
      /**/
    }
  };

  const activeSessionId = activeSession?.id;
  const activeSessionStatus = activeSession?.status;

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSessions();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling da lista de sessões (novas conversas aparecem automaticamente)
  useEffect(() => {
    const interval = setInterval(() => {
      void loadSessions();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Polling de mensagens da sessão ativa
  useEffect(() => {
    if (!activeSessionId || activeSessionStatus === "CLOSED") return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/chat/session/${activeSessionId}/messages`);
        setMessages(res.data);
      } catch {
        /**/
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeSession, activeSessionId, activeSessionStatus]);

  const q = search.toLowerCase().trim();
  const filterSessions = (list: ChatSession[]) =>
    q
      ? list.filter(
          (s) =>
            s.user.name.toLowerCase().includes(q) ||
            s.user.email.toLowerCase().includes(q) ||
            s.messages.some((m) => m.content.toLowerCase().includes(q)),
        )
      : list;

  const open = filterSessions(sessions.filter((s) => s.status === "OPEN"));
  const closed = filterSessions(sessions.filter((s) => s.status === "CLOSED"));
  const groups = buildGroups(messages);

  return (
    <div className="flex -mx-4 -my-4 sm:-mx-6 sm:-my-6 md:-mx-8 md:-my-8 h-[calc(100vh-4rem)] overflow-hidden">
      {/* ─── Left panel ─────────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-100 bg-white">
        {/* Header + search */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base mb-3">
            Atendimento
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700 bg-gray-50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {sessions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10 px-4">
              Nenhuma sessão ainda
            </p>
          )}

          {open.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 py-1.5">
                Ativos
              </p>
              {open.map((s) => {
                const lastMsg = s.messages[s.messages.length - 1];
                return (
                  <button
                    key={s.id}
                    onClick={() => openSession(s)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition ${
                      activeSession?.id === s.id
                        ? "bg-green-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                          {s.user.avatarUrl ? (
                            <Image
                              src={s.user.avatarUrl}
                              alt={s.user.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            s.user.name[0]?.toUpperCase()
                          )}
                        </div>
                        {!seenSessions.has(s.id) && (
                          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                        )}
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
                            {s.user.name}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatSessionDate(s.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {lastMsg?.content || "Conversa iniciada"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {closed.length > 0 && (
            <>
              {open.length > 0 && (
                <div className="h-px bg-gray-100 mx-3 my-2" />
              )}
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 py-1.5">
                Encerrados
              </p>
              {closed.map((s) => {
                const lastMsg = s.messages[s.messages.length - 1];
                return (
                  <button
                    key={s.id}
                    onClick={() => openSession(s)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition ${
                      activeSession?.id === s.id
                        ? "bg-gray-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0 opacity-70">
                        {s.user.avatarUrl ? (
                          <Image
                            src={s.user.avatarUrl}
                            alt={s.user.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          s.user.name[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-sm font-medium text-gray-600 truncate">
                            {s.user.name}
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
                          <p className="text-xs text-gray-400 truncate">
                            {lastMsg?.content || "Encerrada"}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ─── Chat area ──────────────────────────────────────────────── */}
      {!activeSession ? (
        <div className="flex-1 flex items-center justify-center bg-[#f7f8fa]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ArrowLeft className="w-7 h-7 text-gray-300 rotate-180" />
            </div>
            <p className="text-sm text-gray-400 font-medium">
              Selecione uma conversa
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col min-w-0 bg-[#f7f8fa]">
            {/* Header */}
            <div className="h-16 bg-white border-b border-gray-100 px-4 flex items-center gap-3 shrink-0 shadow-sm">
              {activeSession.status === "OPEN" && (
                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {activeSession.user.name}
                </p>
                <p className="text-xs text-gray-400 truncate leading-tight">
                  {activeSession.user.email}
                </p>
              </div>
              {activeSession.status === "OPEN" ? (
                <button
                  onClick={closeSession}
                  className="text-xs text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition shrink-0"
                >
                  Encerrar chat
                </button>
              ) : (
                <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg shrink-0">
                  Encerrada
                </span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">
                    Nenhuma mensagem ainda.
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
                  const isAdmin = msg.senderRole === "ADMIN";

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${
                        isAdmin ? "justify-end" : "justify-start"
                      } ${isFirst ? "mt-4" : "mt-0.5"}`}
                    >
                      {/* Bubble */}
                      <div className="max-w-[70%]">
                        {isAdmin ? (
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
                              <p className="whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            )}
                            {msg.fileUrl && (
                              <MessageAttachment
                                fileUrl={msg.fileUrl}
                                fileType={msg.fileType}
                                isAdmin={true}
                              />
                            )}
                            {isLast && (
                              <p className="text-[10px] text-green-100 mt-1 text-right">
                                {formatTime(msg.createdAt)}
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
                              <p className="whitespace-pre-wrap">
                                {msg.content}
                              </p>
                            )}
                            {msg.fileUrl && (
                              <MessageAttachment
                                fileUrl={msg.fileUrl}
                                fileType={msg.fileType}
                                isAdmin={false}
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
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input / Feedback */}
            <div className="bg-white border-t border-gray-100 px-4 md:px-6 py-3 shrink-0">
              {activeSession.status === "CLOSED" ? (
                <div className="flex flex-col items-center gap-1.5 py-1">
                  {activeSession.rating ? (
                    <>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= activeSession.rating!
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      {activeSession.ratingComment && (
                        <p className="text-xs text-gray-500 italic text-center max-w-xs">
                          &ldquo;{activeSession.ratingComment}&rdquo;
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Conversa encerrada · sem avaliação
                    </p>
                  )}
                </div>
              ) : (
                <>
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        rows={1}
                        placeholder="Responder..."
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
                </>
              )}
            </div>
          </div>

          {/* ─── Right info panel (xl only) ─────────────────────────── */}
          <div className="hidden xl:flex w-60 shrink-0 flex-col border-l border-gray-100 bg-white">
            <div className="p-5 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Paciente
              </p>
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
                  {activeSession.user.avatarUrl ? (
                    <Image
                      src={activeSession.user.avatarUrl}
                      alt={activeSession.user.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    activeSession.user.name[0]?.toUpperCase()
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">
                    {activeSession.user.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 break-all">
                    {activeSession.user.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 flex flex-col gap-4 flex-1">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                  Sessão iniciada
                </p>
                <p className="text-sm text-gray-700">
                  {new Date(activeSession.createdAt).toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "long", year: "numeric" },
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                  Status
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                    activeSession.status === "OPEN"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeSession.status === "OPEN"
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {activeSession.status === "OPEN"
                    ? "Em andamento"
                    : "Encerrada"}
                </span>
              </div>
              {activeSession.rating && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                    Avaliação
                  </p>
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= activeSession.rating!
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  {activeSession.ratingComment && (
                    <p className="text-xs text-gray-500 italic">
                      &ldquo;{activeSession.ratingComment}&rdquo;
                    </p>
                  )}
                </div>
              )}
              {activeSession.status === "OPEN" && (
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <button
                    onClick={closeSession}
                    className="w-full text-xs text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition font-medium"
                  >
                    Encerrar conversa
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
