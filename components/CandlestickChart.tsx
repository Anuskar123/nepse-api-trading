import React from 'react';
import { View, Dimensions, Text } from 'react-native';
import Svg, { Line, Rect, G, Text as SvgText } from 'react-native-svg';

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

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10 }}>
      <Svg width={width} height={height}>
        {/* Grid Lines */}
        <Line x1={0} y1={getY(maxHigh)} x2={width} y2={getY(maxHigh)} stroke="#f3f4f6" strokeWidth="1" />
        <Line x1={0} y1={getY(minLow)} x2={width} y2={getY(minLow)} stroke="#f3f4f6" strokeWidth="1" />
        <Line x1={0} y1={getY(minLow + range/2)} x2={width} y2={getY(minLow + range/2)} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="5,5" />
        
        {/* Y-Axis Labels */}
        <SvgText x={width - 40} y={getY(maxHigh) + 4} fontSize="10" fill="#9ca3af">{maxHigh.toFixed(0)}</SvgText>
        <SvgText x={width - 40} y={getY(minLow) + 4} fontSize="10" fill="#9ca3af">{minLow.toFixed(0)}</SvgText>

        {data.map((d, i) => {
          const isBull = d.close >= d.open;
          const color = isBull ? '#10b981' : '#ef4444'; // Green if up, Red if down
          const x = padding + i * candleWidth;
          
          const yOpen = getY(d.open);
          const yClose = getY(d.close);
          const yHigh = getY(d.high);
          const yLow = getY(d.low);

          const rectY = Math.min(yOpen, yClose);
          const rectHeight = Math.max(Math.abs(yOpen - yClose), 1); // Ensure at least 1px height
          
          const vY = getVolY(d.volume);
          const vHeight = height - vY;

          return (
            <G key={i}>
              {/* Wick */}
              <Line 
                x1={x + candleWidth / 2} 
                y1={yHigh} 
                x2={x + candleWidth / 2} 
                y2={yLow} 
                stroke={color} 
                strokeWidth="1" 
              />
              {/* Body */}
              <Rect 
                x={x + spacing / 2} 
                y={rectY} 
                width={barWidth} 
                height={rectHeight} 
                fill={color} 
              />
              {/* Volume Bar */}
              <Rect
                x={x + spacing / 2}
                y={vY}
                width={barWidth}
                height={vHeight}
                fill={color}
                opacity={0.3}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
