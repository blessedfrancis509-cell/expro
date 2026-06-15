import React, { useState, useRef, useEffect } from 'react';
import { Candle, Position } from '../types';
import { Eye, TrendingUp, Filter, BarChart2, Activity } from 'lucide-react';

interface CandlestickChartProps {
  candles: Candle[];
  symbol: string;
  currentPrice: number;
  positions: Position[];
}

export default function CandlestickChart({ candles, symbol, currentPrice, positions }: CandlestickChartProps) {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1D'>('5m');
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry && entry.contentRect) {
          const w = entry.contentRect.width || 0;
          const h = entry.contentRect.height || 0;
          setDimensions({
            width: Math.max(w, 280),
            height: Math.max(h || 310, 320),
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute boundaries for prices
  const prices = candles.flatMap((c) => [c.high, c.low]);
  const maxPrice = Math.max(...prices, currentPrice) * 1.0005;
  const minPrice = Math.min(...prices, currentPrice) * 0.9995;
  const priceRange = maxPrice - minPrice || 1;

  // SMA/EMA Calculations
  const calculateSMA = (period: number, index: number): number | null => {
    if (index < period - 1) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[index - i].close;
    }
    return sum / period;
  };

  const calculateEMA = (period: number, index: number): number | null => {
    if (index < period - 1) return null;
    let ema = candles[period - 1].close; // Start of EMA is simple SMA
    if (index === period - 1) {
      let sum = 0;
      for (let i = 0; i < period; i++) sum += candles[i].close;
      return sum / period;
    }
    const k = 2 / (period + 1);
    for (let i = period; i <= index; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    return ema;
  };

  // RSI Calculation
  const calculateRSI = (index: number, period = 14): number => {
    if (index < period) return 50; // default value
    let gains = 0;
    let losses = 0;
    for (let i = index - period + 1; i <= index; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  // Sanitized layouts prevent NaN from bleeding to elements
  const validWidth = Number.isFinite(dimensions.width) && dimensions.width > 0 ? dimensions.width : 600;
  const validHeight = Number.isFinite(dimensions.height) && dimensions.height > 0 ? dimensions.height : 350;

  // Chart coordinate mapping - mobile optimized
  const isMobileSize = validWidth < 500;
  const paddingRight = isMobileSize ? 42 : 65;
  const chartWidth = validWidth - paddingRight;
  const chartHeight = showRSI ? validHeight * 0.65 : validHeight * 0.82;
  const rsiHeight = validHeight * 0.20;
  const rsiTop = chartHeight + 15;

  const getX = (index: number) => {
    if (candles.length <= 1) return 0;
    const calculatedX = (index / (candles.length - 1)) * (chartWidth - 20) + 10;
    return Number.isFinite(calculatedX) ? calculatedX : 10;
  };

  const getY = (price: number) => {
    if (priceRange === 0 || !Number.isFinite(priceRange)) return chartHeight / 2;
    const calculatedY = chartHeight - ((price - minPrice) / priceRange) * (chartHeight - 40) - 20;
    return Number.isFinite(calculatedY) ? calculatedY : chartHeight / 2;
  };

  const getRsiY = (rsi: number) => {
    const validRsi = Number.isFinite(rsi) ? rsi : 50;
    const calculatedY = rsiTop + rsiHeight - (validRsi / 100) * rsiHeight;
    return Number.isFinite(calculatedY) ? calculatedY : rsiTop + rsiHeight / 2;
  };

  const getPriceFromY = (y: number) => {
    const relativeY = chartHeight - y - 20;
    const relativeRange = chartHeight - 40;
    const computedPrice = (relativeY / (relativeRange || 1)) * priceRange + minPrice;
    return Number.isFinite(computedPrice) ? computedPrice : minPrice;
  };

  // Handle Mouse Hover for Crosshairs
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverCoords({ x, y });

    // Find closest candle index based on X
    const relativeX = x - 10;
    const totalPlayableWidth = chartWidth - 20;
    const percentage = relativeX / totalPlayableWidth;
    let index = Math.round(percentage * (candles.length - 1));
    index = Math.max(0, Math.min(candles.length - 1, index));

    setHoverIndex(index);
  };

  // Handle Touch Hover for responsive scrubbing on mobile screens
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Prevent default scrolling when zooming/panning/pointing on the chart canvas
    if (e.cancelable) {
      e.preventDefault();
    }

    setHoverCoords({ x, y });

    // Find closest candle index based on X
    const relativeX = x - 10;
    const totalPlayableWidth = chartWidth - 20;
    const percentage = relativeX / totalPlayableWidth;
    let index = Math.round(percentage * (candles.length - 1));
    index = Math.max(0, Math.min(candles.length - 1, index));

    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverCoords(null);
  };

  const handleTouchEnd = () => {
    setHoverIndex(null);
    setHoverCoords(null);
  };

  // SMA and EMA Line paths
  let smaPath = '';
  let emaPath = '';
  candles.forEach((candle, idx) => {
    if (showSMA) {
      const smaVal = calculateSMA(9, idx);
      if (smaVal !== null) {
        const x = getX(idx);
        const y = getY(smaVal);
        smaPath += (smaPath === '' ? 'M' : 'L') + `${x},${y}`;
      }
    }
    if (showEMA) {
      const emaVal = calculateEMA(12, idx);
      if (emaVal !== null) {
        const x = getX(idx);
        const y = getY(emaVal);
        emaPath += (emaPath === '' ? 'M' : 'L') + `${x},${y}`;
      }
    }
  });

  // RSI Line Path
  let rsiPath = '';
  if (showRSI) {
    candles.forEach((_, idx) => {
      const rsiVal = calculateRSI(idx, 14);
      const x = getX(idx);
      const y = getRsiY(rsiVal);
      rsiPath += (rsiPath === '' ? 'M' : 'L') + `${x},${y}`;
    });
  }

  // Active positions of current asset to draw purchase lines
  const activeAssetPositions = positions.filter((p) => p.symbol === symbol);

  return (
    <div id="chart-panel-outer" className="flex flex-col bg-[#181a20] border border-zinc-850 rounded-xl p-3 shadow-lg">
      {/* Chart Headers with Selectors */}
      <div id="chart-header-controls" className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider">Market Symbol</span>
              <span className="animate-pulse flex h-2 w-2 rounded-full bg-[#00c087]"></span>
            </div>
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">{symbol}</h3>
          </div>

          <div id="price-and-change-badge" className="ml-3 flex flex-col items-start">
            <span className="text-base font-mono font-bold text-[#f0b90b]">
              {symbol.includes('/') ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 }) : currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Timeframes and Technical Overlay toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe buttons */}
          <div className="flex bg-[#2b2f36] p-0.5 rounded-lg border border-zinc-750 text-xs font-medium text-zinc-400">
            {(['1m', '5m', '15m', '1h', '1D'] as const).map((tf) => (
              <button
                key={tf}
                id={`tf-${tf}`}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md transition-all text-[11px] ${
                  timeframe === tf ? 'bg-[#f0b90b] text-[#0b0e11] font-bold shadow-sm' : 'hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicators Toggle */}
          <div className="flex items-center bg-[#2b2f36] p-0.5 rounded-lg border border-zinc-750">
            <button
              id="toggle-sma"
              onClick={() => setShowSMA(!showSMA)}
              className={`p-1 px-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
                showSMA ? 'text-[#3E82F7] bg-[#3E82F7]/10' : 'text-zinc-500 hover:text-white'
              }`}
              title="Simple Moving Average (9)"
            >
              <Activity className="h-2.5 w-2.5" /> SMA
            </button>
            <button
              id="toggle-ema"
              onClick={() => setShowEMA(!showEMA)}
              className={`p-1 px-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
                showEMA ? 'text-[#f6465d] bg-[#f6465d]/10' : 'text-zinc-500 hover:text-white'
              }`}
              title="Exponential Moving Average (12)"
            >
              <TrendingUp className="h-2.5 w-2.5" /> EMA
            </button>
            <button
              id="toggle-rsi"
              onClick={() => setShowRSI(!showRSI)}
              className={`p-1 px-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
                showRSI ? 'text-[#f0b90b] bg-[#f0b90b]/10' : 'text-zinc-500 hover:text-white'
              }`}
              title="Relative Strength Index (14)"
            >
              <Filter className="h-2.5 w-2.5" /> RSI
            </button>
            <button
              id="toggle-volume"
              onClick={() => setShowVolume(!showVolume)}
              className={`p-1 px-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all ${
                showVolume ? 'text-[#00c087] bg-[#00c087]/10' : 'text-zinc-500 hover:text-white'
              }`}
              title="Trading Volume bars"
            >
              <BarChart2 className="h-2.5 w-2.5" /> VOL
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic candle metrics information row for mobile viewports */}
      {hoverIndex !== null && candles[hoverIndex] ? (
        <div id="mobile-ohlc-hud" className="flex flex-wrap gap-x-3 gap-y-1.5 bg-zinc-950/50 p-2 rounded-xl text-[10px] font-mono mb-2 md:hidden border border-zinc-850">
          <span className="text-zinc-500 font-bold">TICK: <span className="text-zinc-200">{candles[hoverIndex].time}</span></span>
          <span className="text-zinc-400">O: <span className={candles[hoverIndex].close >= candles[hoverIndex].open ? "text-[#00c087] font-bold" : "text-[#f6465d] font-bold"}>{candles[hoverIndex].open.toLocaleString(undefined, { minimumFractionDigits: symbol.includes('/') ? 2 : 1 })}</span></span>
          <span className="text-zinc-400">H: <span className={candles[hoverIndex].close >= candles[hoverIndex].open ? "text-[#00c087] font-bold" : "text-[#f6465d] font-bold"}>{candles[hoverIndex].high.toLocaleString(undefined, { minimumFractionDigits: symbol.includes('/') ? 2 : 1 })}</span></span>
          <span className="text-zinc-400">L: <span className={candles[hoverIndex].close >= candles[hoverIndex].open ? "text-[#00c087] font-bold" : "text-[#f6465d] font-bold"}>{candles[hoverIndex].low.toLocaleString(undefined, { minimumFractionDigits: symbol.includes('/') ? 2 : 1 })}</span></span>
          <span className="text-zinc-400">C: <span className={candles[hoverIndex].close >= candles[hoverIndex].open ? "text-[#00c087] font-bold" : "text-[#f6465d] font-bold"}>{candles[hoverIndex].close.toLocaleString(undefined, { minimumFractionDigits: symbol.includes('/') ? 2 : 1 })}</span></span>
        </div>
      ) : (
        <div id="mobile-ohlc-taphint" className="flex items-center gap-1.5 bg-zinc-950/20 p-2 rounded-xl text-[10px] text-zinc-500 font-mono mb-2 md:hidden border border-zinc-900 border-dashed">
          <span className="text-zinc-400">ℹ️</span> <span>Touch/scrub the chart canvas to inspect historical tick indicators.</span>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div
        id="chart-container"
        ref={containerRef}
        className="w-full relative flex-grow cursor-crosshair select-none bg-[#0b0e11] rounded-lg overflow-hidden border border-zinc-850"
        style={{ minHeight: '310px' }}
      >
        <svg
          id="svg-trading-chart"
          width={validWidth}
          height={validHeight}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 touch-none"
        >
          {/* GRID LINES: Horizontal Price Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const priceVal = minPrice + pct * priceRange;
            const y = getY(priceVal);
            return (
              <g key={`ygrid-${i}`}>
                <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#1f232d" strokeDasharray="3 3" />
                <text x={chartWidth + 4} y={y + 3} fill="#8291A6" className={`${isMobileSize ? 'text-[8px]' : 'text-[10px]'} font-mono`}>
                  {priceVal.toLocaleString(undefined, { maximumFractionDigits: symbol.includes('/') ? (isMobileSize ? 2 : 4) : 1 })}
                </text>
              </g>
            );
          })}

          {/* GRID LINES: Vertical Time Grid */}
          {candles.filter((_, idx) => idx % Math.max(1, Math.round(candles.length / (isMobileSize ? 3 : 5))) === 0).map((candle, i) => {
            const idx = candles.indexOf(candle);
            const x = getX(idx);
            return (
              <g key={`xgrid-${i}`}>
                <line x1={x} y1="0" x2={x} y2={chartHeight} stroke="#1f232d" strokeDasharray="3 3" />
                <text x={x} y={chartHeight + 14} fill="#8291A6" textAnchor="middle" className={`${isMobileSize ? 'text-[8px]' : 'text-[10px]'} font-mono`}>
                  {candle.time}
                </text>
              </g>
            );
          })}

          {/* VOLUME BARS (Overlayed on bottom of main chart optionally) */}
          {showVolume &&
            (() => {
              const maxVol = Math.max(...candles.map((c) => c.volume), 1);
              return candles.map((candle, idx) => {
                const x = getX(idx);
                const barWidth = Math.max(2, (chartWidth / candles.length) * 0.5);
                const volHeight = (candle.volume / maxVol) * (chartHeight * 0.15);
                const isBullish = candle.close >= candle.open;
                return (
                  <rect
                    key={`vol-${idx}`}
                    x={x - barWidth / 2}
                    y={chartHeight - volHeight - 5}
                    width={barWidth}
                    height={volHeight}
                    fill={isBullish ? 'rgba(0, 192, 135, 0.25)' : 'rgba(246, 70, 93, 0.25)'}
                  />
                );
              });
            })()}

          {/* CANDLESTICKS */}
          {candles.map((candle, idx) => {
            const x = getX(idx);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const openY = getY(candle.open);
            const closeY = getY(candle.close);

            const isBullish = candle.close >= candle.open;
            const strokeColor = isBullish ? '#00c087' : '#f6465d';
            const fillColor = isBullish ? '#00c087' : '#f6465d';

            const candleWidth = Math.max(3, (chartWidth / candles.length) * 0.65);

            return (
              <g key={`candle-${idx}`} id={`candle-group-${idx}`}>
                {/* Wick shadow */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={strokeColor} strokeWidth={1.5} />
                {/* Real Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={Math.min(openY, closeY)}
                  width={candleWidth}
                  height={Math.max(1, Math.abs(openY - closeY))}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* SMA Overlay Line */}
          {showSMA && smaPath && (
            <path d={smaPath} fill="none" stroke="#3E82F7" strokeWidth={1.75} strokeLinecap="round" />
          )}

          {/* EMA Overlay Line */}
          {showEMA && emaPath && (
            <path d={emaPath} fill="none" stroke="#f6465d" strokeWidth={1.75} strokeLinecap="round" />
          )}

          {/* RSI Panel */}
          {showRSI && (
            <g id="rsi-panel">
              {/* RSI background borders */}
              <rect x="0" y={rsiTop} width={chartWidth} height={rsiHeight} fill="#0b0e11" stroke="#212630" strokeWidth={1} />
              
              {/* Overbought 70% line */}
              <line x1="0" y1={getRsiY(70)} x2={chartWidth} y2={getRsiY(70)} stroke="#f6465d" strokeDasharray="2 2" strokeOpacity={0.7} />
              <text x={chartWidth + 5} y={getRsiY(70) + 3} fill="#f6465d" className="text-[9px] font-mono font-bold">70</text>

              {/* Center 50% line */}
              <line x1="0" y1={getRsiY(50)} x2={chartWidth} y2={getRsiY(50)} stroke="#212630" strokeDasharray="2 2" />

              {/* Oversold 30% line */}
              <line x1="0" y1={getRsiY(30)} x2={chartWidth} y2={getRsiY(30)} stroke="#00c087" strokeDasharray="2 2" strokeOpacity={0.7} />
              <text x={chartWidth + 5} y={getRsiY(30) + 3} fill="#00c087" className="text-[9px] font-mono font-bold">30</text>

              {/* RSI main line path */}
              {rsiPath && (
                <path d={rsiPath} fill="none" stroke="#f0b90b" strokeWidth={1.5} />
              )}
              
              <text x="8" y={rsiTop + 14} fill="#8291A6" className="text-[10px] font-mono font-bold tracking-tight">RSI(14)</text>
            </g>
          )}

          {/* ACTIVE POSITION LINES OVERLAY ON CHART */}
          {activeAssetPositions.map((p) => {
            const entryY = getY(p.entryPrice);
            const isBuy = p.side === 'buy';
            const color = isBuy ? '#00c087' : '#f6465d';
            return (
              <g key={`position-line-${p.id}`} id={`pos-line-${p.id}`}>
                <line
                  x1="0"
                  y1={entryY}
                  x2={chartWidth}
                  y2={entryY}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                {/* Floating trade flag */}
                <rect
                  x={10}
                  y={entryY - 10}
                  width={110}
                  height={20}
                  rx={3}
                  fill={isBuy ? 'rgba(0, 192, 135, 0.9)' : 'rgba(246, 70, 93, 0.9)'}
                />
                <text x={15} y={entryY + 4} fill="#0b0e11" className="text-[9px] font-bold font-mono">
                  {p.side.toUpperCase()} @ {p.entryPrice.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* LIVE CURRENT PRICE HORIZONTAL TAG */}
          {(() => {
            const currentY = getY(currentPrice);
            return (
              <g id="live-price-tag" className="transition-all duration-300">
                <line x1="0" y1={currentY} x2={chartWidth} y2={currentY} stroke="#f0b90b" strokeWidth={1.25} />
                <rect x={chartWidth} y={currentY - 9} width={paddingRight} height={18} rx={2} fill="#f0b90b" />
                <text x={chartWidth + paddingRight / 2} y={currentY + 4} fill="#0b0e11" textAnchor="middle" className={`${isMobileSize ? 'text-[8px]' : 'text-[10px]'} font-mono font-extrabold`}>
                  {currentPrice.toLocaleString(undefined, { maximumFractionDigits: symbol.includes('/') ? (isMobileSize ? 2 : 4) : 1 })}
                </text>
              </g>
            );
          })()}

          {/* HOVER INTERACTIVE MARKS / TOOLTIP */}
          {hoverCoords && hoverIndex !== null && (
            <g id="hover-interactive-element">
              {/* Vertical crosshair line */}
              <line x1={hoverCoords.x} y1="0" x2={hoverCoords.x} y2={chartHeight} stroke="#4E5E7A" strokeDasharray="3 3" />

              {/* Horizontal crosshair line */}
              {hoverCoords.y <= chartHeight && (
                <line x1="0" y1={hoverCoords.y} x2={chartWidth} y2={hoverCoords.y} stroke="#4E5E7A" strokeDasharray="3 3" />
              )}

              {/* Floating tag on vertical axis */}
              {hoverCoords.y <= chartHeight && (
                <g>
                  <rect x={chartWidth} y={hoverCoords.y - 8} width={paddingRight} height={16} rx={2} fill="#212630" />
                  <text x={chartWidth + paddingRight / 2} y={hoverCoords.y + 4} fill="#FFFFFF" textAnchor="middle" className={`${isMobileSize ? 'text-[8px]' : 'text-[9px]'} font-mono`}>
                    {getPriceFromY(hoverCoords.y).toLocaleString(undefined, { maximumFractionDigits: symbol.includes('/') ? (isMobileSize ? 2 : 4) : 1 })}
                  </text>
                </g>
              )}

              {/* Selected Candle Details indicator at top left of chart inner border */}
              {(() => {
                const c = candles[hoverIndex];
                if (!c) return null;
                const isBullish = c.close >= c.open;
                const colorCls = isBullish ? 'text-[#00c087]' : 'text-[#f6465d]';
                return (
                  <svg x="10" y="8" width="300" height="40" className="hidden sm:block">
                    <rect width="280" height="30" rx={4} fill="rgba(11, 14, 25, 0.85)" stroke="#212630" strokeWidth={1} />
                    <text x="10" y="19" fill="#8291A6" className="text-[9px] font-mono">
                      O:<tspan className={`${colorCls} font-bold`}>{c.open.toFixed(symbol.includes('/') ? 4 : 1)}</tspan>{' '}
                      H:<tspan className={`${colorCls} font-bold`}>{c.high.toFixed(symbol.includes('/') ? 4 : 1)}</tspan>{' '}
                      L:<tspan className={`${colorCls} font-bold`}>{c.low.toFixed(symbol.includes('/') ? 4 : 1)}</tspan>{' '}
                      C:<tspan className={`${colorCls} font-bold`}>{c.close.toFixed(symbol.includes('/') ? 4 : 1)}</tspan>
                    </text>
                  </svg>
                );
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Quick Summary Cards underneath */}
      <div id="chart-quick-summary" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
        <div className="bg-[#2b2f36]/40 border border-[#232A3D] rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-zinc-400 font-medium text-[10px] uppercase">SMA Indicator</span>
          <span className="text-white mt-1 font-mono font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3E82F7]"></span>
            {showSMA ? 'Active (9 Periods)' : 'Disabled'}
          </span>
        </div>
        <div className="bg-[#2b2f36]/40 border border-[#232A3D] rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-zinc-400 font-medium text-[10px] uppercase">EMA Indicator</span>
          <span className="text-white mt-1 font-mono font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f6465d]"></span>
            {showEMA ? 'Active (12 Periods)' : 'Disabled'}
          </span>
        </div>
        <div className="bg-[#2b2f36]/40 border border-[#232A3D] rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-zinc-400 font-medium text-[10px] uppercase">RSI Status</span>
          <span className="text-white mt-1 font-mono font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f0b90b]"></span>
            {showRSI ? 'Active (14 Periods)' : 'Disabled'}
          </span>
        </div>
        <div className="bg-[#2b2f36]/40 border border-[#232A3D] rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-zinc-400 font-medium text-[10px] uppercase">Volume Activity</span>
          <span className="text-white mt-1 font-mono font-semibold text-xs flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00c087]"></span>
            {showVolume ? 'Displaying Volume' : 'Hidden'}
          </span>
        </div>
      </div>
    </div>
  );
}
