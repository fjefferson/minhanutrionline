"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Send, Paperclip, X, FileText, Star, Search } from "lucide-react";
import Image from "next/image";
import ImageLightbox from "@/components/ImageLightbox";

interface ChatSession {
  id: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  rating: number | null;
  ratingComment: string | null;
  user: { name: string; email: string };
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
  const activeSessionRef = useRef<ChatSession | null>(null);
  activeSessionRef.current = activeSession;

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

  const send = async () => {
    if (!activeSession || (!text.trim() && !file)) return;
    setSending(true);
    const content = text.trim();
    const fileToSend = file;
    setText("");
    clearFile();
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

  useEffect(() => {
    loadSessions();
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling da lista de sessões (novas conversas aparecem automaticamente)
  useEffect(() => {
    const interval = setInterval(loadSessions, 8000);
    return () => clearInterval(interval);
  }, []);

  // Polling de mensagens da sessão ativa
  useEffect(() => {
    if (!activeSession || activeSession.status === "CLOSED") return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/chat/session/${activeSession.id}/messages`);
        setMessages(res.data);
      } catch {
        /**/
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeSession?.id, activeSession?.status]);

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

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Lista de sessões */}
      <div className="w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Chats</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou assunto..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        {sessions.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10 px-4">
            Nenhuma sessão ainda
          </p>
        )}
        {open.length > 0 && (
          <div className="p-2">
            <p className="text-xs text-gray-400 font-medium px-2 pb-1">
              ABERTOS
            </p>
            {open.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1 transition ${activeSession?.id === s.id ? "bg-green-50" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {s.user.name}
                  </p>
                  {!seenSessions.has(s.id) && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-green-500" />
                  )}
                </div>
                {s.messages[0]?.content && (
                  <p className="text-xs text-gray-700 truncate font-medium">
                    {s.messages[0].content}
                  </p>
                )}
                <p className="text-xs text-gray-400 truncate">{s.user.email}</p>
              </button>
            ))}
          </div>
        )}
        {closed.length > 0 && (
          <div className="p-2">
            <p className="text-xs text-gray-400 font-medium px-2 pb-1 mt-2">
              ENCERRADOS
            </p>
            {closed.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1 opacity-60 transition ${activeSession?.id === s.id ? "bg-gray-100" : "hover:bg-gray-50"}`}
              >
                <p className="font-medium text-sm text-gray-900 truncate">
                  {s.user.name}
                </p>
                {s.messages[0]?.content && (
                  <p className="text-xs text-gray-700 truncate font-medium">
                    {s.messages[0].content}
                  </p>
                )}
                <p className="text-xs text-gray-400 truncate">{s.user.email}</p>
                {s.rating && (
                  <div className="flex gap-0.5 mt-1">
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
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversa */}
      {!activeSession ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 shadow-sm">
          Selecione uma conversa
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {activeSession.user.name}
              </p>
              <p className="text-xs text-gray-400">
                {activeSession.user.email}
              </p>
            </div>
            {activeSession.status === "OPEN" && (
              <button
                onClick={closeSession}
                className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                Encerrar chat
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg) => {
              const isAdmin = msg.senderRole === "ADMIN";
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}
                >
                  {isAdmin && (
                    <div className="relative w-7 h-7 shrink-0 mb-1 order-last">
                      <Image
                        src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
                        alt="Elane"
                        fill
                        className="rounded-full object-cover object-top"
                        sizes="28px"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                      isAdmin
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.content && (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {msg.fileUrl && (
                      <MessageAttachment
                        fileUrl={msg.fileUrl}
                        fileType={msg.fileType}
                        isAdmin={isAdmin}
                      />
                    )}
                    <p
                      className={`text-xs mt-1 ${isAdmin ? "text-green-100" : "text-gray-400"}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input / Feedback */}
          <div className="px-4 py-3 border-t border-gray-100">
            {activeSession.status === "CLOSED" ? (
              <div className="flex flex-col items-center gap-1 py-2">
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
                  <p className="text-sm text-gray-400 py-1">
                    Conversa encerrada · sem avaliação
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Preview de arquivo */}
                {file && (
                  <div className="mb-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="preview"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                    )}
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {file.name}
                    </span>
                    <button
                      onClick={clearFile}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-green-600 transition p-2 rounded-xl hover:bg-green-50 shrink-0"
                    title="Anexar arquivo"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Responder..."
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                  <button
                    onClick={send}
                    disabled={sending || (!text.trim() && !file)}
                    className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "Enviando" : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
