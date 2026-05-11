import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { fetchLiveMarketData } from '../../services/api';
import { analyzeStock } from '../../utils/technicalAnalysis';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react-native';

// NEPSE broker commission slabs (official)
const getBrokerCommission = (tradeValue: number): number => {
  if (tradeValue <= 50000) return tradeValue * 0.004;          // 0.40%
  if (tradeValue <= 500000) return tradeValue * 0.0037;        // 0.37%
  if (tradeValue <= 2000000) return tradeValue * 0.0034;       // 0.34%
  if (tradeValue <= 10000000) return tradeValue * 0.003;       // 0.30%
  return tradeValue * 0.0025;                                   // 0.25%
};

const SEBON_FEE = 0.0015;      // 0.015% - regulator fee
const DP_CHARGE = 25;          // Flat Rs. 25 per sell transaction
const CGT_SHORT = 0.075;       // 7.5% for <1 year
const CGT_LONG = 0.05;         // 5% for >1 year

interface StockScore {
  symbol: string;
  ltp: number;
  change: number;
  percentChange: number;
  volume: number;
  score: number;
  verdict: string;
}

export default function ScannerScreen() {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortTermStocks, setShortTermStocks] = useState<StockScore[]>([]);
  const [scanDone, setScanDone] = useState(false);

  // Calculator state
  const [calcMode, setCalcMode] = useState<'buy' | 'sell'>('buy');
  const [investAmount, setInvestAmount] = useState('100000');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [holdDays, setHoldDays] = useState('30');
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const liveData = await fetchLiveMarketData();
      setMarketData(liveData);

      // Score each stock for short-term suitability
      const scored: StockScore[] = liveData.map((stock: any) => {
        let score = 0;
        const reasons = [];

        // Liquidity: high volume is good for short-term
        if (stock.volume > 50000) score += 2;
        else if (stock.volume > 10000) score += 1;

        // Momentum: slight positive change but not overbought
        if (stock.percentChange > 0 && stock.percentChange < 4) score += 2;
        else if (stock.percentChange >= 4 && stock.percentChange <= 7) score += 1;
        else if (stock.percentChange < 0 && stock.percentChange > -2) score += 1; // Slight dip buy

        // Price range: mid-cap stocks tend to be more liquid for NEPSE
        if (stock.ltp >= 200 && stock.ltp <= 2000) score += 1;

        let verdict = 'Avoid';
        if (score >= 4) verdict = 'Strong Candidate';
        else if (score >= 2) verdict = 'Watch';

        return {
          symbol: stock.symbol,
          ltp: stock.ltp,
          change: stock.change,
          percentChange: stock.percentChange,
          volume: stock.volume,
          score,
          verdict
        };
      });

      const sorted = scored
        .filter(s => s.verdict !== 'Avoid' && s.ltp > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      setShortTermStocks(sorted);
      setScanDone(true);
      setLoading(false);
    };
    load();
  }, []);

  const calculate = () => {
    const amount = parseFloat(investAmount) || 0;
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || buy * 1.10;
    const days = parseInt(holdDays) || 30;

    if (amount <= 0 || buy <= 0) return;

    const shares = Math.floor(amount / buy);
    const actualBuyCost = shares * buy;
    const buyBroker = getBrokerCommission(actualBuyCost);
    const buySEBON = actualBuyCost * SEBON_FEE;
    const totalBuyCost = actualBuyCost + buyBroker + buySEBON;

    const grossSell = shares * sell;
    const sellBroker = getBrokerCommission(grossSell);
    const sellSEBON = grossSell * SEBON_FEE;

    const profit = grossSell - actualBuyCost;
    const cgtRate = days > 365 ? CGT_LONG : CGT_SHORT;
    const cgt = profit > 0 ? profit * cgtRate : 0;

    const netProfit = grossSell - actualBuyCost - sellBroker - sellSEBON - DP_CHARGE - cgt - buyBroker - buySEBON;
    const roi = ((netProfit / totalBuyCost) * 100);

    // Minimum price to break even
    const breakEvenPrice = (totalBuyCost + sellBroker + DP_CHARGE) / (shares * (1 - cgtRate - SEBON_FEE));

    setCalcResult({
      shares,
      totalBuyCost: totalBuyCost.toFixed(2),
      buyBroker: buyBroker.toFixed(2),
      grossSell: grossSell.toFixed(2),
      sellBroker: sellBroker.toFixed(2),
      cgt: cgt.toFixed(2),
      cgtRate: (cgtRate * 100).toFixed(1),
      dpCharge: DP_CHARGE,
      netProfit: netProfit.toFixed(2),
      roi: roi.toFixed(2),
      breakEvenPrice: breakEvenPrice.toFixed(2),
      holdDays: days,
      // Settlement: T+3 days to receive shares after buy
      earliestSellDate: `T+3 Working Days (after Buy Settlement)`,
      profitWarning: netProfit < 0 ? true : false
    });
  };

  const renderScoreCard = ({ item }: { item: StockScore }) => {
    const isStrong = item.verdict === 'Strong Candidate';
    const isPositive = item.percentChange > 0;
    return (
      <View style={[styles.stockRow, isStrong && styles.strongRow]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
          <Text style={styles.stockVolume}>Vol: {item.volume.toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', flex: 1 }}>
          <Text style={styles.stockLtp}>Rs. {item.ltp.toFixed(2)}</Text>
          <Text style={[styles.stockChange, { color: isPositive ? '#10b981' : '#ef4444' }]}>
            {isPositive ? '+' : ''}{item.percentChange.toFixed(2)}%
          </Text>
        </View>
        <View style={[styles.verdictBadge, { backgroundColor: isStrong ? '#10b981' : '#f59e0b' }]}>
          <Text style={styles.verdictText}>{item.verdict === 'Strong Candidate' ? '🔥 Strong' : '👀 Watch'}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Smart Scanner</Text>
          <Text style={styles.subtitle}>Short-term candidates + True cost calculator</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <AlertTriangle size={14} color="#92400e" />
          <Text style={styles.disclaimerText}> For educational use only. Not financial advice.</Text>
        </View>

        {/* Short-Term Scanner */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Short-Term Candidates</Text>
          </View>
          <Text style={styles.sectionSub}>Scored by Volume Liquidity + Momentum + NEPSE Price Range</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#3b82f6" />
              <Text style={styles.loadingText}>Scanning {marketData.length} stocks...</Text>
            </View>
          ) : (
            <FlatList
              data={shortTermStocks}
              keyExtractor={(item) => item.symbol}
              renderItem={renderScoreCard}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 8 }}
            />
          )}
        </View>

        {/* NEPSE Trade Calculator */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calculator size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>True Cost Calculator</Text>
          </View>
          <Text style={styles.sectionSub}>Includes Broker Commission + SEBON Fee + CGT + DP Charge</Text>

          <View style={styles.inputGrid}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Investment (Rs.)</Text>
              <TextInput style={styles.input} value={investAmount} onChangeText={setInvestAmount} keyboardType="numeric" placeholderTextColor="#9ca3af" />
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Buy Price (Rs.)</Text>
              <TextInput style={styles.input} value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" placeholder="Enter LTP" placeholderTextColor="#9ca3af" />
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Target Sell Price (Rs.)</Text>
              <TextInput style={styles.input} value={sellPrice} onChangeText={setSellPrice} keyboardType="numeric" placeholder="Expected sell" placeholderTextColor="#9ca3af" />
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Hold Days</Text>
              <TextInput style={styles.input} value={holdDays} onChangeText={setHoldDays} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
            <Text style={styles.calcBtnText}>Calculate Real Profit / Loss</Text>
          </TouchableOpacity>

          {calcResult && (
            <View style={styles.resultCard}>
              <View style={[styles.resultHeader, { backgroundColor: calcResult.profitWarning ? '#fef2f2' : '#f0fdf4' }]}>
                <Text style={[styles.resultTitle, { color: calcResult.profitWarning ? '#ef4444' : '#10b981' }]}>
                  {calcResult.profitWarning ? '⚠️ You Would LOSE Money' : '✅ Profitable Trade'}
                </Text>
                <Text style={[styles.resultBig, { color: calcResult.profitWarning ? '#ef4444' : '#10b981' }]}>
                  Rs. {calcResult.netProfit} ({calcResult.roi}% ROI)
                </Text>
              </View>

              <View style={styles.resultGrid}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Shares You Can Buy</Text>
                  <Text style={styles.resultValue}>{calcResult.shares} units</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Total Buy Cost (incl. fees)</Text>
                  <Text style={styles.resultValue}>Rs. {calcResult.totalBuyCost}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Buy Broker Commission</Text>
                  <Text style={[styles.resultValue, { color: '#ef4444' }]}>- Rs. {calcResult.buyBroker}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Gross Sell Amount</Text>
                  <Text style={styles.resultValue}>Rs. {calcResult.grossSell}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Sell Broker Commission</Text>
                  <Text style={[styles.resultValue, { color: '#ef4444' }]}>- Rs. {calcResult.sellBroker}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>CGT ({calcResult.cgtRate}% – {parseInt(calcResult.holdDays) > 365 ? '>1yr' : '<1yr'})</Text>
                  <Text style={[styles.resultValue, { color: '#ef4444' }]}>- Rs. {calcResult.cgt}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>DP Charge (Sell)</Text>
                  <Text style={[styles.resultValue, { color: '#ef4444' }]}>- Rs. {calcResult.dpCharge}</Text>
                </View>
                <View style={[styles.resultRow, styles.breakEvenRow]}>
                  <Text style={styles.resultLabel}>📈 Break-Even Price</Text>
                  <Text style={[styles.resultValue, { color: '#f59e0b', fontWeight: 'bold' }]}>Rs. {calcResult.breakEvenPrice}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <CheckCircle size={14} color="#3b82f6" />
                <Text style={styles.infoText}>  Settlement: You can sell after <Text style={{ fontWeight: 'bold' }}>T+3 Working Days</Text> from purchase. Shares appear in your DEMAT portfolio after this window.</Text>
              </View>
              <View style={styles.infoBox}>
                <CheckCircle size={14} color="#3b82f6" />
                <Text style={styles.infoText}>  You must pay <Text style={{ fontWeight: 'bold' }}>25% collateral</Text> to broker in advance for secondary market purchases.</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  disclaimer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', padding: 12, margin: 16, borderRadius: 8 },
  disclaimerText: { fontSize: 13, color: '#92400e', flex: 1 },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 8 },
  sectionSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  center: { alignItems: 'center', padding: 20 },
  loadingText: { color: '#6b7280', marginTop: 8 },
  stockRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, gap: 8 },
  strongRow: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  stockSymbol: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  stockVolume: { fontSize: 12, color: '#9ca3af' },
  stockLtp: { fontSize: 14, fontWeight: '600', color: '#111827' },
  stockChange: { fontSize: 13, fontWeight: '500' },
  verdictBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  verdictText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  inputGrid: { gap: 12, marginBottom: 16 },
  inputBox: {},
  inputLabel: { fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, color: '#111827', backgroundColor: '#f9fafb' },
  calcBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: { marginTop: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  resultHeader: { padding: 16 },
  resultTitle: { fontSize: 14, fontWeight: 'bold' },
  resultBig: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  resultGrid: { padding: 16, gap: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  breakEvenRow: { borderBottomWidth: 0, backgroundColor: '#fffbeb', padding: 8, borderRadius: 8 },
  resultLabel: { fontSize: 14, color: '#4b5563', flex: 1 },
  resultValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff', padding: 12, borderTopWidth: 1, borderTopColor: '#dbeafe' },
  infoText: { fontSize: 13, color: '#1e40af', flex: 1 }
});
