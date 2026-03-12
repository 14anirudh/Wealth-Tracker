import { logChatStep } from '../../utils/chatLogger.js';

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-pro';
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 45000;

const getMaxOutputTokens = (intent) => {
  if (intent === 'FINANCIAL_REVIEW') return 12000;
  if (intent === 'AFFORDABILITY_CHECK') return 9000;
  return 70000;
};

const sanitizeValue = (value) => {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    const output = {};
    Object.entries(value).forEach(([key, entryValue]) => {
      const cleaned = sanitizeValue(entryValue);
      if (cleaned !== undefined) {
        output[key] = cleaned;
      }
    });
    return output;
  }

  return undefined;
};

export const sanitizeAnalysisForLlm = (analysis) => sanitizeValue(analysis) || {};

const getIntentResponseFormat = (intent) => {
  if (intent === 'AFFORDABILITY_CHECK') {
    return [
      'Return exactly 3 short sections:',
      '1) Direct yes/no decision',
      '2) Risk explanation based only on provided numbers',
      '3) Safer alternative',
    ].join('\n');
  }

  if (intent === 'FINANCIAL_REVIEW') {
    return [
      'Return exactly 3 short sections:',
      '1) Snapshot',
      '2) Key risks/strengths from numbers only',
      '3) Next actions',
      '',
      'Mandatory coverage for FINANCIAL_REVIEW:',
      '- Mention health.score',
      '- Mention netWorth.totalCurrent and netWorth.totalGainPercent',
      '- Mention emergency.coverageMonths',
      '- Mention risk.riskScore and at least one risk flag from risk.riskFlags',
      '- Mention one concrete next action tied to numbers',
      '- Do NOT focus only on savings rate',
    ].join('\n');
  }

  if (intent === 'UNKNOWN') {
    return [
      'User follow-up may be contextual.',
      'Use recent chat history and financial snapshot to answer helpfully.',
      'If user references "it/that", infer the subject from history.',
      'Provide practical suggestions, not only restating values.',
      'If data is missing, state what assumption you made.',
    ].join('\n');
  }

  return 'Return a concise natural response based only on provided analysis values.Mention the values you have used and suggest you answer for the question based on that';
};

const buildPrompt = ({ userQuestion, intent, analysis, chatHistory = [], financialSnapshot = {}, lastActiveContext = null }) => {
  const formatInstructions = getIntentResponseFormat(intent);
  return [
    'You are a financial assistant.',
    'CRITICAL RULES:',
    '- Never calculate new numbers.',
    '- Never infer missing values by math.',
    '- Use only values present in the analysis JSON.',
    '- If a required value is missing, explicitly say data is unavailable.',
    '- Keep tone human, clear, and practical.',
    '- Do not give generic praise-only output.',
    '- All money values are in Indian Rupees (INR).',
    '- Never mention dollars or USD.',
    '- When writing amounts, prefer Indian format like "Rs 1,00,000" or "10 lakh".',
    '- Do not just restate numbers; include concrete recommendation and adjustment suggestion.',
    '',
    `Intent: ${intent}`,
    `Last Active Context: ${lastActiveContext || 'none'}`,
    `User Question: ${userQuestion}`,
    '',
    'Recent Chat History (last 5 messages):',
    JSON.stringify(chatHistory),
    '',
    'Current Financial Snapshot:',
    JSON.stringify(financialSnapshot),
    '',
    'Financial Analysis JSON (source of truth):',
    JSON.stringify(analysis),
    '',
    formatInstructions,
  ].join('\n');
};

export const generateLlmResponse = async ({
  userQuestion,
  intent,
  analysis,
  chatHistory = [],
  financialSnapshot = {},
  lastActiveContext = null,
  traceId = null,
}) => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    await logChatStep('llm_skipped_missing_api_key', {
      traceId,
      intent,
      userQuestion,
    });
    return {
      used: false,
      text: null,
      error: 'GOOGLE_GEMINI_API_KEY is missing',
    };
  }

  const prompt = buildPrompt({ userQuestion, intent, analysis, chatHistory, financialSnapshot, lastActiveContext });
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const maxOutputTokens = getMaxOutputTokens(intent);
  let timeout;

  await logChatStep('llm_request_prepared', {
    traceId,
    model: GEMINI_MODEL,
    intent,
    userQuestion,
    chatHistory,
    financialSnapshot,
    analysis,
    prompt,
    maxOutputTokens,
  });

  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API call failed:', errorBody);
      return {
        used: false,
        text: null,
        error: `Gemini API HTTP ${response.status}`,
      };
    }

    const json = await response.json();
    const candidate = json?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;
    if (text?.trim()) {
      await logChatStep('llm_response_received', {
        traceId,
        intent,
        finishReason: finishReason || null,
        text: text.trim(),
      });
      return {
        used: true,
        text: text.trim(),
        error: null,
      };
    }

    await logChatStep('llm_response_empty', {
      traceId,
      intent,
      finishReason: finishReason || null,
      rawResponse: json,
    });
    return {
      used: false,
      text: null,
      error: finishReason ? `Gemini returned no text (finishReason: ${finishReason})` : 'Gemini returned no text',
    };
  } catch (error) {
    console.error('Gemini API call failed:', error.message);
    await logChatStep('llm_request_failed', {
      traceId,
      intent,
      error,
    });
    return {
      used: false,
      text: null,
      error:
        error.name === 'AbortError'
          ? `Gemini request timed out after ${Math.round(GEMINI_TIMEOUT_MS / 1000)}s`
          : error.message,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};
