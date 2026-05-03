"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Send, Paperclip, X, FileText, Plus, Clock, Star } from "lucide-react";
import Image from "next/image";
import { useState as useLightboxState } from "react";
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
}: {
  fileUrl: string;
  fileType: string | null;
}) {
  const [lightbox, setLightbox] = useLightboxState(false);
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
      className="flex items-center gap-2 mt-2 bg-white/10 hover:bg-white/20 transition px-3 py-2 rounded-lg text-xs"
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="truncate max-w-45">
        {decodeURIComponent(fileUrl.split("/").pop() ?? "documento")}
      </span>
    </a>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function ChatPage() {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="text-gray-400 text-sm">Carregando chat...</div>
      </div>
    );
  }

  // Nenhuma sessão — tela inicial
  if (allSessions.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <Image
            src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
            alt="Elane Oliveira"
            fill
            className="rounded-full object-cover object-top"
            sizes="96px"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Elane Oliveira
        </h1>
        <p className="text-sm text-green-600 font-medium mb-1">
          Nutricionista · CRN-14533
        </p>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Tire suas dúvidas diretamente com a especialista. As mensagens serão
          respondidas em até 24h.
        </p>
        <button
          onClick={startSession}
          disabled={startingNew}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-60"
        >
          {startingNew ? "Iniciando..." : "Iniciar conversa"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Sidebar histórico */}
      <div className="w-60 shrink-0 flex flex-col gap-2">
        {/* Botão nova conversa — só se não há sessão aberta */}
        {openSessions.length === 0 && (
          <button
            onClick={startSession}
            disabled={startingNew}
            className="flex items-center gap-2 justify-center bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {startingNew ? "Iniciando..." : "Nova conversa"}
          </button>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto flex-1">
          {openSessions.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-400 font-medium px-2 py-1">
                ATIVA
              </p>
              {openSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition text-sm ${
                    activeSession?.id === s.id
                      ? "bg-green-50 text-green-700 font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <p className="truncate">Conversa em andamento</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(s.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}

          {closedSessions.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-400 font-medium px-2 py-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> HISTÓRICO
              </p>
              {closedSessions.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition text-sm ${
                    activeSession?.id === s.id
                      ? "bg-gray-100 font-medium text-gray-800"
                      : "hover:bg-gray-50 text-gray-500"
                  }`}
                >
                  <p className="truncate">
                    Conversa {closedSessions.length - i}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(s.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Janela de chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white rounded-t-2xl border border-b-0 border-gray-100 px-6 py-4 flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0">
            <Image
              src="/images/avatar_atendimento_elane_oliveira_nutri.jpg"
              alt="Elane Oliveira"
              fill
              className="rounded-full object-cover object-top"
              sizes="40px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">
              Elane Oliveira · Nutricionista
            </p>
            <p className="text-xs font-medium">
              {isViewingActive ? (
                <span className="text-green-500">
                  ● Online — responde em até 24h
                </span>
              ) : (
                <span className="text-gray-400">
                  ● Sessão encerrada em{" "}
                  {activeSession ? formatDate(activeSession.createdAt) : ""}
                </span>
              )}
            </p>
          </div>
          {/* Botão nova conversa quando visualizando histórico */}
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
        <div className="flex-1 bg-white border-x border-gray-100 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-10">
              Nenhuma mensagem nesta conversa.
            </div>
          )}
          {messages.map((msg) => {
            const isUser = msg.senderRole === "USER";
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="relative w-7 h-7 shrink-0 mb-1">
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
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser
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
                    />
                  )}
                  <p
                    className={`text-xs mt-1 ${isUser ? "text-green-100" : "text-gray-400"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isUser && msg.readAt && " · Lida"}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input / Avaliação */}
        <div className="bg-white rounded-b-2xl border border-t border-gray-100 px-4 py-3">
          {!isViewingActive ? (
            <div className="flex flex-col items-center gap-3 py-2">
              {canRate ? (
                <>
                  <p className="text-sm font-medium text-gray-700">
                    Como foi seu atendimento?
                  </p>
                  {/* Estrelas */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingValue(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        className="transition"
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
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      />
                      <button
                        onClick={submitRating}
                        disabled={ratingSending}
                        className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-60"
                      >
                        {ratingSending ? "Enviando..." : "Enviar avaliação"}
                      </button>
                    </>
                  )}
                  {openSessions.length === 0 && (
                    <button
                      onClick={startSession}
                      className="text-xs text-green-600 hover:underline mt-1"
                    >
                      Iniciar nova conversa
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {activeSession?.rating && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${star <= (activeSession.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-400">
                    {activeSession?.rating
                      ? "Obrigada pelo seu feedback!"
                      : "Esta conversa foi encerrada."}
                    {openSessions.length === 0 && !activeSession?.rating && (
                      <>
                        {" "}
                        <button
                          onClick={startSession}
                          className="text-green-600 font-medium hover:underline"
                        >
                          Iniciar nova conversa
                        </button>
                      </>
                    )}
                  </p>
                </div>
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
                  onKeyDown={handleKey}
                  rows={1}
                  placeholder="Digite sua mensagem... (Enter para enviar)"
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <button
                  onClick={send}
                  disabled={sending || (!text.trim() && !file)}
                  className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50 shrink-0 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Enviando" : "Enviar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
