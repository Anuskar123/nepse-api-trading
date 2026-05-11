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
            AI Recommendation: {data.analysis.signal}
          </Text>
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
        <Text style={styles.sectionTitle}>AI Analysis Breakdown</Text>
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
  reasonText: { flex: 1, fontSize: 15, color: '#374151', lineHeight: 22 }
});
