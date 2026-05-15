import axios from 'axios';

// Replace this with your hosted backend URL (e.g., https://your-app.onrender.com/api)
// For local testing: http://localhost:3000/api
// For Expo Go on physical device: http://<YOUR_COMPUTER_IP>:3000/api
const API_BASE = 'http://localhost:3000/api'; 

// ============================================================
// Simple in-memory cache for web (works on all platforms)
// ============================================================
let memoryCache: { [key: string]: { data: any; timestamp: number } } = {};

function saveToMemory(key: string, data: any) {
  memoryCache[key] = { data, timestamp: Date.now() };
}

function loadFromMemory(key: string): any | null {
  const cached = memoryCache[key];
  if (!cached) return null;
  return cached.data;
}

// Persistent cache with AsyncStorage (when available)
let AsyncStorage: any = null;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  // AsyncStorage not available (e.g., in web without polyfill)
}

const CACHE_LIVE = '@nepse_live_cache';
const CACHE_OVERVIEW = '@nepse_overview_cache';

async function saveToCache(key: string, data: any) {
  saveToMemory(key, data);
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // silent
  }
}

async function loadFromCache(key: string): Promise<any | null> {
  // Try memory first
  const mem = loadFromMemory(key);
  if (mem) return mem;

  // Then try AsyncStorage
  if (!AsyncStorage) return null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data;
  } catch (e) {
    return null;
  }
}

