import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import CandlestickChart from '../../components/CandlestickChart';
import { fetchHistoricalData, fetchFundamentals } from '../../services/api';
import { analyzeStock } from '../../utils/technicalAnalysis';

const screenWidth = Dimensions.get('window').width;

export default function StockDetailScreen() {
  const { symbol, ltp } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const currentPrice = ltp ? parseFloat(ltp as string) : 1000;
      
      const [history, fundamentals] = await Promise.all([
        fetchHistoricalData(symbol as string, currentPrice),
        fetchFundamentals(symbol as string)
      ]);

      const analysis = analyzeStock(history, fundamentals);
      const last30Days = history.slice(-30); // 30 days looks good on candlestick
      
      setData({
        history,
        fundamentals,
        analysis,
        last30Days
      });
    };
    
    loadData();
  }, [symbol, ltp]);

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Running AI Analysis...</Text>
      </View>
    );
  }

  const getSignalColor = (signal: string) => {
    if (signal.includes('Buy')) return '#10b981';
    if (signal.includes('Sell')) return '#ef4444';
    return '#6b7280';
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: `${symbol} Analysis` }} />
      
      <View style={styles.headerCard}>
        <Text style={styles.price}>Rs. {ltp ? parseFloat(ltp as string).toFixed(2) : data.history[data.history.length - 1].close.toFixed(2)}</Text>
        <View style={[styles.signalBadge, { backgroundColor: getSignalColor(data.analysis.signal) + '20' }]}>
          <Text style={[styles.signalText, { color: getSignalColor(data.analysis.signal) }]}>
            {data.analysis.signal}
          </Text>
        </View>
      </View>

      {/* AI FINAL VERDICT CARD */}
      <View style={styles.verdictCard}>
        <View style={styles.verdictHeader}>
          <Text style={styles.verdictLabel}>AI FINAL VERDICT</Text>
          <Text style={[styles.verdictAction, { color: getSignalColor(data.analysis.signal) }]}>
            {data.analysis.verdict.action}
          </Text>
        </View>
        
        <View style={styles.verdictGrid}>
          <View style={styles.verdictBox}>
            <Text style={styles.verdictBoxLabel}>Target Price</Text>
            <Text style={[styles.verdictBoxValue, { color: '#10b981' }]}>Rs. {data.analysis.verdict.target}</Text>
          </View>
          <View style={styles.verdictBox}>
            <Text style={styles.verdictBoxLabel}>Stop Loss</Text>
            <Text style={[styles.verdictBoxValue, { color: '#ef4444' }]}>Rs. {data.analysis.verdict.stopLoss}</Text>
          </View>
        </View>

        <View style={styles.verdictFooter}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Timeframe</Text>
            <Text style={styles.footerValue}>{data.analysis.verdict.timeframe}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Risk Level</Text>
            <Text style={[styles.footerValue, { color: data.analysis.verdict.risk === 'Low' ? '#10b981' : '#f59e0b' }]}>
              {data.analysis.verdict.risk}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>30-Day Trading Chart</Text>
        <CandlestickChart 
          data={data.last30Days} 
          width={screenWidth - 48} 
          height={220} 
        />
      </View>

      {/* Price Performance Stats */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Price Performance</Text>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>52-Week High</Text>
          <Text style={[styles.indicatorValue, { color: '#10b981' }]}>Rs. {Math.max(...data.history.map((h: any) => h.high)).toFixed(2)}</Text>
        </View>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>52-Week Low</Text>
          <Text style={[styles.indicatorValue, { color: '#ef4444' }]}>Rs. {Math.min(...data.history.map((h: any) => h.low)).toFixed(2)}</Text>
        </View>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>Volatility</Text>
          <Text style={styles.indicatorValue}>{((Math.max(...data.history.map((h: any) => h.high)) - Math.min(...data.history.map((h: any) => h.low))) / Math.min(...data.history.map((h: any) => h.low)) * 100).toFixed(1)}%</Text>
        </View>
      </View>

      {/* Market Activity Today */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Market Activity Today</Text>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>Traded Units</Text>
          <Text style={styles.indicatorValue}>
            {data.history[data.history.length-1]?.volume?.toLocaleString() ?? '0'} units
          </Text>
        </View>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>Estimated Value</Text>
          <Text style={styles.indicatorValue}>
            Rs. {((data.history[data.history.length-1]?.volume ?? 0) * parseFloat(ltp as string)).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Quality Assessment */}
      <View style={[styles.card, { backgroundColor: data.fundamentals?.eps > 0 ? '#f0fdf4' : '#fef2f2' }]}>
        <Text style={styles.sectionTitle}>Company Health Scorecard</Text>
        <View style={styles.qualityBox}>
           <Text style={[styles.qualityScore, { color: data.fundamentals?.eps > 20 ? '#16a34a' : data.fundamentals?.eps > 0 ? '#ca8a04' : '#dc2626' }]}>
              {data.fundamentals?.eps > 20 ? '🌟 Strong Company' : data.fundamentals?.eps > 0 ? '✅ Decent Company' : '⚠️ Weak Company'}
           </Text>
           <Text style={styles.qualityDescription}>
              {data.fundamentals?.eps > 20 
                ? "This company earns great profit per share. It's one of the stronger picks in NEPSE. Safe for both short-term and long-term." 
                : data.fundamentals?.eps > 0 
                ? "The company is profitable. You can invest, but be aware that growth may be slow."
                : "The company is losing money or barely breaking even. Very risky for investment. Only for experienced traders."}
           </Text>
        </View>
      </View>

      {/* Fundamentals with Explanations */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Company Fundamentals</Text>
        {data.fundamentals && Object.keys(data.fundamentals).length > 0 ? (
          <>
            {/* EPS */}
            <View style={styles.fundRow}>
              <View style={styles.fundLeft}>
                <Text style={styles.fundLabel}>EPS (Earnings Per Share)</Text>
                <Text style={styles.fundHint}>How much profit company makes per share. Higher = Better.</Text>
              </View>
              <Text style={[styles.fundValue, { color: (data.fundamentals.eps || 0) > 0 ? '#16a34a' : '#dc2626' }]}>
                Rs. {data.fundamentals.eps || 'N/A'}
              </Text>
            </View>

            {/* P/E Ratio */}
            <View style={styles.fundRow}>
              <View style={styles.fundLeft}>
                <Text style={styles.fundLabel}>P/E Ratio</Text>
                <Text style={styles.fundHint}>
                  {(data.fundamentals.peRatio || 0) < 20 ? 'Low P/E = Stock may be undervalued (cheap).' 
                  : (data.fundamentals.peRatio || 0) < 40 ? 'Normal P/E = Fairly priced stock.'
                  : 'High P/E = Stock is expensive. Be careful.'}
                </Text>
              </View>
              <Text style={[styles.fundValue, { color: (data.fundamentals.peRatio || 0) < 25 ? '#16a34a' : '#f59e0b' }]}>
                {data.fundamentals.peRatio || 'N/A'}
              </Text>
            </View>

            {/* Book Value */}
            <View style={styles.fundRow}>
              <View style={styles.fundLeft}>
                <Text style={styles.fundLabel}>Book Value</Text>
                <Text style={styles.fundHint}>
                  {parseFloat(ltp as string) < (data.fundamentals.bookValue || 0) 
                    ? '🟢 LTP is BELOW book value — you may be getting a bargain!' 
                    : '🟡 LTP is above book value — the market expects growth.'}
                </Text>
              </View>
              <Text style={styles.fundValue}>Rs. {data.fundamentals.bookValue || 'N/A'}</Text>
            </View>

            {/* 1 Year Return */}
            {data.fundamentals.return1Year && (
              <View style={styles.fundRow}>
                <View style={styles.fundLeft}>
                  <Text style={styles.fundLabel}>1 Year Return</Text>
                  <Text style={styles.fundHint}>How much this stock gained or lost in the past year.</Text>
                </View>
                <Text style={[styles.fundValue, { color: String(data.fundamentals.return1Year).includes('-') ? '#dc2626' : '#16a34a' }]}>
                  {data.fundamentals.return1Year}
                </Text>
              </View>
            )}

            {/* 120 Day Return */}
            {data.fundamentals.return120 && (
              <View style={styles.fundRow}>
                <View style={styles.fundLeft}>
                  <Text style={styles.fundLabel}>120 Days Return</Text>
                  <Text style={styles.fundHint}>Recent 4-month performance trend.</Text>
                </View>
                <Text style={[styles.fundValue, { color: String(data.fundamentals.return120).includes('-') ? '#dc2626' : '#16a34a' }]}>
                  {data.fundamentals.return120}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noDataBox}>
            <Text style={styles.noDataText}>⏳ Fundamentals data is loading from Sharesansar. The backend may take ~30s on first wake-up.</Text>
          </View>
        )}
      </View>

      {/* Should You Buy This Stock? */}
      <View style={[styles.card, { borderWidth: 2, borderColor: getSignalColor(data.analysis.signal) }]}>
        <Text style={styles.sectionTitle}>💡 Should You Buy This Stock?</Text>
        <Text style={styles.adviceText}>{data.analysis.verdict?.humanSummary || 'Analysis in progress...'}</Text>
        
        {data.fundamentals?.eps > 0 && parseFloat(ltp as string) < (data.fundamentals.bookValue || 999999) && (
          <View style={[styles.tipBox, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.tipText}>✅ This stock is trading below its book value with positive EPS — this is typically considered a value buy opportunity.</Text>
          </View>
        )}
        
        {data.fundamentals?.eps <= 0 && (
          <View style={[styles.tipBox, { backgroundColor: '#fef2f2' }]}>
            <Text style={styles.tipText}>⛔ This company has negative or zero EPS. Even if the price is going up, the company isn't making money. High risk.</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Technical Indicators</Text>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>RSI (14)</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.indicatorValue}>{data.analysis.rsi.toFixed(2)}</Text>
            <Text style={{ fontSize: 11, color: data.analysis.rsi < 30 ? '#16a34a' : data.analysis.rsi > 70 ? '#dc2626' : '#64748b' }}>
              {data.analysis.rsi < 30 ? 'Oversold (Cheap)' : data.analysis.rsi > 70 ? 'Overbought (Expensive)' : 'Neutral'}
            </Text>
          </View>
        </View>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>SMA (50)</Text>
          <Text style={styles.indicatorValue}>{data.analysis.sma50.toFixed(2)}</Text>
        </View>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>SMA (200)</Text>
          <Text style={styles.indicatorValue}>{data.analysis.sma200.toFixed(2)}</Text>
        </View>
      </View>

      {data.analysis.patterns.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chart Patterns Detected</Text>
          <View style={styles.patternContainer}>
            {data.analysis.patterns.map((pattern: string, i: number) => (
              <View key={i} style={styles.patternBadge}>
                <Text style={styles.patternText}>✨ {pattern}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#ffffff', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  price: { fontSize: 36, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  signalBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  signalText: { fontSize: 18, fontWeight: 'bold' },
  chartCard: { backgroundColor: '#ffffff', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  card: { backgroundColor: '#ffffff', marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  indicatorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  indicatorName: { fontSize: 16, color: '#4b5563' },
  indicatorValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6', marginTop: 8, marginRight: 12 },
  reasonText: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 22 },
  
  verdictCard: { backgroundColor: '#111827', margin: 16, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  verdictHeader: { borderBottomWidth: 1, borderBottomColor: '#374151', paddingBottom: 12, marginBottom: 16 },
  verdictLabel: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 1 },
  verdictAction: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  verdictGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  verdictBox: { flex: 1, backgroundColor: '#1f2937', padding: 12, borderRadius: 8 },
  verdictBoxLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  verdictBoxValue: { fontSize: 16, fontWeight: 'bold' },
  verdictFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { flex: 1 },
  footerLabel: { fontSize: 11, color: '#9ca3af' },
  footerValue: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginTop: 2 },
  
  qualityBox: { marginTop: 4 },
  qualityScore: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  qualityDescription: { fontSize: 14, color: '#4b5563', lineHeight: 20 },

  patternSection: { marginBottom: 12 },
  patternHeading: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' },
  patternContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  patternBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#dbeafe' },
  patternText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },

  fundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  fundLeft: { flex: 1, marginRight: 12 },
  fundLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  fundHint: { fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 15 },
  fundValue: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },

  adviceText: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 12 },
  tipBox: { padding: 12, borderRadius: 10, marginTop: 8 },
  tipText: { fontSize: 13, lineHeight: 18 },
  noDataBox: { padding: 12, backgroundColor: '#fefce8', borderRadius: 8 },
  noDataText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
});
