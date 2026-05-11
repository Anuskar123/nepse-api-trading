import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Info, ShieldCheck, Wallet, Clock, TrendingUp } from 'lucide-react-native';

export default function TradingGuideScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trading Guide</Text>
        <Text style={styles.subtitle}>Essential tips for NEPSE Secondary Market</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={24} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Essential Factors</Text>
          </View>
          <Text style={styles.sectionText}>
            When buying stocks in the NEPSE secondary market, you must prioritize company fundamental analysis (profitability, P/E ratio, dividend history), market liquidity, and broker commission structures.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <ShieldCheck size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Company Fundamentals</Text>
          </View>
          <Text style={styles.cardText}>
            Research the company's financial performance, annual reports, past performance, and management efficiency. Look for companies with consistent returns, especially in high-growth sectors.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Market Liquidity</Text>
          </View>
          <Text style={styles.cardText}>
            Select stocks with high liquidity (high daily trading volume) to ensure you can easily sell them when needed.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Info size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Risk Management</Text>
          </View>
          <Text style={styles.cardText}>
            Be aware of high market volatility. Avoid over-diversifying and, if needed, limit the number of stocks in your portfolio. Maintain a long-term perspective to avoid high capital gains taxes.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wallet size={20} color="#ef4444" />
            <Text style={styles.cardTitle}>Transaction Costs & Taxes</Text>
          </View>
          <Text style={styles.cardText}>
            Capital gains tax is 5% for individuals holding shares for more than one year and 7.5% for less than one year. Don't forget broker commissions!
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Clock size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>Collateral & Settlement</Text>
          </View>
          <Text style={styles.cardText}>
            You must pay 25% of the total purchase amount as collateral to the broker in advance. Payments must be settled within 1 working day after the trading day (T+1).
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Timing the Market</Text>
          </View>
          <Text style={styles.cardText}>
            Avoid buying at peak prices. Analyze the market trend and wait for a correction to buy stocks at a better valuation.
          </Text>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Simple Activity icon replacement since it wasn't imported
const Activity = ({ size, color }: { size: number, color: string }) => (
  <View style={{ width: size, height: size, backgroundColor: color, borderRadius: size/2 }} />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  content: { padding: 16 },
  section: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 10 },
  sectionText: { fontSize: 16, color: '#4b5563', lineHeight: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginLeft: 8 },
  cardText: { fontSize: 14, color: '#4b5563', lineHeight: 20 }
});
