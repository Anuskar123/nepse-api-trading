import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Info, ShieldCheck, Wallet, Clock, TrendingUp, BrainCircuit, Target, AlertTriangle } from 'lucide-react-native';

export default function TradingGuideScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>2026 Trading Rules</Text>
        <Text style={styles.subtitle}>Official NEPSE Secondary Market Regulations</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* MASTER WORKFLOW */}
        <View style={styles.masterSection}>
           <View style={styles.sectionHeader}>
             <BrainCircuit size={24} color="#fff" />
             <Text style={styles.masterTitle}>AI TRADING WORKFLOW</Text>
           </View>
           <Text style={styles.stepText}>1. Pick momentum stocks from Home Coach.{"\n"}2. Verify AI signs in Predict tab.{"\n"}3. Calculate Kitta profit in Scanner.</Text>
        </View>

        {/* 2026 OFFICIAL RULES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={24} color="#ef4444" />
            <Text style={styles.sectionTitle}>Key Rules (2026 Update)</Text>
          </View>
          
          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>Price Limits & Circuit Breakers</Text>
            <Text style={styles.ruleText}>• Daily price limit for stocks is now 15%.{"\n"}• 5% Index move (11AM-1PM) = 15-min halt.{"\n"}• 8% Index move = Trading suspended for the day.</Text>
          </View>

          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>Pre-Open Session</Text>
            <Text style={styles.ruleText}>• Runs 10:30 AM to 10:45 AM.{"\n"}• Price movement limit: 5% of previous close.</Text>
          </View>

          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>Settlement (T+3)</Text>
            <Text style={styles.ruleText}>• Final payment and security transfer must be completed within 3 business days.</Text>
          </View>

          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>Collateral Requirement</Text>
            <Text style={styles.ruleText}>• 25% of intended purchase amount must be deposited with broker in advance.</Text>
          </View>

          <View style={styles.ruleBox}>
            <Text style={styles.ruleTitle}>EDIS & Selling</Text>
            <Text style={styles.ruleText}>• Transfer shares via MeroShare within 2 days of sale.{"\n"}• Failure = 20% Closeout Penalty.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.cardTitle}>When to Sell?</Text>
          </View>
          <Text style={styles.cardText}>
            Sell when price hits AI Target, drops below Stop Loss, or when AI Coach flags a sell signal.
          </Text>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  content: { padding: 16 },
  masterSection: { backgroundColor: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 },
  masterTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepText: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  section: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 10 },
  ruleBox: { marginTop: 16, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  ruleTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  ruleText: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginLeft: 8 },
  cardText: { fontSize: 13, color: '#4b5563', lineHeight: 18 }
});
