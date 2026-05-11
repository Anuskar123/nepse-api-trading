import axios from 'axios';
// Replace this with your hosted backend URL (e.g., https://your-app.onrender.com/api)
// For local testing: http://localhost:3000/api
// For Expo Go on physical device: http://<YOUR_COMPUTER_IP>:3000/api
const API_BASE = 'https://nepse-api-trading.onrender.com/api'; 

export const fetchLiveMarketData = async () => {
  try {
    const res = await axios.get(`${API_BASE}/live`);
    return res.data; // Return the whole { success, data, indices, gainers, losers, topTurnovers }
  } catch (error) {
    console.error("Error fetching live data:", error);
    return { data: [], indices: {} };
  }
};

export const fetchFundamentals = async (symbol: string) => {
  try {
    const res = await axios.get(`${API_BASE}/fundamentals/${symbol}`);
    return res.data.data || null;
  } catch (error) {
    console.error(`Error fetching fundamentals for ${symbol}:`, error);
    return null;
  }
};

export const fetchHistoricalData = async (symbol: string, ltp: number) => {
  try {
    const res = await axios.get(`${API_BASE}/history/${symbol}?ltp=${ltp}`);
    return res.data.data || [];
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return [];
  }
};

export const fetchOverview = async () => {
  try {
    const res = await axios.get(`${API_BASE}/overview`);
    return res.data.data || null;
  } catch (error) {
    console.error("Error fetching overview:", error);
    return null;
  }
};