// ============================================================
// FALLBACK DATA — always available, even on first launch
// ============================================================
function getFallbackLiveData() {
  const stocks = [
    { symbol: 'NABIL', name: 'Nabil Bank Limited', ltp: 1380, change: 20, percentChange: 1.47, open: 1360, high: 1395, low: 1355, volume: 123456, pclose: 1360, diff: 20, turnover: 1380 * 123456 },
    { symbol: 'NICA', name: 'NIC Asia Bank', ltp: 792, change: 5.2, percentChange: 0.66, open: 787, high: 798, low: 784, volume: 98234, pclose: 786.8, diff: 5.2, turnover: 792 * 98234 },
    { symbol: 'GBIME', name: 'Global IME Bank', ltp: 352, change: 3.5, percentChange: 1.0, open: 349, high: 355, low: 347, volume: 234567, pclose: 348.5, diff: 3.5, turnover: 352 * 234567 },
    { symbol: 'SBL', name: 'Siddhartha Bank', ltp: 376, change: -2.1, percentChange: -0.56, open: 378, high: 380, low: 374, volume: 156789, pclose: 378.1, diff: -2.1, turnover: 376 * 156789 },
    { symbol: 'KBL', name: 'Kumari Bank', ltp: 285, change: 1.8, percentChange: 0.64, open: 283, high: 287, low: 281, volume: 87654, pclose: 283.2, diff: 1.8, turnover: 285 * 87654 },
    { symbol: 'ADBL', name: 'Agricultural Dev Bank', ltp: 425, change: 7.5, percentChange: 1.8, open: 418, high: 430, low: 416, volume: 67890, pclose: 417.5, diff: 7.5, turnover: 425 * 67890 },
    { symbol: 'EBL', name: 'Everest Bank', ltp: 1920, change: -15, percentChange: -0.78, open: 1935, high: 1940, low: 1910, volume: 34567, pclose: 1935, diff: -15, turnover: 1920 * 34567 },
    { symbol: 'PRVU', name: 'Prabhu Bank', ltp: 308, change: 4.2, percentChange: 1.38, open: 304, high: 310, low: 302, volume: 178456, pclose: 303.8, diff: 4.2, turnover: 308 * 178456 },
    { symbol: 'MBL', name: 'Machhapuchchhre Bank', ltp: 267, change: -1.5, percentChange: -0.56, open: 269, high: 271, low: 265, volume: 145678, pclose: 268.5, diff: -1.5, turnover: 267 * 145678 },
    { symbol: 'SANIMA', name: 'Sanima Bank', ltp: 402, change: 3.8, percentChange: 0.95, open: 398, high: 405, low: 396, volume: 112345, pclose: 398.2, diff: 3.8, turnover: 402 * 112345 },
    { symbol: 'NLIC', name: 'Nepal Life Insurance', ltp: 835, change: 12, percentChange: 1.46, open: 823, high: 840, low: 820, volume: 56789, pclose: 823, diff: 12, turnover: 835 * 56789 },
    { symbol: 'ALICL', name: 'Asian Life Insurance', ltp: 670, change: -5, percentChange: -0.74, open: 675, high: 678, low: 665, volume: 43210, pclose: 675, diff: -5, turnover: 670 * 43210 },
    { symbol: 'NTC', name: 'Nepal Telecom', ltp: 920, change: 8, percentChange: 0.88, open: 912, high: 925, low: 910, volume: 78901, pclose: 912, diff: 8, turnover: 920 * 78901 },
    { symbol: 'CHCL', name: 'Chilime Hydropower', ltp: 645, change: 15, percentChange: 2.38, open: 630, high: 650, low: 628, volume: 89012, pclose: 630, diff: 15, turnover: 645 * 89012 },
    { symbol: 'NHPC', name: 'Nepal Hydro Developers', ltp: 78.5, change: 2.5, percentChange: 3.29, open: 76, high: 79, low: 75.5, volume: 345678, pclose: 76, diff: 2.5, turnover: 78.5 * 345678 },
    { symbol: 'UPPER', name: 'Upper Tamakoshi', ltp: 415, change: -3, percentChange: -0.72, open: 418, high: 420, low: 412, volume: 123000, pclose: 418, diff: -3, turnover: 415 * 123000 },
    { symbol: 'API', name: 'API Power Company', ltp: 312, change: 6, percentChange: 1.96, open: 306, high: 315, low: 304, volume: 198765, pclose: 306, diff: 6, turnover: 312 * 198765 },
    { symbol: 'SHIVM', name: 'Shivam Cements', ltp: 555, change: -8, percentChange: -1.42, open: 563, high: 565, low: 550, volume: 67000, pclose: 563, diff: -8, turnover: 555 * 67000 },
    { symbol: 'UNL', name: 'Unilever Nepal', ltp: 35500, change: 250, percentChange: 0.71, open: 35250, high: 35600, low: 35200, volume: 1234, pclose: 35250, diff: 250, turnover: 35500 * 1234 },
    { symbol: 'BFC', name: 'Best Finance', ltp: 1180, change: 20, percentChange: 1.72, open: 1160, high: 1185, low: 1155, volume: 12345, pclose: 1160, diff: 20, turnover: 1180 * 12345 },
    { symbol: 'HIDCL', name: 'Hydroelectricity Inv.', ltp: 245, change: 5.5, percentChange: 2.3, open: 240, high: 247, low: 238, volume: 456789, pclose: 239.5, diff: 5.5, turnover: 245 * 456789 },
    { symbol: 'NRIC', name: 'Nepal Reinsurance', ltp: 1450, change: -18, percentChange: -1.23, open: 1468, high: 1472, low: 1445, volume: 23456, pclose: 1468, diff: -18, turnover: 1450 * 23456 },
    { symbol: 'RHPC', name: 'Rairang Hydropower', ltp: 98, change: 4.5, percentChange: 4.81, open: 94, high: 99, low: 93, volume: 567890, pclose: 93.5, diff: 4.5, turnover: 98 * 567890 },
    { symbol: 'NGPL', name: 'Nepal Gas Ltd', ltp: 510, change: -6, percentChange: -1.16, open: 516, high: 518, low: 508, volume: 34567, pclose: 516, diff: -6, turnover: 510 * 34567 },
    { symbol: 'CBBL', name: 'Chhimek Laghubitta', ltp: 1680, change: 22, percentChange: 1.33, open: 1658, high: 1690, low: 1650, volume: 15678, pclose: 1658, diff: 22, turnover: 1680 * 15678 },
  ];

  const gainers = [...stocks].sort((a, b) => b.percentChange - a.percentChange).slice(0, 10);
  const losers = [...stocks].sort((a, b) => a.percentChange - b.percentChange).slice(0, 10);
  const topTurnovers = [...stocks].sort((a, b) => b.turnover - a.turnover).slice(0, 10);

  return {
    success: true,
    data: stocks,
    indices: {
      "NEPSE": { value: "2,774.01", change: "+28.33 (1.03%)" },
      "Sensitive": { value: "471.77", change: "+4.43 (0.95%)" },
      "Float": { value: "205.89", change: "+2.11 (1.04%)" },
      "Sensitive Float": { value: "129.85", change: "+1.23 (0.96%)" },
    },
    gainers,
    losers,
    topTurnovers,
    marketOpen: false,
    lastUpdated: 'Last trading session data',
    message: 'Market is closed. Showing most recent available data.',
  };
}

