import React from 'react';
import { Transaction, Position } from '../types';
import { Award, Zap, TrendingUp, HelpCircle } from 'lucide-react';

interface PerformanceAnalyticsProps {
  transactions: Transaction[];
  positions: Position[];
  userBalance: number;
}

export default function PerformanceAnalytics({ transactions, positions, userBalance }: PerformanceAnalyticsProps) {
  // Aggregate statistics
  const tradeTxs = transactions.filter((t) => t.type === 'trade_close');
  const totalTrades = tradeTxs.length;
  
  const winningTrades = tradeTxs.filter((t) => t.amount > 0).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 100;

  // Track mock balance log to plot equity curve
  let startingEquity = 12000.0;
  const equityPoints: number[] = [startingEquity];
  
  // Re-calculate mock historically based on transactions
  [...transactions].reverse().forEach((tx) => {
    if (tx.type === 'trade_close') {
      const point = equityPoints[equityPoints.length - 1] + tx.amount;
      equityPoints.push(point);
    } else if (tx.type === 'deposit') {
      const point = equityPoints[equityPoints.length - 1] + tx.amount;
      equityPoints.push(point);
    } else if (tx.type === 'withdrawal') {
      const point = equityPoints[equityPoints.length - 1] - tx.amount;
      equityPoints.push(point);
    }
  });

  if (equityPoints.length < 5) {
    // populate more points for a realistic first-lookup visual
    equityPoints.unshift(startingEquity * 0.9, startingEquity * 0.95, startingEquity * 1.05);
  }

  // Ensure last point matches user balance
  equityPoints.push(userBalance);

  // SVG Chart rendering calculations
  const chartHeight = 160;
  const chartWidth = 500;
  const maxEquity = Math.max(...equityPoints, startingEquity) * 1.02;
  const minEquity = Math.min(...equityPoints, startingEquity) * 0.98;
  const deltaEquity = maxEquity - minEquity || 100;

  const getSvgCoordinates = (): string => {
    return equityPoints
      .map((pt, idx) => {
        const x = (idx / (equityPoints.length - 1)) * (chartWidth - 20) + 10;
        const y = chartHeight - ((pt - minEquity) / deltaEquity) * (chartHeight - 40) - 20;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const polyPoints = getSvgCoordinates();

  // Create shaded fill under the line path
  const areaPoints = polyPoints && `${chartWidth - 10},${chartHeight - 10} 10,${chartHeight - 10} ${polyPoints}`;

  // Categorize portfolio holdings
  const holdings = {
    crypto: 45,
    forex: 35,
    commodities: 20,
  };

  return (
    <div id="analytics-master-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* Primary Equity Balance Trend Vector Chart */}
      <div className="lg:col-span-2 bg-[#181a20] border border-zinc-850 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
            <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <TrendingUp className="h-4 w-4 text-[#f0b90b]" /> Capital Growth & Balance Equity Flow
            </h4>
            <span className="text-[10px] font-mono text-[#f0b90b] bg-[#f0b90b]/10 px-2.5 py-0.5 border border-[#f0b90b]/25 rounded-md">
              Real-time Track
            </span>
          </div>

          <p className="text-[11px] text-[#8E9AAB] mb-3">
            Cumulative balance trajectory tracking combined with live execution payouts and blockchain settlements over the past weeks:
          </p>
        </div>

        {/* Custom SVG Coordinate Area Chart wrapper */}
        <div className="w-full relative py-2 bg-zinc-950/60 rounded-lg p-2 border border-zinc-850">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0b90b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f0b90b" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid guidelines */}
            {[0, 0.5, 1].map((pct, i) => {
              const val = minEquity + pct * deltaEquity;
              const y = chartHeight - pct * (chartHeight - 40) - 20;
              return (
                <g key={i}>
                  <line x1="10" y1={y} x2={chartWidth - 10} y2={y} stroke="#1e232d" strokeDasharray="3 3" />
                  <text x={chartWidth - 8} y={y + 3} fill="#5C667B" className="text-[9px] font-mono" textAnchor="end">
                    ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                </g>
              );
            })}

            {/* Shaded Area fill */}
            {areaPoints && (
              <polygon points={areaPoints} fill="url(#areaGrad)" />
            )}

            {/* Main vector polyline */}
            {polyPoints && (
              <polyline
                fill="none"
                stroke="#f0b90b"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polyPoints}
              />
            )}

            {/* Real-time ending pulsing dot indicator */}
            {equityPoints.length > 0 && (() => {
              const lastX = chartWidth - 10;
              const lastY = chartHeight - ((equityPoints[equityPoints.length - 1] - minEquity) / deltaEquity) * (chartHeight - 40) - 20;
              return (
                <g>
                  <circle cx={lastX} cy={lastY} r={5} fill="#f0b90b" className="animate-ping" />
                  <circle cx={lastX} cy={lastY} r={3} fill="#f0b90b" />
                </g>
              );
            })()}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8E9AAB] font-mono mt-3.5 border-t border-zinc-800 pt-2.5">
          <span>Starting Base: ${startingEquity.toLocaleString()}</span>
          <span className="text-[#00c087] font-bold">Max Peak: ${Math.max(...equityPoints).toLocaleString()}</span>
        </div>
      </div>

      {/* Stats Board & Asset Distribution Class */}
      <div className="bg-[#181a20] border border-zinc-850 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
            <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#00c087]" /> Metrics & Payout Distribution
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3 font-sans">
            <div className="bg-[#2b2f36] p-2.5 rounded-lg border border-zinc-750">
              <span className="text-[10px] text-zinc-400 uppercase block">System Win Rate</span>
              <span className="text-base font-bold font-mono text-[#00c087] mt-0.5 block">
                {winRate}%
              </span>
              <span className="text-[9px] text-[#8E9AAB] font-mono">{winningTrades} of {totalTrades} won</span>
            </div>

            <div className="bg-[#2b2f36] p-2.5 rounded-lg border border-zinc-750">
              <span className="text-[10px] text-zinc-400 uppercase block">Total Operations</span>
              <span className="text-base font-bold font-mono text-zinc-100 mt-0.5 block">
                {transactions.length}
              </span>
              <span className="text-[9px] text-[#8E9AAB] font-mono">{tradeTxs.length} settled</span>
            </div>
          </div>
        </div>

        {/* Asset Class Allocations Donuts ring */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase block tracking-wider">
            Asset Holdings Distribution
          </span>

          <div className="relative flex items-center justify-center py-1">
            <svg id="asset-donut-ring" width="90" height="90" className="rotate-[-90deg]">
              {/* Crypto - 45% (dasharray ~ 141) */}
              <circle cx="45" cy="45" r="40" fill="none" stroke="#252A3D" strokeWidth="8" />
              <circle
                cx="45"
                cy="45"
                r="40"
                fill="none"
                stroke="#f0b90b"
                strokeWidth="8"
                strokeDasharray="251.3"
                strokeDashoffset={251.3 - (251.3 * holdings.crypto) / 100}
                strokeLinecap="round"
              />
              {/* Forex - 35% overlay */}
              <circle
                cx="45"
                cy="45"
                r="40"
                fill="none"
                stroke="#3E82F7"
                strokeWidth="8"
                strokeDasharray="251.3"
                strokeDashoffset={251.3 - (251.3 * (holdings.crypto + holdings.forex)) / 100}
                className="opacity-70"
              />
              {/* Commodities - 20% overlay */}
              <circle
                cx="45"
                cy="45"
                r="40"
                fill="none"
                stroke="#00c087"
                strokeWidth="8"
                strokeDasharray="251.3"
                strokeDashoffset={251.3 - (251.3 * (holdings.crypto + holdings.forex + holdings.commodities)) / 100}
                className="opacity-75"
              />
            </svg>

            <div className="absolute flex flex-col justify-center items-center text-center">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold">Spread</span>
              <span className="text-[11px] font-bold text-zinc-100 font-mono">3 Types</span>
            </div>
          </div>

          <div className="space-y-1 select-none pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f0b90b]"></span> Cryptocurrencies</span>
              <span className="text-zinc-200 font-mono font-bold">{holdings.crypto}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3E82F7]"></span> Forex Currencies</span>
              <span className="text-zinc-200 font-mono font-bold">{holdings.forex}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#00c087]"></span> Commodities & Metals</span>
              <span className="text-zinc-200 font-mono font-bold">{holdings.commodities}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
