import {
  calculateRebalanceRecommendation,
  calculateAffordability,
  calculateSavingsRate,
  detectInvestmentInconsistency,
  generateFinancialHealthScore,
  getAssetAllocation,
  getAverageMonthlyIncome,
  getAverageMonthlyExpenses,
  getEmergencyCoverage,
  getEquityBreakdown,
  getExpenseBreakdown,
  getNetWorth,
  projectFutureCorpus,
  simulateSalarySplit,
} from '../financial/index.js';
import Portfolio from '../../models/Portfolio.js';
import { CHAT_INTENTS, classifyIntent } from './intentClassifier.js';
import { buildResponse } from './responseBuilder.js';
import ChatConversation from '../../models/ChatConversation.js';
import { createHttpError } from '../httpError.js';
import { generateLlmResponse, sanitizeAnalysisForLlm } from './aiService.js';

const DEFAULT_AFFORDABILITY_MONTHS = 12;
const DEFAULT_CORPUS_YEARS = 10;
const DEFAULT_EXPECTED_RETURN = 12;
const MAX_SEARCH_YEARS = 40;

const resolveAssistantMessage = async ({ userQuestion, intent, analysis, chatHistory, financialSnapshot, lastActiveContext }) => {
  const llm = await generateLlmResponse({
    userQuestion,
    intent,
    analysis,
    chatHistory,
    financialSnapshot,
    lastActiveContext,
  });

  const fallbackMessage = buildResponse({ intent, data: analysis });
  return {
    message: llm?.text || fallbackMessage,
    llm: {
      used: Boolean(llm?.used && llm?.text),
      error: llm?.error || null,
    },
  };
};

const roundTo = (value, digits = 2) => {
  const base = 10 ** digits;
  return Math.round((Number(value) || 0) * base) / base;
};

const getLastHistory = (messages = [], limit = 5) =>
  messages.slice(-limit).map((m) => ({ role: m.role, content: m.content }));