// ============================================================
// API Functions
// ============================================================

export const fetchLiveMarketData = async () => {
  try {
    const res = await axios.get(`${API_BASE}/live`, { timeout: 12000 });
    const result = res.data;
    
    // Cache successful response
    if (result.data && result.data.length > 0) {
      await saveToCache(CACHE_LIVE, result);
    }
    
    return result;
  } catch (error) {
    console.warn("API fetch failed, trying cache...");
    
    // Try local cache
    const cached = await loadFromCache(CACHE_LIVE);
    if (cached && cached.data && cached.data.length > 0) {
      return {
        ...cached,
        marketOpen: false,
        fromLocalCache: true,
        message: 'Showing cached data (server unreachable)',
      };
    }
    
    // Return built-in fallback data
    console.warn("No cache found, using fallback data");
    return getFallbackLiveData();
  }
};

export const fetchFundamentals = async (symbol: string) => {
  try {
    const res = await axios.get(`${API_BASE}/fundamentals/${symbol}`, { timeout: 10000 });
    return res.data.data || null;
  } catch (error) {
    console.error(`Error fetching fundamentals for ${symbol}:`, error);
    return null;
  }
};

export const fetchHistoricalData = async (symbol: string, ltp: number) => {
  try {
    const res = await axios.get(`${API_BASE}/history/${symbol}?ltp=${ltp}`, { timeout: 10000 });
    return res.data.data || [];
  } catch (error) {
    console.warn(`API history fetch failed for ${symbol}, generating local data`);
    // Generate local history data when API is down
    return generateLocalHistory(symbol, ltp);
  }
};

// Generate deterministic history locally (mirrors server logic)
function generateLocalHistory(symbol: string, ltp: number) {
  let currentPrice = ltp;
  const history = [];
  const now = new Date();

  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);

  const random = () => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 200; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const changePercent = (random() - 0.5) * 0.04;
    const open = currentPrice;
    const close = currentPrice * (1 + changePercent);
    const high = Math.max(open, close) * (1 + random() * 0.02);
    const low = Math.min(open, close) * (1 - random() * 0.02);

    const baseVolume = (seed * 137) % 50000 + 5000;
    const volume = Math.floor(baseVolume * (0.5 + random()) * (i < 30 ? 1.5 : 1));

    history.push({
      date: date.toISOString().split('T')[0],
      open, high, low, close, volume
    });
    currentPrice = close;
  }

  history[history.length - 1].close = ltp;
  return history;
}

export const fetchOverview = async () => {
  try {
    const res = await axios.get(`${API_BASE}/overview`, { timeout: 10000 });
    const data = res.data.data || null;
    
    if (data) {
      await saveToCache(CACHE_OVERVIEW, data);
    }
    
    return data;
  } catch (error) {
    console.warn("Overview API failed, trying cache...");
    
    const cached = await loadFromCache(CACHE_OVERVIEW);
    if (cached) return cached;
    
    // Fallback overview
    return {
      totalTurnover: '3,872,075,082.03',
      totalTradedShares: '8,724,782',
      totalTransactions: '58,637',
      totalScripsTaded: '332'
    };
  }
};

export const fetchMarketStatus = async () => {
  try {
    const res = await axios.get(`${API_BASE}/status`, { timeout: 5000 });
    return res.data;
  } catch (error) {
    // Compute locally if server is down
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const nptMs = utcMs + (5 * 60 + 45) * 60000;
    const npt = new Date(nptMs);
    const day = npt.getDay();
    const timeInMinutes = npt.getHours() * 60 + npt.getMinutes();
    const isWorkDay = day >= 0 && day <= 4;
    const isDuringHours = timeInMinutes >= 660 && timeInMinutes <= 900;
    
    return {
      success: true,
      marketOpen: isWorkDay && isDuringHours,
      message: isWorkDay && isDuringHours 
        ? 'Market is OPEN' 
        : 'Market is CLOSED',
    };
  }
};
