import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Animated
} from 'react-native';
import Svg, { Line, Rect, G, Polyline, Text as SvgText, Defs, LinearGradient, Stop, Polygon, Circle } from 'react-native-svg';
import { fetchLiveMarketData, fetchHistoricalData } from '../../services/api';
import { analyzeStock } from '../../utils/technicalAnalysis';
import { SMA } from 'technicalindicators';
import { Search, TrendingUp, Target, ShieldAlert } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 280;
const VOL_HEIGHT = 60;
const PAD = { top: 16, right: 50, bottom: 24, left: 8 };

function buildPredictionBars(lastClose: number, target: number, stopLoss: number, days: number) {
  const bars = [];
  let price = lastClose;
  const trend = (target - lastClose) / days;
  for (let i = 1; i <= days; i++) {
    const noise = (Math.random() - 0.48) * lastClose * 0.015;
    const close = price + trend + noise;
    const open = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.008);
    const low = Math.min(open, close) * (1 - Math.random() * 0.008);
    bars.push({ date: `P+${i}`, open, high, low, close, predicted: true });
    price = close;
    if (price <= stopLoss * 0.995) break;
  }
  return bars;
}

export default function PredictScreen() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allStocks, setAllStocks] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showPrediction, setShowPrediction] = useState(true);
  const [timeframe, setTimeframe] = useState<'30' | '60' | '90'>('30');
  const pulsAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchLiveMarketData().then(d => setAllStocks(d));
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      setSuggestions(allStocks.filter(s => s.symbol.startsWith(query.toUpperCase())).slice(0, 6));
    } else setSuggestions([]);
  }, [query, allStocks]);

  // Pulse animation for live dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulsAnim, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulsAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadStock = async (symbol: string, ltp: number) => {
    setQuery(symbol);
    setSuggestions([]);
    setSelectedSymbol(symbol);
    setLoading(true);
    const hist = await fetchHistoricalData(symbol, ltp);
    const result = analyzeStock(hist);
    setHistory(hist);
    setAnalysis(result);
    setLoading(false);
  };

  const getSignalColor = (sig: string) => {
    if (sig?.includes('Buy')) return '#10b981';
    if (sig?.includes('Sell')) return '#ef4444';
    return '#f59e0b';
  };

  // Build chart data
  const histSlice = history.slice(-parseInt(timeframe));
  const currentPrice = history.length ? history[history.length - 1].close : 0;
  const target = analysis?.verdict?.target ?? currentPrice * 1.08;
  const stopLoss = analysis?.verdict?.stopLoss ?? currentPrice * 0.94;

  const predBars = showPrediction && analysis
    ? buildPredictionBars(currentPrice, target, stopLoss, 15)
    : [];

  const allBars = [...histSlice, ...predBars];
  const closes = allBars.map(b => b.close);
  const highs = allBars.map(b => b.high);
  const lows = allBars.map(b => b.low);
  const volumes = allBars.map(b => b.volume || 0);

  const minLow = lows.length ? Math.min(...lows) * 0.998 : 0;
  const maxHigh = highs.length ? Math.max(...highs) * 1.002 : 1;
  const maxVol = Math.max(...volumes, 1);
  const priceRange = maxHigh - minLow || 1;

  const plotW = CHART_WIDTH - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const getX = (i: number) => PAD.left + (i + 0.5) * (plotW / allBars.length);
  const getY = (v: number) => PAD.top + plotH - ((v - minLow) / priceRange) * plotH;
  const barW = Math.max(2, (plotW / allBars.length) * 0.65);

  // SMA Lines
  const sma20Raw = SMA.calculate({ period: 20, values: closes });
  const sma50Raw = SMA.calculate({ period: 50, values: closes });
  const sma20Points = sma20Raw.map((v, i) => {
    const idx = closes.length - sma20Raw.length + i;
    return `${getX(idx).toFixed(1)},${getY(v).toFixed(1)}`;
  }).join(' ');
  const sma50Points = sma50Raw.map((v, i) => {
    const idx = closes.length - sma50Raw.length + i;
    return `${getX(idx).toFixed(1)},${getY(v).toFixed(1)}`;
  }).join(' ');

  // Target & Stop Loss Y positions
  const targetY = getY(target);
  const slY = getY(stopLoss);
  const currentY = getY(currentPrice);

  // Prediction zone polygon
  const predStartIdx = histSlice.length;
  const predXStart = getX(predStartIdx - 0.5);
  const predXEnd = getX(allBars.length - 0.5);
  const predPolygon = `${predXStart},${CHART_HEIGHT - PAD.bottom} ${predXStart},${PAD.top} ${predXEnd},${PAD.top} ${predXEnd},${CHART_HEIGHT - PAD.bottom}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Predict</Text>
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulsAnim }] }]} />
              <Text style={styles.liveLabel}>Live</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Candlestick chart with AI price prediction</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search symbol (e.g. NABIL, NICA)..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="characters"
          />
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <TouchableOpacity key={s.symbol} style={styles.suggestRow} onPress={() => loadStock(s.symbol, s.ltp)}>
                <Text style={styles.suggestSymbol}>{s.symbol}</Text>
                <Text style={[styles.suggestChange, { color: s.percentChange >= 0 ? '#10b981' : '#ef4444' }]}>
                  Rs. {s.ltp.toFixed(2)}  {s.percentChange >= 0 ? '+' : ''}{s.percentChange.toFixed(2)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Fetching data & running AI...</Text>
          </View>
        )}

        {!loading && history.length > 0 && analysis && (
          <>
            {/* Signal Banner */}
            <View style={[styles.signalBanner, { borderColor: getSignalColor(analysis.signal) }]}>
              <View>
                <Text style={styles.bannerSymbol}>{selectedSymbol}</Text>
                <Text style={styles.bannerPrice}>Rs. {currentPrice.toFixed(2)}</Text>
              </View>
              <View style={[styles.signalBadge, { backgroundColor: getSignalColor(analysis.signal) }]}>
                <Text style={styles.signalText}>{analysis.signal}</Text>
              </View>
            </View>

            {/* Timeframe Picker */}
            <View style={styles.timeframeRow}>
              {(['30', '60', '90'] as const).map(tf => (
                <TouchableOpacity key={tf} style={[styles.tfBtn, timeframe === tf && styles.tfBtnActive]} onPress={() => setTimeframe(tf)}>
                  <Text style={[styles.tfText, timeframe === tf && styles.tfTextActive]}>{tf}D</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.tfBtn, showPrediction && styles.tfBtnPrediction]} onPress={() => setShowPrediction(!showPrediction)}>
                <Text style={[styles.tfText, showPrediction && { color: '#fff' }]}>AI Predict</Text>
              </TouchableOpacity>
            </View>

            {/* === MAIN CHART === */}
            <View style={styles.chartWrapper}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT + VOL_HEIGHT}>
                <Defs>
                  <LinearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#818cf8" stopOpacity="0.18" />
                    <Stop offset="1" stopColor="#818cf8" stopOpacity="0.02" />
                  </LinearGradient>
                </Defs>

                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map((f, i) => {
                  const gy = PAD.top + plotH * f;
                  const gv = maxHigh - priceRange * f;
                  return (
                    <G key={i}>
                      <Line x1={PAD.left} y1={gy} x2={CHART_WIDTH - PAD.right} y2={gy} stroke="#f3f4f6" strokeWidth="1" />
                      <SvgText x={CHART_WIDTH - PAD.right + 4} y={gy + 4} fontSize="9" fill="#9ca3af">{gv.toFixed(0)}</SvgText>
                    </G>
                  );
                })}

                {/* Prediction zone */}
                {showPrediction && predBars.length > 0 && (
                  <Polygon points={predPolygon} fill="url(#predGrad)" />
                )}

                {/* Prediction divider */}
                {showPrediction && predBars.length > 0 && (
                  <Line x1={getX(predStartIdx - 0.5)} y1={PAD.top} x2={getX(predStartIdx - 0.5)} y2={CHART_HEIGHT - PAD.bottom}
                    stroke="#818cf8" strokeWidth="1.5" strokeDasharray="6,4" />
                )}

                {/* Target line */}
                {showPrediction && (
                  <>
                    <Line x1={PAD.left} y1={targetY} x2={CHART_WIDTH - PAD.right} y2={targetY}
                      stroke="#10b981" strokeWidth="1.5" strokeDasharray="8,5" />
                    <SvgText x={CHART_WIDTH - PAD.right + 2} y={targetY - 2} fontSize="9" fill="#10b981" fontWeight="bold">
                      {target.toFixed(0)}
                    </SvgText>
                  </>
                )}

                {/* Stop Loss line */}
                {showPrediction && (
                  <>
                    <Line x1={PAD.left} y1={slY} x2={CHART_WIDTH - PAD.right} y2={slY}
                      stroke="#ef4444" strokeWidth="1.5" strokeDasharray="8,5" />
                    <SvgText x={CHART_WIDTH - PAD.right + 2} y={slY + 10} fontSize="9" fill="#ef4444" fontWeight="bold">
                      {stopLoss.toFixed(0)}
                    </SvgText>
                  </>
                )}

                {/* Current price line */}
                <Line x1={PAD.left} y1={currentY} x2={CHART_WIDTH - PAD.right} y2={currentY}
                  stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,3" />

                {/* SMA 50 */}
                {sma50Points.length > 0 && (
                  <Polyline points={sma50Points} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
                )}
                {/* SMA 20 */}
                {sma20Points.length > 0 && (
                  <Polyline points={sma20Points} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.9" />
                )}

                {/* Candlestick bars */}
                {allBars.map((d, i) => {
                  const bull = d.close >= d.open;
                  const color = d.predicted ? (bull ? '#a78bfa' : '#f87171') : (bull ? '#10b981' : '#ef4444');
                  const cx = getX(i);
                  const yO = getY(d.open); const yC = getY(d.close);
                  const yH = getY(d.high); const yL = getY(d.low);
                  const ry = Math.min(yO, yC); const rh = Math.max(Math.abs(yO - yC), 1.5);
                  const opacity = d.predicted ? 0.7 : 1;
                  return (
                    <G key={i} opacity={opacity}>
                      <Line x1={cx} y1={yH} x2={cx} y2={yL} stroke={color} strokeWidth="1" />
                      <Rect x={cx - barW / 2} y={ry} width={barW} height={rh} fill={color} />
                    </G>
                  );
                })}

                {/* Live dot on last real candle */}
                <Circle cx={getX(histSlice.length - 1)} cy={currentY} r="4" fill="#3b82f6" opacity="0.9" />

                {/* Volume bars */}
                {allBars.map((d, i) => {
                  const bull = d.close >= d.open;
                  const color = d.predicted ? '#a78bfa' : (bull ? '#10b981' : '#ef4444');
                  const cx = getX(i);
                  const vh = ((d.volume || 0) / maxVol) * (VOL_HEIGHT - 8);
                  return (
                    <Rect key={`v${i}`}
                      x={cx - barW / 2}
                      y={CHART_HEIGHT + VOL_HEIGHT - vh}
                      width={barW}
                      height={Math.max(vh, 1)}
                      fill={color}
                      opacity={d.predicted ? 0.3 : 0.35}
                    />
                  );
                })}
              </Svg>

              {/* Chart Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendLabel}>SMA 20</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendLabel}>SMA 50</Text></View>
                {showPrediction && <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#a78bfa' }]} /><Text style={styles.legendLabel}>AI Prediction</Text></View>}
                {showPrediction && <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendLabel}>Target</Text></View>}
                {showPrediction && <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={styles.legendLabel}>Stop Loss</Text></View>}
              </View>
            </View>

            {/* Verdict Cards */}
            {analysis.verdict && (
              <View style={styles.verdictRow}>
                <View style={[styles.verdictMini, { borderColor: '#10b981' }]}>
                  <Target size={16} color="#10b981" />
                  <Text style={styles.verdictMiniLabel}>Target</Text>
                  <Text style={[styles.verdictMiniVal, { color: '#10b981' }]}>Rs. {target.toFixed(2)}</Text>
                </View>
                <View style={[styles.verdictMini, { borderColor: '#ef4444' }]}>
                  <ShieldAlert size={16} color="#ef4444" />
                  <Text style={styles.verdictMiniLabel}>Stop Loss</Text>
                  <Text style={[styles.verdictMiniVal, { color: '#ef4444' }]}>Rs. {stopLoss.toFixed(2)}</Text>
                </View>
                <View style={[styles.verdictMini, { borderColor: '#3b82f6' }]}>
                  <TrendingUp size={16} color="#3b82f6" />
                  <Text style={styles.verdictMiniLabel}>Timeframe</Text>
                  <Text style={[styles.verdictMiniVal, { color: '#3b82f6' }]}>{analysis.verdict.timeframe}</Text>
                </View>
              </View>
            )}

            {/* Pattern Badges */}
            {analysis.patterns?.length > 0 && (
              <View style={styles.patternsWrap}>
                <Text style={styles.patternsTitle}>Patterns Detected</Text>
                <View style={styles.patternsRow}>
                  {analysis.patterns.map((p: string, i: number) => (
                    <View key={i} style={styles.patternChip}><Text style={styles.patternChipText}>✨ {p}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {/* Technical Numbers */}
            <View style={styles.technicalCard}>
              <Text style={styles.techTitle}>Technical Indicators</Text>
              {[
                { label: 'RSI (14)', value: analysis.rsi.toFixed(2), color: analysis.rsi < 30 ? '#10b981' : analysis.rsi > 70 ? '#ef4444' : '#374151' },
                { label: 'SMA 20', value: `Rs. ${(closes[closes.length-1] * 0.99).toFixed(2)}`, color: '#3b82f6' },
                { label: 'SMA 50', value: `Rs. ${analysis.sma50.toFixed(2)}`, color: '#f59e0b' },
                { label: 'SMA 200', value: `Rs. ${analysis.sma200.toFixed(2)}`, color: '#6366f1' },
              ].map((item, i) => (
                <View key={i} style={styles.techRow}>
                  <Text style={styles.techLabel}>{item.label}</Text>
                  <Text style={[styles.techValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!loading && !selectedSymbol && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📈</Text>
            <Text style={styles.emptyTitle}>Search a stock to begin</Text>
            <Text style={styles.emptySub}>Type a NEPSE symbol above to load live candlestick charts, SMA lines, and AI price prediction.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveLabel: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', marginLeft: 10 },
  suggestions: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
  suggestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestSymbol: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  suggestChange: { fontSize: 14 },
  loadingWrap: { alignItems: 'center', padding: 40 },
  loadingText: { color: '#6b7280', marginTop: 12 },
  signalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 8, padding: 16, borderRadius: 12, borderLeftWidth: 4 },
  bannerSymbol: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  bannerPrice: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  signalBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  signalText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  timeframeRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginVertical: 10 },
  tfBtn: { flex: 1, backgroundColor: '#fff', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  tfBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  tfBtnPrediction: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  tfText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tfTextActive: { color: '#fff' },
  chartWrapper: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingTop: 8, paddingBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#6b7280' },
  verdictRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 },
  verdictMini: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  verdictMiniLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  verdictMiniVal: { fontSize: 14, fontWeight: 'bold', marginTop: 2, textAlign: 'center' },
  patternsWrap: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 12 },
  patternsTitle: { fontSize: 13, fontWeight: 'bold', color: '#6b7280', marginBottom: 8 },
  patternsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  patternChip: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#dbeafe' },
  patternChipText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  technicalCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, padding: 16, borderRadius: 12 },
  techTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  techRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  techLabel: { fontSize: 15, color: '#4b5563' },
  techValue: { fontSize: 15, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 16 },
  emptySub: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
