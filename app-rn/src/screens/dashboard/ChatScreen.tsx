import React, { useCallback, useEffect, useRef, useState } from 'react';
const NUTRI_AVATAR = require('../../assets/images/avatar_atendimento_elane_oliveira_nutri.jpg');
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import PlanLock from '../../components/PlanLock';

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
  const { user, planType } = useAuthStore();
  const plan = planType();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [view, setView] = useState<'list' | 'chat'>('list');
  // File attachment
  type PickedFile = {
    uri: string;
    name: string;
    type: string;
    isImage: boolean;
  };
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);

  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const s = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardShown(true),
    );
    const h = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardShown(false),
    );
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  // Rating
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSent, setRatingSent] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadSessions = useCallback(async () => {
    try {
      const sessionsRes = await api.get<Session[]>('/chat/sessions');
      setSessions(sessionsRes.data);
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
      setPickedFile(null);
      await openSession(newSession);
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar uma nova conversa.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
      });
      const asset: Asset | undefined = result.assets?.[0];
      if (!asset || !asset.uri) return;
      setPickedFile({
        uri: asset.uri,
        name: asset.fileName ?? `imagem_${Date.now()}.jpg`,
        type: asset.type ?? 'image/jpeg',
        isImage: true,
      });
    } catch {
      /* cancelado */
    }
  };

  const pickDocument = async () => {
    try {
      const [result] = await pick({
        type: [types.pdf, types.doc, types.docx, types.plainText, types.images],
        copyTo: 'cachesDirectory',
      });
      if (!result.uri) return;
      const isImage = result.type?.startsWith('image/') ?? false;
      setPickedFile({
        uri: result.localCopyUri ?? result.uri,
        name: result.name ?? `arquivo_${Date.now()}`,
        type: result.type ?? 'application/octet-stream',
        isImage,
      });
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)
        return;
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  const showAttachMenu = () => {
    Alert.alert('Anexar arquivo', 'Escolha o tipo de arquivo', [
      { text: 'Imagem / Vídeo', onPress: pickImage },
      { text: 'Documento (PDF, Word…)', onPress: pickDocument },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pickedFile) || !activeSession || sending) return;

    const fileToSend = pickedFile;
    setText('');
    setPickedFile(null);
    setSending(true);

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      content: trimmed,
      fileUrl: fileToSend ? fileToSend.uri : null,
      fileType: fileToSend ? fileToSend.type : null,
      senderRole: 'USER',
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const formData = new FormData();
      if (trimmed) formData.append('content', trimmed);
      if (fileToSend) {
        formData.append('file', {
          uri: fileToSend.uri,
          name: fileToSend.name,
          type: fileToSend.type,
        } as any);
      }
      await api.post(`/chat/session/${activeSession.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
  const hasChat = plan === 'PLUS' || plan === 'PREMIUM';

  if (!loading && !hasChat) {
    return (
      <PlanLock
        icon="chatbubble-ellipses"
        featureName="Chat com a Nutri"
        description="O chat direto com a nutricionista é exclusivo para assinantes Plus e Premium. Faça o upgrade do seu plano para desbloquear."
        requiredPlan="Plus ou Premium"
      />
    );
  }

  /* ── SESSION LIST VIEW ── */
  if (view === 'list') {
    const openSessions = sessions.filter(s => s.status === 'OPEN');
    const closedSessions = sessions.filter(s => s.status === 'CLOSED');

    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat com a Nutri</Text>
          <Text style={styles.headerSub}>Tire suas dúvidas por aqui</Text>
        </View>

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
                  <Image source={NUTRI_AVATAR} style={styles.sessionAvatar} />
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
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>Elane Oliveira</Text>
          <Text style={styles.chatHeaderSub}>
            CRN-14533 • {isClosed ? 'Conversa encerrada' : 'Online'}
          </Text>
        </View>
        {!isClosed && <View style={styles.onlineDot} />}
      </View>

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
          const userInitial = user?.name?.[0]?.toUpperCase() ?? '?';
          return (
            <View
              style={[
                styles.msgRow,
                isUser ? styles.msgRowUser : styles.msgRowAdmin,
              ]}
            >
              {!isUser && (
                <Image source={NUTRI_AVATAR} style={styles.msgAvatar} />
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
                  <TouchableOpacity
                    style={styles.fileAttachment}
                    onPress={() => Linking.openURL(msg.fileUrl!)}
                    activeOpacity={0.75}
                  >
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
                      numberOfLines={1}
                    >
                      {decodeURIComponent(
                        msg.fileUrl.split('/').pop() ?? 'documento',
                      )}
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={13}
                      color={isUser ? 'rgba(255,255,255,0.7)' : '#9ca3af'}
                    />
                  </TouchableOpacity>
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
              {isUser &&
                (user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.msgAvatar}
                  />
                ) : (
                  <View style={styles.msgAvatarFallback}>
                    <Text style={styles.msgAvatarInitial}>{userInitial}</Text>
                  </View>
                ))}
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
        <View>
          {/* Preview do arquivo selecionado */}
          {pickedFile && (
            <View style={styles.filePreviewBar}>
              {pickedFile.isImage ? (
                <Image
                  source={{ uri: pickedFile.uri }}
                  style={styles.filePreviewImg}
                />
              ) : (
                <View style={styles.filePreviewDoc}>
                  <Ionicons name="document-outline" size={20} color="#16a34a" />
                </View>
              )}
              <Text style={styles.filePreviewName} numberOfLines={1}>
                {pickedFile.name}
              </Text>
              <TouchableOpacity
                onPress={() => setPickedFile(null)}
                style={styles.filePreviewRemove}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachBtn} onPress={showAttachMenu}>
              <Ionicons name="attach" size={22} color="#6b7280" />
            </TouchableOpacity>
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
                ((!text.trim() && !pickedFile) || sending) &&
                  styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={(!text.trim() && !pickedFile) || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          {!keyboardShown && (
            <View style={{ height: 94, backgroundColor: '#fff' }} />
          )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 110 },
  newBtn: {
    backgroundColor: '#2563EB', // Royal Blue
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    borderRadius: 100, // Pílula perfeita
    paddingVertical: 14,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

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
    borderRadius: 20, // Mais suave e redondo moderno
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: { padding: 4 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  chatHeaderSub: { fontSize: 13, color: '#6b7280' },
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
  },
  msgAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgAvatarInitial: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#2563EB', // Royal Blue do chat também
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
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filePreviewImg: { width: 44, height: 44, borderRadius: 8 },
  filePreviewDoc: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewName: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  filePreviewRemove: { padding: 2 },
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});
