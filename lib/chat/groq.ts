import { getBaseUrl } from '@/lib/config';
import { query } from '@/lib/db';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const CHAT_WHATSAPP_NUMBER = (
  process.env.CHAT_WHATSAPP_NUMBER || '5215530776194'
).replace(/\D/g, '') || '5215530776194';
const CHAT_WHATSAPP_URL =
  'https://wa.me/' +
  (CHAT_WHATSAPP_NUMBER.startsWith('52')
    ? CHAT_WHATSAPP_NUMBER
    : '52' + CHAT_WHATSAPP_NUMBER);
const BASE_URL_CHAT = getBaseUrl();

const CHAT_SYSTEM_BASE = `Eres Redi, la asistente virtual de Psicólogos en Red. Eres mujer, amable y profesional. Te presentas como Redi.
Respondes SIEMPRE en español, de forma clara y concisa. No des consejos clínicos ni diagnósticos; solo orientas sobre la plataforma y recomiendas especialistas según la información que tienes.

ALCANCE (obligatorio): Solo respondes a preguntas RELACIONADAS con Psicólogos en Red: agendar citas, horarios, precios, servicios (terapia individual, pareja, asesoría de crianza, academia), registro, inicio de sesión, recomendación de psicólogos de la lista, ubicación (México vs extranjero), contacto, cómo usar la plataforma. Si la persona pregunta sobre otro tema, responde brevemente que solo puedes ayudar con temas de la plataforma.

FORMATO: texto plano, sin Markdown. Respuestas breves. Listas con guiones cuando haya pasos.

RECOMENDACIÓN DE PSICÓLOGOS: haz preguntas de seguimiento; recomienda UN solo psicólogo cuando tengas suficiente info. Enlace: ${BASE_URL_CHAT}/catalogo?ver=ID

GUÍA: Catálogo ${BASE_URL_CHAT}/catalogo. Registro ${BASE_URL_CHAT}/registro. Login ${BASE_URL_CHAT}/login. Academia ${BASE_URL_CHAT}/academia.`;

const ACADEMIA_STATIC_CONTEXT = `

ACADEMIA VIRTUAL: formación para psicólogas y estudiantes. Ver programas en ${BASE_URL_CHAT}/academia. Solo menciona diplomados del bloque DIPLOMADOS Y CURSOS DISPONIBLES.`;

const CRISIS_KEYWORDS =
  /\b(suicidio|suicida|suicidar|matar|muerte|morir(?:me)?|matanza|asesinato|crimen|autolesi[oó]n|querer morir|acabar con (?:todo|migo)|emergencia de vida|pensamientos de muerte|ideaci[oó]n suicida|intento de suicidio)\b/i;
const CRISIS_NOTICE =
  'Te recomendamos acudir a los servicios de emergencia de tu localidad. En México puedes marcar 911 o la Línea de la Vida: 800 911 2000.';

function detectCrisis(
  userMessage: string,
  messageHistory: { role?: string; content?: string }[] | undefined,
): boolean {
  if (!userMessage) return false;
  const text = userMessage.toLowerCase();
  if (CRISIS_KEYWORDS.test(text)) return true;
  if (!Array.isArray(messageHistory)) return false;
  const lastUser = messageHistory
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => String(m.content || '').toLowerCase())
    .join(' ');
  return CRISIS_KEYWORDS.test(lastUser);
}

async function getDiplomadosContextForChat(): Promise<string> {
  try {
    const r = await query(
      `SELECT id, area, titulo, fecha_inicio, descripcion_corta, descripcion_larga
       FROM diplomados WHERE activo = true ORDER BY orden ASC, id ASC`,
    );
    if (!r.rows.length) {
      return '\nDIPLOMADOS Y CURSOS DISPONIBLES: No hay programas publicados en este momento.';
    }
    const lines = r.rows.map((d) => {
      const row = d as Record<string, unknown>;
      const descLarga = String(row.descripcion_larga || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 350);
      return `- ${row.titulo} (${row.area}). Inicio: ${row.fecha_inicio || 'consultar'}. ${row.descripcion_corta || ''}. ${descLarga ? descLarga + '.' : ''} Más info: ${BASE_URL_CHAT}/academia`;
    });
    return '\nDIPLOMADOS Y CURSOS DISPONIBLES:\n' + lines.join('\n');
  } catch {
    return `\nDIPLOMADOS: visita ${BASE_URL_CHAT}/academia`;
  }
}

