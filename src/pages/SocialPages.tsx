import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Ban,
  Bell,
  Check,
  Flag,
  MessageSquare,
  Search,
  Send,
  Smile,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MAP_LIST } from '../../shared/maps.ts';
import type { AuthUser, MapId, RoomSummary } from '../../shared/types.ts';
import { CharacterPreview3D } from '../components/CharacterPreview3D.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { db } from '../lib/firebase.ts';

interface SearchUserItem {
  uid: string;
  username: string;
  displayName: string;
  level: number;
  wins: number;
  equippedSkin: string;
}

interface FriendReqDoc {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface FriendshipDoc {
  id: string;
  userA: string;
  userB: string;
}

interface MessageDoc {
  id: string;
  channelId: string;
  senderUid: string;
  senderName: string;
  recipientUid?: string;
  text: string;
  createdAt?: { seconds: number };
}

interface NotificationDoc {
  id: string;
  userId: string;
  type: 'friend_request' | 'room_invite' | 'reward' | 'system';
  title: string;
  body: string;
  read: boolean;
}

const EMOJIS = ['👋', '🔥', '🎮', '😂', '🛡️', '👑', '⚡'];

export function FriendsPage({
  user,
  currentRoom,
}: {
  user: AuthUser;
  currentRoom: RoomSummary | null;
}) {
  const { firebaseUser } = useAuth();
  const canUseFirestore = Boolean(firebaseUser?.emailVerified);

  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<FriendReqDoc[]>([]);
  const [friendships, setFriendships] = useState<FriendshipDoc[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<Map<string, SearchUserItem>>(new Map());
  const [notice, setNotice] = useState<string | null>(null);

  // Load directory from backend search endpoint so usernames/displayNames resolve reliably
  useEffect(() => {
    const loadDir = async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.users || []) as SearchUserItem[];
        setResults(list.filter((u) => u.uid !== user.uid));
        setAllProfiles((prev) => {
          const next = new Map(prev);
          list.forEach((u) => next.set(u.uid, u));
          return next;
        });
      }
    };
    void loadDir();
  }, [searchTerm, user.uid]);

  // Firestore real-time listeners (for verified Google accounts)
  useEffect(() => {
    if (!canUseFirestore) return;
    const unsubReqs = onSnapshot(
      query(collection(db, 'friend_requests'), where('toUid', '==', user.uid)),
      (snap) => {
        setIncomingReqs(
          snap.docs
            .map((d) => d.data() as FriendReqDoc)
            .filter((r) => r.status === 'pending')
        );
      }
    );
    const unsubA = onSnapshot(
      query(collection(db, 'friendships'), where('userA', '==', user.uid)),
      (snap) => {
        const listA = snap.docs.map((d) => d.data() as FriendshipDoc);
        setFriendships((prev) => [...prev.filter((f) => f.userA !== user.uid), ...listA]);
      }
    );
    const unsubB = onSnapshot(
      query(collection(db, 'friendships'), where('userB', '==', user.uid)),
      (snap) => {
        const listB = snap.docs.map((d) => d.data() as FriendshipDoc);
        setFriendships((prev) => [...prev.filter((f) => f.userB !== user.uid), ...listB]);
      }
    );
    const unsubBlocks = onSnapshot(
      query(collection(db, 'blocked_users'), where('blockerUid', '==', user.uid)),
      (snap) => {
        setBlockedIds(snap.docs.map((d) => String(d.data().blockedUid)));
      }
    );

    return () => {
      unsubReqs();
      unsubA();
      unsubB();
      unsubBlocks();
    };
  }, [canUseFirestore, user.uid]);

  const friendUids = useMemo(() => {
    const s = new Set<string>();
    friendships.forEach((f) => {
      s.add(f.userA === user.uid ? f.userB : f.userA);
    });
    return Array.from(s);
  }, [friendships, user.uid]);

  const sendFriendRequest = async (target: SearchUserItem) => {
    setNotice(null);
    if (!canUseFirestore) {
      setNotice(`Friend request queued for ${target.displayName} (Sign in with Google for cross-device Firestore sync).`);
      return;
    }
    const reqId = `fr_${user.uid}_${target.uid}`.slice(0, 120);
    await setDoc(doc(db, 'friend_requests', reqId), {
      id: reqId,
      fromUid: user.uid,
      toUid: target.uid,
      fromName: user.displayName,
      toName: target.displayName,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNotice(`Friend request sent to ${target.displayName}.`);
  };

  const respondRequest = async (req: FriendReqDoc, accept: boolean) => {
    if (!canUseFirestore) return;
    await updateDoc(doc(db, 'friend_requests', req.id), {
      status: accept ? 'accepted' : 'rejected',
      updatedAt: serverTimestamp(),
    });
    if (accept) {
      const fId = [req.fromUid, req.toUid].sort().join('_').slice(0, 120);
      await setDoc(doc(db, 'friendships', fId), {
        id: fId,
        userA: req.fromUid,
        userB: req.toUid,
        createdAt: serverTimestamp(),
      });
    }
  };

  const blockUser = async (targetUid: string, displayName: string) => {
    if (!canUseFirestore) {
      setBlockedIds((prev) => Array.from(new Set([...prev, targetUid])));
      setNotice(`Blocked ${displayName} for this session.`);
      return;
    }
    const bId = `blk_${user.uid}_${targetUid}`.slice(0, 120);
    await setDoc(doc(db, 'blocked_users', bId), {
      id: bId,
      blockerUid: user.uid,
      blockedUid: targetUid,
      createdAt: serverTimestamp(),
    });
    setNotice(`Blocked ${displayName}.`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Friends Hub</h1>
        <p className="text-sm text-slate-400 mt-1">
          Find Hideverse contenders, manage friend requests, and invite squadmates to your 3D room.
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200">
          {notice}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Search Players */}
        <div className="lg:col-span-7 bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search players by username or display name..."
              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-2.5">
            {results
              .filter((r) => !blockedIds.includes(r.uid))
              .map((p) => {
                const isFriend = friendUids.includes(p.uid);
                return (
                  <div
                    key={p.uid}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-white/10"
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">{p.displayName}</div>
                      <div className="text-xs text-slate-400">
                        @{p.username} · Level {p.level} · {p.wins} Wins
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentRoom && (
                        <button
                          onClick={() => {
                            void navigator.clipboard.writeText(`${window.location.origin}/?room=${currentRoom.id}`);
                            setNotice(`Copied invite link for ${p.displayName}: ${currentRoom.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300"
                        >
                          Invite
                        </button>
                      )}
                      {!isFriend && (
                        <button
                          onClick={() => void sendFriendRequest(p)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      )}
                      <button
                        onClick={() => void blockUser(p.uid, p.displayName)}
                        title="Block user"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Requests & Active Friends */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-white">
              Incoming Requests ({incomingReqs.length})
            </h2>
            {incomingReqs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-white/10"
              >
                <span className="text-xs font-semibold text-white">{r.fromName}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void respondRequest(r, true)}
                    className="p-1.5 rounded bg-emerald-500 text-slate-950"
                    title="Accept"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void respondRequest(r, false)}
                    className="p-1.5 rounded bg-slate-800 text-slate-300"
                    title="Decline"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {incomingReqs.length === 0 && (
              <div className="text-xs text-slate-500">No pending friend requests.</div>
            )}
          </div>

          <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Friends ({friendUids.length})
            </h2>
            {friendUids.map((fid) => {
              const info = allProfiles.get(fid);
              return (
                <div
                  key={fid}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 border border-white/10 text-xs"
                >
                  <span className="font-semibold text-white">{info?.displayName || fid}</span>
                  <span className="text-emerald-400">Online</span>
                </div>
              );
            })}
            {friendUids.length === 0 && (
              <div className="text-xs text-slate-500">
                Add contenders from the player directory to build your squad.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessagesPage({ user }: { user: AuthUser }) {
  const { firebaseUser } = useAuth();
  const canUseFirestore = Boolean(firebaseUser?.emailVerified);

  const [channelId, setChannelId] = useState('global_lobby');
  const [messages, setMessages] = useState<MessageDoc[]>([
    {
      id: 'welcome_1',
      channelId: 'global_lobby',
      senderUid: 'admin_root',
      senderName: 'Hideverse Admin',
      text: 'Welcome to Global Lounge! Squad up or drop a room code here.',
    },
  ]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!canUseFirestore) return;
    const q = query(collection(db, 'messages'), where('recipientUid', '==', ''));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map((d) => d.data() as MessageDoc)
        .filter((m) => m.channelId === channelId)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      if (docs.length > 0) setMessages(docs);
    });
    return () => unsub();
  }, [canUseFirestore, channelId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const clean = text.trim().slice(0, 500);
    setText('');
    setShowEmoji(false);

    if (canUseFirestore) {
      const msgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'messages', msgId), {
        id: msgId,
        channelId,
        senderUid: user.uid,
        senderName: user.displayName,
        recipientUid: '',
        text: clean,
        createdAt: serverTimestamp(),
      });
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `local_${Date.now()}`,
          channelId,
          senderUid: user.uid,
          senderName: user.displayName,
          text: clean,
        },
      ]);
    }
  };

  const reportMessageSender = async (m: MessageDoc) => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        targetUid: m.senderUid,
        targetName: m.senderName,
        reason: 'Chat Abuse',
        details: `Reported message in ${channelId}: "${m.text}"`,
      }),
    });
    if (res.ok) {
      setReportNotice(`Reported ${m.senderName} to moderation.`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Community &amp; Squad Chat
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Switch between Global Lounge and Arena Strategy channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['global_lobby', 'looking_for_group', 'strategy_tips'].map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelId(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                channelId === ch
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#111827] border border-white/10 text-slate-300'
              }`}
            >
              #{ch.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {reportNotice && (
        <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200">
          {reportNotice}
        </div>
      )}

      <div className="bg-[#111827] border border-white/10 rounded-2xl p-5 flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {messages.map((m) => (
            <div key={m.id} className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-cyan-300">{m.senderName}</div>
                <div className="text-sm text-slate-200 mt-1">{m.text}</div>
              </div>
              {m.senderUid !== user.uid && (
                <button
                  onClick={() => void reportMessageSender(m)}
                  title="Report user"
                  className="p-1.5 rounded hover:bg-rose-500/15 text-slate-500 hover:text-rose-400"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {showEmoji && (
          <div className="flex gap-2 py-2 border-t border-white/10">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setText((t) => `${t}${em}`)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={sendMessage} className="mt-3 pt-3 border-t border-white/10 flex gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <Smile className="w-4 h-4" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Send message to #${channelId}...`}
            className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export function NotificationsPage({ user }: { user: AuthUser }) {
  const { firebaseUser } = useAuth();
  const canUseFirestore = Boolean(firebaseUser?.emailVerified);
  const [items, setItems] = useState<NotificationDoc[]>([
    {
      id: 'welcome_notif',
      userId: user.uid,
      type: 'system',
      title: 'Welcome to HIDEVERSE',
      body: 'Complete daily missions in Rewards to unlock new 3D character skins and accessories.',
      read: false,
    },
  ]);

  useEffect(() => {
    if (!canUseFirestore) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setItems(snap.docs.map((d) => d.data() as NotificationDoc));
      }
    });
    return () => unsub();
  }, [canUseFirestore, user.uid]);

  const markRead = async (n: NotificationDoc) => {
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
    if (canUseFirestore && n.id !== 'welcome_notif') {
      await updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {});
    }
  };

  const clearNotif = async (n: NotificationDoc) => {
    setItems((prev) => prev.filter((it) => it.id !== n.id));
    if (canUseFirestore && n.id !== 'welcome_notif') {
      await deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
        <Bell className="w-5 h-5 text-cyan-400" />
        Notifications
      </h1>

      <div className="space-y-3">
        {items.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              n.read ? 'bg-[#111827]/60 border-white/5' : 'bg-[#111827] border-cyan-500/30'
            }`}
          >
            <div>
              <div className="text-xs text-cyan-400 uppercase font-semibold">{n.type.replace('_', ' ')}</div>
              <div className="font-display text-base font-bold text-white mt-0.5">{n.title}</div>
              <p className="text-xs text-slate-300 mt-1">{n.body}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!n.read && (
                <button
                  onClick={() => void markRead(n)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300"
                >
                  Mark Read
                </button>
              )}
              <button
                onClick={() => void clearNotif(n)}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="bg-[#111827] border border-white/10 rounded-xl p-8 text-center text-sm text-slate-400">
            All caught up! No unread notifications.
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfilePage({ user }: { user: AuthUser }) {
  const { updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [favoriteMap, setFavoriteMap] = useState<MapId>(user.favoriteMap);
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const winRate = user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSavedMsg(null);
    try {
      await updateProfile({ displayName, bio, favoriteMap, photoUrl });
      setSavedMsg('Profile saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-[#111827] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-xl object-cover border border-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-display text-xl font-bold text-cyan-300">
              {user.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-bold text-white">{user.displayName}</h1>
            <div className="text-xs text-slate-400">
              @{user.username} · Level {user.level} · {user.role.toUpperCase()}
            </div>
          </div>
        </div>

        <CharacterPreview3D
          skinId={user.equippedSkin}
          accessoryId={user.equippedAccessory}
          role="hider"
          className="w-full h-64"
        />

        <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-white/10">
          <div>
            <div className="text-xs text-slate-400">Matches</div>
            <div className="font-mono-num text-lg font-bold text-white">{user.matchesPlayed}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Wins</div>
            <div className="font-mono-num text-lg font-bold text-emerald-400">{user.wins}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Win Rate</div>
            <div className="font-mono-num text-lg font-bold text-cyan-400">{winRate}%</div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 bg-[#111827] border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-xl font-bold text-white mb-4">Edit Player Profile</h2>
        {savedMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
            {savedMsg}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Favorite Arena</label>
            <select
              value={favoriteMap}
              onChange={(e) => setFavoriteMap(e.target.value as MapId)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {MAP_LIST.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Avatar Image URL</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
          >
            {busy ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
