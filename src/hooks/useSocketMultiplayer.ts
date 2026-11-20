import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ChatMessage,
  MapId,
  MatchResultSummary,
  MatchStateSnapshot,
  PlayerAnimState,
  PlayerRole,
  RoomMemberInfo,
  RoomSettings,
  RoomSummary,
  Vec3,
} from '../../shared/types.ts';
import { gameAudio } from '../game-engine/audio.ts';

export interface VoicePeerState {
  playerId: string;
  displayName: string;
  muted: boolean;
  deafened: boolean;
  role: PlayerRole;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useSocketMultiplayer(currentUser: {
  uid: string;
  username: string;
  displayName: string;
  equippedSkin: string;
  equippedAccessory: string;
} | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomSummary | null>(null);
  const [members, setMembers] = useState<RoomMemberInfo[]>([]);
  const [matchState, setMatchState] = useState<MatchStateSnapshot | null>(null);
  const [lastMatchResult, setLastMatchResult] = useState<MatchResultSummary | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastTagEffect, setLastTagEffect] = useState<{ x: number; y: number; z: number; ts: number } | null>(null);
  const [kickedNotice, setKickedNotice] = useState(false);

  // WebRTC Voice Chat state
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceDeafened, setVoiceDeafened] = useState(false);
  const [voicePeers, setVoicePeers] = useState<VoicePeerState[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const voiceDeafenedRef = useRef(false);

  useEffect(() => {
    voiceDeafenedRef.current = voiceDeafened;
    for (const audio of audioElsRef.current.values()) {
      audio.muted = voiceDeafened;
    }
  }, [voiceDeafened]);

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('rooms:list', (list: RoomSummary[]) => setRoomsList(list));

    socket.on(
      'room:state',
      (payload: {
        room: RoomSummary;
        members: RoomMemberInfo[];
        chat: ChatMessage[];
        voicePeers: VoicePeerState[];
      }) => {
        setCurrentRoom(payload.room);
        setMembers(payload.members);
        setChatMessages(payload.chat);
        setVoicePeers(payload.voicePeers);
      }
    );

    socket.on('match:state', (snap: MatchStateSnapshot) => {
      setMatchState(snap);
    });

    socket.on('match:seekers_released', () => {
      gameAudio.playSeekerRelease();
    });

    socket.on('match:tag_effect', (pos: { x: number; y: number; z: number }) => {
      gameAudio.playTag();
      setLastTagEffect({ ...pos, ts: Date.now() });
    });

    socket.on('match:ended', (summary: MatchResultSummary) => {
      setLastMatchResult(summary);
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev.slice(-60), msg]);
    });

    socket.on('chat:typing', (info: { displayName: string; isTyping: boolean }) => {
      setTypingUsers((prev) =>
        info.isTyping
          ? Array.from(new Set([...prev, info.displayName]))
          : prev.filter((n) => n !== info.displayName)
      );
    });

    socket.on('room:kicked', () => {
      setKickedNotice(true);
      setCurrentRoom(null);
      setMatchState(null);
    });

    // WebRTC signaling handlers
    const ensurePeer = (remoteId: string): RTCPeerConnection => {
      let pc = peerConnsRef.current.get(remoteId);
      if (pc) return pc;
      pc = new RTCPeerConnection(RTC_CONFIG);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => pc!.addTrack(t, localStreamRef.current!));
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc:ice', { targetPlayerId: remoteId, data: e.candidate });
        }
      };
      pc.ontrack = (e) => {
        let audio = audioElsRef.current.get(remoteId);
        if (!audio) {
          audio = document.createElement('audio');
          audio.autoplay = true;
          audio.muted = voiceDeafenedRef.current;
          audioElsRef.current.set(remoteId, audio);
        }
        audio.srcObject = e.streams[0];
      };
      peerConnsRef.current.set(remoteId, pc);
      return pc;
    };

    socket.on('webrtc:offer', async ({ fromPlayerId, data }: { fromPlayerId: string; data: RTCSessionDescriptionInit }) => {
      const pc = ensurePeer(fromPlayerId);
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { targetPlayerId: fromPlayerId, data: answer });
    });

    socket.on('webrtc:answer', async ({ fromPlayerId, data }: { fromPlayerId: string; data: RTCSessionDescriptionInit }) => {
      const pc = peerConnsRef.current.get(fromPlayerId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data));
    });

    socket.on('webrtc:ice', async ({ fromPlayerId, data }: { fromPlayerId: string; data: RTCIceCandidateInit }) => {
      const pc = peerConnsRef.current.get(fromPlayerId);
      if (pc && data) await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
    });

    return () => {
      socket.disconnect();
      for (const pc of peerConnsRef.current.values()) pc.close();
      peerConnsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const createRoom = useCallback(
    (settings: Partial<RoomSettings>, password?: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !currentUser) return reject(new Error('Sign in required'));
        socketRef.current.emit(
          'room:create',
          {
            user: {
              id: currentUser.uid,
              username: currentUser.username,
              displayName: currentUser.displayName,
              skin: currentUser.equippedSkin,
              accessory: currentUser.equippedAccessory,
            },
            settings,
            password,
          },
          (res: { ok: boolean; roomId?: string; error?: string }) => {
            if (res?.ok && res.roomId) resolve(res.roomId);
            else reject(new Error(res?.error || 'Failed to create room'));
          }
        );
      });
    },
    [currentUser]
  );

  const quickMatch = useCallback(
    (mapId?: MapId): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !currentUser) return reject(new Error('Sign in required'));
        socketRef.current.emit(
          'room:quick_match',
          {
            user: {
              id: currentUser.uid,
              username: currentUser.username,
              displayName: currentUser.displayName,
              skin: currentUser.equippedSkin,
              accessory: currentUser.equippedAccessory,
            },
            mapId,
          },
          (res: { ok: boolean; roomId?: string; error?: string }) => {
            if (res?.ok && res.roomId) resolve(res.roomId);
            else reject(new Error(res?.error || 'Quick match failed'));
          }
        );
      });
    },
    [currentUser]
  );

  const joinRoom = useCallback(
    (roomId: string, password?: string): Promise<RoomSummary> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current || !currentUser) return reject(new Error('Sign in required'));
        setKickedNotice(false);
        setLastMatchResult(null);
        socketRef.current.emit(
          'room:join',
          {
            roomId,
            password,
            user: {
              id: currentUser.uid,
              username: currentUser.username,
              displayName: currentUser.displayName,
              skin: currentUser.equippedSkin,
              accessory: currentUser.equippedAccessory,
            },
          },
          (res: { ok: boolean; room?: RoomSummary; match?: MatchStateSnapshot; error?: string }) => {
            if (res?.ok && res.room) {
              setCurrentRoom(res.room);
              if (res.match) setMatchState(res.match);
              resolve(res.room);
            } else {
              reject(new Error(res?.error || 'Unable to join room'));
            }
          }
        );
      });
    },
    [currentUser]
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setCurrentRoom(null);
    setMembers([]);
    setMatchState(null);
    setChatMessages([]);
    if (voiceConnected) {
      socketRef.current?.emit('voice:leave');
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setVoiceConnected(false);
    }
  }, [voiceConnected]);

  const setReady = useCallback((ready: boolean) => {
    socketRef.current?.emit('room:ready', ready);
  }, []);

  const updateRoomSettings = useCallback((settings: Partial<RoomSettings>) => {
    socketRef.current?.emit('room:update_settings', settings);
  }, []);

  const kickPlayer = useCallback((targetId: string) => {
    socketRef.current?.emit('room:kick', targetId);
  }, []);

  const startMatch = useCallback(() => {
    setLastMatchResult(null);
    socketRef.current?.emit('match:start');
  }, []);

  const resetLobby = useCallback(() => {
    setLastMatchResult(null);
    socketRef.current?.emit('match:reset_lobby');
  }, []);

  const sendMove = useCallback((pos: Vec3, yaw: number, anim: PlayerAnimState) => {
    socketRef.current?.emit('player:move', { pos, yaw, anim });
  }, []);

  const sendTagAttempt = useCallback((targetId?: string) => {
    socketRef.current?.emit('player:tag_attempt', targetId);
  }, []);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit('chat:send', text);
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit('chat:typing', isTyping);
  }, []);

  const toggleVoiceJoin = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket || !currentUser) return;
    if (voiceConnected) {
      socket.emit('voice:leave');
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      for (const pc of peerConnsRef.current.values()) pc.close();
      peerConnsRef.current.clear();
      setVoiceConnected(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setVoiceConnected(true);
    socket.emit('voice:join', { muted: voiceMuted, deafened: voiceDeafened });

    // Initiate WebRTC offers to existing voice peers
    for (const peer of voicePeers) {
      if (peer.playerId === currentUser.uid) continue;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('webrtc:ice', { targetPlayerId: peer.playerId, data: e.candidate });
      };
      pc.ontrack = (e) => {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        audio.muted = voiceDeafenedRef.current;
        audio.srcObject = e.streams[0];
        audioElsRef.current.set(peer.playerId, audio);
      };
      peerConnsRef.current.set(peer.playerId, pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { targetPlayerId: peer.playerId, data: offer });
    }
  }, [currentUser, voiceConnected, voiceDeafened, voiceMuted, voicePeers]);

  const toggleVoiceMute = useCallback(() => {
    const next = !voiceMuted;
    setVoiceMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    socketRef.current?.emit('voice:mute', { muted: next, deafened: voiceDeafened });
  }, [voiceDeafened, voiceMuted]);

  const toggleVoiceDeafen = useCallback(() => {
    const next = !voiceDeafened;
    setVoiceDeafened(next);
    socketRef.current?.emit('voice:mute', { muted: voiceMuted, deafened: next });
  }, [voiceDeafened, voiceMuted]);

  return {
    connected,
    roomsList,
    currentRoom,
    members,
    matchState,
    lastMatchResult,
    chatMessages,
    typingUsers,
    lastTagEffect,
    kickedNotice,
    voiceConnected,
    voiceMuted,
    voiceDeafened,
    voicePeers,
    createRoom,
    quickMatch,
    joinRoom,
    leaveRoom,
    setReady,
    updateRoomSettings,
    kickPlayer,
    startMatch,
    resetLobby,
    sendMove,
    sendTagAttempt,
    sendChat,
    sendTyping,
    toggleVoiceJoin,
    toggleVoiceMute,
    toggleVoiceDeafen,
  };
}
