import { NextResponse } from 'next/server';
import { format, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';

// ── Known service keywords ───────────────────────────────────────────────────
const SERVICE_MAP: Record<string, string> = {
  haircut: 'Haircut',
  'hair cut': 'Haircut',
  trim: 'Haircut',
  'hair trim': 'Haircut',
  shave: 'Shave',
  'beard shave': 'Shave',
  'beard trim': 'Beard Trim',
  beard: 'Beard Trim',
  'clean shave': 'Shave',
  color: 'Hair Color',
  colour: 'Hair Color',
  'hair color': 'Hair Color',
  'hair colour': 'Hair Color',
  highlights: 'Highlights',
  highlight: 'Highlights',
  facial: 'Facial',
  'face clean': 'Facial',
  cleanup: 'Facial',
  'clean up': 'Facial',
  massage: 'Head Massage',
  'head massage': 'Head Massage',
  'hair spa': 'Hair Spa',
  spa: 'Hair Spa',
  keratin: 'Keratin Treatment',
  straightening: 'Hair Straightening',
  styling: 'Hair Styling',
  style: 'Hair Styling',
};

// ── Service alias fuzzy match ────────────────────────────────────────────────
function detectService(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, canonical] of Object.entries(SERVICE_MAP)) {
    if (lower.includes(keyword)) return canonical;
  }
  return '';
}

// ── Detect person name (first alphabetic word that isn't a keyword) ──────────
const SKIP_WORDS = new Set([
  'book', 'appointment', 'need', 'want', 'please', 'hello', 'hi', 'hey',
  'can', 'could', 'would', 'i', 'me', 'my', 'the', 'a', 'an', 'for',
  'get', 'have', 'make', 'schedule', 'fix', 'tomorrow', 'today', 'next',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'morning', 'afternoon', 'evening', 'night', 'am', 'pm', 'at', 'on', 'in',
  ...Object.keys(SERVICE_MAP),
]);

function detectName(text: string): string {
  const words = text.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z]/g, '');
    if (clean.length >= 2 && !SKIP_WORDS.has(clean.toLowerCase())) {
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }
  }
  return '';
}

// ── Resolve date from text ────────────────────────────────────────────────────
function detectDate(text: string, today: Date): string {
  const lower = text.toLowerCase();

  if (lower.includes('today')) return format(today, 'yyyy-MM-dd');
  if (lower.includes('tomorrow')) return format(addDays(today, 1), 'yyyy-MM-dd');
  if (lower.includes('day after tomorrow')) return format(addDays(today, 2), 'yyyy-MM-dd');
  if (lower.includes('monday')) return format(nextMonday(today), 'yyyy-MM-dd');
  if (lower.includes('tuesday')) return format(nextTuesday(today), 'yyyy-MM-dd');
  if (lower.includes('wednesday')) return format(nextWednesday(today), 'yyyy-MM-dd');
  if (lower.includes('thursday')) return format(nextThursday(today), 'yyyy-MM-dd');
  if (lower.includes('friday')) return format(nextFriday(today), 'yyyy-MM-dd');
  if (lower.includes('saturday')) return format(nextSaturday(today), 'yyyy-MM-dd');
  if (lower.includes('sunday')) return format(nextSunday(today), 'yyyy-MM-dd');

  // Match explicit date like "15 march", "march 15", "15/3", "2026-03-15"
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return '';
}

// ── Resolve time from text ────────────────────────────────────────────────────
function detectTime(text: string): string {
  const lower = text.toLowerCase();

  // Match "5pm", "5 pm", "5:30pm", "17:00", "5:30 pm"
  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];

    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    // If no am/pm but hour is <= 8, assume PM (salon hours)
    if (!period && hours <= 8 && hours >= 1) hours += 12;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  // Named times
  if (lower.includes('morning')) return '10:00';
  if (lower.includes('afternoon')) return '14:00';
  if (lower.includes('evening')) return '18:00';
  if (lower.includes('night')) return '19:00';

  return '';
}

// ── Optional: try Gemini AI if API key is set ─────────────────────────────────
async function tryGeminiAutofill(text: string, todayStr: string): Promise<Record<string, string> | null> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are a salon booking assistant. Extract appointment details from this text and return ONLY valid JSON with these keys: name, service, date (YYYY-MM-DD), time (HH:MM 24h). Today is ${todayStr}.

Text: "${text}"

Rules:
- name: client first name only
- service: one of [Haircut, Shave, Beard Trim, Hair Color, Highlights, Facial, Head Massage, Hair Spa, Keratin Treatment, Hair Straightening, Hair Styling]
- date: resolve relative dates like "tomorrow" using today's date
- time: convert to 24h format, if pm add 12 to hours

Return only the JSON object, nothing else.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('[AI Autofill] Gemini failed, using regex fallback:', e);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text: string = body.text || body.request || '';

    if (!text.trim()) {
      return NextResponse.json({ error: 'No input text provided' }, { status: 400 });
    }

    console.log('[AI Autofill] Processing:', text);

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // 1. Try Gemini AI (if configured)
    const aiResult = await tryGeminiAutofill(text, todayStr);

    if (aiResult && (aiResult.name || aiResult.service)) {
      console.log('[AI Autofill] Gemini result:', aiResult);
      return NextResponse.json({
        name: aiResult.name || '',
        service: aiResult.service || '',
        date: aiResult.date || todayStr,
        time: aiResult.time || '',
      });
    }

    // 2. Fallback: regex-based NLP parsing (always works, no API key needed)
    const name = detectName(text);
    const service = detectService(text);
    const date = detectDate(text, today) || todayStr;
    const time = detectTime(text);

    const result = { name, service, date, time };
    console.log('[AI Autofill] Regex result:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI Autofill] Error:', error);
    return NextResponse.json(
      { error: 'AI assistant temporarily unavailable', name: '', service: '', date: '', time: '' },
      { status: 200 } // Always 200 so the form can still use partial data
    );
  }
}
