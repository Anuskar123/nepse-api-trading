
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json());

// Root endpoint to check if server is alive
app.get('/', (req, res) => {
  res.send('NEPSE Analysis API is running! Use /api/live for data.');
});

// Endpoint 1: Live Market Data (Uses the existing merolagani scrape but runs on backend)
app.get('/api/live', async (req, res) => {
  try {
    const response = await axios.get('https://merolagani.com/LatestMarket.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);

    const stocks: any[] = [];
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 9) {
        const symbol = $(cols[0]).text().trim();
        const ltpText = $(cols[1]).text().replace(/,/g, '').trim();
        const percentChangeText = $(cols[2]).text().replace(/,/g, '').trim();
        const diffText = $(cols[8]).text().replace(/,/g, '').trim();
        const volumeText = $(cols[6]).text().replace(/,/g, '').trim();

        stocks.push({
          symbol,
          name: symbol,
          ltp: parseFloat(ltpText) || 0,
          change: parseFloat(diffText) || 0,
          percentChange: parseFloat(percentChangeText) || 0,
          volume: parseFloat(volumeText) || 0,
        });
      }
    });
    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch live data' });
  }
});

// Endpoint 2: Company Fundamentals (EPS, PE, Book Value, etc.) from Sharesansar
app.get('/api/fundamentals/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const response = await axios.get(`https://www.sharesansar.com/company/${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);

    const fundamentals: any = {};

    // Scrape standard table rows in sharesansar
    $('table tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length === 2) {
        const key = $(cols[0]).text().trim();
        const val = $(cols[1]).text().trim();
        if (key.includes('EPS')) fundamentals.eps = parseFloat(val);
        if (key.includes('Book Value')) fundamentals.bookValue = parseFloat(val);
        if (key.includes('P/E Ratio')) fundamentals.peRatio = parseFloat(val);
        if (key.includes('120 Days Return')) fundamentals.return120 = val;
        if (key.includes('1 Year Return')) fundamentals.return1Year = val;
      }
    });

    res.json({ success: true, data: fundamentals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch fundamentals' });
  }
});

// Endpoint 3: Historical Data (Using simulated deterministic history anchored to live LTP since free APIs block history)
// A robust production app would store history in a PostgreSQL database daily via a cron job.
app.get('/api/history/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const ltp = req.query.ltp ? parseFloat(req.query.ltp as string) : 1000;

  // Deterministic random walk using symbol to seed (so the chart doesn't randomly change every request)
  let currentPrice = ltp;
  const history = [];
  const now = new Date();

  // Seed random generator based on symbol
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

    history.push({
      date: date.toISOString().split('T')[0],
      open, high, low, close
    });
    currentPrice = close;
  }

  // Fix the last item to match the LTP perfectly
  history[history.length - 1].close = ltp;

  res.json({ success: true, data: history });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend API Server running on http://localhost:${PORT}`);
});
