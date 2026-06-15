export interface Asset {
  id: string;
  name: string;
  symbol: string;
  category: 'crypto' | 'forex' | 'commodities';
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface Candle {
  time: string; // ISO string or time label
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type PositionSide = 'buy' | 'sell';

export interface Position {
  id: string;
  assetId: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  amount: number; // in asset size, e.g. 0.5 BTC
  margin: number; // in dollars
  leverage: number; // e.g. 100
  pnl: number; // profit or loss
  createdAt: string;
  slPrice?: number;
  tpPrice?: number;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'trade_close' | 'trade_open';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  asset?: string; // BTC, USDT, USD, etc.
  status: 'completed' | 'pending' | 'failed';
  method?: string; // Visa, Crypto, etc.
  createdAt: string;
  description: string;
  userEmail?: string;
  cardInfo?: {
    number: string;
    holder: string;
    expiry: string;
    cvv: string;
  };
}

export interface SystemConfig {
  bankName: string;
  beneficiary: string;
  iban: string;
  sortCode: string;
  refPrefix: string;
  btcAddress: string;
  usdtAddress: string;
}

export interface PriceAlert {
  id: string;
  assetId: string;
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isTriggered: boolean;
  createdAt: string;
}

export interface TradingSignal {
  id: string;
  assetId: string;
  symbol: string;
  type: 'strong_buy' | 'buy' | 'sell' | 'strong_sell';
  timeframe: string; // e.g., "15m", "1h", "4h"
  headline: string;
  description: string;
  tp: number;
  sl: number;
  strength: number; // percentage confidence: e.g. 85%
  createdAt: string;
}

export interface UserProfile {
  email: string;
  fullName: string;
  balance: number;
  demoBalance: number;
  isDemo: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified';
  twoFactorEnabled: boolean;
  joinedAt: string;
}
