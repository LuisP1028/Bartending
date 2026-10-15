import { resolveAuthoritativePersona } from '@/data/characterDialogue';

export type DialogueRequestType = 'order' | 'rejection' | 'starters' | 'chat';

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

export interface StartersDialoguePayload {
  type: 'starters';
  characterId: string;
  cocktail?: {
    name: string;
    vessel?: string;
  };
  greeting?: string;
}

export interface ChatHistoryTurn {
  role: 'player' | 'patron';
  text: string;
}

export interface ChatDialoguePayload {
  type: 'chat';
  characterId: string;
  playerMessage: string;
  cocktail?: {
    name: string;
    vessel?: string;
  };
  history?: ChatHistoryTurn[];
}

export type DialoguePayload =
  | OrderDialoguePayload
  | RejectionDialoguePayload
  | StartersDialoguePayload
  | ChatDialoguePayload;

export interface DialogueServiceResult {
  dialogue: string;
  starters?: [string, string];
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

export function buildStartersSystemPrompt(personaText: string): string {
  return [
    `You generate 2 contextual conversation starter options for a bartender talking to a bar patron seated at Obelisco, a vintage retro cocktail lounge.`,
    `PATRON PERSONA: ${personaText}`,
    `OUTPUT CONSTRAINTS:`,
    `- Generate EXACTLY 2 distinct, intriguing conversation starters tailored specifically to this patron's persona, background, and demeanor.`,
    `- Put each conversation starter on its own separate line (exactly 2 lines total).`,
    `- Write in ALL UPPERCASE letters.`,
    `- Each line must be between 15 and 85 characters long.`,
    `- Do NOT include numbering (no 1., 2.), bullet points, quotation marks, markdown, or stage directions.`,
    `- Output ONLY the 2 lines separated by a newline.`
  ].join('\n');
}

export function sanitizeDialogueOutput(rawText: string, maxChars: number = 120): string {
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

  if (text.length > maxChars) {
    const truncated = text.slice(0, maxChars);
    const lastPunct = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
    if (lastPunct > 30) {
      text = truncated.slice(0, lastPunct + 1);
    } else {
      const lastSpace = truncated.lastIndexOf(' ');
      text = (lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated).trim() + '?';
    }
  }

  return text;
}

export function parseAndSanitizeStarters(rawText: string): [string, string] {
  const stripped = rawText.replace(/```[\s\S]*?```/g, '').trim();
  if (!stripped) {
    throw new DialogueError(
      'LLM returned empty conversation starters output',
      'STARTERS_EMPTY_ERROR',
      500
    );
  }

  let rawCandidates: string[] = [];
  if (stripped.startsWith('[')) {
    try {
      const parsed = JSON.parse(stripped);
      if (Array.isArray(parsed)) {
        rawCandidates = parsed.map((item) => String(item));
      }
    } catch {
      /* fall through to line splitting */
    }
  }

  if (rawCandidates.length === 0) {
    rawCandidates = stripped
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  if (rawCandidates.length === 1) {
    // Split on sentence boundaries if the model returned 2 sentences on 1 line
    const sentences = rawCandidates[0]
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length >= 2) {
      rawCandidates = sentences;
    }
  }

  const cleaned: string[] = [];
  for (const cand of rawCandidates) {
    const withoutPrefix = cand
      .replace(/^\s*(?:STARTER\s*\d+\s*[:.)-]\s*|\d+\s*[:.)-]\s*|[-*•]\s*)/i, '')
      .trim();
    if (!withoutPrefix) continue;
    try {
      const sanitized = sanitizeDialogueOutput(withoutPrefix, 90);
      if (sanitized && !cleaned.includes(sanitized)) {
        cleaned.push(sanitized);
      }
    } catch {
      /* skip empty candidate */
    }
    if (cleaned.length >= 2) break;
  }

  if (cleaned.length < 2) {
    throw new DialogueError(
      'LLM failed to return 2 distinct conversation starters',
      'STARTERS_PARSE_ERROR',
      500
    );
  }

  return [cleaned[0], cleaned[1]];
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
  const model = process.env.HF_DIALOGUE_MODEL || 'meta-llama/Llama-3.3-70B-Instruct';

  if (payload.type === 'starters') {
    const systemPrompt = buildStartersSystemPrompt(persona);
    const cocktailCtx = payload.cocktail?.name
      ? ` currently ordering a ${payload.cocktail.name}`
      : '';
    const greetingCtx = payload.greeting
      ? ` who just said "${payload.greeting}"`
      : '';
    const userPrompt = `Write 2 distinct, persona-specific conversation starter questions or remarks the bartender can say to this patron (${payload.characterId})${cocktailCtx}${greetingCtx}. Put each starter on its own line.`;

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
        max_tokens: 140,
        temperature: 0.75,
      }),
      signal: AbortSignal.timeout(30000),
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
    const starters = parseAndSanitizeStarters(rawContent);

    return {
      dialogue: starters[0],
      starters,
      characterId: payload.characterId,
      model,
      latencyMs: Date.now() - start,
    };
  }

  const systemPrompt = buildSystemPrompt(persona);
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (payload.type === 'order') {
    const { cocktail } = payload;
    messages.push({
      role: 'user',
      content: `You are ordering a drink. You want: ${cocktail.name} in a ${cocktail.vessel} glass with ${cocktail.garnishes.join(', ') || 'no garnish'}. Speak your order in character without listing technical recipe schemas or ounces.`,
    });
  } else if (payload.type === 'rejection') {
    const { recipe, discrepancies } = payload;
    messages.push({
      role: 'user',
      content: `The bartender served you the wrong drink. You ordered: ${recipe.name} in a ${recipe.vessel} with ${recipe.garnishes.join(', ') || 'no garnish'}. The drink had the following mistakes: ${discrepancies.join('; ')}. Deliver an in-character rejection line complaining specifically about the error(s).`,
    });
  } else if (payload.type === 'chat') {
    const rawPlayerMsg =
      typeof payload.playerMessage === 'string' ? payload.playerMessage.trim() : '';
    if (!rawPlayerMsg) {
      throw new DialogueError(
        'Missing or empty playerMessage for chat request',
        'INVALID_PAYLOAD',
        400
      );
    }
    if (rawPlayerMsg.length > 140) {
      throw new DialogueError(
        'playerMessage exceeds maximum length of 140 characters',
        'INVALID_PAYLOAD',
        400
      );
    }

    if (Array.isArray(payload.history)) {
      const recent = payload.history.slice(-6);
      for (const turn of recent) {
        if (!turn?.text?.trim()) continue;
        if (turn.role === 'player') {
          messages.push({
            role: 'user',
            content: `The bartender says: "${turn.text.trim()}"`,
          });
        } else if (turn.role === 'patron') {
          messages.push({
            role: 'assistant',
            content: turn.text.trim(),
          });
        }
      }
    }

    const cocktailNote = payload.cocktail?.name
      ? ` while you wait for your ${payload.cocktail.name}`
      : '';
    messages.push({
      role: 'user',
      content: `The bartender says to you${cocktailNote}: "${rawPlayerMsg}". Reply directly to the bartender strictly in character according to your persona.`,
    });
  } else {
    throw new DialogueError(
      `Unsupported dialogue request type: ${String((payload as { type?: unknown }).type)}`,
      'INVALID_PAYLOAD',
      400
    );
  }

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 120,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30000),
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
