'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AudioRecorderProps {
  leadId?: string;
  onTranscriptionComplete: (text: string) => void;
  onRecordingComplete?: (audioUrl: string) => void;
  onRestructuredComplete?: (text: string) => void;
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'done';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function AudioRecorder({
  leadId,
  onTranscriptionComplete,
  onRecordingComplete,
  onRestructuredComplete,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [restructured, setRestructured] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supabaseRef = useRef(createClient());

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setTranscription('');
      setRestructured('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const actualMime = mimeType.split(';')[0]; // audio/webm ou audio/mp4

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: actualMime });
        handleRecordingComplete(blob, actualMime);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleRecordingComplete = async (blob: Blob, mimeType: string = 'audio/webm') => {
    setState('processing');

    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Upload audio to Supabase Storage
      const ext = mimeType === 'audio/mp4' ? 'm4a' : 'webm';
      const timestamp = Date.now();
      const folder = leadId || 'drafts';
      const filePath = `${user.id}/${folder}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-notes')
        .upload(filePath, blob, { contentType: mimeType });

      if (uploadError) {
        console.warn('Audio upload failed (non-bloquant):', uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from('audio-notes')
          .getPublicUrl(filePath);
        onRecordingComplete?.(urlData.publicUrl);
      }

      // Convert blob to base64 for Gemini transcription
      const audioBase64 = await blobToBase64(blob);

      // Transcribe via Gemini
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      });

      if (!transcribeRes.ok) throw new Error('Erreur de transcription');
      const { transcription: rawText } = await transcribeRes.json();
      setTranscription(rawText);
      onTranscriptionComplete(rawText);

      // Restructure via Gemini
      const restructureRes = await fetch('/api/restructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });

      if (!restructureRes.ok) throw new Error('Erreur de restructuration');
      const { restructured: structuredText } = await restructureRes.json();
      setRestructured(structuredText);
      onRestructuredComplete?.(structuredText);

      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setState('idle');
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stopTimer]);

  return (
    <div className="space-y-4">
      {/* Record Button */}
      <div className="flex flex-col items-center gap-3">
        {state === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            className="h-20 w-20 rounded-full bg-danger-400 hover:bg-danger-500 active:bg-danger-600 flex items-center justify-center shadow-lg transition-all"
          >
            <Mic className="h-8 w-8 text-white" />
          </button>
        )}

        {state === 'recording' && (
          <>
            <button
              type="button"
              onClick={stopRecording}
              className="h-20 w-20 rounded-full bg-danger-400 flex items-center justify-center shadow-lg animate-pulse"
            >
              <Square className="h-7 w-7 text-white" />
            </button>
            <p className="text-lg font-mono text-gray-900 tabular-nums">{formatDuration(duration)}</p>
            <p className="text-sm text-danger-400 font-medium">Enregistrement en cours...</p>
          </>
        )}

        {state === 'processing' && (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-600">Transcription et restructuration en cours...</p>
          </div>
        )}

        {state === 'done' && (
          <button
            type="button"
            onClick={() => {
              setState('idle');
              setTranscription('');
              setRestructured('');
              setError(null);
            }}
            className="text-sm text-brand-500 font-medium"
          >
            Enregistrer à nouveau
          </button>
        )}

        {state === 'idle' && !error && !transcription && (
          <p className="text-sm text-gray-500">Appuyez pour enregistrer</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-3">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      {/* Transcription Result */}
      {transcription && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Transcription</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{transcription}</p>
        </div>
      )}

      {/* Restructured Result */}
      {restructured && (
        <div className="bg-brand-50 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-brand-700">Note restructurée</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{restructured}</p>
        </div>
      )}
    </div>
  );
}
