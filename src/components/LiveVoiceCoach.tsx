import { Mic, MicOff, Radio, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function floatTo16BitBase64(float32: Float32Array): string {
  const buf = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

export function LiveVoiceCoach({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ who: 'you' | 'coach'; text: string }>>([]);
  const [textPrompt, setTextPrompt] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);

  const stopSession = () => {
    wsRef.current?.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void inputCtxRef.current?.close();
    void outputCtxRef.current?.close();
    inputCtxRef.current = null;
    outputCtxRef.current = null;
    setStatus('idle');
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  const startSession = async () => {
    setErrorMsg(null);
    setStatus('connecting');
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/live`);
      wsRef.current = ws;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const b64 = floatTo16BitBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: b64 }));
        };
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.status === 'connected') {
          setStatus('live');
        } else if (msg.error) {
          setErrorMsg(msg.error);
          setStatus('error');
        } else if (msg.audio && outputCtxRef.current) {
          const samples = base64ToFloat32(msg.audio);
          const buffer = outputCtxRef.current.createBuffer(1, samples.length, 24000);
          buffer.getChannelData(0).set(samples);
          const src = outputCtxRef.current.createBufferSource();
          src.buffer = buffer;
          src.connect(outputCtxRef.current.destination);
          const startAt = Math.max(outputCtxRef.current.currentTime, nextStartTimeRef.current);
          src.start(startAt);
          nextStartTimeRef.current = startAt + buffer.duration;
        } else if (msg.interrupted && outputCtxRef.current) {
          nextStartTimeRef.current = outputCtxRef.current.currentTime;
        } else if (msg.inputTranscript) {
          setTranscripts((prev) => [...prev.slice(-10), { who: 'you', text: msg.inputTranscript }]);
        } else if (msg.outputTranscript) {
          setTranscripts((prev) => [...prev.slice(-10), { who: 'coach', text: msg.outputTranscript }]);
        }
      };

      ws.onerror = () => {
        setErrorMsg('Live voice connection closed or failed.');
        setStatus('error');
      };
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Microphone permission required');
      setStatus('error');
    }
  };

  const sendQuickQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textPrompt.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text: textPrompt.trim() }));
    setTranscripts((prev) => [...prev.slice(-10), { who: 'you', text: textPrompt.trim() }]);
    setTextPrompt('');
  };

  return (
    <div className="w-80 bg-[#0F172A]/95 border border-white/15 rounded-xl shadow-2xl p-4 text-slate-100 pointer-events-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="font-display text-sm font-bold tracking-wide">Tactical Voice Coach</span>
        </div>
        <button
          onClick={() => {
            stopSession();
            onClose();
          }}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
          aria-label="Close voice coach"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        Speak in real time to get map hiding strategies and seeker routes via Gemini Live.
      </p>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        {status !== 'live' ? (
          <button
            onClick={startSession}
            disabled={status === 'connecting'}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            <Mic className="w-4 h-4" />
            {status === 'connecting' ? 'Connecting...' : 'Start Voice Session'}
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold text-xs transition-colors"
          >
            <MicOff className="w-4 h-4" />
            End Voice Session
          </button>
        )}
      </div>

      {status === 'live' && (
        <form onSubmit={sendQuickQuestion} className="flex gap-2 mb-3">
          <input
            value={textPrompt}
            onChange={(e) => setTextPrompt(e.target.value)}
            placeholder="Ask a map question..."
            className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300"
          >
            Send
          </button>
        </form>
      )}

      {transcripts.length > 0 && (
        <div className="max-h-36 overflow-y-auto space-y-1.5 border-t border-white/10 pt-2">
          {transcripts.map((t, idx) => (
            <div key={idx} className="text-xs leading-relaxed">
              <span className={t.who === 'you' ? 'text-amber-300 font-semibold' : 'text-cyan-300 font-semibold'}>
                {t.who === 'you' ? 'You: ' : 'Coach: '}
              </span>
              <span className="text-slate-200">{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
