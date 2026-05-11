import { RSI, SMA } from 'technicalindicators';

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
    humanSummary: string;
  };
}

export const analyzeStock = (historicalData: any[], fundamentals?: Fundamentals): TA_Result => {
  const closes = historicalData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];

  if (closes.length < 20) {
    return {
      rsi: 50, sma50: currentPrice, sma200: currentPrice, macd: {},
      signal: 'Hold', reasons: ['Not enough historical data for analysis.'], patterns: [],
      verdict: { action: 'WAIT AND WATCH', target: currentPrice, stopLoss: currentPrice, timeframe: 'N/A', risk: 'Medium', humanSummary: "We don't have enough data to analyze this stock yet. Wait for more trading days." }
    };
  }

  // Calculate indicators
  const rsiResult = RSI.calculate({ period: 14, values: closes });
  const currentRSI = rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : 50;

  const sma20Result = SMA.calculate({ period: 20, values: closes });
  const currentSMA20 = sma20Result.length > 0 ? sma20Result[sma20Result.length - 1] : currentPrice;

  const sma50Result = SMA.calculate({ period: Math.min(50, closes.length), values: closes });
  const currentSMA50 = sma50Result.length > 0 ? sma50Result[sma50Result.length - 1] : currentPrice;

  const sma200Result = SMA.calculate({ period: Math.min(200, closes.length), values: closes });
  const currentSMA200 = sma200Result.length > 0 ? sma200Result[sma200Result.length - 1] : currentPrice;

  // Calculate average volatility (for realistic targets)
  const recentCloses = closes.slice(-20);
  const avgDailyMove = recentCloses.reduce((sum, c, i) => {
    if (i === 0) return 0;
    return sum + Math.abs(c - recentCloses[i - 1]);
  }, 0) / (recentCloses.length - 1);

  // Scoring system
  let score = 0;
  const reasons: string[] = [];
  const patterns: string[] = [];

  // RSI Analysis
  if (currentRSI < 30) {
    score += 2;
    reasons.push(`RSI is ${currentRSI.toFixed(1)} (Oversold) — the stock has been heavily sold. It could bounce back up soon.`);
  } else if (currentRSI > 70) {
    score -= 2;
    reasons.push(`RSI is ${currentRSI.toFixed(1)} (Overbought) — too many people are buying. The price might correct downward.`);
  } else {
    reasons.push(`RSI is ${currentRSI.toFixed(1)} (Neutral) — the stock is not overbought or oversold right now.`);
  }

  // SMA Crossover
  if (currentPrice > currentSMA50) {
    score += 1;
    reasons.push(`Price (Rs. ${currentPrice.toFixed(0)}) is above SMA 50 (Rs. ${currentSMA50.toFixed(0)}) — short-term trend is UP.`);
  } else {
    score -= 1;
    reasons.push(`Price (Rs. ${currentPrice.toFixed(0)}) is below SMA 50 (Rs. ${currentSMA50.toFixed(0)}) — short-term trend is DOWN.`);
  }

  if (currentPrice > currentSMA200) {
    score += 1;
    reasons.push(`Price is above SMA 200 — long-term trend is bullish.`);
  } else {
    score -= 1;
    reasons.push(`Price is below SMA 200 — long-term trend is bearish.`);
  }

  // Momentum (recent movement)
  const price5dAgo = closes[closes.length - 6] || currentPrice;
  const recentReturn = ((currentPrice - price5dAgo) / price5dAgo) * 100;
  if (recentReturn > 3) {
    score += 1;
    reasons.push(`Stock gained ${recentReturn.toFixed(1)}% in the last 5 days — strong recent momentum.`);
  } else if (recentReturn < -3) {
    score -= 1;
    reasons.push(`Stock fell ${recentReturn.toFixed(1)}% in the last 5 days — weak recent momentum.`);
  }

  // Fundamentals (only if available)
  let fundSummary = "";
  if (fundamentals && fundamentals.eps !== undefined) {
    if (fundamentals.eps > 20) {
      score += 2;
      fundSummary = `The company has strong earnings (EPS: Rs. ${fundamentals.eps}). It's a fundamentally solid business.`;
      reasons.push(fundSummary);
    } else if (fundamentals.eps > 0) {
      score += 1;
      fundSummary = `The company is profitable (EPS: Rs. ${fundamentals.eps}), but earnings are moderate.`;
      reasons.push(fundSummary);
    } else {
      score -= 1;
      fundSummary = `The company has negative or zero EPS. It's not making money — this is risky.`;
      reasons.push(fundSummary);
    }
  }

  // Determine signal
  let signal: TA_Result['signal'];
  if (score >= 4) signal = 'Strong Buy';
  else if (score >= 2) signal = 'Buy';
  else if (score <= -4) signal = 'Strong Sell';
  else if (score <= -2) signal = 'Sell';
  else signal = 'Hold';

  // Calculate TARGET and STOP LOSS correctly
  const targetMultiplier = avgDailyMove * 10; // ~10 days of avg movement
  let target: number;
  let stopLoss: number;

  if (signal === 'Strong Buy' || signal === 'Buy') {
    target = Number((currentPrice + targetMultiplier).toFixed(2));
    stopLoss = Number((currentPrice - targetMultiplier * 0.6).toFixed(2));
  } else if (signal === 'Strong Sell' || signal === 'Sell') {
    // For sell: target is LOWER (where you think it'll drop to), stop loss is HIGHER (where to cut loss if it goes up)
    target = Number((currentPrice - targetMultiplier).toFixed(2));
    stopLoss = Number((currentPrice + targetMultiplier * 0.6).toFixed(2));
  } else {
    target = Number((currentPrice + targetMultiplier * 0.5).toFixed(2));
    stopLoss = Number((currentPrice - targetMultiplier * 0.5).toFixed(2));
  }

  // Ensure target and stop loss are positive and sensible
  target = Math.max(target, currentPrice * 0.5);
  stopLoss = Math.max(stopLoss, currentPrice * 0.5);

  // Risk
  const risk: 'Low' | 'Medium' | 'High' = Math.abs(score) >= 3 ? 'Low' : Math.abs(score) >= 1 ? 'Medium' : 'High';

  // Action text
  let action: string;
  if (signal === 'Strong Buy') action = 'STRONG BUY 🟢';
  else if (signal === 'Buy') action = 'GOOD TIME TO BUY';
  else if (signal === 'Strong Sell') action = 'SELL NOW ⛔';
  else if (signal === 'Sell') action = 'CONSIDER SELLING';
  else action = 'WAIT AND WATCH';

  // Human Summary
  const summaryParts: string[] = [];
  if (currentRSI > 70) summaryParts.push("The stock is currently overbought — many people bought recently, so the price might drop soon.");
  else if (currentRSI < 30) summaryParts.push("The stock is oversold — many people sold in panic. This might be a buying opportunity.");
  else summaryParts.push("The stock is trading at a normal level — not too expensive and not too cheap.");

  if (currentPrice > currentSMA50) summaryParts.push("The short-term trend (SMA 50) is pointing UP, which is a positive sign.");
  else summaryParts.push("The short-term trend (SMA 50) is pointing DOWN, so be cautious.");

  if (fundSummary) summaryParts.push(fundSummary);

  if (signal === 'Buy' || signal === 'Strong Buy') {
    summaryParts.push(`Our AI recommends buying. Set your target at Rs. ${target} and stop-loss at Rs. ${stopLoss} to protect your investment.`);
  } else if (signal === 'Sell' || signal === 'Strong Sell') {
    summaryParts.push(`Our AI recommends selling or avoiding this stock right now. If you already hold it, consider exiting.`);
  } else {
    summaryParts.push(`Our AI recommends waiting. Don't buy or sell yet — watch for a clearer signal.`);
  }

  return {
    rsi: currentRSI,
    sma50: currentSMA50,
    sma200: currentSMA200,
    macd: {},
    signal,
    reasons,
    patterns,
    verdict: {
      action,
      target,
      stopLoss,
      timeframe: '7-15 Days',
      risk,
      humanSummary: summaryParts.join(' '),
    }
  };
};
