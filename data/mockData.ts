export const STOCKS = [
  { symbol: "NEPSE", name: "NEPSE Index" },
  { symbol: "NICA", name: "NIC Asia Bank Ltd." },
  { symbol: "NABIL", name: "Nabil Bank Limited" },
  { symbol: "NTC", name: "Nepal Telecom" },
  { symbol: "SHIVM", name: "Shivam Cements" },
  { symbol: "UNL", name: "Unilever Nepal" }
];

export const generateMockHistory = (basePrice: number, days: number = 30) => {
  let currentPrice = basePrice;
  const history = [];
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random walk
    const changePercent = (Math.random() - 0.5) * 0.05; // up to 5% change
    const open = currentPrice;
    const close = currentPrice * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 100000) + 10000;

    history.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
    
    currentPrice = close;
  }
  
  return history;
};

// Generate deterministic-looking mock data
export const getMockDataForSymbol = (symbol: string) => {
  switch (symbol) {
    case "NEPSE": return generateMockHistory(2100, 60);
    case "NICA": return generateMockHistory(750, 60);
    case "NABIL": return generateMockHistory(500, 60);
    case "NTC": return generateMockHistory(900, 60);
    case "SHIVM": return generateMockHistory(550, 60);
    case "UNL": return generateMockHistory(35000, 60);
    default: return generateMockHistory(1000, 60);
  }
};
