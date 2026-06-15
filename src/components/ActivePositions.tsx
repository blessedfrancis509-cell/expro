import React from 'react';
import { Position } from '../types';
import { TrendingUp, TrendingDown, XCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ActivePositionsProps {
  positions: Position[];
  onClosePosition: (id: string) => void;
}

export default function ActivePositions({ positions, onClosePosition }: ActivePositionsProps) {
  // Calculates live contract specs
  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-[#00c087] bg-[#00c087]/10 border-[#00c087]/20';
    if (pnl < 0) return 'text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20';
    return 'text-zinc-400 bg-zinc-800';
  };

  return (
    <div id="active-positions-card" className="bg-[#181a20] border border-zinc-850 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#f0b90b] animate-ping"></span>
          <h3 className="font-bold text-zinc-100 text-xs uppercase tracking-wider">Active Leverage Portfolios</h3>
        </div>
        <span className="text-[10px] bg-[#2b2f36] border border-zinc-750 text-[#96A0B5] px-2 py-0.5 rounded-full font-mono">
          {positions.length} Open Deals
        </span>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 select-none flex flex-col items-center">
          <div className="h-10 w-10 text-zinc-700 bg-zinc-800/40 rounded-full flex items-center justify-center mb-2">
            📊
          </div>
          <span id="no-positions-msg" className="text-xs font-semibold">No active terminal positions.</span>
          <p className="text-[10px] text-zinc-600 mt-1 max-w-xs leading-relaxed">
            Pick a market asset target from the explorer roster on the left, configure your leverage multiplier scale, then dispatch a BUY or SELL transaction order.
          </p>
        </div>
      ) : (
        <div id="positions-grid" className="space-y-4">
          
          {/* Mobile Lists (Visible on screens below md breakpoint) */}
          <div className="md:hidden space-y-3">
            {positions.map((p) => {
              const isBuy = p.side === 'buy';
              const pnl = p.pnl;
              return (
                <div key={p.id} className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2 text-xs relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-zinc-100 font-sans tracking-tight">{p.symbol}</span>
                      <span className="text-[9px] font-mono font-bold text-[#f0b90b]">1:{p.leverage}</span>
                    </div>
                    {isBuy ? (
                      <span className="text-[#00c087] bg-[#00c087]/10 px-2 py-0.5 rounded text-[9px] font-bold uppercase font-sans">BUY</span>
                    ) : (
                      <span className="text-[#f6465d] bg-[#f6465d]/10 px-2 py-0.5 rounded text-[9px] font-bold uppercase font-sans">SELL</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-zinc-400 font-mono">
                    <div>
                      <span className="text-zinc-500 text-[9px] block uppercase font-sans font-semibold mb-0.5">Contract Size</span>
                      <span className="text-zinc-200 font-bold">{p.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[9px] block uppercase font-sans font-semibold mb-0.5">PnL (Yield)</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${pnl >= 0 ? 'text-[#00c087] bg-[#00c087]/15' : 'text-[#f6465d] bg-[#f6465d]/15'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[9px] block uppercase font-sans font-semibold mb-0.5">Entry Rate</span>
                      <span className="text-zinc-300">${p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[9px] block uppercase font-sans font-semibold mb-0.5">Current Rate</span>
                      <span className="text-zinc-300">${p.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-zinc-900/60 flex justify-end">
                    <button
                      onClick={() => onClosePosition(p.id)}
                      className="bg-[#f6465d]/90 hover:bg-[#f6465d] text-white px-3.5 py-1.5 rounded-lg text-[10px] font-black font-sans transition-all cursor-pointer shadow-sm tracking-wider uppercase"
                    >
                      CLOSE POSITION
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Visible on md and larger viewports) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="text-[10px] text-zinc-500 border-b border-zinc-800 uppercase font-bold tracking-wider">
                  <th className="pb-2">Asset Order</th>
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Lev</th>
                  <th className="pb-2">Contract Sizes</th>
                  <th className="pb-2">Entry Rate</th>
                  <th className="pb-2">Current Rate</th>
                  <th className="pb-2 text-right">Interactive Profit / Loss (PnL)</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-xs">
                {positions.map((p) => {
                  const isBuy = p.side === 'buy';
                  const pnl = p.pnl;
                  const sideBadge = isBuy ? (
                    <span className="inline-flex items-center gap-1 text-[#00c087] bg-[#00c087]/10 border border-[#00c087]/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      <ArrowUpRight className="h-3 w-3" /> BUY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#f6465d] bg-[#f6465d]/10 border border-[#f6465d]/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      <ArrowDownRight className="h-3 w-3" /> SELL
                    </span>
                  );

                  return (
                    <tr key={p.id} id={`position-row-${p.id}`} className="hover:bg-zinc-800/10 transition-all font-mono">
                      <td className="py-2.5 font-sans font-bold text-zinc-200 max-w-[110px] truncate">{p.symbol}</td>
                      <td className="py-2.5">{sideBadge}</td>
                      <td className="py-2.5 font-semibold text-[#f0b90b]">1:{p.leverage}</td>
                      <td className="py-2.5 text-zinc-400">{p.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                      <td className="py-2.5 text-zinc-400">${p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                      <td className="py-2.5 text-zinc-400">${p.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded border text-xs font-bold leading-none ${getPnlColor(pnl)}`}>
                          {pnl >= 0 ? '+' : ''}
                          ${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          id={`close-btn-${p.id}`}
                          onClick={() => onClosePosition(p.id)}
                          className="text-[#f6465d] hover:text-white bg-[#f6465d]/10 hover:bg-[#f6465d] p-1 px-2.5 rounded border border-[#f6465d]/20 transition-all text-[10px] font-extrabold font-sans"
                        >
                          CLOSE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
