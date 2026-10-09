import { resolveAuthoritativePersona } from '@/data/characterDialogue';

export type DialogueRequestType = 'order' | 'rejection';

export interface OrderDialoguePayload {
  type: 'order';
  characterId: string;
  cocktail: {
    name: string;
    vessel: string;
    garnishes: string[];
    agitation: string;
    flavorNotes?: string;
  };
}

export interface RejectionDialoguePayload {
  type: 'rejection';
  characterId: string;
  recipe: {
    name: string;
    vessel: string;
    garnishes: string[];
    agitation: string;
  };
  deliveredDrink: {
    vessel: string | null;
    ingredients: Record<string, number>;
    rim: string | null;
    agitation: string | null;
    garnishes: string[];
  };
  discrepancies: string[];
}

export type DialoguePayload = OrderDialoguePayload | RejectionDialoguePayload;

export interface DialogueServiceResult {
  dialogue: string;
  characterId: string;
  model: string;
  latencyMs: number;
}

export class DialogueError extends Error {
  code: string;
  statusCode: number;
  details?: string;

  constructor(message: string, code: string, statusCode: number, details?: string) {
    super(message);
    this.name = 'DialogueError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function buildSystemPrompt(personaText: string): string {
  return [
    `You are a bar patron seated at Obelisco, a vintage retro cocktail lounge.`,
    `PERSONA: ${personaText}`,
    `OUTPUT CONSTRAINTS:`,
    `- Speak strictly in character according to your persona.`,
    `- Deliver exactly 1 to 2 short sentences.`,
    `- Speak in ALL UPPERCASE letters.`,
    `- Maximum 120 characters total length.`,
    `- Do not use quotation marks, markdown, asterisks, or stage directions (no emojis, no *grumbles*).`,
    `- Output ONLY your spoken line.`
  ].join('\n');
}

export function sanitizeDialogueOutput(rawText: string): string {
  let text = rawText
    .replace(/["'“”‘’]/g, '')
    .replace(/\*.*?\*/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  if (!text || text.length === 0) {
    throw new DialogueError('LLM returned empty or whitespace-only dialogue string', 'DIALOGUE_EMPTY_ERROR', 500);
  }

  if (text.length > 120) {
    const truncated = text.slice(0, 120);
    const lastPunct = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
    if (lastPunct > 40) {
      text = truncated.slice(0, lastPunct + 1);
    } else {
      const lastSpace = truncated.lastIndexOf(' ');
      text = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated).trim() + '!';
    }
  }

  return text;
}

export async function generateDialogueCompletion(
  payload: DialoguePayload
): Promise<DialogueServiceResult> {
  const start = Date.now();
  const token = process.env.HF_TOKEN?.trim();
  if (!token) {
    throw new DialogueError('HF_TOKEN environment variable is not set or empty', 'HF_TOKEN_MISSING', 500);
  }

  const persona = await resolveAuthoritativePersona(payload.characterId);
  const systemPrompt = buildSystemPrompt(persona);

  let userPrompt = '';
  if (payload.type === 'order') {
    const { cocktail } = payload;
    userPrompt = `You are ordering a drink. You want: ${cocktail.name} in a ${cocktail.vessel} glass with ${cocktail.garnishes.join(', ') || 'no garnish'}. Speak your order in character without listing technical recipe schemas or ounces.`;
  } else {
    const { recipe, discrepancies } = payload;
    userPrompt = `The bartender served you the wrong drink. You ordered: ${recipe.name} in a ${recipe.vessel} with ${recipe.garnishes.join(', ') || 'no garnish'}. The drink had the following mistakes: ${discrepancies.join('; ')}. Deliver an in-character rejection line complaining specifically about the error(s).`;
  }

  const model = process.env.HF_DIALOGUE_MODEL || 'Qwen/Qwen2.5-72B-Instruct';

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 120,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new DialogueError(
      `Hugging Face API returned status ${response.status}: ${errText}`,
      'HF_UPSTREAM_ERROR',
      response.status === 401 ? 500 : response.status,
      errText
    );
  }

  const json = await response.json();
  const rawContent = json.choices?.[0]?.message?.content || '';
  const cleanDialogue = sanitizeDialogueOutput(rawContent);

  return {
    dialogue: cleanDialogue,
    characterId: payload.characterId,
    model,
    latencyMs: Date.now() - start,
  };
}
