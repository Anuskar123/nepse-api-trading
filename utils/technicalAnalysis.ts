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
    humanSummary: string;
  };
}

export const analyzeStock = (historicalData: any[], fundamentals?: Fundamentals): TA_Result => {
  const closes = historicalData.map(d => d.close);
  const currentPrice = closes[closes.length - 1];
  
  if (closes.length < 20) {
    return {
      rsi: 50, sma50: 0, sma200: 0, macd: {}, signal: 'Hold', reasons: ['Not enough data'], patterns: [],
      verdict: { action: 'Wait', target: 0, stopLoss: 0, timeframe: 'N/A', risk: 'Medium', humanSummary: "Wait for more market data before making a move." }
    };
  }

  const rsiResult = RSI.calculate({ period: 14, values: closes });
  const currentRSI = rsiResult.length > 0 ? rsiResult[rsiResult.length - 1] : 50;

  const sma50Result = SMA.calculate({ period: Math.min(50, closes.length), values: closes });
  const currentSMA50 = sma50Result.length > 0 ? sma50Result[sma50Result.length - 1] : currentPrice;

  const sma200Result = SMA.calculate({ period: Math.min(200, closes.length), values: closes });
  const currentSMA200 = sma200Result.length > 0 ? sma200Result[sma200Result.length - 1] : currentPrice;

  let score = 0;
  const reasons = [];
  const patterns = [];

  // Beginner Friendly Reasoning
  let strengthSummary = "";
  let safetySummary = "";
  
  // Logic
  if (currentRSI < 30) {
    score += 2;
    strengthSummary = "This stock is currently very cheap because many people are selling it in panic. This is often a good time for you to buy.";
  } else if (currentRSI > 70) {
    score -= 2;
    strengthSummary = "The stock has become very expensive recently. Everyone is buying, so the price might fall soon. Be careful!";
  } else {
    strengthSummary = "The price is at a normal level right now, not too high and not too low.";
  }

  if (fundamentals) {
    if (fundamentals.eps && fundamentals.eps > 0) {
       safetySummary = "This company is making a profit, which makes it a safer choice for your money.";
       score += 1;
    } else {
       safetySummary = "This company is currently not making much profit, which makes it a bit risky.";
       score -= 1;
    }
  }

  let signal: TA_Result['signal'] = 'Hold';
  if (score >= 3) signal = 'Buy';
  else if (score <= -3) signal = 'Sell';

  const volatility = Math.max(...closes.slice(-10)) - Math.min(...closes.slice(-10));
  const target = signal === 'Buy' ? currentPrice + volatility * 2 : currentPrice - volatility * 1.5;
  const stopLoss = signal === 'Buy' ? currentPrice - volatility * 1.2 : currentPrice + volatility * 1.2;

  const humanSummary = `${strengthSummary} ${safetySummary} Our AI recommends you ${signal === 'Buy' ? 'consider buying some shares' : signal === 'Sell' ? 'think about selling to stay safe' : 'just wait and watch for now'}.`;

  return {
    rsi: currentRSI,
    sma50: currentSMA50,
    sma200: currentSMA200,
    macd: {},
    signal,
    reasons,
    patterns,
    verdict: {
      action: signal === 'Buy' ? 'GOOD TIME TO BUY' : signal === 'Sell' ? 'BETTER TO SELL' : 'WAIT AND WATCH',
      target: Number(target.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      timeframe: "7-15 Days",
      risk: score > 0 ? 'Low' : 'Medium',
      humanSummary
    }
  };
};
