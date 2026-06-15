import { Asset, Candle, TradingSignal } from './types';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'btc_usd',
    name: 'Bitcoin',
    symbol: 'BTC/USD',
    category: 'crypto',
    currentPrice: 94250.0,
    change24h: 3.42,
    high24h: 94800.0,
    low24h: 91100.0,
    volume24h: 48210000000,
  },
  {
    id: 'eth_usd',
    name: 'Ethereum',
    symbol: 'ETH/USD',
    category: 'crypto',
    currentPrice: 3280.5,
    change24h: -1.24,
    high24h: 3350.0,
    low24h: 3210.0,
    volume24h: 19850000000,
  },
  {
    id: 'eur_usd',
    name: 'Euro / US Dollar',
    symbol: 'EUR/USD',
    category: 'forex',
    currentPrice: 1.0845,
    change24h: 0.12,
    high24h: 1.0890,
    low24h: 1.0810,
    volume24h: 125000000000,
  },
  {
    id: 'gbp_usd',
    name: 'Pound / US Dollar',
    symbol: 'GBP/USD',
    category: 'forex',
    currentPrice: 1.2672,
    change24h: 0.28,
    high24h: 1.2720,
    low24h: 1.2610,
    volume24h: 85000000000,
  },
  {
    id: 'xau_usd',
    name: 'Gold / US Dollar',
    symbol: 'XAU/USD',
    category: 'commodities',
    currentPrice: 2342.8,
    change24h: 0.85,
    high24h: 2360.0,
    low24h: 2320.0,
    volume24h: 36000000000,
  },
  {
    id: 'usoil',
    name: 'Brent Crude Oil',
    symbol: 'USOIL',
    category: 'commodities',
    currentPrice: 79.35,
    change24h: -1.65,
    high24h: 81.10,
    low24h: 78.40,
    volume24h: 14000000000,
  },
];

// Generates high-quality mock candlestick data
export function generateMockCandles(basePrice: number, numCandles = 60, volatility = 0.003): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice * (1 - volatility * numCandles * 0.15); // Start slightly lower

  const now = new Date();

  for (let i = numCandles; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000 * 5); // 5-minute ticks
    const change = currentPrice * volatility * (Math.random() - 0.48); // Slight upward bias
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * currentPrice * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * currentPrice * volatility * 0.5;
    const volume = Math.round(1000 + Math.random() * 5000);

    candles.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

export const INITIAL_SIGNALS: TradingSignal[] = [
  {
    id: 'sig_1',
    assetId: 'btc_usd',
    symbol: 'BTC/USD',
    type: 'strong_buy',
    timeframe: '15m',
    headline: 'MACD Golden Cross Confirmed',
    description: 'The 12-period EMA has crossed above the 26-period EMA on the 15-minute chart with high volume, indicating a strong short-term bullish momentum.',
    tp: 95500.0,
    sl: 93200.0,
    strength: 92,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'sig_2',
    assetId: 'xau_usd',
    symbol: 'XAU/USD',
    type: 'buy',
    timeframe: '1h',
    headline: 'Support Level Bounce at $2,330',
    description: 'Gold has successfully retested major psychological support around $2,330 and printed a hammer candle on the 1-hour chart.',
    tp: 2368.0,
    sl: 2325.0,
    strength: 84,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'sig_3',
    assetId: 'eth_usd',
    symbol: 'ETH/USD',
    type: 'sell',
    timeframe: '4h',
    headline: 'RSI Overbought & Divergence',
    description: 'RSI touched 74 on the 4h timeframe, showing a bearish divergence with the price, which formed lower highs, indicating a near-term correction risk.',
    tp: 3180.0,
    sl: 3340.0,
    strength: 78,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'sig_4',
    assetId: 'eur_usd',
    symbol: 'EUR/USD',
    type: 'strong_sell',
    timeframe: '15m',
    headline: 'US CPI Blowout Signals USD Strength',
    description: 'Higher than expected CPI figures have reinforced Federal Reserve hawkish outlook. Yield spreads are collapsing in favor of the Dollar.',
    tp: 1.0760,
    sl: 1.0895,
    strength: 90,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];
