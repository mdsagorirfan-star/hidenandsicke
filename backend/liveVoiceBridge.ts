import { GoogleGenAI, type LiveServerMessage, Modality } from '@google/genai';
import type { Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';

export function setupLiveVoiceBridge(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  wss.on('connection', async (clientWs) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          error: 'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.',
        })
      );
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            'You are the HIDEVERSE Tactical Voice Coach. Give crisp, energetic, concise 1-2 sentence tips for 3D Hide & Seek across the 5 maps (Modern House, Academy Campus, Neon District, Mystic Jungle, Starlight Park), covering hiding spots, seeker routes, and Infection mode tactics.',
        },
        callbacks: {
          onopen: () => {
            clientWs.send(JSON.stringify({ status: 'connected' }));
          },
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(JSON.stringify({ inputTranscript: content.inputTranscription.text }));
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(JSON.stringify({ outputTranscript: content.outputTranscription.text }));
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: unknown) => {
            clientWs.send(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Gemini Live API stream error',
              })
            );
          },
        },
      });
    } catch (error) {
      clientWs.send(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unable to connect to Gemini Live API',
        })
      );
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session) return;
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (parsed.text) {
          session.sendRealtimeInput({ text: String(parsed.text) });
        }
      } catch {
        // Ignore malformed packets
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // Ignore cleanup errors
      }
      session = null;
    });
  });
}
