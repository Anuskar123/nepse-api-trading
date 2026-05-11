import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Dimensions, Animated
} from 'react-native';
import Svg, { Line, Rect, G, Polyline, Text as SvgText, Defs, LinearGradient, Stop, Polygon, Circle } from 'react-native-svg';
import { fetchLiveMarketData, fetchHistoricalData } from '../../services/api';
import { analyzeStock } from '../../utils/technicalAnalysis';
import { SMA } from 'technicalindicators';
import { Search, ZoomIn, ZoomOut, Target, TrendingUp, ShieldAlert } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 300;
const PAD = { top: 20, right: 50, bottom: 30, left: 10 };

export default function PredictScreen() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allStocks, setAllStocks] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  
  // Interaction State
  const [zoomLevel, setZoomLevel] = useState(50); // Number of bars visible
  const [showPrediction, setShowPrediction] = useState(true);

  useEffect(() => {
    fetchLiveMarketData().then(d => setAllStocks(d));
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      setSuggestions(allStocks.filter(s => s.symbol.startsWith(query.toUpperCase())).slice(0, 5));
    } else setSuggestions([]);
  }, [query, allStocks]);

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

  // Helper to build predicted bars
  const buildPrediction = (lastPrice: number, target: number, days: number) => {
    const bars = [];
    let price = lastPrice;
    const step = (target - lastPrice) / days;
    for(let i=1; i<=days; i++) {
      const close = price + step + (Math.random() - 0.5) * 5;
      bars.push({ close, open: price, high: Math.max(price, close) + 2, low: Math.min(price, close) - 2, date: `P+${i}`, predicted: true });
      price = close;
    }
    return bars;
  };

  const chartData = useMemo(() => {
    if (!history.length) return [];
    const histSlice = history.slice(-zoomLevel);
    const lastPrice = history[history.length - 1].close;
    const target = analysis?.verdict?.target ?? lastPrice * 1.1;
    const prediction = showPrediction ? buildPrediction(lastPrice, target, 15) : [];
    return [...histSlice, ...prediction];
  }, [history, zoomLevel, showPrediction, analysis]);

  if (!history.length && !loading) {
     // Initial state view
  }

  const highs = chartData.map(d => d.high);
  const lows = chartData.map(d => d.low);
  const maxHigh = Math.max(...highs, 1);
  const minLow = Math.min(...lows, 0);
  const range = maxHigh - minLow || 1;

  const getX = (i: number) => PAD.left + (i * (CHART_WIDTH - PAD.left - PAD.right)) / chartData.length;
  const getY = (v: number) => PAD.top + (CHART_HEIGHT - PAD.top - PAD.bottom) * (1 - (v - minLow) / range);

  const candleWidth = (CHART_WIDTH - PAD.left - PAD.right) / chartData.length * 0.7;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Predict Pro</Text>
          <Text style={styles.subtitle}>Interactive Analysis & Forecast</Text>
        </View>

        <View style={styles.searchBar}>
          <Search color="#9ca3af" size={20} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search NEPSE Symbol..."
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map(s => (
              <TouchableOpacity key={s.symbol} style={styles.suggestItem} onPress={() => loadStock(s.symbol, s.ltp)}>
                <Text style={styles.suggestSymbol}>{s.symbol}</Text>
                <Text style={styles.suggestLtp}>Rs. {s.ltp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : history.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>{selectedSymbol} Performance</Text>
              <View style={styles.zoomControls}>
                <TouchableOpacity onPress={() => setZoomLevel(Math.min(zoomLevel + 10, 150))}>
                  <ZoomOut color="#6b7280" size={24} />
                </TouchableOpacity>
                <Text style={styles.zoomText}>{zoomLevel} Bars</Text>
                <TouchableOpacity onPress={() => setZoomLevel(Math.max(zoomLevel - 10, 20))}>
                  <ZoomIn color="#6b7280" size={24} />
                </TouchableOpacity>
              </View>
            </View>

            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#818cf8" stopOpacity="0.2" />
                  <Stop offset="1" stopColor="#818cf8" stopOpacity="0.05" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(f => (
                <Line 
                  key={f}
                  x1={PAD.left} y1={PAD.top + f * (CHART_HEIGHT - PAD.top - PAD.bottom)}
                  x2={CHART_WIDTH - PAD.right} y2={PAD.top + f * (CHART_HEIGHT - PAD.top - PAD.bottom)}
                  stroke="#f3f4f6" strokeWidth="1"
                />
              ))}

              {/* Prediction Background */}
              {showPrediction && (
                <Rect 
                  x={getX(history.slice(-zoomLevel).length)}
                  y={PAD.top}
                  width={CHART_WIDTH - getX(history.slice(-zoomLevel).length) - PAD.right}
                  height={CHART_HEIGHT - PAD.top - PAD.bottom}
                  fill="url(#predGrad)"
                />
              )}

              {/* Candlesticks */}
              {chartData.map((d, i) => {
                const x = getX(i);
                const isBull = d.close >= d.open;
                const color = d.predicted ? (isBull ? '#a78bfa' : '#f87171') : (isBull ? '#10b981' : '#ef4444');
                const yHigh = getY(d.high);
                const yLow = getY(d.low);
                const yOpen = getY(d.open);
                const yClose = getY(d.close);
                
                return (
                  <G key={i}>
                    <Line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                    <Rect 
                      x={x - candleWidth/2} 
                      y={Math.min(yOpen, yClose)} 
                      width={candleWidth} 
                      height={Math.max(Math.abs(yOpen - yClose), 1)} 
                      fill={color} 
                    />
                  </G>
                );
              })}

              {/* Target & Stop Loss Lines with Labels */}
              {showPrediction && analysis?.verdict && (
                <>
                  <Line 
                    x1={PAD.left} y1={getY(analysis.verdict.target)} 
                    x2={CHART_WIDTH - PAD.right} y2={getY(analysis.verdict.target)}
                    stroke="#10b981" strokeWidth="1" strokeDasharray="5,5"
                  />
                  <G transform={`translate(${CHART_WIDTH - PAD.right}, ${getY(analysis.verdict.target) - 10})`}>
                    <Rect width={45} height={18} fill="#10b981" rx={4} />
                    <SvgText x={22} y={13} fontSize="9" fill="#fff" fontWeight="bold" textAnchor="middle">TARGET</SvgText>
                  </G>

                  <Line 
                    x1={PAD.left} y1={getY(analysis.verdict.stopLoss)} 
                    x2={CHART_WIDTH - PAD.right} y2={getY(analysis.verdict.stopLoss)}
                    stroke="#ef4444" strokeWidth="1" strokeDasharray="5,5"
                  />
                  <G transform={`translate(${CHART_WIDTH - PAD.right}, ${getY(analysis.verdict.stopLoss) - 10})`}>
                    <Rect width={45} height={18} fill="#ef4444" rx={4} />
                    <SvgText x={22} y={13} fontSize="9" fill="#fff" fontWeight="bold" textAnchor="middle">STOP</SvgText>
                  </G>
                </>
              )}

              {/* Buy Sign Marker */}
              {analysis?.signal === 'Buy' && (
                <G transform={`translate(${getX(history.slice(-zoomLevel).length - 1) - 12}, ${getY(history[history.length-1].close) + 10})`}>
                   <Polygon points="0,8 8,0 16,8" fill="#10b981" />
                   <Rect y={8} width={16} height={12} fill="#10b981" rx={2} />
                   <SvgText x={8} y={17} fontSize="8" fill="#fff" fontWeight="bold" textAnchor="middle">BUY</SvgText>
                </G>
              )}
            </Svg>

            {/* Verdict Cards */}
            {analysis.verdict && (
              <>
                <View style={styles.verdictRow}>
                  <View style={[styles.verdictMini, { borderColor: '#10b981' }]}>
                    <Target size={16} color="#10b981" />
                    <Text style={styles.verdictMiniLabel}>Target</Text>
                    <Text style={[styles.verdictMiniVal, { color: '#10b981' }]}>Rs. {analysis.verdict.target}</Text>
                  </View>
                  <View style={[styles.verdictMini, { borderColor: '#ef4444' }]}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <Text style={styles.verdictMiniLabel}>Stop Loss</Text>
                    <Text style={[styles.verdictMiniVal, { color: '#ef4444' }]}>Rs. {analysis.verdict.stopLoss}</Text>
                  </View>
                </View>

                {/* Beginner Friendly Card */}
                <View style={styles.beginnerCard}>
                   <Text style={styles.beginnerTitle}>Common Man's Explanation</Text>
                   <Text style={styles.beginnerText}>{analysis.verdict.humanSummary}</Text>
                </View>
              </>
            )}
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },
  suggestions: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  suggestItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  suggestSymbol: { fontWeight: 'bold', fontSize: 16 },
  suggestLtp: { color: '#6b7280' },
  chartCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoomText: { fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  verdictBox: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 },
  verdictTitle: { fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginBottom: 12 },
  verdictRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vItem: { alignItems: 'center' },
  vLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  vValue: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  beginnerCard: { marginTop: 20, backgroundColor: '#f0f9ff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bae6fd' },
  beginnerTitle: { fontSize: 14, fontWeight: 'bold', color: '#0369a1', marginBottom: 6 },
  beginnerText: { fontSize: 14, color: '#0c4a6e', lineHeight: 20 }
});
