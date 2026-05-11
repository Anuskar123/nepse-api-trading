import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { fetchLiveMarketData } from '../../services/api';
import { Calculator, TrendingUp, AlertTriangle, Briefcase, DollarSign } from 'lucide-react-native';

// NEPSE Fees
const getBrokerCommission = (tradeValue: number): number => {
  if (tradeValue <= 50000) return tradeValue * 0.004;
  if (tradeValue <= 500000) return tradeValue * 0.0037;
  if (tradeValue <= 2000000) return tradeValue * 0.0034;
  if (tradeValue <= 10000000) return tradeValue * 0.003;
  return tradeValue * 0.0025;
};

const SEBON_FEE = 0.00015; 
const DP_CHARGE = 25;
const CGT_SHORT = 0.075;

export default function ScannerScreen() {
  const [marketData, setMarketData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Trade Simulator State
  const [symbol, setSymbol] = useState('');
  const [units, setUnits] = useState('100'); // Kitta
  const [buyPrice, setBuyPrice] = useState('');
  const [expectedSellPrice, setExpectedSellPrice] = useState('');
  const [simulation, setSimulation] = useState<any>(null);

  useEffect(() => {
    fetchLiveMarketData().then(data => {
      setMarketData(data);
      setLoading(false);
    });
  }, []);

  const runSimulation = () => {
    const kitta = parseFloat(units) || 0;
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(expectedSellPrice) || 0;

    if (kitta <= 0 || buy <= 0 || sell <= 0) return;

    // Entry Costs
    const purchaseValue = kitta * buy;
    const buyBroker = getBrokerCommission(purchaseValue);
    const buySebon = purchaseValue * SEBON_FEE;
    const totalEntryCost = purchaseValue + buyBroker + buySebon;
    const costPerShare = totalEntryCost / kitta;

    // Exit Costs
    const sellValue = kitta * sell;
    const sellBroker = getBrokerCommission(sellValue);
    const sellSebon = sellValue * SEBON_FEE;
    const grossProfit = sellValue - purchaseValue;
    
    // CGT only on profit
    const cgt = grossProfit > 0 ? grossProfit * CGT_SHORT : 0;
    const totalExitFees = sellBroker + sellSebon + DP_CHARGE + cgt;
    const netReceivable = sellValue - totalExitFees;
    
    const netProfit = netReceivable - totalEntryCost;
    const profitPercentage = (netProfit / totalEntryCost) * 100;

    setSimulation({
      kitta,
      purchaseValue,
      totalEntryCost,
      costPerShare,
      sellValue,
      totalExitFees,
      netProfit,
      profitPercentage,
      isProfit: netProfit > 0
    });
  };

  const topShortTerm = useMemo(() => {
    return [...marketData]
      .filter(s => s.volume > 20000 && s.percentChange > 0)
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 10);
  }, [marketData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>Trade Simulator</Text>
          <Text style={styles.subtitle}>Analyze potential gains by Units (Kitta)</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity (Kitta / Units)</Text>
            <TextInput 
              style={styles.input} 
              value={units} 
              onChangeText={setUnits} 
              keyboardType="numeric"
              placeholder="e.g. 100"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Buying Price (LTP)</Text>
            <TextInput 
              style={styles.input} 
              value={buyPrice} 
              onChangeText={setBuyPrice} 
              keyboardType="numeric"
              placeholder="e.g. 540"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Expected Selling Price</Text>
            <TextInput 
              style={styles.input} 
              value={expectedSellPrice} 
              onChangeText={setExpectedSellPrice} 
              keyboardType="numeric"
              placeholder="e.g. 600"
            />
          </View>

          <TouchableOpacity style={styles.simulateBtn} onPress={runSimulation}>
            <Text style={styles.simulateBtnText}>Run Detailed Analysis</Text>
          </TouchableOpacity>
        </View>

        {simulation && (
          <View style={[styles.resultCard, { borderColor: simulation.isProfit ? '#10b981' : '#ef4444' }]}>
            <View style={styles.resultHeader}>
              <Briefcase color={simulation.isProfit ? '#10b981' : '#ef4444'} size={24} />
              <Text style={styles.resultTitle}>Investment Summary</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resLabel}>Total Units</Text>
              <Text style={styles.resValue}>{simulation.kitta} Kitta</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resLabel}>Total Investment (with fees)</Text>
              <Text style={styles.resValue}>Rs. {simulation.totalEntryCost.toFixed(2)}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resLabel}>Actual Cost per Share</Text>
              <Text style={styles.resValue}>Rs. {simulation.costPerShare.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={styles.resLabel}>Net Receivable (after fees/CGT)</Text>
              <Text style={styles.resValue}>Rs. {simulation.sellValue.toFixed(2)}</Text>
            </View>

            <View style={[styles.profitBox, { backgroundColor: simulation.isProfit ? '#ecfdf5' : '#fef2f2' }]}>
              <Text style={[styles.profitLabel, { color: simulation.isProfit ? '#059669' : '#dc2626' }]}>
                NET {simulation.isProfit ? 'PROFIT' : 'LOSS'}
              </Text>
              <Text style={[styles.profitValue, { color: simulation.isProfit ? '#059669' : '#dc2626' }]}>
                Rs. {simulation.netProfit.toFixed(2)} ({simulation.profitPercentage.toFixed(2)}%)
              </Text>
            </View>
            
            <View style={styles.timelineBox}>
              <Text style={styles.timelineText}>
                ⚠️ Note: This share will be eligible to sell in the secondary market after T+3 working days once it reaches your DEMAT portfolio.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>High Liquidity Picks</Text>
          <Text style={styles.sectionSub}>Top stocks suitable for short-term trading today</Text>
          
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            topShortTerm.map((item, idx) => (
              <View key={idx} style={styles.pickItem}>
                <Text style={styles.pickSymbol}>{item.symbol}</Text>
                <View style={styles.pickRight}>
                  <Text style={styles.pickPrice}>Rs. {item.ltp}</Text>
                  <Text style={styles.pickChange}>+{item.percentChange}%</Text>
                </View>
              </View>
            ))
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  simulateBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  simulateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultCard: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, borderWidth: 2 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, color: '#111827' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  resLabel: { color: '#6b7280', fontSize: 15 },
  resValue: { fontWeight: 'bold', color: '#111827', fontSize: 15 },
  divider: { hieght: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  profitBox: { marginTop: 12, padding: 16, borderRadius: 8, alignItems: 'center' },
  profitLabel: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  profitValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  timelineBox: { marginTop: 16, backgroundColor: '#fffbeb', padding: 12, borderRadius: 8 },
  timelineText: { fontSize: 12, color: '#92400e', lineHeight: 18, fontStyle: 'italic' },
  pickItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickSymbol: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  pickRight: { alignItems: 'flex-end' },
  pickPrice: { fontSize: 15, fontWeight: '600' },
  pickChange: { fontSize: 13, color: '#10b981', fontWeight: 'bold' }
});
