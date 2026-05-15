/**
 * AI Prediction Tracker — Self-Learning System
 * 
 * Saves predictions when made, then compares actual outcomes
 * when market data updates. Tracks accuracy over time and
 * adjusts confidence multipliers to improve future predictions.
 */

// Prediction record structure
export interface PredictionRecord {
  id: string;
  symbol: string;
  predictedAt: string;        // ISO date when prediction was made
  priceAtPrediction: number;  // LTP when prediction was made
  predictedTarget: number;    // AI's target price
  predictedStopLoss: number;  // AI's stop loss
  predictedSignal: string;    // 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  predictedDirection: 'UP' | 'DOWN' | 'NEUTRAL'; 
  timeframeLabel: string;     // e.g. '7-15 Days'
  
  // Filled after market updates
  actualPriceAfter?: number;
  actualHighAfter?: number;
  actualLowAfter?: number;
  checkedAt?: string;
  outcome?: 'HIT_TARGET' | 'HIT_STOPLOSS' | 'PARTIAL_CORRECT' | 'WRONG' | 'PENDING';
  accuracyScore?: number;     // 0-100
  notes?: string;
}

export interface LearningStats {
  totalPredictions: number;
  correctPredictions: number;
  partialCorrect: number;
  wrongPredictions: number;
  pendingPredictions: number;
  overallAccuracy: number;      // percentage 0-100
  directionAccuracy: number;    // % of times direction was correct
  avgTargetDeviation: number;   // avg % difference from target
  confidenceMultiplier: number; // learned adjustment factor (0.5 - 1.5)
  streakCurrent: number;        // current correct streak
  streakBest: number;           // best correct streak ever
  lastUpdated: string;
}

// In-memory storage (persisted via cache functions)
let predictions: PredictionRecord[] = [];
let learningStats: LearningStats = getDefaultStats();

function getDefaultStats(): LearningStats {
  return {
    totalPredictions: 0,
    correctPredictions: 0,
    partialCorrect: 0,
    wrongPredictions: 0,
    pendingPredictions: 0,
    overallAccuracy: 0,
    directionAccuracy: 0,
    avgTargetDeviation: 0,
    confidenceMultiplier: 1.0,
    streakCurrent: 0,
    streakBest: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// Generate unique ID
function generateId(): string {
  return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// ============================================================
// PERSISTENCE (AsyncStorage when available, memory otherwise)
// ============================================================
const PREDICTIONS_KEY = '@nepse_predictions';
const STATS_KEY = '@nepse_learning_stats';

let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  // Not available
}

async function savePersistent() {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(PREDICTIONS_KEY, JSON.stringify(predictions));
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(learningStats));
  } catch (e) {
    console.warn('PredictionTracker save failed:', e);
  }
}

async function loadPersistent() {
  if (!AsyncStorage) return;
  try {
    const predRaw = await AsyncStorage.getItem(PREDICTIONS_KEY);
    if (predRaw) predictions = JSON.parse(predRaw);
    const statsRaw = await AsyncStorage.getItem(STATS_KEY);
    if (statsRaw) learningStats = JSON.parse(statsRaw);
  } catch (e) {
    console.warn('PredictionTracker load failed:', e);
  }
}

// Initialize on import
loadPersistent();

// ============================================================
// CORE API
// ============================================================

/**
 * Save a new prediction when the AI makes one
 */
export async function savePrediction(
  symbol: string,
  currentPrice: number,
  target: number,
  stopLoss: number,
  signal: string,
  timeframe: string
): Promise<PredictionRecord> {
  let direction: 'UP' | 'DOWN' | 'NEUTRAL';
  if (signal === 'Strong Buy' || signal === 'Buy') direction = 'UP';
  else if (signal === 'Strong Sell' || signal === 'Sell') direction = 'DOWN';
  else direction = 'NEUTRAL';

  const record: PredictionRecord = {
    id: generateId(),
    symbol,
    predictedAt: new Date().toISOString(),
    priceAtPrediction: currentPrice,
    predictedTarget: target,
    predictedStopLoss: stopLoss,
    predictedSignal: signal,
    predictedDirection: direction,
    timeframeLabel: timeframe,
    outcome: 'PENDING',
  };

  // Avoid duplicate predictions for same symbol on same day
  const today = new Date().toISOString().split('T')[0];
  const existing = predictions.find(
    p => p.symbol === symbol && p.predictedAt.startsWith(today)
  );
  if (existing) {
    // Update existing prediction instead of adding duplicate
    Object.assign(existing, record, { id: existing.id });
  } else {
    predictions.push(record);
  }

  // Keep only last 100 predictions
  if (predictions.length > 100) {
    predictions = predictions.slice(-100);
  }

  learningStats.pendingPredictions = predictions.filter(p => p.outcome === 'PENDING').length;
  learningStats.totalPredictions = predictions.length;

  await savePersistent();
  return record;
}

