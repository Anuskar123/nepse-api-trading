import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchLiveMarketData } from '../../services/api';
import { Search, TrendingUp, TrendingDown, Activity } from 'lucide-react-native';

export default function MarketTrackerScreen() {
  const router = useRouter();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const liveData = await fetchLiveMarketData();
    
    // Sort alphabetically by symbol initially
    const sortedData = liveData.sort((a, b) => a.symbol.localeCompare(b.symbol));

    setMarketData(sortedData);
    
    // Apply existing search filter if any
    if (searchQuery) {
      setFilteredData(sortedData.filter(item => item.symbol.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFilteredData(sortedData);
    }
    
    setLastUpdated(new Date().toLocaleTimeString());
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [searchQuery]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text) {
      setFilteredData(marketData.filter(item => item.symbol.toLowerCase().includes(text.toLowerCase())));
    } else {
      setFilteredData(marketData);
    }
  };

  // Calculate Market Overview Stats
  const topGainers = useMemo(() => {
    return [...marketData].sort((a, b) => b.percentChange - a.percentChange).slice(0, 5);
  }, [marketData]);

  const topLosers = useMemo(() => {
    return [...marketData].sort((a, b) => a.percentChange - b.percentChange).slice(0, 5);
  }, [marketData]);

  const topTurnovers = useMemo(() => {
    return [...marketData].sort((a, b) => b.volume - a.volume).slice(0, 5);
  }, [marketData]);

  const renderOverviewCard = (title: string, data: any[], type: 'gain' | 'loss' | 'neutral') => {
    const isGain = type === 'gain';
    const isLoss = type === 'loss';
    
    return (
      <View style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          {isGain && <TrendingUp size={16} color="#10b981" />}
          {isLoss && <TrendingDown size={16} color="#ef4444" />}
          {type === 'neutral' && <Activity size={16} color="#3b82f6" />}
          <Text style={[styles.overviewTitle, { color: isGain ? '#10b981' : isLoss ? '#ef4444' : '#3b82f6' }]}>
            {title}
          </Text>
        </View>
        
        <View style={styles.overviewList}>
          {data.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.overviewItem}
              onPress={() => router.push({ pathname: `/stock/${item.symbol}`, params: { ltp: item.ltp } })}
            >
              <Text style={styles.overviewSymbol}>{item.symbol}</Text>
              <View style={styles.overviewRight}>
                <Text style={styles.overviewLtp}>{item.ltp.toFixed(2)}</Text>
                {type === 'neutral' ? (
                   <Text style={[styles.overviewChange, { color: '#6b7280' }]}>{item.volume.toLocaleString()}</Text>
                ) : (
                   <Text style={[styles.overviewChange, { color: isGain ? '#10b981' : '#ef4444' }]}>
                     {item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(2)}%
                   </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Market Overview Section */}
      {!searchQuery && marketData.length > 0 && (
        <View style={styles.overviewSection}>
          <Text style={styles.sectionHeading}>Market Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            {renderOverviewCard("Top Gainers", topGainers, 'gain')}
            {renderOverviewCard("Top Losers", topLosers, 'loss')}
            {renderOverviewCard("Top Turnovers", topTurnovers, 'neutral')}
          </ScrollView>
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Symbol</Text>
        <Text style={[styles.headerCell, { flex: 2, textAlign: 'right' }]}>LTP</Text>
        <Text style={[styles.headerCell, { flex: 2, textAlign: 'right' }]}>Diff</Text>
        <Text style={[styles.headerCell, { flex: 2, textAlign: 'right' }]}>% Chg</Text>
        {Platform.OS === 'web' && <Text style={[styles.headerCell, { flex: 2, textAlign: 'right' }]}>Volume</Text>}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isPositive = item.change > 0;
    const isNegative = item.change < 0;
    const color = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6b7280';
    const rowBg = isPositive ? '#ecfdf5' : isNegative ? '#fef2f2' : '#ffffff';

    return (
      <TouchableOpacity 
        style={[styles.tableRow, { backgroundColor: rowBg }]}
        onPress={() => router.push({ pathname: `/stock/${item.symbol}`, params: { ltp: item.ltp } })}
      >
        <Text style={[styles.cell, { flex: 2, fontWeight: 'bold', color: '#111827' }]}>{item.symbol}</Text>
        <Text style={[styles.cell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
          {item.ltp.toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 2, textAlign: 'right', color }]}>
          {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}
        </Text>
        <Text style={[styles.cell, { flex: 2, textAlign: 'right', color }]}>
          {item.change > 0 ? '+' : ''}{item.percentChange.toFixed(2)}%
        </Text>
        {Platform.OS === 'web' && (
          <Text style={[styles.cell, { flex: 2, textAlign: 'right', color: '#6b7280' }]}>
            {item.volume.toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Market</Text>
          </View>
        </View>
        
        <Text style={styles.subtitle}>
          Data updated: {lastUpdated || 'Loading...'}
        </Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Company Symbol..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.tableContainer}>
        {loading && marketData.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.symbol}
            ListHeaderComponent={renderHeader}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            initialNumToRender={20}
            showsVerticalScrollIndicator={true}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 6 },
  liveText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, marginTop: 16, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, fontSize: 16, color: '#111827' },
  
  overviewSection: { backgroundColor: '#f9fafb', paddingTop: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginLeft: 16, marginBottom: 12 },
  overviewCard: { backgroundColor: '#ffffff', width: 220, borderRadius: 12, padding: 12, marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  overviewTitle: { fontSize: 15, fontWeight: 'bold', marginLeft: 6 },
  overviewList: { gap: 8 },
  overviewItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 6 },
  overviewSymbol: { fontSize: 14, fontWeight: '600', color: '#374151' },
  overviewRight: { alignItems: 'flex-end' },
  overviewLtp: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
  overviewChange: { fontSize: 12, fontWeight: '500' },

  tableContainer: { flex: 1, backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerCell: { fontSize: 13, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cell: { fontSize: 14, color: '#374151' },
  list: { paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }
});
