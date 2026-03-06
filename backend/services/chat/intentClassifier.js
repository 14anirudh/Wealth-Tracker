const INTENTS = {
  SAVINGS_CHECK: 'SAVINGS_CHECK',
  AFFORDABILITY_CHECK: 'AFFORDABILITY_CHECK',
  FINANCIAL_REVIEW: 'FINANCIAL_REVIEW',
  PORTFOLIO_RISK: 'PORTFOLIO_RISK',
  CORPUS_PROJECTION: 'CORPUS_PROJECTION',
  SALARY_SPLIT: 'SALARY_SPLIT',
  UNKNOWN: 'UNKNOWN',
};

const normalize = (text = '') => text.toLowerCase().replace(/\s+/g, ' ').trim();

const parseAmountToken = (raw = '') => {
  const token = raw.toLowerCase().replace(/,/g, '').trim();
  const match = token.match(/^(\d+(\.\d+)?)([a-z]+)?$/);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[3] || '';
  if (!Number.isFinite(value)) return null;

  const unitMultiplier = {
    k: 1_000,
    l: 100_000,
    lac: 100_000,
    lakh: 100_000,
    m: 1_000_000,
    cr: 10_000_000,
    crore: 10_000_000,
  };

  return value * (unitMultiplier[unit] || 1);
};

const removeTimeExpressions = (text = '') =>
  text.replace(/\b\d+(\.\d+)?\s*(year|years|yr|yrs|month|months|mo)\b/gi, ' ');

const extractAmountCandidates = (text = '') => {
  const sanitized = removeTimeExpressions(text);
  const matches = sanitized.match(/\d[\d,]*(\.\d+)?\s*(k|l|lac|lakh|m|cr|crore)?/gi) || [];
  return matches
    .map((entry) => parseAmountToken(entry.replace(/\s+/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0);
};

const extractYears = (text = '') => {
  const match = text.match(/(\d+(\.\d+)?)\s*(year|years|yr|yrs)\b/i);
  return match ? Number(match[1]) : null;
};

const extractMonths = (text = '') => {
  const match = text.match(/(\d+)\s*(month|months|mo)\b/i);
  return match ? Number(match[1]) : null;
};

export const classifyIntent = (message = '') => {
  const text = normalize(message);
  const amounts = extractAmountCandidates(text);
  const years = extractYears(text);
  const months = extractMonths(text);

  if (/saving enough|savings rate|am i saving/i.test(text)) {
    return { intent: INTENTS.SAVINGS_CHECK, confidence: 0.95, entities: { amounts, years, months } };
  }

  if (/buy|afford|purchase|worth|can i get|can i buy|what about in/i.test(text)) {
    return {
      intent: INTENTS.AFFORDABILITY_CHECK,
      confidence: amounts.length ? 0.93 : 0.78,
      entities: { purchaseAmount: amounts[0] || null, amounts, years, months },
    };
  }

  if (/review my finances|review finances|financial review|overall review|health score/i.test(text)) {
    return { intent: INTENTS.FINANCIAL_REVIEW, confidence: 0.94, entities: { amounts, years, months } };
  }

  if (/portfolio risky|risky|risk profile|too much risk|is my portfolio/i.test(text)) {
    return { intent: INTENTS.PORTFOLIO_RISK, confidence: 0.92, entities: { amounts, years, months } };
  }

  if (/increase sip|sip by|increase monthly investment|monthly investment/i.test(text)) {
    return {
      intent: INTENTS.CORPUS_PROJECTION,
      confidence: 0.86,
      entities: { targetCorpus: null, sipIncrement: amounts[0] || null, amounts, years, months },
    };
  }

  if (/reach|corpus|retire|goal|target|what if/i.test(text) && amounts.length) {
    return {
      intent: INTENTS.CORPUS_PROJECTION,
      confidence: 0.92,
      entities: { targetCorpus: amounts[0], amounts, years, months },
    };
  }

  if (/split .*salary|salary split|divide salary|allocate salary|how should i split/i.test(text) && amounts.length) {
    return {
      intent: INTENTS.SALARY_SPLIT,
      confidence: 0.96,
      entities: { salaryAmount: amounts[0], amounts, years, months },
    };
  }

  if (
    /need|needs|lifestyle|emergency|investment|investments|split/i.test(text) &&
    amounts.length
  ) {
    return {
      intent: INTENTS.SALARY_SPLIT,
      confidence: 0.74,
      entities: {
        salaryAmount: null,
        desiredNeedsAmount: /need|needs/i.test(text) ? amounts[0] : null,
        amounts,
        years,
        months,
      },
    };
  }

  return { intent: INTENTS.UNKNOWN, confidence: 0.4, entities: { amounts, years, months } };
};

export const CHAT_INTENTS = INTENTS;