async function getPsicologosContextForChat(): Promise<string> {
  try {
    const r = await query(`
      SELECT id, nombre, especialidad, biografia, problemas_principales, servicios,
             precio_terapia_individual, precio_terapia_pareja, precio_asesoria_crianza
      FROM psicologos
      WHERE (COALESCE(visible_mexico, true) = true OR COALESCE(visible_internacional, false) = true)
      ORDER BY nombre
    `);
    if (!r.rows.length) return '\n[Lista de psicólogos: no disponible.]';
    const lines = r.rows.map((p) => {
      const row = p as Record<string, unknown>;
      const areas = Array.isArray(row.problemas_principales)
        ? row.problemas_principales.join(', ')
        : String(row.problemas_principales || '');
      const serv = Array.isArray(row.servicios)
        ? row.servicios.join(', ')
        : String(row.servicios || '');
      const bio = String(row.biografia || '')
        .replace(/\s+/g, ' ')
        .slice(0, 400);
      return `- ${row.nombre} (ID ${row.id}). Especialidad: ${row.especialidad || '—'}. Áreas: ${areas || '—'}. Servicios: ${serv || '—'}. Bio: ${bio || '—'}.`;
    });
    return '\nLISTA DE ESPECIALISTAS:\n' + lines.join('\n');
  } catch {
    return '\n[Lista de psicólogos temporalmente no disponible.]';
  }
}

export interface GroqChatResponse {
  text?: string;
  fallback?: boolean;
  message?: string;
  whatsappUrl: string;
  crisisNotice?: string;
}

export async function handleGroqChat(body: {
  message?: string;
  history?: { role?: string; content?: string }[];
}): Promise<GroqChatResponse> {
  const userMessage = String(body.message || '')
    .trim()
    .slice(0, 1000);
  if (!userMessage) {
    throw new Error('Falta el mensaje');
  }

  const showCrisisNotice = detectCrisis(userMessage, body.history);
  const crisisExtra = showCrisisNotice ? { crisisNotice: CRISIS_NOTICE } : {};

  if (!GROQ_API_KEY) {
    return {
      fallback: true,
      message:
        'Para recibir respuesta a tu pregunta, dirígete con nuestros especialistas por WhatsApp.',
      whatsappUrl: CHAT_WHATSAPP_URL,
      ...crisisExtra,
    };
  }

  const [psicologosContext, diplomadosContext] = await Promise.all([
    getPsicologosContextForChat(),
    getDiplomadosContextForChat(),
  ]);
  const systemContent =
    CHAT_SYSTEM_BASE +
    psicologosContext +
    ACADEMIA_STATIC_CONTEXT +
    diplomadosContext;

  const messages = [
    { role: 'system', content: systemContent },
    ...(Array.isArray(body.history)
      ? body.history.slice(-10).map((m) => ({
          role: m.role || 'user',
          content: String(m.content || '').slice(0, 500),
        }))
      : []),
    { role: 'user', content: userMessage },
  ];

  try {
    const groqRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          max_tokens: 500,
          temperature: 0.5,
        }),
      },
    );
    const data = (await groqRes.json()) as {
      error?: { code?: string; message?: string };
      choices?: { message?: { content?: string } }[];
    };

    if (!groqRes.ok) {
      const isRateLimit =
        groqRes.status === 429 ||
        data.error?.code === 'rate_limit_exceeded' ||
        String(data.error?.message || '')
          .toLowerCase()
          .includes('quota');
      if (isRateLimit) {
        return {
          fallback: true,
          message:
            'Para recibir respuesta a tu pregunta, dirígete con nuestros especialistas por WhatsApp.',
          whatsappUrl: CHAT_WHATSAPP_URL,
          ...crisisExtra,
        };
      }
      throw new Error('Groq API error');
    }

    const text =
      data.choices?.[0]?.message?.content?.trim() ||
      'No pude generar una respuesta. ¿Quieres que te pasemos con un especialista por WhatsApp?';

    return {
      text,
      whatsappUrl: CHAT_WHATSAPP_URL,
      ...crisisExtra,
    };
  } catch {
    return {
      fallback: true,
      message:
        'Para recibir respuesta a tu pregunta, dirígete con nuestros especialistas por WhatsApp.',
      whatsappUrl: CHAT_WHATSAPP_URL,
      ...crisisExtra,
    };
  }
}
