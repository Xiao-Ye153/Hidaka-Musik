import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const LANGS: Record<string, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
  ms: 'Bahasa Melayu',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  ru: 'Русский'
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = (searchParams.get('name') || '').trim().slice(0, 100);
  const lang = LANGS[searchParams.get('lang') || 'id'] || LANGS.id;

  if (!name) return NextResponse.json({ error: 'Nama artis wajib diisi' }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY belum diatur di Vercel' }, { status: 500 });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt =
    `Cari informasi terbaru di internet tentang artis atau musisi "${name}". ` +
    `Tulis bio singkat dalam ${lang}, 3 sampai 4 kalimat yang natural: genre dan gaya musiknya, ` +
    'apa yang membuatnya unik, karya atau lagu yang dikenal, dan dampaknya bagi pendengar. ' +
    'Tulis hanya bionya saja, tanpa kata pengantar, tanpa menyebut hasil pencarian atau sumber, ' +
    'tanpa format markdown atau poin-poin. Jika informasi tentang artis ini sangat sedikit, ' +
    'tulis apa yang benar-benar ditemukan dan jangan mengarang fakta.';

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } }
      }),
      signal: AbortSignal.timeout(25000)
    });
    const d = await r.json();
    if (!r.ok) return NextResponse.json({ error: d?.error?.message || `Gemini ${r.status}` }, { status: 502 });

    const parts: { text?: string }[] = d?.candidates?.[0]?.content?.parts || [];
    const bio = parts
      .map((p) => p.text || '')
      .join('')
      .replace(/\*\*/g, '')
      .replace(/\[\d+(?:,\s*\d+)*\]/g, '')
      .trim();
    if (!bio) return NextResponse.json({ error: 'Jawaban kosong dari Gemini' }, { status: 502 });

    return NextResponse.json(
      { bio, grounded: !!d?.candidates?.[0]?.groundingMetadata },
      { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate' } }
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Gagal' }, { status: 502 });
  }
}
