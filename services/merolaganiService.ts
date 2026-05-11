import axios from 'axios';
import * as cheerio from 'cheerio';

export interface MerolaganiStock {
  symbol: string;
  ltp: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  volume: number;
}

export const fetchLiveMarketData = async (): Promise<MerolaganiStock[]> => {
  try {
    const response = await axios.get('https://merolagani.com/LatestMarket.aspx');
    const html = response.data;
    const $ = cheerio.load(html);
    
    const stocks: MerolaganiStock[] = [];

    // The table is usually under a class or id, but generally we can look for tbody tr
    // On merolagani, the live trading table has tbody tr where each tr has td's
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 9) {
        const symbol = $(cols[0]).text().trim();
        const ltpText = $(cols[1]).text().replace(/,/g, '').trim();
        const percentChangeText = $(cols[2]).text().replace(/,/g, '').trim();
        const openText = $(cols[3]).text().replace(/,/g, '').trim();
        const highText = $(cols[4]).text().replace(/,/g, '').trim();
        const lowText = $(cols[5]).text().replace(/,/g, '').trim();
        const volumeText = $(cols[6]).text().replace(/,/g, '').trim();
        const diffText = $(cols[8]).text().replace(/,/g, '').trim();

        const ltp = parseFloat(ltpText) || 0;
        const percentChange = parseFloat(percentChangeText) || 0;
        const change = parseFloat(diffText) || 0;
        const high = parseFloat(highText) || 0;
        const low = parseFloat(lowText) || 0;
        const volume = parseFloat(volumeText) || 0;

        if (symbol) {
          stocks.push({
            symbol,
            ltp,
            change,
            percentChange,
            high,
            low,
            volume
          });
        }
      }
    });

    return stocks;
  } catch (error) {
    console.error("Error fetching live data from Merolagani:", error);
    return [];
  }
};
