import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_TEXT_LENGTH = 50000; // 50K caractères max

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: 'Texte trop long (max 50000 caractères)' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const systemPrompt = `Tu es un assistant commercial expert. Tu reçois la transcription brute d'une note vocale prise après un appel téléphonique commercial (cold call).

Ton rôle est de restructurer cette note en la rendant claire, lisible et orientée action, tout en conservant TOUTES les informations utiles.

Organise la note selon les sections suivantes (n'inclus que les sections pour lesquelles il y a des informations) :

## Contexte
Situation actuelle du prospect, comment il a été contacté

## Besoin
Ce que le prospect recherche ou ses problématiques

## Objections
Les objections soulevées et les réponses apportées

## Budget
Informations sur le budget ou la capacité financière

## Timing
Délais, urgence, planning du projet

## Décisionnaire
Qui prend la décision, processus de validation

## Prochaines étapes
Actions à réaliser, relances prévues, dates de rappel

## Informations importantes
Tout autre détail pertinent (concurrents, contraintes techniques, etc.)

Règles :
- Conserve TOUTES les informations, ne supprime rien d'utile
- Utilise des puces pour la lisibilité
- Sois concis mais complet
- Garde le ton professionnel
- Si une section n'a pas d'information pertinente, ne l'inclus pas`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              parts: [{ text }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return NextResponse.json({ error: 'Restructuring failed' }, { status: 500 });
    }

    const data = await response.json();
    const restructured = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ restructured });
  } catch (error) {
    console.error('Restructure error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
