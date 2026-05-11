import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Dimensions
} from 'react-native';
import Svg, { Line, Rect, G, Polyline, Text as SvgText, Defs, LinearGradient, Stop, Polygon, Circle } from 'react-native-svg';
import { fetchLiveMarketData, fetchHistoricalData } from '../../services/api';
import { analyzeStock } from '../../utils/technicalAnalysis';
import { SMA } from 'technicalindicators';
import { Search, ZoomIn, ZoomOut, Target, TrendingUp, ShieldAlert, Clock, BarChart3 } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 320;
const PAD = { top: 20, right: 55, bottom: 30, left: 10 };

export default function PredictScreen() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allStocks, setAllStocks] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [showPrediction, setShowPrediction] = useState(true);

  useEffect(() => { fetchLiveMarketData().then(d => setAllStocks(d)); }, []);

  useEffect(() => {
    if (query.length > 0) {
      setSuggestions(allStocks.filter(s => s.symbol.toUpperCase().startsWith(query.toUpperCase())).slice(0, 6));
    } else setSuggestions([]);
  }, [query, allStocks]);

  const loadStock = async (stock: any) => {
    setQuery(stock.symbol);
    setSuggestions([]);
    setSelectedSymbol(stock.symbol);
    setSelectedStock(stock);
    setLoading(true);
    const hist = await fetchHistoricalData(stock.symbol, stock.ltp);
    const result = analyzeStock(hist);
    setHistory(hist);
    setAnalysis(result);
    setLoading(false);
  };

  const buildPrediction = (lastPrice: number, target: number, days: number) => {
    const bars = [];
    let price = lastPrice;
    const step = (target - lastPrice) / days;
    // Use deterministic seed so chart doesn't flicker
    let seed = lastPrice * 100;
    const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 1; i <= days; i++) {
      const close = price + step + (seededRandom() - 0.5) * (lastPrice * 0.01);
      bars.push({ close, open: price, high: Math.max(price, close) + lastPrice * 0.003, low: Math.min(price, close) - lastPrice * 0.003, date: `P+${i}`, predicted: true });
      price = close;
    }
    return bars;
  };

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const histSlice = history.slice(-zoomLevel);
    const lastPrice = history[history.length - 1].close;
    const target = analysis?.verdict?.target ?? lastPrice * 1.08;
    const prediction = showPrediction ? buildPrediction(lastPrice, target, 15) : [];
    return [...histSlice, ...prediction];
  }, [history, zoomLevel, showPrediction, analysis]);

  // Compute SMA lines
  const sma20Points = useMemo(() => {
    if (chartData.length < 20) return '';
    const closes = chartData.map(d => d.close);
    const sma = SMA.calculate({ period: 20, values: closes });
    const offset = closes.length - sma.length;
    return sma.map((v, i) => `${getXFn(i + offset)},${getYFn(v)}`).join(' ');
  }, [chartData]);

  // Safe chart math
  const highs = chartData.length ? chartData.map(d => d.high) : [1];
  const lows = chartData.length ? chartData.map(d => d.low) : [0];
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const range = maxHigh - minLow || 1;

  function getXFn(i: number) { return PAD.left + (i * (CHART_WIDTH - PAD.left - PAD.right)) / (chartData.length || 1); }
  function getYFn(v: number) { return PAD.top + (CHART_HEIGHT - PAD.top - PAD.bottom) * (1 - (v - minLow) / range); }

  const candleWidth = Math.max((CHART_WIDTH - PAD.left - PAD.right) / (chartData.length || 1) * 0.65, 2);
  const histCount = history.slice(-zoomLevel).length;

  // Price labels for Y axis
  const priceLabels = [0, 0.25, 0.5, 0.75, 1].map(f => minLow + range * (1 - f));

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}>
          <Text style={s.title}>Predict Pro</Text>
          <Text style={s.subtitle}>AI-Powered Price Forecast & Analysis</Text>
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Search color="#9ca3af" size={18} />
          <TextInput style={s.searchInput} placeholder="Type stock symbol (e.g. NABIL)..." value={query} onChangeText={setQuery} autoCapitalize="characters" />
        </View>

        {suggestions.length > 0 && (
          <View style={s.suggestions}>
            {suggestions.map(st => (
              <TouchableOpacity key={st.symbol} style={s.suggestItem} onPress={() => loadStock(st)}>
                <Text style={s.suggestSymbol}>{st.symbol}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.suggestLtp}>Rs. {st.ltp}</Text>
                  <Text style={[s.suggestChg, { color: st.percentChange >= 0 ? '#10b981' : '#ef4444' }]}>
                    {st.percentChange >= 0 ? '+' : ''}{st.percentChange}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && !history.length && (
          <View style={s.emptyState}>
            <BarChart3 color="#d1d5db" size={48} />
            <Text style={s.emptyTitle}>Search Any NEPSE Stock</Text>
            <Text style={s.emptyText}>Type a symbol above to see AI chart analysis, price predictions, and actionable buy/sell signals.</Text>
          </View>
        )}

        {loading && <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />}

        {!loading && history.length > 0 && analysis && (
          <>
            {/* Live Price Header */}
            <View style={s.priceBar}>
              <View>
                <Text style={s.priceSymbol}>{selectedSymbol}</Text>
                <Text style={s.priceMain}>Rs. {selectedStock?.ltp?.toFixed(2)}</Text>
              </View>
              <View style={[s.priceBadge, { backgroundColor: (selectedStock?.percentChange || 0) >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[s.priceChg, { color: (selectedStock?.percentChange || 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {(selectedStock?.percentChange || 0) >= 0 ? '▲' : '▼'} {selectedStock?.percentChange}%
                </Text>
              </View>
            </View>

            {/* Chart */}
            <View style={s.chartCard}>
              <View style={s.chartControls}>
                <TouchableOpacity onPress={() => setShowPrediction(!showPrediction)} style={[s.toggleBtn, showPrediction && s.toggleActive]}>
                  <Text style={[s.toggleText, showPrediction && s.toggleTextActive]}>🔮 Prediction</Text>
                </TouchableOpacity>
                <View style={s.zoomRow}>
                  <TouchableOpacity onPress={() => setZoomLevel(Math.min(zoomLevel + 15, 180))} style={s.zoomBtn}><ZoomOut color="#64748b" size={18} /></TouchableOpacity>
                  <Text style={s.zoomLabel}>{zoomLevel}D</Text>
                  <TouchableOpacity onPress={() => setZoomLevel(Math.max(zoomLevel - 15, 20))} style={s.zoomBtn}><ZoomIn color="#64748b" size={18} /></TouchableOpacity>
                </View>
              </View>

              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                <Defs>
                  <LinearGradient id="predBg" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#a78bfa" stopOpacity="0.15" />
                    <Stop offset="1" stopColor="#a78bfa" stopOpacity="0.03" />
                  </LinearGradient>
                </Defs>

                {/* Grid + Price Labels */}
                {priceLabels.map((price, idx) => {
                  const y = PAD.top + idx * (CHART_HEIGHT - PAD.top - PAD.bottom) / 4;
                  return (
                    <G key={idx}>
                      <Line x1={PAD.left} y1={y} x2={CHART_WIDTH - PAD.right} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <SvgText x={CHART_WIDTH - PAD.right + 4} y={y + 4} fontSize="9" fill="#94a3b8">{price.toFixed(0)}</SvgText>
                    </G>
                  );
                })}

                {/* Prediction Zone */}
                {showPrediction && histCount < chartData.length && (
                  <Rect x={getXFn(histCount)} y={PAD.top} width={CHART_WIDTH - getXFn(histCount) - PAD.right} height={CHART_HEIGHT - PAD.top - PAD.bottom} fill="url(#predBg)" />
                )}

                {/* SMA 20 Line */}
                {sma20Points.length > 0 && <Polyline points={sma20Points} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.7" />}

                {/* Candlesticks */}
                {chartData.map((d, i) => {
                  const x = getXFn(i);
                  const isBull = d.close >= d.open;
                  const color = d.predicted ? (isBull ? '#a78bfa' : '#c084fc') : (isBull ? '#10b981' : '#ef4444');
                  return (
                    <G key={i}>
                      <Line x1={x} y1={getYFn(d.high)} x2={x} y2={getYFn(d.low)} stroke={color} strokeWidth="1" />
                      <Rect x={x - candleWidth / 2} y={Math.min(getYFn(d.open), getYFn(d.close))} width={candleWidth} height={Math.max(Math.abs(getYFn(d.open) - getYFn(d.close)), 1)} fill={color} />
                    </G>
                  );
                })}

                {/* TARGET line */}
                {showPrediction && analysis.verdict && (
                  <>
                    <Line x1={PAD.left} y1={getYFn(analysis.verdict.target)} x2={CHART_WIDTH - PAD.right} y2={getYFn(analysis.verdict.target)} stroke="#10b981" strokeWidth="1" strokeDasharray="6,3" />
                    <G transform={`translate(${CHART_WIDTH - PAD.right}, ${getYFn(analysis.verdict.target) - 9})`}>
                      <Rect width={48} height={18} fill="#10b981" rx={4} />
                      <SvgText x={24} y={13} fontSize="9" fill="#fff" fontWeight="bold" textAnchor="middle">TARGET</SvgText>
                    </G>

                    <Line x1={PAD.left} y1={getYFn(analysis.verdict.stopLoss)} x2={CHART_WIDTH - PAD.right} y2={getYFn(analysis.verdict.stopLoss)} stroke="#ef4444" strokeWidth="1" strokeDasharray="6,3" />
                    <G transform={`translate(${CHART_WIDTH - PAD.right}, ${getYFn(analysis.verdict.stopLoss) - 9})`}>
                      <Rect width={48} height={18} fill="#ef4444" rx={4} />
                      <SvgText x={24} y={13} fontSize="9" fill="#fff" fontWeight="bold" textAnchor="middle">STOP</SvgText>
                    </G>
                  </>
                )}

                {/* BUY marker */}
                {(analysis.signal === 'Buy' || analysis.signal === 'Strong Buy') && histCount > 0 && (
                  <G transform={`translate(${getXFn(histCount - 1) - 10}, ${getYFn(history[history.length - 1].close) + 8})`}>
                    <Polygon points="0,8 10,0 20,8" fill="#10b981" />
                    <Rect y={8} width={20} height={14} fill="#10b981" rx={3} />
                    <SvgText x={10} y={18} fontSize="8" fill="#fff" fontWeight="bold" textAnchor="middle">BUY</SvgText>
                  </G>
                )}
              </Svg>

              {/* Legend */}
              <View style={s.legendRow}>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#10b981' }]} /><Text style={s.legendText}>Bullish</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={s.legendText}>Bearish</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#a78bfa' }]} /><Text style={s.legendText}>AI Prediction</Text></View>
                <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={s.legendText}>SMA 20</Text></View>
              </View>
            </View>

            {/* AI Verdict */}
            <View style={s.verdictCard}>
              <View style={[s.verdictHeader, { backgroundColor: analysis.signal === 'Buy' || analysis.signal === 'Strong Buy' ? '#065f46' : analysis.signal === 'Sell' || analysis.signal === 'Strong Sell' ? '#7f1d1d' : '#1e3a5f' }]}>
                <Text style={s.verdictAction}>{analysis.verdict?.action || analysis.signal}</Text>
                <View style={s.verdictBadge}><Text style={s.verdictRisk}>Risk: {analysis.verdict?.risk || 'Medium'}</Text></View>
              </View>

              <View style={s.verdictBody}>
                <View style={s.verdictStats}>
                  <View style={s.vStat}>
                    <Target size={16} color="#10b981" />
                    <Text style={s.vStatLabel}>Target</Text>
                    <Text style={[s.vStatVal, { color: '#10b981' }]}>Rs. {analysis.verdict?.target}</Text>
                  </View>
                  <View style={s.vStat}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <Text style={s.vStatLabel}>Stop Loss</Text>
                    <Text style={[s.vStatVal, { color: '#ef4444' }]}>Rs. {analysis.verdict?.stopLoss}</Text>
                  </View>
                  <View style={s.vStat}>
                    <Clock size={16} color="#3b82f6" />
                    <Text style={s.vStatLabel}>Timeframe</Text>
                    <Text style={[s.vStatVal, { color: '#3b82f6' }]}>{analysis.verdict?.timeframe}</Text>
                  </View>
                </View>

                {/* Technical Indicators */}
                <View style={s.techSection}>
                  <Text style={s.techTitle}>Technical Indicators</Text>
                  <View style={s.techRow}>
                    <Text style={s.techLabel}>RSI (14)</Text>
                    <Text style={[s.techVal, { color: analysis.rsi < 30 ? '#10b981' : analysis.rsi > 70 ? '#ef4444' : '#64748b' }]}>{analysis.rsi?.toFixed(1)} {analysis.rsi < 30 ? '(Oversold)' : analysis.rsi > 70 ? '(Overbought)' : '(Neutral)'}</Text>
                  </View>
                  <View style={s.techRow}>
                    <Text style={s.techLabel}>SMA 50</Text>
                    <Text style={s.techVal}>{analysis.sma50?.toFixed(2)}</Text>
                  </View>
                  <View style={s.techRow}>
                    <Text style={s.techLabel}>SMA 200</Text>
                    <Text style={s.techVal}>{analysis.sma200?.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Beginner Explanation */}
                <View style={s.beginnerCard}>
                  <Text style={s.beginnerTitle}>💡 What This Means For You</Text>
                  <Text style={s.beginnerText}>{analysis.verdict?.humanSummary}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  suggestions: { backgroundColor: '#fff', marginHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  suggestItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  suggestSymbol: { fontWeight: 'bold', fontSize: 15, color: '#0f172a' },
  suggestLtp: { fontSize: 14, color: '#374151', fontWeight: '600' },
  suggestChg: { fontSize: 12, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  priceBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12 },
  priceSymbol: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  priceMain: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  priceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  priceChg: { fontSize: 16, fontWeight: 'bold' },
  chartCard: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 14 },
  chartControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  toggleActive: { backgroundColor: '#ede9fe' },
  toggleText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  toggleTextActive: { color: '#7c3aed' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoomBtn: { padding: 6, backgroundColor: '#f1f5f9', borderRadius: 6 },
  zoomLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#94a3b8' },
  verdictCard: { margin: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
  verdictHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verdictAction: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  verdictBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  verdictRisk: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  verdictBody: { padding: 16 },
  verdictStats: { flexDirection: 'row', justifyContent: 'space-between' },
  vStat: { alignItems: 'center', flex: 1 },
  vStatLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  vStatVal: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  techSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  techTitle: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 10 },
  techRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  techLabel: { fontSize: 13, color: '#374151' },
  techVal: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  beginnerCard: { marginTop: 16, backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  beginnerTitle: { fontSize: 14, fontWeight: 'bold', color: '#166534', marginBottom: 6 },
  beginnerText: { fontSize: 13, color: '#15803d', lineHeight: 19 },
});
