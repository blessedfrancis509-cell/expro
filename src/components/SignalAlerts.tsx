import React, { useState } from 'react';
import { TradingSignal, PriceAlert, Asset } from '../types';
import { Bell, Zap, Sliders, Play, Info, Trash2, ShieldAlert } from 'lucide-react';
import { INITIAL_SIGNALS } from '../constants';

interface SignalAlertsProps {
  assets: Asset[];
  alerts: PriceAlert[];
  onCreateAlert: (alert: Omit<PriceAlert, 'id' | 'isTriggered' | 'createdAt'>) => void;
  onDeleteAlert: (id: string) => void;
  onApplySignal: (signal: TradingSignal) => void;
}

export default function SignalAlerts({ assets, alerts, onCreateAlert, onDeleteAlert, onApplySignal }: SignalAlertsProps) {
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || 'btc_usd');
  const [alertPrice, setAlertPrice] = useState('94500');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  const handleSubmitAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !alertPrice || parseFloat(alertPrice) <= 0) return;

    onCreateAlert({
      assetId: selectedAsset.id,
      symbol: selectedAsset.symbol,
      targetPrice: parseFloat(alertPrice),
      condition: alertCondition,
    });
    
    // Set preset to something moderate
    setAlertPrice('');
  };

  const getConfidenceColor = (strength: number) => {
    if (strength >= 90) return 'text-[#00c087] border-[#00c087]/20 bg-[#00c087]/10';
    if (strength >= 80) return 'text-[#f0b90b] border-[#f0b90b]/20 bg-[#f0b90b]/10';
    return 'text-[#3E82F7] border-[#3E82F7]/20 bg-[#3E82F7]/10';
  };

  const getSignalBadge = (type: TradingSignal['type']) => {
    switch (type) {
      case 'strong_buy':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00c087] text-[#0b0e11] uppercase">STRONG BUY</span>;
      case 'buy':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00c087]/15 text-[#00c087] border border-[#00c087]/30 uppercase">BUY</span>;
      case 'sell':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30 uppercase">SELL</span>;
      case 'strong_sell':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f6465d] text-white uppercase">STRONG SELL</span>;
    }
  };

  return (
    <div id="signal-alerts-board" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* Dynamic Trading Signals Feed */}
      <div className="lg:col-span-2 bg-[#181a20] border border-zinc-850 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#f0b90b]" />
              <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider font-sans">
                Professional Market Signals & Indicators
              </h4>
            </div>
            <span className="text-[9px] text-[#8790A6] font-mono">Auto-generated hourly</span>
          </div>

          <div id="signals-scrollable" className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
            {INITIAL_SIGNALS.map((sig) => {
              const activeAsset = assets.find((a) => a.id === sig.assetId);
              return (
                <div
                  key={sig.id}
                  id={`signal-card-${sig.id}`}
                  className="bg-[#2b2f36]/40 border border-[#232A3D] hover:border-zinc-705 rounded-xl p-3.5 transition-all"
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100 font-mono">{sig.symbol}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({sig.timeframe})</span>
                      {getSignalBadge(sig.type)}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold ${getConfidenceColor(sig.strength)}`}>
                      {sig.strength}% Confidence
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-zinc-200 mb-1">{sig.headline}</h5>
                  <p className="text-[11px] text-[#8E9AAB] leading-relaxed mb-3">{sig.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-zinc-800/60 pt-3 text-[10px] font-mono font-bold leading-normal">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">TARGET TAKE PROFIT:</span>
                      <span className="text-[#00c087] font-mono">${sig.tp}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">RECOMMENDED STOP LOSS:</span>
                      <span className="text-[#f6465d] font-mono">${sig.sl}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-right flex items-center justify-end">
                      <button
                        id={`apply-sig-${sig.id}`}
                        onClick={() => onApplySignal(sig)}
                        className="bg-[#f0b90b] hover:bg-[#FFC933] text-[#0b0e11] font-sans px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <Play className="h-3 w-3 fill-current" /> EXECUTE SIGNAL
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Threshold Alerts Setup & Subordinate Lists */}
      <div className="bg-[#181a20] border border-zinc-850 rounded-xl p-4 shadow-lg flex flex-col justify-between">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-805 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-[#f0b90b]" />
              <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider font-sans">
                Automated Price Alerts
              </h4>
            </div>
          </div>

          {/* Setup Form */}
          <form id="create-alert-form" onSubmit={handleSubmitAlert} className="space-y-3.5 text-xs font-medium">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Target Asset</label>
              <select
                id="alert-asset-select"
                value={selectedAssetId}
                onChange={(e) => {
                  setSelectedAssetId(e.target.value);
                  const selected = assets.find((a) => a.id === e.target.value);
                  if (selected) setAlertPrice(selected.currentPrice.toString());
                }}
                className="w-full bg-[#2b2f36] border border-zinc-750 rounded-xl text-zinc-100 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#f0b90b]"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#181a20]">
                    {a.symbol} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Trigger</label>
                <div className="flex bg-zinc-950/40 p-0.5 rounded-xl border border-zinc-800">
                  <button
                    id="cond-above"
                    type="button"
                    onClick={() => setAlertCondition('above')}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                      alertCondition === 'above' ? 'bg-[#f0b90b] text-[#0b0e11]' : 'text-zinc-500'
                    }`}
                  >
                    Goes Above
                  </button>
                  <button
                    id="cond-below"
                    type="button"
                    onClick={() => setAlertCondition('below')}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer ${
                      alertCondition === 'below' ? 'bg-[#f0b90b] text-[#0b0e11]' : 'text-zinc-500'
                    }`}
                  >
                    Goes Below
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Target Price ($)</label>
                <input
                  id="alert-target-price"
                  type="number"
                  required
                  step="any"
                  placeholder="e.g. 94100"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  className="w-full bg-zinc-950/40 border border-zinc-800 rounded-xl px-3 py-1.5 text-white font-mono placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-[#f0b90b]"
                />
              </div>
            </div>

            <button
              id="submit-alert-btn"
              type="submit"
              className="w-full bg-zinc-800 hover:bg-[#f0b90b] hover:text-[#0b0e11] text-zinc-300 py-2 rounded-xl text-[10px] font-bold border border-zinc-750 hover:border-transparent transition-all uppercase tracking-wider cursor-pointer"
            >
              Secure Trigger Connection
            </button>
          </form>
        </div>

        {/* Existing Alerts checklist panel */}
        <div className="space-y-2.5 mt-5">
          <span className="text-[10px] font-extrabold text-zinc-400 block tracking-wider uppercase">
            Active Alerts Queue ({alerts.length})
          </span>

          <div id="alerts-queue-scroller" className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <span className="text-[10px] text-zinc-600 text-center block pt-2">No active alerts currently set.</span>
            ) : (
              alerts.map((al) => (
                <div
                  key={al.id}
                  className="flex items-center justify-between text-xs font-mono bg-[#2b2f36]/30 rounded-xl p-2 border border-zinc-800"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-200 font-sans font-bold">{al.symbol}</span>
                    <span className="text-[9px] text-[#8E9AAB]">
                      Price {al.condition === 'above' ? '▲ rises above' : '▼ sinks below'}
                      <b className="text-zinc-100 font-extrabold pl-1">${al.targetPrice.toLocaleString()}</b>
                    </span>
                  </div>

                  <button
                    id={`del-alert-${al.id}`}
                    onClick={() => onDeleteAlert(al.id)}
                    className="text-zinc-600 hover:text-[#f6465d] p-1 rounded-md hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Remove Alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
