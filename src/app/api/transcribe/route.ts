import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB en base64

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { audioBase64, mimeType } = await request.json();

    if (!audioBase64) {
      return NextResponse.json({ error: 'audioBase64 is required' }, { status: 400 });
    }

    if (audioBase64.length > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Fichier audio trop volumineux (max 10MB)' }, { status: 400 });
    }

    const validMimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'];
    const audioMimeType = validMimeTypes.includes(mimeType) ? mimeType : 'audio/webm';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Use Gemini to transcribe audio
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: audioMimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: 'Transcris cet enregistrement audio en français. Retourne uniquement le texte transcrit, sans commentaires ni formatage supplémentaire.',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini transcription error:', errorData);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const data = await response.json();
    const transcription = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
