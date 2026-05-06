import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

/* ─── Types ────────────────────────────────────────────────── */
interface Message {
  id: string;
  content: string;
  fileUrl: string | null;
  fileType: string | null;
  senderRole: 'USER' | 'ADMIN';
  createdAt: string;
  readAt: string | null;
}

interface Session {
  id: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  messages: Message[];
  rating: number | null;
  ratingComment: string | null;
}

/* ─── Helpers ───────────────────────────────────────────────── */
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/* ─── Main Screen ────────────────────────────────────────────── */
export default function ChatScreen() {
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [view, setView] = useState<'list' | 'chat'>('list');
  // Plan guard
  const [planType, setPlanType] = useState<string | null>(null);
  // Rating
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSent, setRatingSent] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadSessions = useCallback(async () => {
    try {
      const [sessionsRes, subRes] = await Promise.all([
        api.get<Session[]>('/chat/sessions'),
        api
          .get<{ plan?: { type: string } } | null>('/subscriptions/me')
          .catch(() => ({ data: null })),
      ]);
      setSessions(sessionsRes.data);
      const type = (subRes as any)?.data?.plan?.type ?? null;
      setPlanType(type);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadSessions]);

  const openSession = useCallback(async (session: Session) => {
    setActiveSession(session);
    setView('chat');
    setRatingSent(false);
    setRatingValue(session.rating ?? 0);
    setRatingComment(session.ratingComment ?? '');

    try {
      const res = await api.get<Message[]>(
        `/chat/session/${session.id}/messages`,
      );
      setMessages(res.data);
    } catch {
      /* silencioso */
    }

    if (session.status === 'OPEN') {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get<Message[]>(
            `/chat/session/${session.id}/messages`,
          );
          setMessages(res.data);
        } catch {
          /* silencioso */
        }
      }, 5000);
    }
  }, []);

  const handleNewSession = async () => {
    try {
      const res = await api.post<Session>('/chat/session');
      const newSession = res.data;
      setSessions(prev => [
        newSession,
        ...prev.map(s => ({ ...s, status: 'CLOSED' as const })),
      ]);
      setMessages([]);
      await openSession(newSession);
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar uma nova conversa.');
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeSession || sending) return;

    setText('');
    setSending(true);

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      content: trimmed,
      fileUrl: null,
      fileType: null,
      senderRole: 'USER',
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const formData = new FormData();
      formData.append('content', trimmed);
      await api.post(`/chat/session/${activeSession.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Recarrega mensagens para pegar o id real
      const res = await api.get<Message[]>(
        `/chat/session/${activeSession.id}/messages`,
      );
      setMessages(res.data);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleRate = async (stars: number) => {
    if (!activeSession || ratingSent || activeSession.rating !== null) return;
    setRatingValue(stars);
    try {
      await api.post(`/chat/session/${activeSession.id}/rating`, {
        rating: stars,
        ratingComment: ratingComment || undefined,
      });
      setRatingSent(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar avaliação.');
    }
  };

  const goBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setView('list');
    setActiveSession(null);
    loadSessions();
  };

  /* ── Group messages by date ── */
  type MessageItem =
    | { type: 'date'; key: string; label: string }
    | { type: 'msg'; key: string; msg: Message };

  const grouped: MessageItem[] = [];
  let lastDate = '';
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toDateString();
    if (d !== lastDate) {
      lastDate = d;
      grouped.push({
        type: 'date',
        key: `date-${d}`,
        label: formatDateHeader(msg.createdAt),
      });
    }
    grouped.push({ type: 'msg', key: msg.id, msg });
  }

  /* ── PLAN GUARD ── */
  const hasChat = planType === 'PLUS' || planType === 'PREMIUM';

  if (!loading && !hasChat) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#16a34a', '#15803d']} style={styles.header}>
          <Text style={styles.headerTitle}>Chat com a Nutri</Text>
          <Text style={styles.headerSub}>Elane Oliveira • CRN-14533</Text>
        </LinearGradient>
        <View style={styles.upgradeBox}>
          <Ionicons name="lock-closed" size={48} color="#d1fae5" />
          <Text style={styles.upgradeTitle}>
            Disponível nos planos Plus e Premium
          </Text>
          <Text style={styles.upgradeSub}>
            {
              'O chat direto com a nutricionista é exclusivo para assinantes Plus e Premium.\nFaça o upgrade do seu plano para desbloquear.'
            }
          </Text>
          <View style={styles.upgradeBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Plus</Text>
            </View>
            <View style={[styles.badge, styles.badgePremium]}>
              <Text style={styles.badgeText}>Premium</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  /* ── SESSION LIST VIEW ── */
  if (view === 'list') {
    const openSessions = sessions.filter(s => s.status === 'OPEN');
    const closedSessions = sessions.filter(s => s.status === 'CLOSED');

    return (
      <View style={styles.root}>
        <LinearGradient colors={['#16a34a', '#15803d']} style={styles.header}>
          <Text style={styles.headerTitle}>Chat com a Nutri</Text>
          <Text style={styles.headerSub}>Elane Oliveira • CRN-14533</Text>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={[...openSessions, ...closedSessions]}
            keyExtractor={s => s.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.newBtn}
                onPress={handleNewSession}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.newBtnText}>Nova conversa</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color="#d1fae5"
                />
                <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
                <Text style={styles.emptySub}>
                  Inicie uma conversa com sua nutricionista.
                </Text>
              </View>
            }
            renderItem={({ item: session }) => {
              const lastMsg = session.messages[session.messages.length - 1];
              return (
                <TouchableOpacity
                  style={styles.sessionCard}
                  onPress={() => openSession(session)}
                  activeOpacity={0.85}
                >
                  <View style={styles.sessionAvatar}>
                    <Ionicons name="person" size={20} color="#16a34a" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionRow}>
                      <Text style={styles.sessionTitle}>
                        {new Date(session.createdAt).toLocaleDateString(
                          'pt-BR',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          },
                        )}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          session.status === 'OPEN'
                            ? styles.statusOpen
                            : styles.statusClosed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            session.status === 'OPEN'
                              ? styles.statusOpenText
                              : styles.statusClosedText,
                          ]}
                        >
                          {session.status === 'OPEN' ? 'Aberta' : 'Encerrada'}
                        </Text>
                      </View>
                    </View>
                    {lastMsg && (
                      <Text style={styles.sessionPreview} numberOfLines={1}>
                        {lastMsg.senderRole === 'ADMIN' ? '👩‍⚕️ ' : ''}
                        {lastMsg.content || (lastMsg.fileUrl ? 'Arquivo' : '')}
                      </Text>
                    )}
                    {session.rating && (
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Ionicons
                            key={s}
                            name={
                              s <= session.rating! ? 'star' : 'star-outline'
                            }
                            size={12}
                            color="#f59e0b"
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    );
  }

  /* ── CHAT VIEW ── */
  const isClosed = activeSession?.status === 'CLOSED';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <LinearGradient colors={['#16a34a', '#15803d']} style={styles.chatHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>Elane Oliveira</Text>
          <Text style={styles.chatHeaderSub}>
            CRN-14533 • {isClosed ? 'Conversa encerrada' : 'Online'}
          </Text>
        </View>
        {!isClosed && <View style={styles.onlineDot} />}
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={grouped}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{item.label}</Text>
              </View>
            );
          }
          const msg = item.msg;
          const isUser = msg.senderRole === 'USER';
          return (
            <View
              style={[
                styles.msgRow,
                isUser ? styles.msgRowUser : styles.msgRowAdmin,
              ]}
            >
              {!isUser && (
                <View style={styles.msgAvatar}>
                  <Ionicons name="person" size={14} color="#16a34a" />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleAdmin,
                ]}
              >
                {msg.content ? (
                  <Text
                    style={[
                      styles.bubbleText,
                      isUser ? styles.bubbleTextUser : styles.bubbleTextAdmin,
                    ]}
                  >
                    {msg.content}
                  </Text>
                ) : null}
                {msg.fileUrl && msg.fileType?.startsWith('image/') ? (
                  <Image
                    source={{ uri: msg.fileUrl }}
                    style={styles.msgImage}
                    resizeMode="cover"
                  />
                ) : msg.fileUrl ? (
                  <View style={styles.fileAttachment}>
                    <Ionicons
                      name="document-outline"
                      size={16}
                      color={isUser ? '#fff' : '#374151'}
                    />
                    <Text
                      style={[
                        styles.fileAttachmentText,
                        isUser && { color: '#fff' },
                      ]}
                    >
                      Arquivo anexado
                    </Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.bubbleTime,
                    isUser ? styles.bubbleTimeUser : styles.bubbleTimeAdmin,
                  ]}
                >
                  {formatTime(msg.createdAt)}
                  {isUser && msg.readAt ? '  ✓✓' : ''}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Rating for closed sessions */}
      {isClosed && !ratingSent && activeSession?.rating === null && (
        <View style={styles.ratingBar}>
          <Text style={styles.ratingBarLabel}>Como foi o atendimento?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => handleRate(s)}>
                <Ionicons
                  name={s <= ratingValue ? 'star' : 'star-outline'}
                  size={28}
                  color="#f59e0b"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {isClosed && ratingSent && (
        <View style={styles.ratingDoneBar}>
          <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          <Text style={styles.ratingDoneText}>Obrigado pela avaliação!</Text>
        </View>
      )}

      {/* Input */}
      {!isClosed && (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Digite uma mensagem..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!text.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  // LIST
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 4 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 40 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // UPGRADE WALL
  upgradeBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  upgradeSub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeBadges: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#16a34a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgePremium: { backgroundColor: '#7c3aed' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptySub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  sessionPreview: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusOpen: { backgroundColor: '#dcfce7' },
  statusClosed: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusOpenText: { color: '#15803d' },
  statusClosedText: { color: '#6b7280' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },

  // CHAT
  chatHeader: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  chatHeaderSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#86efac',
  },

  messagesContent: { padding: 12, paddingBottom: 12 },
  dateHeader: { alignItems: 'center', marginVertical: 10 },
  dateHeaderText: {
    fontSize: 11,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  msgRow: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAdmin: { justifyContent: 'flex-start', gap: 6 },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#16a34a',
    borderBottomRightRadius: 4,
  },
  bubbleAdmin: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAdmin: { color: '#111827' },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  bubbleTimeAdmin: { color: '#9ca3af' },

  msgImage: { width: 180, height: 140, borderRadius: 10, marginTop: 6 },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  fileAttachmentText: { fontSize: 13, color: '#374151' },

  ratingBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  ratingBarLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  ratingDoneBar: {
    backgroundColor: '#dcfce7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  ratingDoneText: { fontSize: 13, color: '#15803d', fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
