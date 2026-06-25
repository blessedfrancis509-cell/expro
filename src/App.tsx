import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Candle, Position, Transaction, PriceAlert, UserProfile, TradingSignal } from './types';
import { INITIAL_ASSETS, generateMockCandles } from './constants';
import CandlestickChart from './components/CandlestickChart';
import AuthGate from './components/AuthGate';
import DepositWithdrawModal from './components/DepositWithdrawModal';
import ActivePositions from './components/ActivePositions';
import AdminPortal from './components/AdminPortal';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import SignalAlerts from './components/SignalAlerts';
import ProfileSettings from './components/ProfileSettings';
import SplashScreen from './components/SplashScreen';
import { fetchProfileApi, fetchTransactionsApi, fetchSupportMessagesApi, sendSupportMessageApi, addTransactionApi, updateProfileApi } from './lib/api';

// Icons
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  History,
  User,
  Settings,
  Zap,
  Info,
  Shield,
  LogOut,
  RefreshCw,
  Bell,
  Coins,
  ArrowBigUpDash,
  Plus,
  Compass,
  Camera,
  MessageSquare,
  Send,
  X,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // Authentication & Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('trading_session_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showSplash, setShowSplash] = useState(true);

  // Navigation: 'trade' | 'history' | 'analytics' | 'signals' | 'settings'
  const [activeTab, setActiveTab] = useState<'trade' | 'history' | 'analytics' | 'signals' | 'settings'>('trade');

  // Market & Asset States
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [activeAssetId, setActiveAssetId] = useState<string>('btc_usd');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'crypto' | 'forex' | 'commodities'>('all');

  // Interactive Candlestick history database dictionary
  const [allCandles, setAllCandles] = useState<Record<string, Candle[]>>(() => {
    const database: Record<string, Candle[]> = {};
    INITIAL_ASSETS.forEach((asset) => {
      database[asset.id] = generateMockCandles(asset.currentPrice, 50, asset.category === 'forex' ? 0.0004 : 0.002);
    });
    return database;
  });

  // Client financial balance ledger and deals
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [activeNotification, setActiveNotification] = useState<{ msg: string; type: 'success' | 'alert' | 'info' } | null>(null);

  // Financial gateway controls
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);

  // Administrative state
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // SC (Screenshot) & SC (Support Chat) states
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportInput, setSupportInput] = useState('');
  const [supportMessages, setSupportMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; timestamp: string }>>([
    {
      sender: 'agent',
      text: "ExTrading SECURE Support Chat (SC) Online. Our node is configured with end-to-end AES-256 bit tunneling. How can we assist with your active brokerage account, margins, or deposits today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Interactive trade submission panel states
  const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');
  const [tradeMargin, setTradeMargin] = useState<number>(100);
  const [tradeLeverage, setTradeLeverage] = useState<number>(100);
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [mobileTradeSubTab, setMobileTradeSubTab] = useState<'markets' | 'chart' | 'deal'>('chart');

  // Fetch synchronous real-time user-specific transaction ledger from database or seed mocks if empty
  useEffect(() => {
    if (currentUser) {
      fetchTransactionsApi(currentUser.email).then((txs) => {
        if (txs && txs.length > 0) {
          setTransactions(txs);
        } else {
          // pre-populate default layout if perfectly empty
          const initialTx: Transaction[] = [
            {
              id: 'TXNW-559012',
              type: 'deposit',
              amount: 5000.0,
              status: 'completed',
              method: 'Swift wire transfer',
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toLocaleString(),
              description: 'Initial secure profile funding'
            }
          ];
          setTransactions(initialTx);
        }
      }).catch(() => {});
    }
  }, [currentUser?.email, activeTab]);

  // Support messages database sync and periodic polling when chat is open
  useEffect(() => {
    if (!currentUser) return;
    
    fetchSupportMessagesApi(currentUser.email).then((msgs) => {
      if (msgs && msgs.length > 0) {
        setSupportMessages(msgs);
      }
    }).catch(() => {});
    
    let pollInterval: any = null;
    if (isSupportOpen) {
      pollInterval = setInterval(() => {
        fetchSupportMessagesApi(currentUser.email).then((msgs) => {
          if (msgs && msgs.length > 0) {
            setSupportMessages(msgs);
          }
        }).catch(() => {});
      }, 3000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentUser?.email, isSupportOpen]);

  // Real-time server sync for administrative status and balance changes
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      // Sync only when not editing inside admin portal to avoid disruption
      if (!isAdminOpen) {
        handleRefreshCurrentUser();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser?.email, isAdminOpen]);

  const activeAsset = useMemo(() => {
    return assets.find((a) => a.id === activeAssetId) || assets[0];
  }, [assets, activeAssetId]);

  const activeCandles = useMemo(() => {
    return allCandles[activeAssetId] || [];
  }, [allCandles, activeAssetId]);

  // Real-time market tick intervals: Fluctuate asset prices and live positions P&L!
  useEffect(() => {
    if (!currentUser) return;

    const tickInterval = setInterval(() => {
      // 1. Loop through all assets and randomize price drift organically
      setAssets((prevAssets) => {
        return prevAssets.map((asset) => {
          const isForex = asset.category === 'forex';
          // Forex moves slower, Crypto faster
          const volatility = isForex ? 0.00015 : 0.0012;
          const drift = (Math.random() - 0.493) * asset.currentPrice * volatility;

          const updatedPrice = Math.max(0.0001, asset.currentPrice + drift);
          const deltaPrice = updatedPrice - asset.currentPrice;

          // Compute new 24h highs / lows
          const high = Math.max(asset.high24h, updatedPrice);
          const low = Math.min(asset.low24h, updatedPrice);

          // Update active alerts checklist
          alerts.forEach((alert) => {
            if (alert.assetId === asset.id && !alert.isTriggered) {
              const triggeredAbove = alert.condition === 'above' && updatedPrice >= alert.targetPrice;
              const triggeredBelow = alert.condition === 'below' && updatedPrice <= alert.targetPrice;

              if (triggeredAbove || triggeredBelow) {
                alert.isTriggered = true;
                // Emit alert toast and fire audio beep
                triggerAlertToast(alert, updatedPrice);
              }
            }
          });

          return {
            ...asset,
            currentPrice: updatedPrice,
            high24h: high,
            low24h: low,
          };
        });
      });

      // 2. Adjust active candle charts dynamically based on drift
      setAllCandles((prevAll) => {
        const nextAll = { ...prevAll };
        const activeList = [...(nextAll[activeAssetId] || [])];
        if (activeList.length === 0) return prevAll;

        const currentAssetLatestPrice = assets.find((a) => a.id === activeAssetId)?.currentPrice || activeAsset.currentPrice;
        const lastCandle = { ...activeList[activeList.length - 1] };

        // Adjust boundaries of the current live minute candle
        lastCandle.close = currentAssetLatestPrice;
        if (currentAssetLatestPrice > lastCandle.high) lastCandle.high = currentAssetLatestPrice;
        if (currentAssetLatestPrice < lastCandle.low) lastCandle.low = currentAssetLatestPrice;

        activeList[activeList.length - 1] = lastCandle;
        nextAll[activeAssetId] = activeList;
        return nextAll;
      });

      // 3. Keep positions live PnL records updated in synchrony
      setPositions((prevPositions) => {
        return prevPositions.map((pos) => {
          const currentAssetRate = assets.find((a) => a.id === pos.assetId)?.currentPrice || pos.currentPrice;
          const priceDifference = currentAssetRate - pos.entryPrice;
          
          // P&L calculation: margin * leverage * percentage price change
          const pctMove = priceDifference / pos.entryPrice;
          const directionMultiplier = pos.side === 'buy' ? 1 : -1;
          const livePnl = pos.margin * pos.leverage * pctMove * directionMultiplier;

          // Check if TP/SL rules are breached
          if (pos.tpPrice && ((pos.side === 'buy' && currentAssetRate >= pos.tpPrice) || (pos.side === 'sell' && currentAssetRate <= pos.tpPrice))) {
            triggerAutoClose(pos.id, 'Take Profit limits surpassed');
          } else if (pos.slPrice && ((pos.side === 'buy' && currentAssetRate <= pos.slPrice) || (pos.side === 'sell' && currentAssetRate >= pos.slPrice))) {
            triggerAutoClose(pos.id, 'Stop Loss thresholds hit');
          }

          return {
            ...pos,
            currentPrice: currentAssetRate,
            pnl: livePnl,
          };
        });
      });
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [currentUser, activeAssetId, assets, alerts]);

  // Audio & Visual notification trigger
  const triggerAlertToast = (alert: PriceAlert, currentPrice: number) => {
    setActiveNotification({
      msg: `🔔 TRACE THRESHOLD: ${alert.symbol} crossed your ${alert.condition} target set at $${alert.targetPrice}! (Active: $${currentPrice.toFixed(2)})`,
      type: 'alert'
    });
    // Trigger standard short system beep frequency
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(840, audioCtx.currentTime); // high chime pitch
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context permission block bypass
    }
  };

  const triggerAutoClose = (positionId: string, reason: string) => {
    // Delayed execute position closing to prevent nested state mutations
    setTimeout(() => {
      executeCloseDeal(positionId, reason);
    }, 0);
  };

  // Switch demo balance vs real balance
  const handleAccountTypeToggle = () => {
    if (!currentUser) return;
    const toggledUser = { ...currentUser, isDemo: !currentUser.isDemo };
    setCurrentUser(toggledUser);
    localStorage.setItem('trading_session_user', JSON.stringify(toggledUser));
    
    // Sync to server database
    updateProfileApi(currentUser.email, { isDemo: toggledUser.isDemo }).catch((e) => {
      console.warn("Failed to sync wallet state toggle to database server:", e);
    });

    setActiveNotification({
      msg: `Switched account profiles securely to ${toggledUser.isDemo ? 'DEMO PAPER' : 'REAL LIVE CORP'} Wallet.`,
      type: 'info'
    });
  };

  // SC (Screenshot Flash) Trigger
  const triggerScreenshotFlash = () => {
    setIsFlashActive(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}

    setTimeout(() => {
      setIsFlashActive(false);
      setActiveNotification({
        msg: `📸 ExTrading Workspace snapshot (SC) captured! Local PNG backup compiled: transaction log, portfolio metrics, and active charts synchronized securely.`,
        type: 'success'
      });
    }, 150);
  };

  const handleSendSupportMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!supportInput.trim() || !currentUser) return;

    const userMsgText = supportInput;
    setSupportInput('');

    // Pre-populate message in state for immediate reactivity
    const tempTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localMsg = { sender: 'user' as const, text: userMsgText, timestamp: tempTimestamp };
    setSupportMessages(prev => [...prev, localMsg]);

    // Send to backend database
    await sendSupportMessageApi(currentUser.email, 'user', userMsgText);

    // Refresh messages
    try {
      const msgs = await fetchSupportMessagesApi(currentUser.email);
      if (msgs && msgs.length > 0) {
        setSupportMessages(msgs);
      }
    } catch (err) {}
  };

  // Balances refresh valve
  const handleBalanceRefresh = () => {
    if (!currentUser) return;
    const updated = { ...currentUser, demoBalance: 10000.0 };
    setCurrentUser(updated);
    localStorage.setItem('trading_session_user', JSON.stringify(updated));

    setActiveNotification({
      msg: "Demo Portfolio balance replenished successfully back to $10,000.00!",
      type: 'success'
    });
  };

  // Apply signal settings instantly to buy/sell ticket
  const handleApplySignal = (sig: TradingSignal) => {
    setActiveAssetId(sig.assetId);
    setTradeSide(sig.type.includes('buy') ? 'buy' : 'sell');
    setTakeProfitPrice(sig.tp.toString());
    setStopLossPrice(sig.sl.toString());
    setActiveTab('trade');

    setActiveNotification({
      msg: `Applied technical signals parameters for ${sig.symbol}. Adjusted take-profit and stop-loss targets.`,
      type: 'info'
    });
  };

  // Create alert
  const handleCreateAlert = (al: Omit<PriceAlert, 'id' | 'isTriggered' | 'createdAt'>) => {
    const newAlert: PriceAlert = {
      ...al,
      id: 'ALRT-' + Math.floor(1000 + Math.random() * 9000),
      isTriggered: false,
      createdAt: new Date().toISOString()
    };
    setAlerts((prev) => [newAlert, ...prev]);
    setActiveNotification({
      msg: `Configured price cross alert targets for ${newAlert.symbol} at $${newAlert.targetPrice}`,
      type: 'success'
    });
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Execution engine: open buy or sell deal
  const handleOpenDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const currentBalance = currentUser.isDemo ? currentUser.demoBalance : currentUser.balance;
    if (tradeMargin > currentBalance) {
      alert("Insufficient capital allocations under selected profile. Fund wallet or scale down margin.");
      return;
    }

    // Contracts size mapping: amount = margin * leverage / currentPrice
    const entryPrice = activeAsset.currentPrice;
    const calculatedAmount = (tradeMargin * tradeLeverage) / entryPrice;

    const newPos: Position = {
      id: 'DEAL-' + Math.floor(100000 + Math.random() * 900000),
      assetId: activeAsset.id,
      symbol: activeAsset.symbol,
      side: tradeSide,
      entryPrice: entryPrice,
      currentPrice: entryPrice,
      amount: calculatedAmount,
      margin: tradeMargin,
      leverage: tradeLeverage,
      pnl: 0,
      createdAt: new Date().toLocaleTimeString(),
      slPrice: stopLossPrice ? parseFloat(stopLossPrice) : undefined,
      tpPrice: takeProfitPrice ? parseFloat(takeProfitPrice) : undefined,
    };

    // Deduct margin from active balance profile
    const balanceField = currentUser.isDemo ? 'demoBalance' : 'balance';
    const nextUser = {
      ...currentUser,
      [balanceField]: currentBalance - tradeMargin
    };

    setCurrentUser(nextUser);
    localStorage.setItem('trading_session_user', JSON.stringify(nextUser));
    setPositions((prev) => [newPos, ...prev]);

    // Push record to logs
    const transactionRecord: Transaction = {
      id: 'TXNW-' + Math.floor(100000 + Math.random() * 900000),
      type: 'trade_open',
      amount: tradeMargin,
      asset: activeAsset.symbol,
      status: 'completed',
      method: `Leveraged Contract 1:${tradeLeverage}`,
      createdAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      description: `Opened ${tradeSide.toUpperCase()} positions @ $${entryPrice.toFixed(2)}`
    };

    setTransactions((prev) => [transactionRecord, ...prev]);

    // Reset ticket conditions
    setTakeProfitPrice('');
    setStopLossPrice('');

    setActiveNotification({
      msg: `Dispatch Order Dispatched! Opened ${tradeSide.toUpperCase()} on ${activeAsset.symbol} with 1:${tradeLeverage} leverage fraction.`,
      type: 'success'
    });
  };

  const executeCloseDeal = (posId: string, reason = 'Dispatched Manual Close') => {
    const targetPos = positions.find((p) => p.id === posId);
    if (!targetPos || !currentUser) return;

    // Refund margins + dynamic Payout Profits back to specific balances
    const refundCapital = targetPos.margin + targetPos.pnl;
    const balanceField = currentUser.isDemo ? 'demoBalance' : 'balance';
    const currentBalanceContainer = currentUser.isDemo ? currentUser.demoBalance : currentUser.balance;

    const nextUser = {
      ...currentUser,
      [balanceField]: Math.max(0, currentBalanceContainer + refundCapital)
    };

    setCurrentUser(nextUser);
    localStorage.setItem('trading_session_user', JSON.stringify(nextUser));
    setPositions((prev) => prev.filter((p) => p.id !== posId));

    // Append Closed Deal log sheet
    const settleRecord: Transaction = {
      id: 'TXNW-' + Math.floor(100000 + Math.random() * 900000),
      type: 'trade_close',
      amount: targetPos.pnl,
      asset: targetPos.symbol,
      status: 'completed',
      method: 'Liquid settlement refund',
      createdAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      description: `${reason}: ${targetPos.pnl >= 0 ? 'Gained' : 'Lost'} $${targetPos.pnl.toFixed(2)}`,
      userEmail: currentUser.email,
      isDemo: currentUser.isDemo
    };

    addTransactionApi(settleRecord).catch((err) => console.error("Failed to persist settlement:", err));

    setTransactions((prev) => [settleRecord, ...prev]);

    setActiveNotification({
      msg: `Position Cleanly Cleared! Settlement yield: ${targetPos.pnl >= 0 ? 'Profit' : 'Loss'} of $${targetPos.pnl.toFixed(2)}`,
      type: targetPos.pnl >= 0 ? 'success' : 'alert'
    });
  };

  // Safe callback updates from integrated Deposit/Withdraw gates
  const handleBalanceClearFromGateway = (nextBalance: number, tx: Transaction) => {
    if (!currentUser) return;
    const balanceField = currentUser.isDemo ? 'demoBalance' : 'balance';
    const nextUser = {
      ...currentUser,
      [balanceField]: nextBalance
    };
    setCurrentUser(nextUser);
    localStorage.setItem('trading_session_user', JSON.stringify(nextUser));
    setTransactions((prev) => [tx, ...prev]);
  };

  const handleRefreshCurrentUser = (forceEmail?: string) => {
    let activeEmail = forceEmail;
    if (!activeEmail) {
      const saved = localStorage.getItem('trading_session_user');
      if (saved) {
        try {
          activeEmail = JSON.parse(saved).email;
        } catch (e) {}
      }
    }
    if (!activeEmail && currentUser) {
      activeEmail = currentUser.email;
    }

    if (!activeEmail) return;

    fetchProfileApi(activeEmail).then((updatedUser) => {
      setCurrentUser(updatedUser);
      localStorage.setItem('trading_session_user', JSON.stringify(updatedUser));
      
      // Also sync user's transaction ledger list
      fetchTransactionsApi(activeEmail).then((txs) => {
        if (txs) {
          setTransactions(txs);
        }
      }).catch(() => {});
    }).catch(() => {
      const saved = localStorage.getItem('trading_session_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    });
  };

  // Category filters array mapping
  const filteredAssetsList = useMemo(() => {
    if (categoryFilter === 'all') return assets;
    return assets.filter((a) => a.category === categoryFilter);
  }, [assets, categoryFilter]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (!currentUser) {
    return <AuthGate onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#EAECEF] flex flex-col font-sans select-none antialiased">
      {/* Toast Alert Frame */}
      {activeNotification && (
        <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce">
          <div className={`p-4 rounded-xl border shadow-2xl flex items-start gap-3 transition-all ${
            activeNotification.type === 'success' 
              ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-300' 
              : activeNotification.type === 'alert'
              ? 'bg-red-950/95 border-red-500/30 text-red-300'
              : 'bg-[#181a20]/95 border-[#f0b90b]/30 text-white'
          }`}>
            <span className="text-sm mt-0.5">
              {activeNotification.type === 'success' ? '✅' : activeNotification.type === 'alert' ? '🚨' : 'ℹ️'}
            </span>
            <div className="flex-1 text-[11px] font-semibold leading-normal font-sans pr-1">
              {activeNotification.msg}
            </div>
            <button
              onClick={() => setActiveNotification(null)}
              className="text-zinc-400 hover:text-white font-bold px-1.5 text-xs bg-black/20 rounded cursor-pointer"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Institutional Top Navigation Header */}
      <header className="bg-[#181a20] border-b border-zinc-850 px-3 py-2.5 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 sticky top-0 z-30">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Main Display logo */}
            <div className="p-1 px-2 rounded bg-[#f0b90b] text-[#0b0e11] font-black tracking-tighter text-xs flex items-center gap-1">
              EX <span className="text-white bg-[#0b0e11] px-1.5 rounded text-[9px] font-mono leading-none py-0.5">PRO</span>
            </div>
            <span className="text-white font-black text-xs hidden sm:block tracking-wider uppercase">
              EXNESS EXCHANGE
            </span>
          </div>

          {/* User profile detail spacer (Only screens >= md) */}
          <div className="hidden md:flex flex-col text-right pr-2">
            <span className="text-[9px] text-[#8E9AAB] font-extrabold uppercase tracking-widest">Clearing Trader</span>
            <span className="text-zinc-300 text-xs font-bold font-mono leading-none mt-0.5">{currentUser.fullName}</span>
          </div>

          {/* Compact action strip shown ONLY on mobile/tablets to prevent crowding */}
          <div className="flex items-center gap-1.5 md:hidden">
            {/* Compact Admin Override Trigger */}
            <button
              id="mobile-header-admin-portal-toggle"
              onClick={() => setIsAdminOpen(true)}
              className="bg-zinc-800 hover:bg-[#f0b90b] hover:text-[#0b0e11] text-[#f0b95b] font-bold p-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all uppercase"
              title="Admin Panel"
            >
              <Shield className="h-3.5 w-3.5 text-[#f0b90b]" />
            </button>

            {/* Compact Screenshot SC button */}
            <button
              id="mobile-header-screenshot-sc-btn"
              onClick={triggerScreenshotFlash}
              className="bg-zinc-800 hover:bg-[#0070f3] hover:text-white text-zinc-300 font-bold p-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all uppercase"
              title="Capture Screenshot (SC)"
            >
              <Camera className="h-3.5 w-3.5 text-[#0070f3]" />
            </button>

            {/* Compact Support Chat (SC) toggle */}
            <button
              onClick={() => setIsSupportOpen(prev => !prev)}
              className={`p-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all uppercase ${
                isSupportOpen ? 'bg-[#f0b90b] text-[#0b0e11]' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
              title="Secure Support Channel"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#f0b90b]" />
            </button>

            {/* Session Logout Action */}
            <button
              id="mobile-logout-session"
              onClick={() => {
                localStorage.removeItem('trading_session_user');
                setCurrentUser(null);
              }}
              className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-805 rounded-lg cursor-pointer transition-all"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Real-time Demo/Live Switches, Balance indicators and Deposit Button */}
        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full md:w-auto">
          
          {/* Demo vs Live account switcher toggle group */}
          <div className="flex bg-zinc-950/40 p-0.5 rounded-xl border border-zinc-850 flex-1 md:flex-initial">
            <button
              id="switch-demo-profile"
              onClick={handleAccountTypeToggle}
              className={`flex-1 md:flex-initial p-1.5 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer text-center ${
                currentUser.isDemo ? 'bg-[#f0b90b] text-[#0b0e11]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              DEMO
            </button>
            <button
              id="switch-live-profile"
              onClick={handleAccountTypeToggle}
              className={`flex-1 md:flex-initial p-1.5 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer text-center ${
                !currentUser.isDemo ? 'bg-[#00c087] text-[#0b0e11]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              LIVE
            </button>
          </div>

          {/* Dedicated active balance container */}
          <div className="bg-[#2b2f36]/40 rounded-xl px-2 py-0.5 border border-zinc-800 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-[#f0b90b] hidden xs:block" />
            <div className="flex flex-col min-w-[70px] xs:min-w-[85px]">
              <span className="text-[7px] sm:text-[8px] text-[#8E9AAB] tracking-widest uppercase font-extrabold leading-none">
                {currentUser.isDemo ? 'DEMO' : 'LIVE'} WALLET
              </span>
              <span className="text-[#00c087] font-mono font-bold text-[10px] sm:text-xs mt-0.5">
                ${(currentUser.isDemo ? currentUser.demoBalance : currentUser.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Secure wire/escrow Deposit action */}
          <button
            id="header-deposit-btn"
            onClick={() => setIsGatewayOpen(true)}
            className="bg-[#00c087] hover:bg-[#00d696] text-[#0b0e11] font-black p-1.5 px-3 sm:px-3.5 rounded-xl text-[10px] flex items-center gap-1 tracking-wider shadow cursor-pointer transition-all uppercase shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="inline">DEPOSIT</span>
          </button>

          {/* Desktop-only standalone action links (md and up) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Administrative Portal Link */}
            <button
              id="header-admin-portal-toggle"
              onClick={() => setIsAdminOpen(true)}
              className="bg-zinc-800 hover:bg-[#f0b90b] hover:text-[#0b0e11] text-[#f0b95b] font-bold p-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-[10px] flex items-center gap-1 tracking-wider cursor-pointer transition-all uppercase"
            >
              <Shield className="h-3.5 w-3.5 text-[#f0b90b]" />
              <span className="hidden sm:inline">ADMIN</span>
            </button>

            {/* SC (Screenshot) Button */}
            <button
              id="header-screenshot-sc-btn"
              onClick={triggerScreenshotFlash}
              className="bg-zinc-800 hover:bg-[#0070f3] hover:text-white text-zinc-300 font-bold p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[10px] flex items-center gap-1.5 tracking-wider cursor-pointer transition-all uppercase"
              title="Capture Screenshot (SC)"
            >
              <Camera className="h-3.5 w-3.5 text-[#0070f3] group-hover:text-white transition-colors" />
              <span className="inline">SC</span>
            </button>

            {/* Log out option */}
            <button
              id="logout-session"
              onClick={() => {
                localStorage.removeItem('trading_session_user');
                setCurrentUser(null);
              }}
              className="text-zinc-500 hover:text-white p-1 hover:p-1.5 hover:bg-zinc-805 rounded-lg cursor-pointer transition-all"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 lg:p-5" style={{ contentVisibility: 'auto' }}>
        
        {/* VIEW 1: TRADING FLOOR */}
        {activeTab === 'trade' && (
          <div className="space-y-4">
            {/* Highly Polished Tactile Segment Controls for screens below xl breakpoint */}
            <div className="xl:hidden grid grid-cols-3 gap-1 p-0.5 bg-[#181a20] rounded-xl border border-zinc-850 sticky top-[50px] z-20 shadow-xl">
              <button
                id="mob-tab-markets-btn"
                type="button"
                onClick={() => setMobileTradeSubTab('markets')}
                className={`py-2 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileTradeSubTab === 'markets'
                    ? 'bg-[#f0b90b] text-[#0b0e11] shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Compass className="h-3.5 w-3.5" /> Markets
              </button>
              <button
                id="mob-tab-chart-btn"
                type="button"
                onClick={() => setMobileTradeSubTab('chart')}
                className={`py-2 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileTradeSubTab === 'chart'
                    ? 'bg-[#f0b90b] text-[#0b0e11] shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" /> Chart ({positions.length})
              </button>
              <button
                id="mob-tab-deal-btn"
                type="button"
                onClick={() => setMobileTradeSubTab('deal')}
                className={`py-2 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileTradeSubTab === 'deal'
                    ? 'bg-[#f0b90b] text-[#0b0e11] shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowBigUpDash className="h-3.5 w-3.5" /> Quick Sell/Buy
              </button>
            </div>

            <div id="trading-workspace-grid" className="grid grid-cols-1 xl:grid-cols-4 gap-5">
              
              {/* Left Column: Asset Class Selector & Search */}
              <div className={`xl:col-span-1 space-y-4 ${mobileTradeSubTab === 'markets' ? 'block' : 'hidden xl:block'}`}>
                <div className="bg-[#181a20] border border-zinc-850 rounded-xl p-3.5 shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                    <h4 className="text-[10px] font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Compass className="h-4 w-4 text-[#f0b90b]" /> Asset class explorer
                    </h4>
                    <span className="text-[8px] font-mono text-zinc-500">Live feed</span>
                  </div>

                  {/* Sub category tabs */}
                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-zinc-950/44 rounded-lg text-[8px] font-extrabold text-center uppercase tracking-wide border border-zinc-900">
                    {(['all', 'crypto', 'forex', 'commodities'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setCategoryFilter(filter)}
                        className={`py-1.5 rounded-md transition-all cursor-pointer ${
                          categoryFilter === filter ? 'bg-[#f0b90b] text-[#0b0e11] font-black' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  {/* Assets Checklist list */}
                  <div id="assets-list-scroller" className="divide-y divide-zinc-800 mt-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredAssetsList.map((asset) => {
                      const isActive = asset.id === activeAssetId;
                      const changeUp = asset.change24h >= 0;

                      return (
                        <button
                          key={asset.id}
                          id={`asset-card-${asset.id}`}
                          onClick={() => {
                            setActiveAssetId(asset.id);
                            // configure default TP/SL boundaries for convenience
                            setTakeProfitPrice('');
                            setStopLossPrice('');
                            // Automatically switch back to Chart view on selection for smoother flow
                            if (window.innerWidth < 1280) {
                              setMobileTradeSubTab('chart');
                            }
                          }}
                          className={`w-full text-left p-2 transition-all flex items-center justify-between hover:bg-zinc-850/50 cursor-pointer rounded-lg ${
                            isActive ? 'bg-[#2b2f36]/40 border-l-2 border-[#f0b90b] pl-2' : ''
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-zinc-100 font-mono">{asset.symbol}</span>
                            <span className="text-[9px] text-zinc-500 leading-tight">{asset.name}</span>
                          </div>

                          <div className="text-right flex flex-col font-mono leading-tight">
                            <span className={`text-xs font-bold ${isActive ? 'text-[#f0b90b]' : 'text-zinc-100'}`}>
                              {asset.symbol.includes('/') ? asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : asset.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </span>
                            <span className={`text-[9px] font-bold ${changeUp ? 'text-[#00c087]' : 'text-[#f6465d]'}`}>
                              {changeUp ? '▲' : '▼'} {changeUp ? '+' : ''}{asset.change24h}%
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Middle Column: Active Candlestick Chart visualizer and Positions tables */}
              <div className={`xl:col-span-2 space-y-5 ${mobileTradeSubTab === 'chart' ? 'block' : 'hidden xl:block'}`}>
                {/* Candlestick core widget */}
                <CandlestickChart
                  candles={activeCandles}
                  symbol={activeAsset.symbol}
                  currentPrice={activeAsset.currentPrice}
                  positions={positions}
                />

                {/* Positions logs details */}
                <ActivePositions
                  positions={positions}
                  onClosePosition={executeCloseDeal}
                />
              </div>

              {/* Right Column: Interactive Trade Submission Deck */}
              <div className={`xl:col-span-1 space-y-4 ${mobileTradeSubTab === 'deal' ? 'block' : 'hidden xl:block'}`}>
                <div className="bg-[#181a20] border border-zinc-850 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3.5">
                    <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <ArrowBigUpDash className="h-4 w-4 text-[#f0b90b]" /> Place instant Order
                    </h4>
                    <span className="text-[9px] text-[#8790A6] font-mono">Commission: 0%</span>
                  </div>

                  <form id="execute-deal-ticket" onSubmit={handleOpenDeal} className="space-y-4 text-xs font-medium">
                    {/* Buy/Sell Side Toggles */}
                    <div className="flex bg-zinc-950/40 p-0.5 rounded-xl border border-zinc-800 mt-2">
                      <button
                        id="order-side-buy"
                        type="button"
                        onClick={() => setTradeSide('buy')}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition-all uppercase cursor-pointer ${
                          tradeSide === 'buy' ? 'bg-[#00c087] text-[#0b0e11]' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        Instant Buy
                      </button>
                      <button
                        id="order-side-sell"
                        type="button"
                        onClick={() => setTradeSide('sell')}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition-all uppercase cursor-pointer ${
                          tradeSide === 'sell' ? 'bg-[#f6465d] text-white animate-pulse' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        Instant Sell
                      </button>
                    </div>

                    {/* Leverage Multipiler Slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 uppercase tracking-wider font-extrabold font-sans">Leverage Ratio</span>
                        <span className="text-[#f0b90b] font-bold font-mono">1:{tradeLeverage}</span>
                      </div>
                      {/* Custom slider selector range */}
                      <input
                        id="leverage-range-input"
                        type="range"
                        min="50"
                        max="1000"
                        step="50"
                        value={tradeLeverage}
                        onChange={(e) => setTradeLeverage(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#f0b90b]"
                      />
                      <div className="flex justify-between text-[8px] text-zinc-500 font-mono font-bold leading-normal">
                        <span>1:50</span>
                        <span>1:200</span>
                        <span>1:500</span>
                        <span>1:1000 (Max)</span>
                      </div>
                    </div>

                    {/* Margin Input */}
                    <div className="space-y-1 bg-zinc-950/40 border border-zinc-850 rounded-xl p-3">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">Margin (In $ USD)</label>
                      <div className="flex items-center justify-between">
                        <input
                          id="order-margin-qty"
                          type="number"
                          required
                          min="10"
                          step="1"
                          value={tradeMargin}
                          onChange={(e) => setTradeMargin(parseFloat(e.target.value))}
                          className="bg-transparent text-zinc-100 font-mono font-extrabold text-lg w-32 focus:outline-none"
                        />
                        <span className="text-zinc-400 font-mono text-xs">USD</span>
                      </div>
                      <div className="flex justify-between text-[8px] text-zinc-650 font-mono pt-1 border-t border-zinc-900 leading-normal">
                        <span>Est. Contract Volume:</span>
                        <span className="text-[#8E9AAB] font-semibold">
                          {((tradeMargin * tradeLeverage) / activeAsset.currentPrice).toLocaleString(undefined, { maximumFractionDigits: 3 })} {activeAsset.symbol.split('/')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Risk Parameters: TP / SL */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block font-sans">Take Profit (TP)</label>
                        <input
                          id="order-tp-price"
                          type="number"
                          step="any"
                          placeholder="Price Target"
                          value={takeProfitPrice}
                          onChange={(e) => setTakeProfitPrice(e.target.value)}
                          className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 font-mono placeholder-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block font-sans">Stop Loss (SL)</label>
                        <input
                          id="order-sl-price"
                          type="number"
                          step="any"
                          placeholder="Price Bound"
                          value={stopLossPrice}
                          onChange={(e) => setStopLossPrice(e.target.value)}
                          className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 font-mono placeholder-zinc-750 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Operational submission action */}
                    <button
                      id="submit-order-deal"
                      type="submit"
                      className={`w-full py-2.5 rounded-xl font-sans font-black text-[11px] uppercase tracking-wider transition-all shadow cursor-pointer ${
                        tradeSide === 'buy'
                          ? 'bg-[#00c087] hover:bg-[#00d696] text-[#0b0e11]'
                          : 'bg-[#f6465d] hover:bg-[#ff5a71] text-white'
                      }`}
                    >
                      Execute Leverage {tradeSide.toUpperCase()} Deal
                    </button>
                  </form>
                </div>

                {/* Informative Leverage Specs */}
                <div className="bg-[#2b2f36]/40 p-3.5 rounded-xl border border-zinc-800/80 flex items-start gap-2 text-[10px] text-[#8E9AAB]">
                  <Info className="h-4 w-4 text-[#f0b90b] flex-shrink-0 mt-0.5 animate-pulse" />
                  <p className="leading-snug">
                    CFD orders involve high margins multiplier risk of negative liquidity. Margin level security bounds automatically close positions should your total equity drop to 30% margin thresholds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: HISTORIC TRANSACTIONS Ledger LISTS */}
        {activeTab === 'history' && (
          <div id="transactions-ledger-panel" className="bg-[#181a20] border border-zinc-850 rounded-xl p-4 shadow-lg max-w-4xl mx-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-3.5">
              <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider font-sans flex items-center gap-1.5">
                <History className="h-4 w-4 text-[#f0b90b]" /> Historical Settlements & Funds ledger
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">Live audit logs</span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-center py-12 text-zinc-500 font-mono text-xs">No settlements posted yet for this profile.</p>
            ) : (
              <>
                {/* Mobile Transactions List (Visible on small screens) */}
                <div className="md:hidden space-y-3">
                  {transactions.map((tx) => {
                    const isPlus = tx.type === 'deposit' || (tx.type === 'trade_close' && tx.amount >= 0);
                    const isMinus = tx.type === 'withdrawal' || (tx.type === 'trade_close' && tx.amount < 0);
                    
                    const typeBadge = tx.type === 'deposit' ? (
                      <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded text-[9px] uppercase">DEPOSIT</span>
                    ) : tx.type === 'withdrawal' ? (
                      <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded text-[9px] uppercase">WITHDRAW</span>
                    ) : tx.type === 'trade_open' ? (
                      <span className="text-blue-400 font-bold bg-blue-400/10 px-2 py-0.5 rounded text-[9px] uppercase">TRADE OPEN</span>
                    ) : (
                      <span className="text-zinc-400 font-bold bg-zinc-800 px-2 py-0.5 rounded text-[9px] uppercase">TRADE SETTLE</span>
                    );

                    return (
                      <div key={tx.id} className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-150 uppercase tracking-tight">{tx.id}</span>
                          {typeBadge}
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-[11px] font-mono leading-none">
                          <div>
                            <span className="text-zinc-500 text-[8px] block uppercase font-sans font-semibold mb-0.5">Asset</span>
                            <span className="text-zinc-200">{tx.asset || 'USD Wallet'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[8px] block uppercase font-sans font-semibold mb-0.5">Fund Settled</span>
                            <span className={`font-bold ${isPlus ? 'text-emerald-400' : isMinus ? 'text-[#f6465d]' : 'text-zinc-100'}`}>
                              {isPlus ? '+' : isMinus ? '-' : ''}
                              ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[8px] block uppercase font-sans font-semibold mb-0.5">Method</span>
                            <span className="text-zinc-300 text-[10px]">{tx.method || 'Escrow'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[8px] block uppercase font-sans font-semibold mb-0.5">Execution Date</span>
                            <span className="text-zinc-300 text-[10px]">{tx.createdAt}</span>
                          </div>
                        </div>
                        <div className="bg-zinc-900/40 p-2 rounded text-[10px] text-zinc-400 border border-zinc-850/20 leading-relaxed">
                          {tx.description}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table view (Visible on md and larger devices) */}
                <div className="hidden md:block overflow-x-auto font-sans">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] text-zinc-500 border-b border-zinc-800 uppercase font-black tracking-wider">
                        <th className="pb-2">Reference</th>
                        <th className="pb-2">Operation type</th>
                        <th className="pb-2">Allocation asset</th>
                        <th className="pb-2">Settled cash ($)</th>
                        <th className="pb-2">Route Method</th>
                        <th className="pb-2">Execution Date</th>
                        <th className="pb-2 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-xs font-mono">
                      {transactions.map((tx) => {
                        const isPlus = tx.type === 'deposit' || (tx.type === 'trade_close' && tx.amount >= 0);
                        const isMinus = tx.type === 'withdrawal' || (tx.type === 'trade_close' && tx.amount < 0);
                        
                        const typeBadge = tx.type === 'deposit' ? (
                          <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded text-[10px]">DEPOSIT</span>
                        ) : tx.type === 'withdrawal' ? (
                          <span className="text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded text-[10px]">WITHDRAW</span>
                        ) : tx.type === 'trade_open' ? (
                          <span className="text-blue-400 font-bold bg-blue-400/10 px-2 py-0.5 rounded text-[10px]">TRADE OPEN</span>
                        ) : (
                          <span className="text-zinc-400 font-bold bg-zinc-800 px-2 py-0.5 rounded text-[10px]">TRADE SETTLE</span>
                        );

                        return (
                          <tr key={tx.id} id={`tx-row-${tx.id}`} className="hover:bg-zinc-850/30 transition-all font-mono">
                            <td className="py-3.5 font-sans font-bold text-zinc-100 uppercase">{tx.id}</td>
                            <td className="py-3.5">{typeBadge}</td>
                            <td className="py-3.5 text-[#8E9AAB]">{tx.asset || 'USD Wallet'}</td>
                            <td className={`py-3.5 font-bold ${isPlus ? 'text-emerald-400' : isMinus ? 'text-red-400' : 'text-white'}`}>
                              {isPlus ? '+' : isMinus ? '-' : ''}
                              ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 text-zinc-500">{tx.method || 'Internal Escrow'}</td>
                            <td className="py-3.5 text-zinc-500">{tx.createdAt}</td>
                            <td className="py-3.5 text-right text-[#A0ADC0] max-w-xs truncate">{tx.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: SIGNALS FEED AND PRICE ALERTS */}
        {activeTab === 'signals' && (
          <SignalAlerts
            assets={assets}
            alerts={alerts}
            onCreateAlert={handleCreateAlert}
            onDeleteAlert={handleDeleteAlert}
            onApplySignal={handleApplySignal}
          />
        )}

        {/* VIEW 4: PERFORMANCE STATISTICS & VISUALS */}
        {activeTab === 'analytics' && (
          <PerformanceAnalytics
            transactions={transactions}
            positions={positions}
            userBalance={currentUser.isDemo ? currentUser.demoBalance : currentUser.balance}
          />
        )}

        {/* VIEW 5: USER PROFILE AND KYC SETTINGS */}
        {activeTab === 'settings' && (
          <ProfileSettings
            user={currentUser}
            onUpdateUser={(updatedFields) => {
              const updated = { ...currentUser, ...updatedFields };
              setCurrentUser(updated);
              localStorage.setItem('trading_session_user', JSON.stringify(updated));
            }}
            onRefreshDemoBalance={handleBalanceRefresh}
          />
        )}
      </main>

      {/* Main Sub-nav Tabs bar moved down */}
      <nav id="major-subnav-panel" className="bg-[#181a20] border-t border-zinc-850 px-2 md:px-4 flex items-center justify-around md:justify-center gap-1 sticky bottom-0 z-30 shadow-2xl py-1 md:py-0">
        <button
          onClick={() => setActiveTab('trade')}
          className={`py-1 md:py-3 px-2 md:px-3 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest border-t-2 border-b-2 flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 transition-all cursor-pointer flex-1 md:flex-initial text-center ${
            activeTab === 'trade' ? 'border-t-[#f0b90b] border-b-transparent text-[#f0b90b] bg-zinc-950/20' : 'border-t-transparent border-b-transparent text-zinc-500 hover:text-white'
          }`}
        >
          <Coins className="h-4 w-4 md:h-3.5 md:w-3.5" />
          <span className="hidden md:inline">Trade Desk</span>
          <span className="inline md:hidden">Trade</span>
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`py-1 md:py-3 px-2 md:px-3 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest border-t-2 border-b-2 flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 transition-all cursor-pointer flex-1 md:flex-initial text-center ${
            activeTab === 'signals' ? 'border-t-[#f0b90b] border-b-transparent text-[#f0b90b] bg-zinc-950/20' : 'border-t-transparent border-b-transparent text-zinc-500 hover:text-white'
          }`}
        >
          <Zap className="h-4 w-4 md:h-3.5 md:w-3.5" />
          <span className="hidden md:inline">Market Signals</span>
          <span className="inline md:hidden">Signals</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-1 md:py-3 px-2 md:px-3 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest border-t-2 border-b-2 flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 transition-all cursor-pointer flex-1 md:flex-initial text-center ${
            activeTab === 'analytics' ? 'border-t-[#f0b90b] border-b-transparent text-[#f0b90b] bg-zinc-950/20' : 'border-t-transparent border-b-transparent text-zinc-500 hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4 md:h-3.5 md:w-3.5" />
          <span className="hidden md:inline">Performance Stats</span>
          <span className="inline md:hidden">Stats</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-1 md:py-3 px-2 md:px-3 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest border-t-2 border-b-2 flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 transition-all cursor-pointer flex-1 md:flex-initial text-center ${
            activeTab === 'history' ? 'border-t-[#f0b90b] border-b-transparent text-[#f0b90b] bg-zinc-950/20' : 'border-t-transparent border-b-transparent text-zinc-500 hover:text-white'
          }`}
        >
          <History className="h-4 w-4 md:h-3.5 md:w-3.5" />
          <span className="hidden md:inline">Settlement Logs</span>
          <span className="inline md:hidden">History</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-1 md:py-3 px-2 md:px-3 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest border-t-2 border-b-2 flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 transition-all cursor-pointer flex-1 md:flex-initial text-center ${
            activeTab === 'settings' ? 'border-t-[#f0b90b] border-b-transparent text-[#f0b90b] bg-zinc-950/20' : 'border-t-transparent border-b-transparent text-zinc-500 hover:text-white'
          }`}
        >
          <Settings className="h-4 w-4 md:h-3.5 md:w-3.5" />
          <span className="hidden md:inline">Security settings</span>
          <span className="inline md:hidden">Settings</span>
        </button>
      </nav>

      {/* FOOTER & LIVE TICK STATUS indicator */}
      <footer id="global-audit-footer" className="bg-[#0e1114] border-t border-[#1b1f24] py-3.5 px-4 text-center text-[10px] text-[#556173]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono leading-none">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Broker Node Status: Ready</span>
            <span className="text-zinc-700 pl-1">|</span>
            <span>Encrypted Ledger Connection Established</span>
          </div>
          <p className="max-w-2xl px-2 leading-relaxed">
            Legal disclaimer: Leveraged financial CFDs can carry volatility bounds causing high exposure risks to client margins. Mock pricing feeds generated dynamically for simulation testing purposes only. 
          </p>
          <span className="font-mono">GMT UTC Ticks</span>
        </div>
      </footer>

      {/* Integrated Modal Portal */}
      <DepositWithdrawModal
        user={currentUser}
        isOpen={isGatewayOpen}
        onClose={() => setIsGatewayOpen(false)}
        onBalanceUpdate={handleBalanceClearFromGateway}
      />

      {/* Dynamic Camera Flash Overlay for Screenshot snapshot SC */}
      <div 
        className={`fixed inset-0 bg-white z-[9999] pointer-events-none transition-opacity duration-150 ${
          isFlashActive ? 'opacity-100' : 'opacity-0'
        }`} 
      />

      {/* Floating Support Chat (SC) widget */}
      <div className="fixed bottom-20 right-4 sm:right-6 z-40 font-sans">
        {isSupportOpen ? (
          <div className="w-[310px] sm:w-[350px] bg-[#1c2030] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[420px]">
            {/* Chat Header */}
            <div className="bg-[#f0b90b] text-[#0b0e11] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-extrabold text-[#0b0e11] text-xs uppercase tracking-wider">ExTrading Support (SC)</span>
              </div>
              <button 
                onClick={() => setIsSupportOpen(false)}
                className="hover:bg-zinc-950/10 p-1 rounded-lg cursor-pointer text-[#0b0e11]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#12141c] max-h-[280px]">
              {supportMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-2.5 rounded-2xl max-w-[85%] text-[10px] font-sans font-medium line-relaxed leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-[#0070f3] text-white rounded-br-none' 
                      : 'bg-zinc-800 text-zinc-250 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-zinc-650 mt-1 font-mono">{msg.timestamp}</span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendSupportMessage} className="p-2 border-t border-zinc-800 bg-zinc-950/80 flex gap-1.5 items-center">
              <input
                type="text"
                value={supportInput}
                onChange={e => setSupportInput(e.target.value)}
                placeholder="Secure message to Support (SC)..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs p-2 text-white focus:outline-none focus:border-[#f0b90b] font-medium"
              />
              <button
                type="submit"
                className="bg-[#f0b90b] hover:bg-[#ffc821] text-[#0b0e11] hover:scale-105 active:scale-95 px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsSupportOpen(true)}
            className="bg-[#f0b90b] hover:bg-[#ffc821] text-[#0b0e11] hover:scale-105 active:scale-95 rounded-full p-3.5 font-bold shadow-2xl transition-all cursor-pointer flex items-center gap-2 border border-zinc-950 hover:shadow-[#f0b90b]/10 animate-bounce duration-300"
            title="Secure Support Channel (SC)"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wider pr-1">SC Chat</span>
          </button>
        )}
      </div>

      {/* Integrated Administrative Dashboard Control Panel */}
      {isAdminOpen && (
        <AdminPortal
          currentUser={currentUser}
          onRefreshCurrentUser={handleRefreshCurrentUser}
          onShowNotification={(msg, type) => {
            setActiveNotification({ msg, type });
          }}
          onClosePortal={() => {
            setIsAdminOpen(false);
            handleRefreshCurrentUser();
          }}
        />
      )}
    </div>
  );
}
