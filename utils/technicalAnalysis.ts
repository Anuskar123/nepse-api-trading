import { RSI, SMA, MACD } from 'technicalindicators';

export interface Fundamentals {
  eps?: number;
  bookValue?: number;
  peRatio?: number;
  return120?: string;
  return1Year?: string;
}

export interface TA_Result {
  rsi: number;
  sma50: number;
  sma200: number;
  macd: { MACD?: number; signal?: number; histogram?: number };
  signal: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  reasons: string[];
  patterns: string[];
  verdict: {
    action: string;
    target: number;
    stopLoss: number;
    timeframe: string;
    risk: 'Low' | 'Medium' | 'High';
  };
}

export const analyzeStock = (historicalData: any[], fundamentals?: Fundamentals): TA_Result => {
  const closes = historicalData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  
  if (closes.length < 20) {
    return {
      rsi: 50, sma50: 0, sma200: 0, macd: {}, signal: 'Hold', reasons: ['Not enough data'], patterns: [],
      verdict: { action: 'Wait', target: 0, stopLoss: 0, timeframe: 'N/A', risk: 'Medium' }
    };
  }

  const rsiResult = RSI.calculate({ period: 14, values: closes });
  const currentRSI = rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : 50;

  const sma50Result = SMA.calculate({ period: Math.min(50, closes.length), values: closes });
  const currentSMA50 = sma50Result.length > 0 ? sma50Result[sma50Result.length - 1] : currentPrice;

  const sma200Result = SMA.calculate({ period: Math.min(200, closes.length), values: closes });
  const currentSMA200 = sma200Result.length > 0 ? sma200Result[sma200Result.length - 1] : currentPrice;

  const macdResult = MACD.calculate({
    values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
    SimpleMAOscillator: false, SimpleMASignal: false
  });
  const currentMACD = macdResult.length > 0 ? macdResult[macdResult.length - 1] : {};

  let score = 0;
  const reasons = [];
  const detectedPatterns = [];

  // 1. Chart Patterns & Trends
  if (closes.length >= 60) {
    const last60 = closes.slice(-60);
    const min = Math.min(...last60);
    const lowIndices = [];
    for (let i = 0; i < last60.length; i++) {
       if (last60[i] < min * 1.02) lowIndices.push(i);
    }
    if (lowIndices.length >= 2 && (lowIndices[lowIndices.length-1] - lowIndices[0] > 20)) {
       detectedPatterns.push("Double Bottom (Bullish Reversal)");
       score += 2;
    }
  }

  if (currentPrice > currentSMA200) score += 1;
  else score -= 1;

  // 2. Fundamentals
  if (fundamentals) {
    if (fundamentals.peRatio && fundamentals.peRatio < 15) score += 2;
    if (fundamentals.peRatio && fundamentals.peRatio > 40) score -= 2;
    if (fundamentals.eps && fundamentals.eps > 0) score += 1;
    if (fundamentals.bookValue && currentPrice < fundamentals.bookValue) score += 2;
  }

  // 3. Technicals
  if (currentRSI < 35) score += 2;
  if (currentRSI > 65) score -= 2;

  // SIGNAL
  let signal: TA_Result['signal'] = 'Hold';
  if (score >= 4) signal = 'Strong Buy';
  else if (score >= 2) signal = 'Buy';
  else if (score <= -4) signal = 'Strong Sell';
  else if (score <= -2) signal = 'Sell';

  // --- CALCULATION OF TARGET & STOP LOSS ---
  const volatility = Math.max(...closes.slice(-10)) - Math.min(...closes.slice(-10));
  const target = signal.includes('Buy') ? currentPrice + volatility * 2 : currentPrice - volatility * 1.5;
  const stopLoss = signal.includes('Buy') ? currentPrice - volatility * 1.2 : currentPrice + volatility * 1.2;

  // Detailed Reasoning
  if (signal.includes('Buy')) {
    reasons.push("Strong accumulation phase detected. RSI & Fundamentals align for upside.");
  } else if (signal.includes('Sell')) {
    reasons.push("Distribution phase or overvaluation detected. Exit to protect capital.");
  } else {
    reasons.push("Market consolidation. No clear breakout signal yet.");
  }

  return {
    rsi: currentRSI,
    sma50: currentSMA50,
    sma200: currentSMA200,
    macd: currentMACD,
    signal,
    reasons,
    patterns: detectedPatterns,
    verdict: {
      action: signal === 'Strong Buy' ? 'ACCUMULATE HEAVILY' : signal === 'Buy' ? 'ENTER POSITION' : signal === 'Hold' ? 'MAINTAIN' : 'EXIT/SELL',
      target: Number(target.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      timeframe: score >= 4 ? '15-30 Days' : 'Short Term (7-14 Days)',
      risk: fundamentals && fundamentals.peRatio && fundamentals.peRatio < 20 ? 'Low' : 'Medium'
    }
  };
};
