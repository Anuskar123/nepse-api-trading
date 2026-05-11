import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { fetchLiveMarketData } from '../../services/api';
import { Briefcase, ArrowUpRight, ArrowDownRight, AlertTriangle, Receipt } from 'lucide-react-native';

// NEPSE Fee Schedule (2026)
const getBrokerCommission = (v: number): number => {
  if (v <= 50000) return v * 0.004;
  if (v <= 500000) return v * 0.0037;
  if (v <= 2000000) return v * 0.0034;
  if (v <= 10000000) return v * 0.003;
  return v * 0.0025;
};

const SEBON_FEE = 0.00015;
const DP_CHARGE = 25;
const CGT_SHORT = 0.075; // <1 year
const CGT_LONG = 0.05;   // >1 year

export default function ScannerScreen() {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState('10');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [holdPeriod, setHoldPeriod] = useState<'short' | 'long'>('short');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchLiveMarketData().then(res => { setMarketData(res.data || []); setLoading(false); });
  }, []);

  const calculate = () => {
    const kitta = parseFloat(units) || 0;
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(sellPrice) || 0;
    if (!kitta || !buy || !sell) return;

    const purchaseVal = kitta * buy;
    const buyBroker = getBrokerCommission(purchaseVal);
    const buySebon = purchaseVal * SEBON_FEE;
    const totalBuyCost = purchaseVal + buyBroker + buySebon;
    const costPerUnit = totalBuyCost / kitta;

    const sellVal = kitta * sell;
    const sellBroker = getBrokerCommission(sellVal);
    const sellSebon = sellVal * SEBON_FEE;
    const grossProfit = sellVal - purchaseVal;
    const cgtRate = holdPeriod === 'short' ? CGT_SHORT : CGT_LONG;
    const cgt = grossProfit > 0 ? grossProfit * cgtRate : 0;
    const totalSellFees = sellBroker + sellSebon + DP_CHARGE + cgt;
    const netReceivable = sellVal - totalSellFees;
    const netProfit = netReceivable - totalBuyCost;
    const roi = (netProfit / totalBuyCost) * 100;

    // Break-even: minimum sell price to not lose money
    // netReceivable must >= totalBuyCost
    // sell * kitta - fees(sell) - DP - CGT(profit) >= totalBuyCost
    // This is complex, so we iterate
    let breakeven = buy;
    for (let i = 0; i < 100; i++) {
      const sv = kitta * breakeven;
      const sf = getBrokerCommission(sv) + sv * SEBON_FEE + DP_CHARGE;
      const gp = sv - purchaseVal;
      const ct = gp > 0 ? gp * cgtRate : 0;
      const nr = sv - sf - ct;
      if (nr >= totalBuyCost) break;
      breakeven += 0.5;
    }

    setResult({
      kitta, purchaseVal, buyBroker, buySebon, totalBuyCost, costPerUnit,
      sellVal, sellBroker, sellSebon, cgt, cgtRate: cgtRate * 100, dp: DP_CHARGE,
      totalSellFees, netReceivable, netProfit, roi, breakeven,
      isProfit: netProfit > 0
    });
  };

  const topGainers = useMemo(() => {
    return [...marketData].filter(s => s.volume > 10000 && s.percentChange > 0).sort((a, b) => b.percentChange - a.percentChange).slice(0, 8);
  }, [marketData]);

  return (
    <SafeAreaView style={st.container}>
      <ScrollView>
        <View style={st.header}>
          <Text style={st.title}>Profit Calculator</Text>
          <Text style={st.subtitle}>Calculate exact costs, fees, taxes & net profit</Text>
        </View>

        {/* Input Form */}
        <View style={st.card}>
          <View style={st.inputRow}>
            <View style={st.inputCol}>
              <Text style={st.label}>Kitta (Units)</Text>
              <TextInput style={st.input} value={units} onChangeText={setUnits} keyboardType="numeric" placeholder="10" />
            </View>
            <View style={st.inputCol}>
              <Text style={st.label}>Buy Price (Rs.)</Text>
              <TextInput style={st.input} value={buyPrice} onChangeText={setBuyPrice} keyboardType="numeric" placeholder="540" />
            </View>
          </View>
          <View style={st.inputRow}>
            <View style={st.inputCol}>
              <Text style={st.label}>Sell Price (Rs.)</Text>
              <TextInput style={st.input} value={sellPrice} onChangeText={setSellPrice} keyboardType="numeric" placeholder="600" />
            </View>
            <View style={st.inputCol}>
              <Text style={st.label}>Holding Period</Text>
              <View style={st.holdRow}>
                <TouchableOpacity onPress={() => setHoldPeriod('short')} style={[st.holdBtn, holdPeriod === 'short' && st.holdActive]}>
                  <Text style={[st.holdText, holdPeriod === 'short' && st.holdTextActive]}>{'<1 Yr'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHoldPeriod('long')} style={[st.holdBtn, holdPeriod === 'long' && st.holdActive]}>
                  <Text style={[st.holdText, holdPeriod === 'long' && st.holdTextActive]}>{'>1 Yr'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity style={st.calcBtn} onPress={calculate}>
            <Receipt color="#fff" size={18} />
            <Text style={st.calcBtnText}>Calculate Profit</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {result && (
          <View style={st.resultCard}>
            {/* Net Profit Hero */}
            <View style={[st.profitHero, { backgroundColor: result.isProfit ? '#065f46' : '#7f1d1d' }]}>
              <Text style={st.profitHeroLabel}>NET {result.isProfit ? 'PROFIT' : 'LOSS'}</Text>
              <Text style={st.profitHeroVal}>Rs. {result.netProfit.toFixed(2)}</Text>
              <Text style={st.profitHeroRoi}>ROI: {result.roi.toFixed(2)}%</Text>
            </View>

            {/* Breakdown */}
            <View style={st.breakdownSection}>
              <Text style={st.breakdownTitle}>BUYING COSTS</Text>
              <View style={st.bRow}><Text style={st.bLabel}>Purchase Value ({result.kitta} × Rs. {buyPrice})</Text><Text style={st.bVal}>Rs. {result.purchaseVal.toFixed(2)}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>Broker Commission</Text><Text style={st.bVal}>Rs. {result.buyBroker.toFixed(2)}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>SEBON Fee (0.015%)</Text><Text style={st.bVal}>Rs. {result.buySebon.toFixed(2)}</Text></View>
              <View style={[st.bRow, st.bTotal]}><Text style={st.bTotalLabel}>Total Entry Cost</Text><Text style={st.bTotalVal}>Rs. {result.totalBuyCost.toFixed(2)}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>Your Real Cost Per Share</Text><Text style={[st.bVal, { color: '#ef4444', fontWeight: 'bold' }]}>Rs. {result.costPerUnit.toFixed(2)}</Text></View>
            </View>

            <View style={st.breakdownSection}>
              <Text style={st.breakdownTitle}>SELLING COSTS</Text>
              <View style={st.bRow}><Text style={st.bLabel}>Sale Value ({result.kitta} × Rs. {sellPrice})</Text><Text style={st.bVal}>Rs. {result.sellVal.toFixed(2)}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>Broker Commission</Text><Text style={st.bVal}>Rs. {result.sellBroker.toFixed(2)}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>SEBON Fee</Text><Text style={st.bVal}>Rs. {result.sellSebon.toFixed(2)}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>DP Charge</Text><Text style={st.bVal}>Rs. {result.dp}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>CGT ({result.cgtRate}% on profit)</Text><Text style={[st.bVal, { color: '#ef4444' }]}>Rs. {result.cgt.toFixed(2)}</Text></View>
              <View style={[st.bRow, st.bTotal]}><Text style={st.bTotalLabel}>Net Receivable</Text><Text style={st.bTotalVal}>Rs. {result.netReceivable.toFixed(2)}</Text></View>
            </View>

            <View style={st.breakevenBox}>
              <Text style={st.breakevenLabel}>Break-Even Sell Price</Text>
              <Text style={st.breakevenVal}>Rs. {result.breakeven.toFixed(2)}</Text>
              <Text style={st.breakevenHint}>You must sell above this price to make any profit after all fees and taxes.</Text>
            </View>

            <View style={st.timelineBox}>
              <Text style={st.timelineText}>⚠️ T+3 Rule: Shares reach your DEMAT portfolio 3 working days after purchase. You cannot sell before they arrive.</Text>
            </View>
          </View>
        )}

        {/* Quick Picks */}
        <View style={st.card}>
          <Text style={st.sectionTitle}>🔥 Today's Top Movers</Text>
          <Text style={st.sectionSub}>High volume stocks with positive momentum</Text>
          {loading ? <ActivityIndicator size="small" color="#3b82f6" /> : topGainers.map((item, idx) => (
            <View key={idx} style={st.pickRow}>
              <View style={st.pickLeft}>
                <Text style={st.pickSymbol}>{item.symbol}</Text>
                <Text style={st.pickVol}>Vol: {item.volume?.toLocaleString()}</Text>
              </View>
              <View style={st.pickRight}>
                <Text style={st.pickPrice}>Rs. {item.ltp}</Text>
                <Text style={[st.pickChg, { color: '#10b981' }]}>+{item.percentChange}%</Text>
              </View>
              <TouchableOpacity style={st.pickFill} onPress={() => { setBuyPrice(String(item.ltp)); setSellPrice(String((item.ltp * 1.05).toFixed(0))); }}>
                <Text style={st.pickFillText}>Fill</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 14 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputCol: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 15 },
  holdRow: { flexDirection: 'row', gap: 6 },
  holdBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#f1f5f9' },
  holdActive: { backgroundColor: '#dbeafe' },
  holdText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  holdTextActive: { color: '#1d4ed8' },
  calcBtn: { flexDirection: 'row', backgroundColor: '#2563eb', padding: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  calcBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resultCard: { margin: 12, borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden' },
  profitHero: { padding: 20, alignItems: 'center' },
  profitHeroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  profitHeroVal: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  profitHeroRoi: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  breakdownSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  breakdownTitle: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 1, marginBottom: 10 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  bLabel: { fontSize: 13, color: '#64748b' },
  bVal: { fontSize: 13, color: '#0f172a' },
  bTotal: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 6, paddingTop: 10 },
  bTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  bTotalVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  breakevenBox: { padding: 16, backgroundColor: '#fffbeb', margin: 12, borderRadius: 10 },
  breakevenLabel: { fontSize: 11, fontWeight: 'bold', color: '#92400e', letterSpacing: 1 },
  breakevenVal: { fontSize: 22, fontWeight: 'bold', color: '#92400e', marginTop: 4 },
  breakevenHint: { fontSize: 12, color: '#a16207', marginTop: 6, lineHeight: 16 },
  timelineBox: { padding: 12, margin: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  timelineText: { fontSize: 12, color: '#991b1b', lineHeight: 17 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#94a3b8', marginBottom: 14 },
  pickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  pickLeft: { flex: 2 },
  pickSymbol: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  pickVol: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pickRight: { flex: 1.5, alignItems: 'flex-end' },
  pickPrice: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  pickChg: { fontSize: 12, fontWeight: 'bold' },
  pickFill: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginLeft: 8 },
  pickFillText: { fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' },
});