/**
 * Check all pending predictions against current market data
 * Called whenever fresh market data is fetched
 */
export async function evaluatePredictions(currentMarketData: any[]): Promise<{
  evaluated: number;
  correct: number;
  wrong: number;
}> {
  if (!currentMarketData || currentMarketData.length === 0) return { evaluated: 0, correct: 0, wrong: 0 };

  const marketMap = new Map<string, any>();
  currentMarketData.forEach(s => marketMap.set(s.symbol, s));

  let evaluated = 0;
  let correct = 0;
  let wrong = 0;

  for (const pred of predictions) {
    if (pred.outcome !== 'PENDING') continue;

    const stock = marketMap.get(pred.symbol);
    if (!stock) continue;

    const predDate = new Date(pred.predictedAt);
    const now = new Date();
    const daysSince = (now.getTime() - predDate.getTime()) / (1000 * 60 * 60 * 24);

    // Only evaluate after at least 1 trading day has passed
    if (daysSince < 0.5) continue;

    const currentPrice = stock.ltp;
    const highSince = stock.high || currentPrice;
    const lowSince = stock.low || currentPrice;

    pred.actualPriceAfter = currentPrice;
    pred.actualHighAfter = highSince;
    pred.actualLowAfter = lowSince;
    pred.checkedAt = now.toISOString();

    // Evaluate the prediction
    const priceMoved = currentPrice - pred.priceAtPrediction;
    const priceMovedPct = (priceMoved / pred.priceAtPrediction) * 100;
    const targetDistance = Math.abs(pred.predictedTarget - pred.priceAtPrediction);
    const actualDistance = Math.abs(currentPrice - pred.priceAtPrediction);

    if (pred.predictedDirection === 'UP') {
      if (currentPrice >= pred.predictedTarget || highSince >= pred.predictedTarget) {
        pred.outcome = 'HIT_TARGET';
        pred.accuracyScore = 100;
        pred.notes = `✅ Target hit! Predicted Rs.${pred.predictedTarget.toFixed(0)}, reached Rs.${Math.max(currentPrice, highSince).toFixed(0)}`;
        correct++;
      } else if (currentPrice <= pred.predictedStopLoss || lowSince <= pred.predictedStopLoss) {
        pred.outcome = 'HIT_STOPLOSS';
        pred.accuracyScore = 0;
        pred.notes = `❌ Stop loss hit. Price dropped to Rs.${Math.min(currentPrice, lowSince).toFixed(0)} instead of rising.`;
        wrong++;
      } else if (priceMoved > 0) {
        // Price moved in right direction but hasn't hit target yet
        const progress = actualDistance / targetDistance;
        if (daysSince > 15) {
          // Timeframe expired
          pred.outcome = progress > 0.5 ? 'PARTIAL_CORRECT' : 'WRONG';
          pred.accuracyScore = Math.min(80, Math.round(progress * 100));
          pred.notes = progress > 0.5
            ? `⚠️ Partially correct — moved ${priceMovedPct.toFixed(1)}% toward target`
            : `❌ Direction was right but insufficient movement (${priceMovedPct.toFixed(1)}%)`;
          if (progress > 0.5) correct++; else wrong++;
        }
        // else: still pending, within timeframe
      } else if (daysSince > 15) {
        pred.outcome = 'WRONG';
        pred.accuracyScore = 10;
        pred.notes = `❌ Predicted UP but price went DOWN by ${Math.abs(priceMovedPct).toFixed(1)}%`;
        wrong++;
      }
    } else if (pred.predictedDirection === 'DOWN') {
      if (currentPrice <= pred.predictedTarget || lowSince <= pred.predictedTarget) {
        pred.outcome = 'HIT_TARGET';
        pred.accuracyScore = 100;
        pred.notes = `✅ Target hit! Predicted drop to Rs.${pred.predictedTarget.toFixed(0)}, reached Rs.${Math.min(currentPrice, lowSince).toFixed(0)}`;
        correct++;
      } else if (currentPrice >= pred.predictedStopLoss) {
        pred.outcome = 'HIT_STOPLOSS';
        pred.accuracyScore = 0;
        pred.notes = `❌ Stop loss hit. Price rose to Rs.${currentPrice.toFixed(0)} instead of falling.`;
        wrong++;
      } else if (daysSince > 15) {
        const progress = priceMoved < 0 ? actualDistance / targetDistance : 0;
        pred.outcome = progress > 0.5 ? 'PARTIAL_CORRECT' : 'WRONG';
        pred.accuracyScore = Math.round(progress * 100);
        pred.notes = progress > 0.5
          ? `⚠️ Partially correct — dropped ${Math.abs(priceMovedPct).toFixed(1)}%`
          : `❌ Prediction didn't play out (${priceMovedPct.toFixed(1)}% move)`;
        if (progress > 0.5) correct++; else wrong++;
      }
    } else {
      // NEUTRAL prediction
      if (daysSince > 7) {
        if (Math.abs(priceMovedPct) < 2) {
          pred.outcome = 'HIT_TARGET';
          pred.accuracyScore = 90;
          pred.notes = `✅ Correctly predicted sideways movement (${priceMovedPct.toFixed(1)}%)`;
          correct++;
        } else {
          pred.outcome = 'WRONG';
          pred.accuracyScore = 30;
          pred.notes = `⚠️ Predicted sideways but price moved ${priceMovedPct.toFixed(1)}%`;
          wrong++;
        }
      }
    }

    if (pred.outcome !== 'PENDING') evaluated++;
  }

  // Recalculate learning stats
  recalculateStats();
  await savePersistent();

  return { evaluated, correct, wrong };
}

