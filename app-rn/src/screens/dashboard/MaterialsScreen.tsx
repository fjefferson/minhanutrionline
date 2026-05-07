import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import YoutubePlayer from 'react-native-youtube-iframe';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** Extrai o ID de vídeo de qualquer URL do YouTube */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/* ─── Types ─────────────────────────────────────────────── */
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
  type: 'PDF' | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'OTHER';
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

/* ─── Helpers ────────────────────────────────────────────── */
function formatSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

const TYPE_CONFIG: Record<
  Material['type'],
  { label: string; icon: string; color: string; actionLabel: string }
> = {
  VIDEO: {
    label: 'Vídeo',
    icon: 'play-circle',
    color: '#ef4444',
    actionLabel: 'Assistir',
  },
  PDF: {
    label: 'PDF',
    icon: 'document-text',
    color: '#f97316',
    actionLabel: 'Abrir PDF',
  },
  IMAGE: {
    label: 'Imagem',
    icon: 'image',
    color: '#3b82f6',
    actionLabel: 'Ver imagem',
  },
  DOCUMENT: {
    label: 'Documento',
    icon: 'document',
    color: '#8b5cf6',
    actionLabel: 'Abrir',
  },
  OTHER: {
    label: 'Arquivo',
    icon: 'attach',
    color: '#6b7280',
    actionLabel: 'Abrir',
  },
};

