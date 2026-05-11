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
      <View style={[styles.card, { backgroundColor: data.fundamentals?.eps > 0 ? '#f0fdf4' : '#fff' }]}>
        <Text style={styles.sectionTitle}>Financial Quality Assessment</Text>
        <View style={styles.qualityBox}>
           <Text style={[styles.qualityScore, { color: data.fundamentals?.eps > 20 ? '#16a34a' : '#f59e0b' }]}>
              {data.fundamentals?.eps > 20 ? '🌟 High Quality' : data.fundamentals?.eps > 0 ? '✅ Healthy' : '⚠️ Risky'}
           </Text>
           <Text style={styles.qualityDescription}>
              {data.fundamentals?.eps > 20 
                ? "This company has exceptionally strong earnings (EPS), making it a top-tier investment choice." 
                : data.fundamentals?.eps > 0 
                ? "The company is profitable and stable, suitable for standard portfolios."
                : "The company is currently struggling with profitability. High risk detected."}
           </Text>
        </View>
      </View>

      {/* Fundamentals Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Company Fundamentals</Text>
        {data.fundamentals && Object.keys(data.fundamentals).length > 0 ? (
          <>
            {data.fundamentals.eps && (
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorName}>EPS</Text>
                <Text style={styles.indicatorValue}>Rs. {data.fundamentals.eps}</Text>
              </View>
            )}
            {data.fundamentals.peRatio && (
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorName}>P/E Ratio</Text>
                <Text style={styles.indicatorValue}>{data.fundamentals.peRatio}</Text>
              </View>
            )}
            {data.fundamentals.bookValue && (
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorName}>Book Value</Text>
                <Text style={styles.indicatorValue}>Rs. {data.fundamentals.bookValue}</Text>
              </View>
            )}
            {data.fundamentals.return1Year && (
              <View style={styles.indicatorRow}>
                <Text style={styles.indicatorName}>1 Year Return</Text>
                <Text style={styles.indicatorValue}>{data.fundamentals.return1Year}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ color: '#6b7280' }}>Fundamentals data not available for this stock.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Technical Indicators</Text>
        <View style={styles.indicatorRow}>
          <Text style={styles.indicatorName}>RSI (14)</Text>
          <Text style={styles.indicatorValue}>{data.analysis.rsi.toFixed(2)}</Text>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Professional AI Analysis</Text>
        
        {data.analysis.patterns.length > 0 && (
          <View style={styles.patternSection}>
            <Text style={styles.patternHeading}>Chart Patterns Detected:</Text>
            <View style={styles.patternContainer}>
              {data.analysis.patterns.map((pattern: string, i: number) => (
                <View key={i} style={styles.patternBadge}>
                  <Text style={styles.patternText}>✨ {pattern}</Text>
                </View>
              ))}
            </View>
            <View style={styles.divider} />
          </View>
        )}
        
        {data.analysis.reasons.map((reason: string, index: number) => (
          <View key={index} style={styles.reasonRow}>
            <View style={styles.bullet} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>
      
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
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 }
});
