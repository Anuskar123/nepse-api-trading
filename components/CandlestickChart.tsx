import React from 'react';
import { View, Dimensions, Text } from 'react-native';
import Svg, { Line, Rect, G, Polyline, Text as SvgText } from 'react-native-svg';

interface CandleData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  data: CandleData[];
  width: number;
  height: number;
}

export default function CandlestickChart({ data, width, height }: Props) {
  if (!data || data.length === 0) return null;

  const chartHeight = height * 0.75; // Top 75% for candles
  const volumeHeight = height * 0.2; // Bottom 20% for volume
  const padding = 10;
  
  const minLow = Math.min(...data.map(d => d.low));
  const maxHigh = Math.max(...data.map(d => d.high));
  const maxVolume = Math.max(...data.map(d => d.volume));
  
  const range = maxHigh - minLow || 1;
  
  const candleWidth = (width - padding * 2) / data.length;
  const spacing = candleWidth * 0.2;
  const barWidth = candleWidth - spacing;

  const getY = (val: number) => {
    return padding + chartHeight - ((val - minLow) / range) * (chartHeight - padding * 2);
  };

  const getVolY = (vol: number) => {
    return height - ((vol / maxVolume) * volumeHeight);
  };

  // Calculate 20-day SMA for the chart line
  const sma20Points = data.map((d, i) => {
    if (i < 19) return null;
    const slice = data.slice(i - 19, i + 1);
    const avg = slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
    const x = padding + i * candleWidth + candleWidth / 2;
    return `${x},${getY(avg)}`;
  }).filter(p => p !== null).join(' ');

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10 }}>
      <Svg width={width} height={height}>
        {/* Grid Lines */}
        <Line x1={0} y1={getY(maxHigh)} x2={width} y2={getY(maxHigh)} stroke="#f3f4f6" strokeWidth="1" />
        <Line x1={0} y1={getY(minLow)} x2={width} y2={getY(minLow)} stroke="#f3f4f6" strokeWidth="1" />
        <Line x1={0} y1={getY(minLow + range/2)} x2={width} y2={getY(minLow + range/2)} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="5,5" />
        
        {/* Y-Axis Labels */}
        <SvgText x={width - 45} y={getY(maxHigh) + 4} fontSize="10" fill="#9ca3af">{maxHigh.toFixed(0)}</SvgText>
        <SvgText x={width - 45} y={getY(minLow) + 4} fontSize="10" fill="#9ca3af">{minLow.toFixed(0)}</SvgText>

        {/* Volume Bars First (Background) */}
        {data.map((d, i) => {
          const isBull = d.close >= d.open;
          const color = isBull ? '#10b981' : '#ef4444';
          const x = padding + i * candleWidth;
          const vY = getVolY(d.volume);
          const vHeight = height - vY;
          return (
            <Rect
              key={`vol-${i}`}
              x={x + spacing / 2}
              y={vY}
              width={barWidth}
              height={Math.max(vHeight, 2)}
              fill={color}
              opacity={0.15}
            />
          );
        })}

        {/* SMA 20 Line (The "Proper Line Analysis") */}
        <Polyline
          points={sma20Points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity={0.8}
        />

        {/* Candlesticks */}
        {data.map((d, i) => {
          const isBull = d.close >= d.open;
          const color = isBull ? '#10b981' : '#ef4444';
          const x = padding + i * candleWidth;
          
          const yOpen = getY(d.open);
          const yClose = getY(d.close);
          const yHigh = getY(d.high);
          const yLow = getY(d.low);

          const rectY = Math.min(yOpen, yClose);
          const rectHeight = Math.max(Math.abs(yOpen - yClose), 1);

          return (
            <G key={`candle-${i}`}>
              <Line 
                x1={x + candleWidth / 2} 
                y1={yHigh} 
                x2={x + candleWidth / 2} 
                y2={yLow} 
                stroke={color} 
                strokeWidth="1" 
              />
              <Rect 
                x={x + spacing / 2} 
                y={rectY} 
                width={barWidth} 
                height={rectHeight} 
                fill={color} 
              />
            </G>
          );
        })}
      </Svg>
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
        <Text style={styles.legendText}>SMA 20 (Trend Line)</Text>
      </View>
    </View>
  );
}

const styles = {
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 11, color: '#6b7280', fontWeight: '500' }
};
