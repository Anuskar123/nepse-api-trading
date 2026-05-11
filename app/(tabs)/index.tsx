import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { fetchLiveMarketData } from '../../services/api';
import { Link } from 'expo-router';
import { TrendingUp, TrendingDown, BrainCircuit, Calendar, Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';

export default function MarketDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [indices, setIndices] = useState<any>({});
  const [gainers, setGainers] = useState<any[]>([]);
  const [losers, setLosers] = useState<any[]>([]);
  const [topTurnovers, setTopTurnovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'all' | 'gainers' | 'losers' | 'turnover'>('all');

  const loadData = async () => {
    try {
      const response = await fetch('https://nepse-api-trading.onrender.com/api/live');
      const json = await response.json();
      const sortedData = json.data.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol));
      setData(sortedData);
      setIndices(json.indices || {});
      setGainers(json.gainers || []);
      setLosers(json.losers || []);
      setTopTurnovers(json.topTurnovers || []);
    } catch (e) {
      const liveData = await fetchLiveMarketData();
      const sorted = liveData.sort((a: any, b: any) => a.symbol.localeCompare(b.symbol));
      setData(sorted);
      // Compute locally if backend fails
      setGainers([...sorted].sort((a, b) => b.percentChange - a.percentChange).slice(0, 10));
      setLosers([...sorted].sort((a, b) => a.percentChange - b.percentChange).slice(0, 10));
      setTopTurnovers([...sorted].sort((a, b) => (b.ltp * b.volume) - (a.ltp * a.volume)).slice(0, 10));
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // AI Coach
  const aiCoach = useMemo(() => {
    if (!data.length) return null;
    const candidates = [...data].filter(s => s.volume > 50000 && s.percentChange > 0 && s.percentChange < 5).sort((a, b) => b.volume - a.volume);
    const pick = candidates[0] || data[0];
    const loser = [...data].sort((a, b) => a.percentChange - b.percentChange)[0];
    const bullish = data.filter(s => s.percentChange > 0).length;
    return {
      pick: pick.symbol,
      reason: `${pick.symbol} has the highest buying interest today (${pick.volume.toLocaleString()} units traded). Consider a 7-day hold.`,
      exit: `Sell at Rs. ${(pick.ltp * 1.1).toFixed(0)} or after 7 days.`,
      warning: `${loser.symbol} dropped ${loser.percentChange}% today. Avoid buying.`,
      vibe: bullish > data.length / 2 ? 'BULLISH' : 'BEARISH',
      bullCount: bullish,
      bearCount: data.length - bullish,
    };
  }, [data]);

  const displayList = tab === 'gainers' ? gainers : tab === 'losers' ? losers : tab === 'turnover' ? topTurnovers : data;

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={{ marginTop: 12, color: '#6b7280' }}>Loading NEPSE Data...</Text></View>;
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>NEPSE Terminal</Text>
          <View style={s.liveRow}><View style={s.pulseDot} /><Text style={s.liveText}>LIVE MARKET</Text></View>
        </View>

        {/* Indices Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.indicesBar}>
          {Object.entries(indices).map(([name, info]: [string, any]) => (
            <View key={name} style={s.indexItem}>
              <Text style={s.indexName}>{name}</Text>
              <Text style={s.indexVal}>{info.value}</Text>
              <Text style={[s.indexChg, { color: String(info.change).includes('-') ? '#ef4444' : '#10b981' }]}>{info.change}</Text>
            </View>
          ))}
        </ScrollView>

        {/* AI Coach */}
        {aiCoach && (
          <View style={s.coachCard}>
            <View style={s.coachHeader}><BrainCircuit color="#fff" size={18} /><Text style={s.coachTitle}>AI TRADING COACH</Text></View>
            <View style={s.coachBody}>
              <View style={s.vibeRow}>
                <View style={[s.vibeBadge, { backgroundColor: aiCoach.vibe === 'BULLISH' ? '#065f46' : '#7f1d1d' }]}>
                  <Text style={s.vibeText}>{aiCoach.vibe}</Text>
                </View>
                <Text style={s.vibeDetail}>{aiCoach.bullCount}↑ / {aiCoach.bearCount}↓</Text>
              </View>
              <Text style={s.coachMainText}>Buy <Text style={{ fontWeight: 'bold', color: '#60a5fa' }}>{aiCoach.pick}</Text> — {aiCoach.reason}</Text>
              <View style={s.strategyBox}><Text style={s.strategyLabel}>EXIT PLAN:</Text><Text style={s.strategyValue}>{aiCoach.exit}</Text></View>
              <View style={s.warningBox}><Text style={s.warningText}>⚠️ {aiCoach.warning}</Text></View>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: '#f0fdf4' }]}>
            <ArrowUpRight color="#16a34a" size={20} />
            <Text style={s.statLabel}>Top Gainer</Text>
            <Text style={s.statSymbol}>{gainers[0]?.symbol}</Text>
            <Text style={[s.statChange, { color: '#16a34a' }]}>+{gainers[0]?.percentChange}%</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: '#fef2f2' }]}>
            <ArrowDownRight color="#dc2626" size={20} />
            <Text style={s.statLabel}>Top Loser</Text>
            <Text style={s.statSymbol}>{losers[0]?.symbol}</Text>
            <Text style={[s.statChange, { color: '#dc2626' }]}>{losers[0]?.percentChange}%</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: '#fefce8' }]}>
            <Flame color="#ca8a04" size={20} />
            <Text style={s.statLabel}>Hot Stock</Text>
            <Text style={s.statSymbol}>{topTurnovers[0]?.symbol}</Text>
            <Text style={[s.statChange, { color: '#ca8a04' }]}>Rs.{(topTurnovers[0]?.turnover / 1000000)?.toFixed(0)}M</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={s.tabRow}>
          {(['all', 'gainers', 'losers', 'turnover'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>{t === 'all' ? `All (${data.length})` : t === 'gainers' ? 'Gainers' : t === 'losers' ? 'Losers' : 'Turnover'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Table Header */}
        <View style={s.tableHeader}>
          <Text style={[s.colH, { flex: 1.5 }]}>SYMBOL</Text>
          <Text style={[s.colH, { flex: 1, textAlign: 'right' }]}>LTP</Text>
          <Text style={[s.colH, { flex: 0.8, textAlign: 'right' }]}>CHG%</Text>
          <Text style={[s.colH, { flex: 1, textAlign: 'right' }]}>HIGH</Text>
          <Text style={[s.colH, { flex: 1, textAlign: 'right' }]}>LOW</Text>
          <Text style={[s.colH, { flex: 1, textAlign: 'right' }]}>QTY</Text>
        </View>

        {/* Stock Rows */}
        {displayList.map((item, idx) => (
          <Link key={idx} href={{ pathname: "/stock/[symbol]", params: { symbol: item.symbol, ltp: item.ltp } }} asChild>
            <TouchableOpacity style={s.row}>
              <View style={{ flex: 1.5 }}>
                <Text style={s.symbol}>{item.symbol}</Text>
              </View>
              <Text style={[s.cell, { flex: 1 }]}>{item.ltp?.toFixed(2)}</Text>
              <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                <View style={[s.changeBadge, { backgroundColor: item.percentChange >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[s.changeText, { color: item.percentChange >= 0 ? '#16a34a' : '#dc2626' }]}>
                    {item.percentChange >= 0 ? '+' : ''}{item.percentChange?.toFixed(2)}%
                  </Text>
                </View>
              </View>
              <Text style={[s.cell, { flex: 1, color: '#10b981' }]}>{item.high?.toFixed(2) || '-'}</Text>
              <Text style={[s.cell, { flex: 1, color: '#ef4444' }]}>{item.low?.toFixed(2) || '-'}</Text>
              <Text style={[s.cell, { flex: 1 }]}>{item.volume?.toLocaleString() || '-'}</Text>
            </TouchableOpacity>
          </Link>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0f172a' },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 8 },
  liveText: { color: '#ef4444', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  indicesBar: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  indexItem: { marginRight: 28 },
  indexName: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  indexVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 },
  indexChg: { fontSize: 11, fontWeight: 'bold', marginTop: 1 },
  coachCard: { margin: 12, backgroundColor: '#1e293b', borderRadius: 14, overflow: 'hidden' },
  coachHeader: { backgroundColor: '#334155', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },
  coachBody: { padding: 14 },
  vibeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  vibeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  vibeText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  vibeDetail: { color: '#94a3b8', fontSize: 12 },
  coachMainText: { color: '#f1f5f9', fontSize: 14, lineHeight: 20 },
  strategyBox: { marginTop: 12, backgroundColor: '#0f172a', padding: 10, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  strategyLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  strategyValue: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 3 },
  warningBox: { marginTop: 8, padding: 6, backgroundColor: '#450a0a', borderRadius: 6 },
  warningText: { color: '#fca5a5', fontSize: 11 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginVertical: 8 },
  statBox: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4, fontWeight: 'bold' },
  statSymbol: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 },
  statChange: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 4, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 },
  tabBtnText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  tabBtnTextActive: { color: '#0f172a' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  colH: { fontSize: 10, fontWeight: 'bold', color: '#64748b', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  symbol: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  cell: { textAlign: 'right', fontSize: 12, color: '#374151' },
  changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  changeText: { fontSize: 11, fontWeight: 'bold' },
});