/**
 * Recalculate all learning statistics from prediction history
 */
function recalculateStats() {
  const resolved = predictions.filter(p => p.outcome !== 'PENDING');
  const pending = predictions.filter(p => p.outcome === 'PENDING');

  const correctPredictions = resolved.filter(p => 
    p.outcome === 'HIT_TARGET' || p.outcome === 'PARTIAL_CORRECT'
  ).length;
  const wrongPredictions = resolved.filter(p => 
    p.outcome === 'HIT_STOPLOSS' || p.outcome === 'WRONG'
  ).length;

  // Direction accuracy
  const directionCorrect = resolved.filter(p => {
    if (!p.actualPriceAfter) return false;
    const moved = p.actualPriceAfter - p.priceAtPrediction;
    if (p.predictedDirection === 'UP' && moved > 0) return true;
    if (p.predictedDirection === 'DOWN' && moved < 0) return true;
    if (p.predictedDirection === 'NEUTRAL' && Math.abs(moved / p.priceAtPrediction) < 0.02) return true;
    return false;
  }).length;

  // Average target deviation
  const deviations = resolved
    .filter(p => p.actualPriceAfter !== undefined)
    .map(p => {
      const targetDist = Math.abs(p.predictedTarget - p.priceAtPrediction);
      const actualDist = Math.abs(p.actualPriceAfter! - p.priceAtPrediction);
      return targetDist > 0 ? ((actualDist - targetDist) / targetDist) * 100 : 0;
    });
  const avgDeviation = deviations.length > 0 
    ? deviations.reduce((a, b) => a + b, 0) / deviations.length 
    : 0;

  // Calculate streaks
  let currentStreak = 0;
  let bestStreak = 0;
  for (const pred of resolved.sort((a, b) => a.predictedAt.localeCompare(b.predictedAt))) {
    if (pred.outcome === 'HIT_TARGET' || pred.outcome === 'PARTIAL_CORRECT') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Confidence multiplier: adjusts future predictions based on past accuracy
  // If consistently right → increase targets. If consistently wrong → be more conservative.
  const accuracy = resolved.length > 0 ? (correctPredictions / resolved.length) * 100 : 50;
  let confidenceMultiplier = 1.0;
  if (resolved.length >= 5) {
    if (accuracy >= 70) confidenceMultiplier = 1.15;      // More aggressive targets
    else if (accuracy >= 60) confidenceMultiplier = 1.05;
    else if (accuracy >= 40) confidenceMultiplier = 1.0;   // Stay neutral
    else if (accuracy >= 25) confidenceMultiplier = 0.85;  // More conservative
    else confidenceMultiplier = 0.7;                       // Very conservative
  }

  learningStats = {
    totalPredictions: predictions.length,
    correctPredictions,
    partialCorrect: resolved.filter(p => p.outcome === 'PARTIAL_CORRECT').length,
    wrongPredictions,
    pendingPredictions: pending.length,
    overallAccuracy: Math.round(accuracy),
    directionAccuracy: resolved.length > 0 ? Math.round((directionCorrect / resolved.length) * 100) : 0,
    avgTargetDeviation: Math.round(avgDeviation * 10) / 10,
    confidenceMultiplier,
    streakCurrent: currentStreak,
    streakBest: bestStreak,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================
// GETTERS
// ============================================================

export function getPredictions(): PredictionRecord[] {
  return [...predictions].sort((a, b) => b.predictedAt.localeCompare(a.predictedAt));
}

export function getPredictionsForSymbol(symbol: string): PredictionRecord[] {
  return predictions
    .filter(p => p.symbol === symbol)
    .sort((a, b) => b.predictedAt.localeCompare(a.predictedAt));
}

export function getLearningStats(): LearningStats {
  return { ...learningStats };
}

export function getConfidenceMultiplier(): number {
  return learningStats.confidenceMultiplier;
}

/**
 * Get adjusted target/stopLoss based on learning
 */
export function getAdjustedLevels(
  baseTarget: number,
  baseStopLoss: number,
  currentPrice: number
): { target: number; stopLoss: number; confidence: string } {
  const mult = learningStats.confidenceMultiplier;
  const targetDist = (baseTarget - currentPrice) * mult;
  const stopDist = (currentPrice - baseStopLoss) * mult;

  let confidence: string;
  if (learningStats.totalPredictions < 5) confidence = 'Learning (< 5 predictions)';
  else if (learningStats.overallAccuracy >= 70) confidence = 'High Confidence';
  else if (learningStats.overallAccuracy >= 50) confidence = 'Moderate Confidence';
  else confidence = 'Low Confidence';

  return {
    target: Number((currentPrice + targetDist).toFixed(2)),
    stopLoss: Number((currentPrice - stopDist).toFixed(2)),
    confidence,
  };
}

/**
 * Get a human-readable summary of AI learning progress
 */
export function getLearningInsight(): string {
  const s = learningStats;
  if (s.totalPredictions === 0) {
    return "The AI hasn't made any predictions yet. Search for a stock to start tracking prediction accuracy!";
  }
  if (s.totalPredictions < 5) {
    return `AI has ${s.totalPredictions} prediction(s) so far. Need at least 5 to start learning patterns. ${s.pendingPredictions} awaiting market update.`;
  }

  const resolved = s.totalPredictions - s.pendingPredictions;
  let insight = `AI has made ${s.totalPredictions} predictions. `;
  
  if (resolved > 0) {
    insight += `Overall accuracy: ${s.overallAccuracy}% (${s.correctPredictions} correct, ${s.wrongPredictions} wrong). `;
    insight += `Direction accuracy: ${s.directionAccuracy}%. `;
    
    if (s.streakCurrent > 2) {
      insight += `🔥 Current winning streak: ${s.streakCurrent}! `;
    }
    if (s.overallAccuracy >= 70) {
      insight += `The AI is performing well and has increased its confidence in targets.`;
    } else if (s.overallAccuracy >= 50) {
      insight += `The AI is learning and improving with each market session.`;
    } else {
      insight += `The AI has adjusted to be more conservative based on past results.`;
    }
  } else {
    insight += `All ${s.pendingPredictions} predictions are awaiting market updates to verify.`;
  }

  return insight;
}