/* ─── Screen ─────────────────────────────────────────────── */
export default function MaterialsScreen() {
  const { user } = useAuthStore();

  // list state
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // detail state
  const [detail, setDetail] = useState<Material | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reaction, setReaction] = useState<'LIKE' | 'DISLIKE' | null>(null);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  /* ── Load list ── */
  const loadMaterials = useCallback(
    async (catId?: string | null, q?: string) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (catId) params.categoryId = catId;
        if (q?.trim()) params.search = q.trim();
        const { data } = await api.get('/materials', { params });
        setMaterials(data);
      } catch {
        /* silencioso */
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    api
      .get('/materials/categories')
      .then(r => setCategories(r.data))
      .catch(() => {});
    loadMaterials();
  }, [loadMaterials]);

  /* ── Open detail ── */
  const openDetail = async (m: Material) => {
    setDetail(m);
    setView('detail');
    setComments([]);
    setCommentText('');
    setReaction(null);
    setLikes(0);
    setDislikes(0);
    setDetailLoading(true);
    try {
      const [detailRes, reactionRes, commentsRes] = await Promise.allSettled([
        api.get<Material>(`/materials/${m.id}`),
        api.get<{
          userReaction: 'LIKE' | 'DISLIKE' | null;
          likes: number;
          dislikes: number;
        }>(`/materials/${m.id}/reaction`),
        api.get<Comment[]>(`/materials/${m.id}/comments`),
      ]);
      if (detailRes.status === 'fulfilled') {
        setDetail(detailRes.value.data);
        api.post(`/materials/${m.id}/view`).catch(() => {});
      }
      if (reactionRes.status === 'fulfilled') {
        setReaction(reactionRes.value.data.userReaction);
        setLikes(reactionRes.value.data.likes);
        setDislikes(reactionRes.value.data.dislikes);
      }
      if (commentsRes.status === 'fulfilled')
        setComments(commentsRes.value.data);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Open URL ── */
  const handleOpenUrl = async () => {
    if (!detail) return;
    try {
      await Linking.openURL(detail.url);
      api.post(`/materials/${detail.id}/download`).catch(() => {});
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link.');
    }
  };

  /* ── Reaction ── */
  const handleReaction = async (type: 'LIKE' | 'DISLIKE') => {
    if (!detail || reactionLoading) return;
    setReactionLoading(true);
    const prev = reaction;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    // optimistically update
    if (type === 'LIKE') {
      if (reaction === 'LIKE') {
        setReaction(null);
        setLikes(prevLikes - 1);
      } else {
        setReaction('LIKE');
        setLikes(prevLikes + 1);
        if (reaction === 'DISLIKE') setDislikes(prevDislikes - 1);
      }
    } else {
      if (reaction === 'DISLIKE') {
        setReaction(null);
        setDislikes(prevDislikes - 1);
      } else {
        setReaction('DISLIKE');
        setDislikes(prevDislikes + 1);
        if (reaction === 'LIKE') setLikes(prevLikes - 1);
      }
    }

    try {
      const { data } = await api.post(`/materials/${detail.id}/reaction`, {
        type,
      });
      setReaction(data.userReaction);
      setLikes(data.likes);
      setDislikes(data.dislikes);
    } catch {
      setReaction(prev);
      setLikes(prevLikes);
      setDislikes(prevDislikes);
    } finally {
      setReactionLoading(false);
    }
  };

  /* ── Comment ── */
  const handleComment = async () => {
    if (!detail || !commentText.trim() || commentSending) return;
    setCommentSending(true);
    try {
      const { data } = await api.post(`/materials/${detail.id}/comments`, {
        content: commentText.trim(),
      });
      setComments(prev => [data, ...prev]);
      setCommentText('');
    } catch (err: any) {
      Alert.alert(
        'Erro',
        err?.response?.data?.message ?? 'Não foi possível enviar o comentário.',
      );
    } finally {
      setCommentSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert('Excluir comentário', 'Deseja remover este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/materials/comments/${commentId}`);
            setComments(prev => prev.filter(c => c.id !== commentId));
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o comentário.');
          }
        },
      },
    ]);
  };

  /* ─────────────────────────────────────────
     DETAIL VIEW
  ───────────────────────────────────────── */
  if (view === 'detail' && detail) {
    const cfg = TYPE_CONFIG[detail.type];
    const size = formatSize(detail.fileSize);

    return (
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setView('list')}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={styles.detailHeaderContent}>
            <View
              style={[styles.typeBadge, { backgroundColor: cfg.color + '15' }]}
            >
              <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
              <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
                {cfg.label}
              </Text>
            </View>
            {detail.category && (
              <View
                style={[
                  styles.catBadge,
                  { backgroundColor: detail.category.color + '15' },
                ]}
              >
                <Text
                  style={[
                    styles.catBadgeText,
                    { color: detail.category.color },
                  ]}
                >
                  {detail.category.icon ? `${detail.category.icon} ` : ''}
                  {detail.category.name}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.detailTitle}>{detail.title}</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          {detailLoading ? (
            <ActivityIndicator color="#16a34a" style={{ marginTop: 32 }} />
          ) : (
            <>
              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Ionicons name="eye-outline" size={14} color="#9ca3af" />
                  <Text style={styles.statText}>
                    {detail.views} visualizações
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="download-outline" size={14} color="#9ca3af" />
                  <Text style={styles.statText}>
                    {detail.downloads} acessos
                  </Text>
                </View>
                {size && (
                  <View style={styles.statItem}>
                    <Ionicons
                      name="document-outline"
                      size={14}
                      color="#9ca3af"
                    />
                    <Text style={styles.statText}>{size}</Text>
                  </View>
                )}
              </View>

              {/* YouTube player inline */}
              {detail.type === 'VIDEO' &&
                (() => {
                  const ytId = extractYouTubeId(detail.url);
                  if (ytId) {
                    const playerW = SCREEN_WIDTH - 32;
                    const playerH = Math.round((playerW * 9) / 16);
                    return (
                      <View style={[styles.ytWrapper, { height: playerH }]}>
                        <YoutubePlayer
                          videoId={ytId}
                          height={playerH}
                          width={playerW}
                          play={false}
                        />
                      </View>
                    );
                  }
                  return null;
                })()}

              {/* Description */}
              {detail.description && (
                <Text style={styles.detailDesc}>{detail.description}</Text>
              )}

              {/* CTA button — abre no YouTube apenas se não for vídeo YT (já tocando inline) */}
              {!(detail.type === 'VIDEO' && extractYouTubeId(detail.url)) && (
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={handleOpenUrl}
                  activeOpacity={0.85}
                >
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <Text style={styles.openBtnText}>{cfg.actionLabel}</Text>
                </TouchableOpacity>
              )}

              {/* Reaction */}
              <View style={styles.reactionRow}>
                <View style={styles.reactionBtns}>
                  <TouchableOpacity
                    style={[
                      styles.reactionBtn,
                      reaction === 'LIKE' && styles.reactionBtnLikeActive,
                    ]}
                    onPress={() => handleReaction('LIKE')}
                    disabled={reactionLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        reaction === 'LIKE' ? 'thumbs-up' : 'thumbs-up-outline'
                      }
                      size={18}
                      color={reaction === 'LIKE' ? '#16a34a' : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.reactionBtnText,
                        reaction === 'LIKE' && { color: '#16a34a' },
                      ]}
                    >
                      {likes}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.reactionBtn,
                      reaction === 'DISLIKE' && styles.reactionBtnDislikeActive,
                    ]}
                    onPress={() => handleReaction('DISLIKE')}
                    disabled={reactionLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        reaction === 'DISLIKE'
                          ? 'thumbs-down'
                          : 'thumbs-down-outline'
                      }
                      size={18}
                      color={reaction === 'DISLIKE' ? '#ef4444' : '#6b7280'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments */}
              <View style={styles.commentSection}>
                <Text style={styles.commentSectionTitle}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={14}
                    color="#374151"
                  />{' '}
                  Comentários ({comments.length})
                </Text>

                {/* Input */}
                <View style={styles.commentInputRow}>
                  {user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.commentAvatar}
                    />
                  ) : (
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {getInitials(user?.name ?? '?')}
                      </Text>
                    </View>
                  )}
                  <TextInput
                    style={styles.commentInput}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Deixe um comentário..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.commentSendBtn,
                      (!commentText.trim() || commentSending) &&
                        styles.commentSendBtnDisabled,
                    ]}
                    onPress={handleComment}
                    disabled={!commentText.trim() || commentSending}
                    activeOpacity={0.8}
                  >
                    {commentSending ? (
                      <ActivityIndicator color="#fff" size={14} />
                    ) : (
                      <Ionicons name="send" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* List */}
                {comments.length === 0 ? (
                  <Text style={styles.emptyComments}>
                    Nenhum comentário ainda. Seja o primeiro!
                  </Text>
                ) : (
                  comments.map(c => (
                    <View key={c.id} style={styles.commentCard}>
                      {c.user.avatarUrl ? (
                        <Image
                          source={{ uri: c.user.avatarUrl }}
                          style={styles.commentCardAvatar}
                        />
                      ) : (
                        <View style={styles.commentCardAvatar}>
                          <Text style={styles.commentCardAvatarText}>
                            {getInitials(c.user.name)}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.commentCardHeader}>
                          <Text style={styles.commentCardName}>
                            {c.user.name}
                          </Text>
                          <Text style={styles.commentCardDate}>
                            {formatRelative(c.createdAt)}
                          </Text>
                          {c.user.id === user?.id && (
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(c.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={13}
                                color="#ef4444"
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.commentCardText}>{c.content}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  /* ─────────────────────────────────────────
     LIST VIEW
  ───────────────────────────────────────── */
  const featured = materials.filter(m => m.featured);
  const rest = materials.filter(m => !m.featured);
  const showAll = !!search || !!activeCat;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>Materiais de Apoio</Text>
        <Text style={styles.listHeaderSub}>
          Guias, PDFs e vídeos para sua jornada
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={16}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={q => {
            setSearch(q);
            loadMaterials(activeCat, q);
          }}
          placeholder="Buscar materiais..."
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              loadMaterials(activeCat, '');
            }}
          >
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={showAll ? materials : rest}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Category chips */}
            {categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
              >
                <TouchableOpacity
                  style={[
                    styles.catChip,
                    activeCat === null && styles.catChipActive,
                  ]}
                  onPress={() => {
                    setActiveCat(null);
                    loadMaterials(null, search);
                  }}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      activeCat === null && styles.catChipTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      activeCat === c.id && {
                        backgroundColor: c.color,
                        borderColor: c.color,
                      },
                    ]}
                    onPress={() => {
                      setActiveCat(c.id);
                      loadMaterials(c.id, search);
                    }}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        activeCat === c.id && styles.catChipTextActive,
                      ]}
                    >
                      {c.icon ? `${c.icon} ` : ''}
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Featured */}
            {!showAll && featured.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>⭐ Em destaque</Text>
                {featured.map(m => (
                  <MaterialCard key={m.id} material={m} onPress={openDetail} />
                ))}
                {rest.length > 0 && (
                  <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                    Todos os materiais
                  </Text>
                )}
              </View>
            )}

            {loading && (
              <ActivityIndicator color="#16a34a" style={{ marginTop: 32 }} />
            )}

            {!loading && (showAll ? materials : rest).length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="folder-open-outline"
                  size={48}
                  color="#d1d5db"
                />
                <Text style={styles.emptyStateText}>
                  {search
                    ? 'Nenhum material encontrado para esta busca.'
                    : 'Nenhum material disponível ainda.'}
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) =>
          loading ? null : <MaterialCard material={item} onPress={openDetail} />
        }
      />
    </View>
  );
}

