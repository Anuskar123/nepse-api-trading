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
}

export const analyzeStock = (historicalData: any[], fundamentals?: Fundamentals): TA_Result => {
  const closes = historicalData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  
  if (closes.length < 14) {
    return {
      rsi: 50, sma50: 0, sma200: 0, macd: {}, signal: 'Hold', reasons: ['Not enough data']
    };
  }

  const rsiResult = RSI.calculate({ period: 14, values: closes });
  const currentRSI = rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : 50;

  const sma50Result = SMA.calculate({ period: Math.min(50, closes.length), values: closes });
  const currentSMA50 = sma50Result.length > 0 ? sma50Result[sma50Result.length - 1] : currentPrice;

  const sma200Result = SMA.calculate({ period: Math.min(200, closes.length), values: closes });
  const currentSMA200 = sma200Result.length > 0 ? sma200Result[sma200Result.length - 1] : currentPrice;

  const macdResult = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  const currentMACD = macdResult.length > 0 ? macdResult[macdResult.length - 1] : {};

  let score = 0;
  const reasons = [];

  // --- FUNDAMENTAL ANALYSIS (From your Guide) ---
  if (fundamentals) {
    // P/E Ratio Logic: Generally < 20 is considered undervalued/fair in NEPSE
    if (fundamentals.peRatio && fundamentals.peRatio > 0) {
      if (fundamentals.peRatio < 15) {
        score += 2;
        reasons.push(`Favorable P/E Ratio (${fundamentals.peRatio.toFixed(2)}). Stock appears undervalued.`);
      } else if (fundamentals.peRatio > 40) {
        score -= 2;
        reasons.push(`High P/E Ratio (${fundamentals.peRatio.toFixed(2)}). Stock may be overvalued.`);
      }
    }

    // EPS Logic: Profitability is key
    if (fundamentals.eps !== undefined) {
      if (fundamentals.eps > 0) {
        score += 1;
        reasons.push(`Positive EPS (Rs. ${fundamentals.eps}). Company is profitable.`);
      } else {
        score -= 2;
        reasons.push(`Negative EPS. Company is currently reporting losses.`);
      }
    }

    // Price to Book Value Logic
    if (fundamentals.bookValue && fundamentals.bookValue > 0) {
      const priceToBook = currentPrice / fundamentals.bookValue;
      if (priceToBook < 1) {
        score += 2;
        reasons.push(`Trading below Book Value (P/B: ${priceToBook.toFixed(2)}). Strong value play.`);
      } else if (priceToBook > 5) {
        score -= 1;
        reasons.push(`Trading at high P/B ratio (${priceToBook.toFixed(2)}). Overextended valuation.`);
      }
    }
  }

  // --- TECHNICAL ANALYSIS ---
  // RSI Logic
  if (currentRSI < 30) {
    score += 2;
    reasons.push(`RSI is ${currentRSI.toFixed(2)} (Oversold). Technical bounce likely.`);
  } else if (currentRSI > 70) {
    score -= 2;
    reasons.push(`RSI is ${currentRSI.toFixed(2)} (Overbought). Possible pullback.`);
  }

  // Moving Average Logic
  if (currentPrice > currentSMA50) {
    score += 1;
    reasons.push(`Bullish short-term: Price is above 50-day SMA.`);
  } else {
    score -= 1;
    reasons.push(`Bearish short-term: Price is below 50-day SMA.`);
  }

  // MACD Logic
  if (currentMACD && currentMACD.histogram !== undefined) {
    if (currentMACD.histogram > 0) {
      score += 1;
      reasons.push(`Positive MACD momentum.`);
    } else {
      score -= 1;
      reasons.push(`Negative MACD momentum.`);
    }
  }

  // FINAL SIGNAL ASSIGNMENT
  let signal: TA_Result['signal'] = 'Hold';
  if (score >= 4) signal = 'Strong Buy';
  else if (score >= 2) signal = 'Buy';
  else if (score <= -4) signal = 'Strong Sell';
  else if (score <= -2) signal = 'Sell';

  return {
    rsi: currentRSI,
    sma50: currentSMA50,
    sma200: currentSMA200,
    macd: currentMACD,
    signal,
    reasons
  };
};