const buildCurrentFinancialSnapshot = async (userId, memory = {}) => {
  const [income, expenses, savings, emergency, allocation, netWorth, latestPortfolio] = await Promise.all([
    getAverageMonthlyIncome(userId),
    getAverageMonthlyExpenses(userId),
    calculateSavingsRate(userId),
    getEmergencyCoverage(userId),
    getAssetAllocation(userId),
    getNetWorth(userId),
    Portfolio.findOne({ userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const nonEquityTotal = latestPortfolio?.nonEquity?.total || 0;
  const goldCurrent = latestPortfolio?.nonEquity?.commodities?.gold?.current || 0;
  const goldPercent = nonEquityTotal > 0 ? (goldCurrent / nonEquityTotal) * 100 : 0;

  const targetCorpus = memory?.lastTargetCorpus || memory?.lastEntities?.targetCorpus || null;
  const goalProgressPercent = targetCorpus && targetCorpus > 0 ? Math.min(100, (netWorth.totalCurrent / targetCorpus) * 100) : null;

  return sanitizeAnalysisForLlm({
    income: income.avgIncome,
    expenses: expenses.avgExpenses,
    savings_rate: savings.avgSavingsRate,
    emergency_months: emergency.coverageMonths,
    equity_percent: allocation.equityPercent,
    debt_percent: allocation.nonEquityPercent,
    gold_percent: goldPercent,
    net_worth: netWorth.totalCurrent,
    goal_progress_percent: goalProgressPercent,
  });
};

const resolveWithConversationContext = ({ classification, memory, message }) => {
  const resolved = {
    intent: classification.intent,
    entities: { ...(classification.entities || {}) },
    confidence: classification.confidence,
  };

  if (resolved.intent === CHAT_INTENTS.UNKNOWN && memory?.lastIntent) {
    if (/it|that|same plan|same goal|what if|increase|decrease|need/i.test((message || '').toLowerCase())) {
      resolved.intent = memory.lastIntent;
      resolved.confidence = Math.max(0.65, classification.confidence);
    }
  }

  if (resolved.intent === CHAT_INTENTS.AFFORDABILITY_CHECK && !resolved.entities.purchaseAmount) {
    const previous = Number(memory?.lastEntities?.purchaseAmount) || 0;
    if (previous > 0) {
      resolved.entities.purchaseAmount = previous;
      resolved.entities.amounts = Array.isArray(resolved.entities.amounts) ? resolved.entities.amounts : [];
      if (!resolved.entities.amounts.length) resolved.entities.amounts.push(previous);
    }
  }

  if (resolved.intent === CHAT_INTENTS.CORPUS_PROJECTION && !resolved.entities.targetCorpus) {
    const previousTarget = Number(memory?.lastTargetCorpus || memory?.lastEntities?.targetCorpus) || 0;
    if (previousTarget > 0) {
      resolved.entities.targetCorpus = previousTarget;
    }
  }

  if (resolved.intent === CHAT_INTENTS.SALARY_SPLIT) {
    const previousSalary = Number(memory?.lastEntities?.salaryAmount) || 0;
    if (!resolved.entities.salaryAmount && previousSalary > 0) {
      resolved.entities.salaryAmount = previousSalary;
    }
    if (!resolved.entities.desiredNeedsAmount && /need|needs/i.test((message || '').toLowerCase())) {
      const candidate = Number(resolved.entities.amounts?.[0]) || 0;
      if (candidate > 0) resolved.entities.desiredNeedsAmount = candidate;
    }
  }

  return resolved;
};

const getActiveContextForIntent = (intent) => {
  if (intent === CHAT_INTENTS.CORPUS_PROJECTION) return 'goal_projection_house';
  if (intent === CHAT_INTENTS.AFFORDABILITY_CHECK) return 'purchase_affordability';
  if (intent === CHAT_INTENTS.FINANCIAL_REVIEW) return 'financial_review';
  if (intent === CHAT_INTENTS.PORTFOLIO_RISK) return 'portfolio_risk';
  if (intent === CHAT_INTENTS.SALARY_SPLIT) return 'salary_split';
  if (intent === CHAT_INTENTS.SAVINGS_CHECK) return 'savings_check';
  return null;
};

const buildRiskMetrics = async (userId) => {
  const [allocation, equityBreakdown] = await Promise.all([getAssetAllocation(userId), getEquityBreakdown(userId)]);
  const highSmallCapExposure = (equityBreakdown.smallCapExposure || 0) > 30;
  const mediumSmallCapExposure = (equityBreakdown.smallCapExposure || 0) > 20;
  const highDirectStockConcentration = (equityBreakdown.directStocksPercent || 0) > 40;
  const aggressiveEquityAllocation = (allocation.equityPercent || 0) > 75;

  const riskScore =
    (highSmallCapExposure ? 2 : mediumSmallCapExposure ? 1 : 0) +
    (highDirectStockConcentration ? 1 : 0) +
    (aggressiveEquityAllocation ? 1 : 0);

  return {
    allocation,
    equityBreakdown,
    riskFlags: {
      highSmallCapExposure,
      mediumSmallCapExposure,
      highDirectStockConcentration,
      aggressiveEquityAllocation,
    },
    riskScore,
  };
};

const estimateCurrentMonthlyInvestment = async (userId) => {
  const [income, breakdown] = await Promise.all([getAverageMonthlyIncome(userId), getExpenseBreakdown(userId)]);
  return ((income.avgIncome || 0) * (breakdown.investmentsPercent || 0)) / 100;
};

const estimateYearsToTargetCorpus = async (userId, targetCorpus, monthlyInvestment, expectedReturn) => {
  for (let years = 1; years <= MAX_SEARCH_YEARS; years += 1) {
    const projection = await projectFutureCorpus(userId, monthlyInvestment, years, expectedReturn);
    if (projection.projectedCorpus >= targetCorpus) {
      return {
        estimatedYears: years,
        requiredMonthlyInvestment: projection.requiredMonthlyInvestment,
      };
    }
  }

  const fallbackProjection = await projectFutureCorpus(userId, monthlyInvestment, DEFAULT_CORPUS_YEARS, expectedReturn);
  return {
    estimatedYears: null,
    requiredMonthlyInvestment: fallbackProjection.requiredMonthlyInvestment,
  };
};

export const processChatMessage = async (userId, message, memory = {}) => {
  const classification = classifyIntent(message);
  const contextual = resolveWithConversationContext({ classification, memory, message });
  const { intent, entities } = contextual;
  const chatHistory = memory.chatHistory || [];
  const financialSnapshot = await buildCurrentFinancialSnapshot(userId, memory);
  const lastActiveContext = memory.lastActiveContext || null;

  if (intent === CHAT_INTENTS.SAVINGS_CHECK) {
    const [savings, income, expenses] = await Promise.all([
      calculateSavingsRate(userId),
      getAverageMonthlyIncome(userId),
      getAverageMonthlyExpenses(userId),
    ]);
    const data = {
      avgSavingsRate: savings.avgSavingsRate,
      avgIncome: income.avgIncome,
      avgExpenses: expenses.avgExpenses,
      expenseRatio: expenses.expenseRatio,
    };
    const analysis = sanitizeAnalysisForLlm(data);
    const assistant = await resolveAssistantMessage({
      userQuestion: message,
      intent,
      analysis,
      chatHistory,
      financialSnapshot,
      lastActiveContext,
    });

    return {
      intent,
      confidence: contextual.confidence,
      entities,
      data: analysis,
      message: assistant.message,
      llm: assistant.llm,
      financialSnapshot,
      lastActiveContext: getActiveContextForIntent(intent),
    };
  }

  if (intent === CHAT_INTENTS.AFFORDABILITY_CHECK) {
    const purchaseAmount = entities.purchaseAmount || entities.amounts?.[0] || 0;
    const monthsFromYears = entities.years ? Math.round(Number(entities.years) * 12) : null;
    const months = entities.months || monthsFromYears || DEFAULT_AFFORDABILITY_MONTHS;
    const [affordability, emergency] = await Promise.all([
      calculateAffordability(userId, purchaseAmount, months),
      getEmergencyCoverage(userId),
    ]);
    const data = {
      purchaseAmount,
      months,
      affordable: affordability.affordable,
      safeAmount: affordability.safeAmount,
      projectedSavings: affordability.projectedSavings,
      emergencyCoverageMonths: emergency.coverageMonths,
    };
    const analysis = sanitizeAnalysisForLlm(data);
    const assistant = await resolveAssistantMessage({
      userQuestion: message,
      intent,
      analysis,
      chatHistory,
      financialSnapshot,
      lastActiveContext,
    });

    return {
      intent,
      confidence: contextual.confidence,
      entities: { ...entities, purchaseAmount, months },
      data: analysis,
      message: assistant.message,
      llm: assistant.llm,
      financialSnapshot,
      lastActiveContext: getActiveContextForIntent(intent),
    };
  }

  if (intent === CHAT_INTENTS.FINANCIAL_REVIEW) {
    const [health, netWorth, emergency, consistency, savings, income, expenses, breakdown, riskMetrics, rebalance] =
      await Promise.all([
      generateFinancialHealthScore(userId),
      getNetWorth(userId),
      getEmergencyCoverage(userId),
      detectInvestmentInconsistency(userId),
      calculateSavingsRate(userId),
      getAverageMonthlyIncome(userId),
      getAverageMonthlyExpenses(userId),
      getExpenseBreakdown(userId),
      buildRiskMetrics(userId),
      calculateRebalanceRecommendation(userId, {
        equityPercent: 60,
        nonEquityPercent: 25,
        emergencyPercent: 15,
      }),
    ]);

    const data = {
      health: {
        score: health.score,
      },
      netWorth,
      emergency,
      investmentConsistency: {
        inconsistent: consistency.inconsistent,
        irregularSip: consistency.irregularSip,
        decreasingTrend: consistency.decreasingTrend,
      },
      savings: {
        avgSavingsRate: savings.avgSavingsRate,
        avgIncome: income.avgIncome,
        avgExpenses: expenses.avgExpenses,
        expenseRatio: expenses.expenseRatio,
      },
      salarySplit: breakdown,
      risk: riskMetrics,
      rebalance,
    };
    const analysis = sanitizeAnalysisForLlm(data);
    const assistant = await resolveAssistantMessage({
      userQuestion: message,
      intent,
      analysis,
      chatHistory,
      financialSnapshot,
      lastActiveContext,
    });

    return {
      intent,
      confidence: contextual.confidence,
      entities,
      data: analysis,
      message: assistant.message,
      llm: assistant.llm,
      financialSnapshot,
      lastActiveContext: getActiveContextForIntent(intent),
    };
  }

  if (intent === CHAT_INTENTS.PORTFOLIO_RISK) {
    const [riskMetrics, rebalance] = await Promise.all([
      buildRiskMetrics(userId),
      calculateRebalanceRecommendation(userId, {
        equityPercent: 60,
        nonEquityPercent: 25,
        emergencyPercent: 15,
      }),
    ]);
    const data = {
      risk: riskMetrics,
      rebalance,
    };
    const analysis = sanitizeAnalysisForLlm(data);
    const assistant = await resolveAssistantMessage({
      userQuestion: message,
      intent,
      analysis,
      chatHistory,
      financialSnapshot,
      lastActiveContext,
    });

    return {
      intent,
      confidence: contextual.confidence,
      entities,
      data: analysis,
      message: assistant.message,
      llm: assistant.llm,
      financialSnapshot,
      lastActiveContext: getActiveContextForIntent(intent),
    };
  }

  if (intent === CHAT_INTENTS.CORPUS_PROJECTION) {
    const targetCorpus = entities.targetCorpus || entities.amounts?.[0] || 5_000_000;
    const expectedReturn = DEFAULT_EXPECTED_RETURN;
    const monthlyInvestment = await estimateCurrentMonthlyInvestment(userId);

    let data;
    if (entities.years) {
      const projection = await projectFutureCorpus(userId, monthlyInvestment, entities.years, expectedReturn);
      data = {
        targetCorpus,
        estimatedYears: entities.years,
        monthlyInvestment,
        projectedCorpus: projection.projectedCorpus,
        requiredMonthlyInvestment: projection.requiredMonthlyInvestment,
      };
    } else {
      data = await estimateYearsToTargetCorpus(userId, targetCorpus, monthlyInvestment, expectedReturn);
      data = { ...data, targetCorpus, monthlyInvestment };
    }
    const analysis = sanitizeAnalysisForLlm(data);
    const assistant = await resolveAssistantMessage({
      userQuestion: message,
      intent,
      analysis,
      chatHistory,
      financialSnapshot,
      lastActiveContext,
    });

    return {
      intent,
      confidence: contextual.confidence,
      entities: { ...entities, targetCorpus, monthlyInvestment, expectedReturn },
      data: analysis,
      message: assistant.message,
      llm: assistant.llm,
      financialSnapshot,
      lastActiveContext: getActiveContextForIntent(intent),
    };
  }

  if (intent === CHAT_INTENTS.SALARY_SPLIT) {
    const salaryAmount = entities.salaryAmount || entities.amounts?.[0] || Number(memory?.lastEntities?.salaryAmount) || 0;
    const split = await simulateSalarySplit(userId, salaryAmount);

    let normalizedSplit = {
      investmentsPercent: split.investments,
      emergencyPercent: split.emergency,
      needsPercent: split.needs,
      lifestylePercent: split.lifestyle,
    };

    const desiredNeedsAmount = Number(entities.desiredNeedsAmount) || 0;
    if (salaryAmount > 0 && desiredNeedsAmount > 0 && desiredNeedsAmount <= salaryAmount) {
      const desiredNeedsPercent = (desiredNeedsAmount / salaryAmount) * 100;
      const remainingPercent = Math.max(0, 100 - desiredNeedsPercent);
      const currentOther =
        normalizedSplit.investmentsPercent + normalizedSplit.emergencyPercent + normalizedSplit.lifestylePercent;
      const scale = currentOther > 0 ? remainingPercent / currentOther : 0;

      normalizedSplit = {
        investmentsPercent: roundTo(normalizedSplit.investmentsPercent * scale),
        emergencyPercent: roundTo(normalizedSplit.emergencyPercent * scale),
        needsPercent: roundTo(desiredNeedsPercent),
        lifestylePercent: roundTo(normalizedSplit.lifestylePercent * scale),
      };
    }

    const suggestedAmounts = {
      investments: roundTo((salaryAmount * normalizedSplit.investmentsPercent) / 100),
      emergency: roundTo((salaryAmount * normalizedSplit.emergencyPercent) / 100),
      needs: roundTo((salaryAmount * normalizedSplit.needsPercent) / 100),
      lifestyle: roundTo((salaryAmount * normalizedSplit.lifestylePercent) / 100),
    };

    const data = {
      salaryAmount,
      desiredNeedsAmount: desiredNeedsAmount || null,
      ...normalizedSplit,
      suggestedAmounts,
      previousSplit: memory?.lastAnalysis || null,
    };
    const analysis = sanitizeAnalysisForLlm(data);
    const assistant = await resolveAssistantMessage({
      userQuestion: message,
      intent,
      analysis,
      chatHistory,
      financialSnapshot,
      lastActiveContext,
    });

    return {
      intent,
      confidence: contextual.confidence,
      entities: { ...entities, salaryAmount },
      data: analysis,
      message: assistant.message,
      llm: assistant.llm,
      financialSnapshot,
      lastActiveContext: getActiveContextForIntent(intent),
    };
  }

  const unknownAnalysis = sanitizeAnalysisForLlm({
    hasPriorIntent: Boolean(memory?.lastIntent),
    hasPriorContext: Boolean(memory?.lastActiveContext),
    priorAnalysis: memory?.lastAnalysis || null,
  });
  const unknownAssistant = await resolveAssistantMessage({
    userQuestion: message,
    intent: CHAT_INTENTS.UNKNOWN,
    analysis: unknownAnalysis,
    chatHistory,
    financialSnapshot,
    lastActiveContext,
  });

  return {
    intent: CHAT_INTENTS.UNKNOWN,
    confidence: contextual.confidence,
    entities,
    data: unknownAnalysis,
    message: unknownAssistant.message,
    llm: unknownAssistant.llm,
    financialSnapshot,
    lastActiveContext: lastActiveContext || null,
  };
};

const formatConversation = (conversationDoc) => ({
  id: conversationDoc._id.toString(),
  title: conversationDoc.title,
  createdAt: conversationDoc.createdAt,
  updatedAt: conversationDoc.updatedAt,
  messages: (conversationDoc.messages || []).map((msg) => ({
    id: msg._id.toString(),
    role: msg.role,
    content: msg.content,
    meta: msg.meta || undefined,
    createdAt: msg.createdAt,
  })),
});

export const listChatConversations = async (userId) => {
  const conversations = await ChatConversation.find({ userId }).sort({ updatedAt: -1 });
  return conversations.map(formatConversation);
};

export const saveChatMessage = async (userId, message, conversationId = null) => {
  let conversation = null;

  if (conversationId) {
    conversation = await ChatConversation.findOne({ _id: conversationId, userId });
    if (!conversation) {
      throw createHttpError(404, 'Conversation not found');
    }
  } else {
    conversation = new ChatConversation({
      userId,
      title: message.slice(0, 40) || 'New chat',
      messages: [],
      context: {
        lastActiveContext: null,
        lastIntent: null,
        lastEntities: {},
        lastTargetCorpus: null,
        lastAnalysis: null,
      },
    });
  }

  const memory = {
    chatHistory: getLastHistory(conversation.messages || [], 5),
    lastActiveContext: conversation.context?.lastActiveContext || null,
    lastIntent: conversation.context?.lastIntent || null,
    lastEntities: conversation.context?.lastEntities || {},
    lastTargetCorpus: conversation.context?.lastTargetCorpus || null,
    lastAnalysis: conversation.context?.lastAnalysis || null,
  };

  conversation.messages.push({
    role: 'user',
    content: message,
    createdAt: new Date(),
  });

  const result = await processChatMessage(userId, message, memory);

  conversation.messages.push({
    role: 'assistant',
    content: result.message || 'No response',
    meta: {
      intent: result.intent,
      confidence: result.confidence,
      entities: result.entities,
      data: result.data,
      llm: result.llm,
      financialSnapshot: result.financialSnapshot,
      lastActiveContext: result.lastActiveContext,
    },
    createdAt: new Date(),
  });

  conversation.context = {
    lastActiveContext: result.lastActiveContext || conversation.context?.lastActiveContext || null,
    lastIntent: result.intent || conversation.context?.lastIntent || null,
    lastEntities: result.entities || {},
    lastTargetCorpus: result.entities?.targetCorpus || conversation.context?.lastTargetCorpus || null,
    lastAnalysis: result.data || null,
  };

  await conversation.save();

  return {
    ...result,
    conversation: formatConversation(conversation),
  };
};

export const deleteChatConversation = async (userId, conversationId) => {
  const deleted = await ChatConversation.findOneAndDelete({ _id: conversationId, userId });
  if (!deleted) {
    throw createHttpError(404, 'Conversation not found');
  }
};