/* ─── MaterialCard ───────────────────────────────────────── */
function MaterialCard({
  material: m,
  onPress,
}: {
  material: Material;
  onPress: (m: Material) => void;
}) {
  const cfg = TYPE_CONFIG[m.type];
  return (
    <TouchableOpacity
      style={[styles.card, m.featured && styles.cardFeatured]}
      onPress={() => onPress(m)}
      activeOpacity={0.85}
    >
      {/* Type icon + category */}
      <View style={styles.cardTop}>
        <View
          style={[styles.cardTypeIcon, { backgroundColor: cfg.color + '18' }]}
        >
          <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {m.title}
          </Text>
          <View style={styles.cardMetaRow}>
            <View
              style={[styles.cardCatDot, { backgroundColor: m.category.color }]}
            />
            <Text style={styles.cardCatText}>{m.category.name}</Text>
            {m.featured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Destaque</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
      </View>

      {/* Description */}
      {m.description && (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {m.description}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardStat}>
          <Ionicons name="eye-outline" size={12} color="#9ca3af" />
          <Text style={styles.cardStatText}>{m.views}</Text>
        </View>
        <View style={styles.cardStat}>
          <Ionicons name="download-outline" size={12} color="#9ca3af" />
          <Text style={styles.cardStatText}>{m.downloads}</Text>
        </View>
        {m.fileSize && (
          <Text style={styles.cardSize}>{formatSize(m.fileSize)}</Text>
        )}
        <View
          style={[styles.cardTypePill, { backgroundColor: cfg.color + '18' }]}
        >
          <Text style={[styles.cardTypePillText, { color: cfg.color }]}>
            {cfg.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  // List header
  listHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
  },
  listHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  listHeaderSub: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 14,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  // Category chips
  catRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  catChip: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  catChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  catChipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  catChipTextActive: { color: '#fff' },

  // Section
  sectionBlock: { paddingHorizontal: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  listContent: { paddingBottom: 110 },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardFeatured: {
    borderWidth: 1.5,
    borderColor: '#fbbf24',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardCatDot: { width: 8, height: 8, borderRadius: 4 },
  cardCatText: { fontSize: 12, color: '#6b7280' },
  featuredBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  featuredBadgeText: { fontSize: 10, color: '#92400e', fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#6b7280', marginTop: 8, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardStatText: { fontSize: 11, color: '#9ca3af' },
  cardSize: { fontSize: 11, color: '#9ca3af' },
  cardTypePill: {
    marginLeft: 'auto',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardTypePillText: { fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // ── Detail ────────────────────────────────────────────────
  detailHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
  },
  backBtn: {
    padding: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  detailHeaderContent: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  catBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  detailTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
    letterSpacing: -0.5,
  },

  detailScroll: { padding: 20, paddingBottom: 110 },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#9ca3af' },

  ytWrapper: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#000',
  },

  detailDesc: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
  },

  openBtn: {
    backgroundColor: '#2563EB', // Royal Blue
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100, // Pílula perfeita
    paddingVertical: 14,
    marginBottom: 24,
    gap: 8,
    elevation: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  openBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Reaction
  reactionRow: {
    marginBottom: 20,
  },
  reactionBtns: { flexDirection: 'row', gap: 10 },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reactionBtnLikeActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  reactionBtnDislikeActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  reactionBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  // Comments
  commentSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  commentSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 14,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  commentInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    maxHeight: 100,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: { backgroundColor: '#d1d5db' },
  emptyComments: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  commentCard: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  commentCardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentCardAvatarText: { fontSize: 11, fontWeight: '800', color: '#6b7280' },
  commentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  commentCardDate: { fontSize: 11, color: '#9ca3af' },
  commentCardText: { fontSize: 13, color: '#374151', lineHeight: 18 },
});
