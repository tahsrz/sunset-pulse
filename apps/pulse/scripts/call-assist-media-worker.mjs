import http from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import {
  buildRealtimeTranscriptionSession,
  buildTranscriptPostBody,
  buildTranscriptPostUrl,
  realtimeTranscriptEventToFragment,
  resolveSessionIdFromTwilioStart,
  twilioMediaToRealtimeAppend,
} from '../lib/call-assist/mediaStreamWorker.js';

const PORT = Number(process.env.CALL_ASSIST_MEDIA_WORKER_PORT || 8787);
const APP_BASE_URL = process.env.CALL_ASSIST_APP_BASE_URL || 'http://127.0.0.1:3001';
const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2';
const TRANSCRIPTION_MODEL = process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || 'gpt-realtime-whisper';
const OPENAI_REALTIME_URL = process.env.OPENAI_REALTIME_URL || `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`;
const AUDIO_COMMIT_MS = Number(process.env.CALL_ASSIST_AUDIO_COMMIT_MS || 2500);

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'call-assist-media-worker' }));
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server, path: '/call-assist/media' });

wss.on('connection', (twilioSocket, request) => {
  let sessionId = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).searchParams.get('sessionId') || '';
  let openaiSocket = null;
  let openaiReady = false;
  let hasUncommittedAudio = false;
  const pendingAudioEvents = [];
  const commitInterval = setInterval(() => {
    if (!hasUncommittedAudio || !openaiReady || openaiSocket?.readyState !== WebSocket.OPEN) return;
    openaiSocket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    hasUncommittedAudio = false;
  }, AUDIO_COMMIT_MS);

  function log(message, extra = {}) {
    console.log(JSON.stringify({
      at: new Date().toISOString(),
      worker: 'call-assist-media',
      sessionId,
      message,
      ...extra,
    }));
  }

  function connectOpenAI() {
    if (openaiSocket || !process.env.OPENAI_API_KEY) return;

    openaiSocket = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Safety-Identifier': sessionId || 'call-assist',
      },
    });

    openaiSocket.on('open', () => {
      openaiReady = true;
      openaiSocket.send(JSON.stringify(buildRealtimeTranscriptionSession({
        transcriptionModel: TRANSCRIPTION_MODEL,
        language: process.env.OPENAI_REALTIME_TRANSCRIPTION_LANGUAGE || 'en',
        delay: process.env.OPENAI_REALTIME_TRANSCRIPTION_DELAY || 'low',
      })));
      if (pendingAudioEvents.length > 0) hasUncommittedAudio = true;
      pendingAudioEvents.splice(0).forEach((event) => openaiSocket.send(JSON.stringify(event)));
      log('openai_connected');
    });

    openaiSocket.on('message', async (data) => {
      const event = safeJson(data.toString());
      const fragment = realtimeTranscriptEventToFragment(event);
      if (!fragment || !sessionId) return;

      try {
        await fetch(buildTranscriptPostUrl(sessionId, APP_BASE_URL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildTranscriptPostBody(fragment)),
        });
      } catch (error) {
        log('transcript_post_failed', { error: error.message });
      }
    });

    openaiSocket.on('close', () => {
      openaiReady = false;
      log('openai_closed');
    });

    openaiSocket.on('error', (error) => {
      log('openai_error', { error: error.message });
    });
  }

  function sendAudioToOpenAI(event) {
    if (!event) return;
    if (openaiReady && openaiSocket?.readyState === WebSocket.OPEN) {
      openaiSocket.send(JSON.stringify(event));
      hasUncommittedAudio = true;
      return;
    }
    hasUncommittedAudio = true;
    pendingAudioEvents.push(event);
  }

  twilioSocket.on('message', (data) => {
    const event = safeJson(data.toString());
    if (!event) return;

    if (event.event === 'start') {
      sessionId = sessionId || resolveSessionIdFromTwilioStart(event);
      log('twilio_stream_started', {
        streamSid: event.start?.streamSid,
        mediaFormat: event.start?.mediaFormat,
      });

      if (!process.env.OPENAI_API_KEY) {
        log('openai_key_missing');
        return;
      }

      connectOpenAI();
      return;
    }

    if (event.event === 'media') {
      sendAudioToOpenAI(twilioMediaToRealtimeAppend(event));
      return;
    }

    if (event.event === 'stop') {
      log('twilio_stream_stopped', { streamSid: event.stop?.streamSid });
      if (openaiReady && openaiSocket?.readyState === WebSocket.OPEN) {
        openaiSocket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      }
      clearInterval(commitInterval);
      openaiSocket?.close();
    }
  });

  twilioSocket.on('close', () => {
    clearInterval(commitInterval);
    openaiSocket?.close();
    log('twilio_socket_closed');
  });

  twilioSocket.on('error', (error) => {
    clearInterval(commitInterval);
    openaiSocket?.close();
    log('twilio_socket_error', { error: error.message });
  });
});

server.listen(PORT, () => {
  console.log(`Call Assist media worker listening on ws://127.0.0.1:${PORT}/call-assist/media`);
});

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
