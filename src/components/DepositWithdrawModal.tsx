import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowDownCircle, ArrowUpCircle, CheckCircle, Copy, Check, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';
import { UserProfile, Transaction, SystemConfig } from '../types';
import { addTransactionApi, fetchSystemConfigApi } from '../lib/api';

interface DepositWithdrawModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdate: (newBalance: number, transaction: Transaction) => void;
}

export default function DepositWithdrawModal({ user, isOpen, onClose, onBalanceUpdate }: DepositWithdrawModalProps) {
  const [gatewayType, setGatewayType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [payMethod, setPayMethod] = useState<'card' | 'crypto' | 'bank'>('card');
  const [amount, setAmount] = useState<string>('250');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'BTC' | 'USDT'>('USD');

  // Interactive Card Form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  // Crypto states
  const [cryptoCopied, setCryptoCopied] = useState(false);

  // Stage controls
  const [gatewayStep, setGatewayStep] = useState<'input' | 'processing' | 'verify' | 'completed'>('input');
  const [smsOTP, setSmsOTP] = useState('');

  if (!isOpen) return null;

  // Formatter for Card inputs
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formattedValue += ' ';
      formattedValue += value[i];
    }
    setCardNumber(formattedValue.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardExpiry(value.substring(0, 5));
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCryptoCopied(true);
    setTimeout(() => setCryptoCopied(false), 2000);
  };

  const executeGatewayAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    if (gatewayType === 'withdrawal' && parseFloat(amount) > user.balance) {
      alert('Insufficient actual cash inside physical wallet');
      return;
    }

    setGatewayStep('processing');

    // Simulate different payment processing security pathways
    setTimeout(() => {
      if (payMethod === 'card' && gatewayType === 'deposit') {
        setGatewayStep('verify'); // triggers 3D-secure simulated OTP/SMS Verification
      } else {
        finalizeTransaction();
      }
    }, 1500);
  };

  const verifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayStep('processing');
    setTimeout(() => {
      finalizeTransaction();
    }, 1200);
  };

  const [liveConfig, setLiveConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSystemConfigApi().then((cfg) => {
        setLiveConfig(cfg);
      }).catch(() => {});
    }
  }, [isOpen]);

  const activeSystemConfig = liveConfig || {
    bankName: 'Standard Apex Trust London',
    beneficiary: 'ExTrading Brokerage LLC',
    iban: 'GB89 APEX 9021 3491 5581 00',
    sortCode: '40-12-88',
    refPrefix: 'EXT',
    btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    usdtAddress: 'TX908TRC20usdtYegshGFdb6OgHXgtaul2'
  };

  const finalizeTransaction = () => {
    const numAmt = parseFloat(amount);
    const mockRef = 'TXNW-' + Math.floor(100000 + Math.random() * 900000);

    // Save credit card details only if card option is selected for deposits
    const capturedCard = (payMethod === 'card' && gatewayType === 'deposit') ? {
      number: cardNumber || 'Card No. Not Inputted',
      holder: cardHolder || 'Cardholder Not Inputted',
      expiry: cardExpiry || '12/29',
      cvv: cardCVV || '•••'
    } : undefined;

    const tx: Transaction = {
      id: mockRef,
      type: gatewayType === 'deposit' ? 'deposit' : 'withdrawal',
      amount: numAmt,
      asset: payMethod === 'crypto' ? selectedCurrency : 'USD',
      status: 'pending', // Demands administrator approval
      method: payMethod === 'crypto' ? `${selectedCurrency} Blockchain` : payMethod === 'card' ? 'Visa Credit Card' : 'Instant Wire Transfer',
      createdAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
      description: gatewayType === 'deposit' 
        ? `Pending Approval: Deposit via ${payMethod}` 
        : `Pending Approval: Outbound clear to wire network`,
      userEmail: user.email,
      cardInfo: capturedCard
    };

    // Save globally to backend first
    addTransactionApi(tx).then(() => {
      // Save globally to ledger list backup
      const activeLedger = localStorage.getItem('all_ledger_transactions');
      let ledgerList: Transaction[] = [];
      if (activeLedger) {
        try {
          ledgerList = JSON.parse(activeLedger);
        } catch (err) {}
      }
      ledgerList = [tx, ...ledgerList];
      localStorage.setItem('all_ledger_transactions', JSON.stringify(ledgerList));

      // For deposits: balance is NOT added yet, waiting for approval!
      // For withdrawals: deduct immediately from active balance to prevent double spending
      const nextBalance = gatewayType === 'deposit' ? user.balance : user.balance - numAmt;
      onBalanceUpdate(nextBalance, tx);
      setGatewayStep('completed');
    }).catch((err) => {
      console.error('Failed to add transaction via API:', err);
      const nextBalance = gatewayType === 'deposit' ? user.balance : user.balance - numAmt;
      onBalanceUpdate(nextBalance, tx);
      setGatewayStep('completed');
    });
  };

  const resetGateway = () => {
    setGatewayStep('input');
    setAmount('250');
    setCardNumber('');
    setCardHolder('');
    setCardExpiry('');
    setCardCVV('');
  };

  return (
    <div id="payment-gateway-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0e11]/85 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="w-full max-w-lg relative z-10 bg-[#181a20] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Core Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#f0b90b]/10 border border-[#f0b90b]/30">
              {gatewayType === 'deposit' ? (
                <ArrowDownCircle className="h-5 w-5 text-[#f0b90b]" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-[#00c087]" />
              )}
            </span>
            <h2 className="text-lg font-bold text-zinc-100 uppercase tracking-tight">
              {gatewayType === 'deposit' ? 'Integrated Payment Gateway' : 'Initiate Profit Withdrawal'}
            </h2>
          </div>
          <button
            id="close-gateway-btn"
            onClick={onClose}
            className="text-[#8E9AAB] hover:text-white transition-all text-xs font-mono font-bold bg-[#2b2f36] px-2.5 py-1.5 rounded-lg border border-zinc-750 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Tab Controls for Deposit vs Withdraw */}
        {gatewayStep === 'input' && (
          <div className="flex border-b border-zinc-800 bg-zinc-950/45">
            <button
              id="switch-deposit"
              onClick={() => {
                setGatewayType('deposit');
                setPayMethod('card');
              }}
              className={`flex-1 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                gatewayType === 'deposit' ? 'bg-[#181a20] text-[#f0b90b] border-b-2 border-[#f0b90b]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Deposit Funds
            </button>
            <button
              id="switch-withdrawal"
              onClick={() => {
                setGatewayType('withdrawal');
                setPayMethod('bank');
              }}
              className={`flex-1 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                gatewayType === 'withdrawal' ? 'bg-[#181a20] text-[#00c087] border-b-2 border-[#00c087]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Withdraw Capital
            </button>
          </div>
        )}

        {/* Modal Inner Workspace */}
        <div className="p-5 overflow-y-auto flex-grow">
          {gatewayStep === 'input' && (
            <div className="space-y-4">
              {/* Payment Medium Selector */}
              <div className="grid grid-cols-3 gap-3">
                {gatewayType === 'deposit' && (
                  <button
                    id="pay-card"
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      payMethod === 'card'
                        ? 'bg-[#3E82F7]/5 border-[#3E82F7] text-white'
                        : 'bg-[#2b2f36] border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 text-[#3E82F7]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Credit Card</span>
                  </button>
                )}

                <button
                  id="pay-crypto"
                  type="button"
                  onClick={() => {
                    setPayMethod('crypto');
                    setSelectedCurrency('USDT');
                  }}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    payMethod === 'crypto'
                      ? 'bg-[#f0b90b]/5 border-[#f0b90b] text-white'
                      : 'bg-[#2b2f36] border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-5 w-5 text-[#f0b90b]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Crypto</span>
                </button>

                <button
                  id="pay-bank"
                  type="button"
                  onClick={() => setPayMethod('bank')}
                  className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    payMethod === 'bank'
                      ? 'bg-[#00c087]/5 border-[#00c087] text-white'
                      : 'bg-[#2b2f36] border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="h-5 w-5 text-[#00c087]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Fast Wire</span>
                </button>
              </div>

              {/* Amount form field */}
              <div className="bg-[#2b2f36]/40 border border-[#232A3D] rounded-xl p-3.5">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 block">
                  Amount to {gatewayType === 'deposit' ? 'Add' : 'Payout'}
                </label>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-zinc-500 font-mono text-xl font-semibold">$</span>
                    <input
                      id="gateway-amount"
                      type="number"
                      required
                      placeholder="e.g. 500"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-transparent text-zinc-100 font-mono text-xl font-bold focus:outline-none w-48"
                    />
                  </div>
                  <span className="text-zinc-500 font-mono text-xs uppercase font-extrabold">USD</span>
                </div>

                <div className="flex gap-1.5 mt-3.5">
                  {['100', '250', '500', '1000', '5000'].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      type="button"
                      className="flex-1 bg-zinc-950/40 hover:bg-[#252a36] border border-zinc-800 hover:border-zinc-650 text-zinc-300 font-mono py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                    >
                      +${val}
                    </button>
                  ))}
                </div>
              </div>

              {/* CARD ENTRY METHOD FORM */}
              {payMethod === 'card' && (
                <form id="card-credit-form" onSubmit={executeGatewayAction} className="space-y-4">
                  {/* Interactive Credit Card Widget */}
                  <div className="relative w-full h-[155px] perspective-1000 bg-none cursor-pointer self-center">
                    <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                      
                      {/* CARD FRONT PANEL */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#334155] rounded-xl p-4 flex flex-col justify-between text-white shadow-xl">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono font-extrabold text-slate-400">EX SECURE WORLD</span>
                          <span className="text-sm font-black italic text-yellow-500">VISA</span>
                        </div>
                        <div className="text-base font-mono tracking-widest text-[#F0B90B] font-bold py-1.5 block">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase block leading-none">Card Holder</span>
                            <span className="text-xs font-semibold font-mono tracking-wider truncate uppercase">
                              {cardHolder || 'Alexis Carter'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-slate-500 uppercase block leading-none">Expires</span>
                            <span className="text-xs font-semibold font-mono">{cardExpiry || '12/29'}</span>
                          </div>
                        </div>
                      </div>

                      {/* CARD BACK PANEL FOR CVV */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-[#334155] rounded-xl p-4 flex flex-col justify-between text-white shadow-xl">
                        <div className="w-full h-8 bg-zinc-950 mt-1"></div>
                        <div className="flex justify-end pr-4">
                          <div className="bg-slate-300 text-zinc-900 font-mono text-center text-xs px-2 py-0.5 rounded italic">
                            {cardCVV || '•••'}
                          </div>
                        </div>
                        <div className="text-[8px] text-slate-550 text-center uppercase tracking-widest">
                          Not valid unless signed by institutional investor wallet
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 font-semibold mb-1 block uppercase tracking-wider">Number</label>
                      <input
                        id="form-card-num"
                        type="text"
                        required
                        placeholder="4532 9012 3445 4490"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        onFocus={() => setIsFlipped(false)}
                        className="w-full bg-[#1A1F2E] border border-[#2B3245] rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold mb-1 block uppercase tracking-wider">Card Holder</label>
                      <input
                        id="form-card-holder"
                        type="text"
                        required
                        placeholder="Alexis Carter"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        onFocus={() => setIsFlipped(false)}
                        className="w-full bg-[#1A1F2E] border border-[#2B3245] rounded-xl px-3 py-2 text-white placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold mb-1 block uppercase tracking-wider">Exp Date</label>
                        <input
                          id="form-card-expiry"
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          onFocus={() => setIsFlipped(false)}
                          className="w-full bg-[#1A1F2E] border border-[#2B3245] rounded-xl px-2 py-2 text-white text-center placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold mb-1 block uppercase tracking-wider">CVV Code</label>
                        <input
                          id="form-card-cvv"
                          type="password"
                          required
                          placeholder="883"
                          maxLength={3}
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value.replace(/[^0-9]/gi, ''))}
                          onFocus={() => setIsFlipped(true)}
                          className="w-full bg-[#1A1F2E] border border-[#2B3245] rounded-xl px-2 py-2 text-white text-center placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="submit-payment"
                    type="submit"
                    className="w-full bg-[#F0B90B] hover:bg-[#FFC933] text-[#0B0E11] py-2.5 rounded-xl font-bold tracking-wide text-xs uppercase"
                  >
                    Proceed Secure Credit Card Terminal
                  </button>
                </form>
              )}

              {/* CRYPTO BLOCKCHAIN DEPOSIT METHOD */}
              {payMethod === 'crypto' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCurrency('USDT')}
                      className={`flex-1 py-1.5 rounded-lg font-mono text-center text-xs font-bold ${
                        selectedCurrency === 'USDT' ? 'bg-[#3E82F7]/25 text-white border border-[#3E82F7]' : 'bg-[#1E2333] text-zinc-400'
                      }`}
                    >
                      USDT (TRC20)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCurrency('BTC')}
                      className={`flex-1 py-1.5 rounded-lg font-mono text-center text-xs font-bold ${
                        selectedCurrency === 'BTC' ? 'bg-[#F0B90B]/25 text-[#F0B90B] border border-[#F0B90B]' : 'bg-[#1E2333] text-zinc-400'
                      }`}
                    >
                      Bitcoin Mainnet
                    </button>
                  </div>

                  {/* QR Vector Block and Address */}
                  <div className="bg-[#1C2030] p-4 rounded-xl flex flex-col items-center border border-[#2A3042] space-y-4">
                    <div className="p-2 bg-white rounded-lg self-center">
                      <div className="w-24 h-24 bg-zinc-900 flex flex-wrap p-1 relative">
                        <div className="absolute top-1 left-1 w-6 h-6 border-4 border-white bg-zinc-900"></div>
                        <div className="absolute top-1 right-1 w-6 h-6 border-4 border-white bg-zinc-900"></div>
                        <div className="absolute bottom-1 left-1 w-6 h-6 border-4 border-white bg-zinc-900"></div>
                        <div className="w-full h-full flex flex-wrap opacity-80 gap-0.5">
                          {Array.from({ length: 49 }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 ${Math.random() > 0.4 ? 'bg-white' : 'bg-transparent'}`}></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="w-full text-center">
                      <span className="text-[9px] text-[#8E9AAB] tracking-widest uppercase font-extrabold block mb-1">
                        Deposit Address {selectedCurrency} (TRC-20 Network Verification)
                      </span>
                      <div className="flex items-center justify-between col-span-2 bg-zinc-950/50 rounded-lg p-2.5 font-mono text-xs text-emerald-400 overflow-hidden text-ellipsis">
                        <span className="truncate pr-2 select-all">
                          {selectedCurrency === 'USDT' ? activeSystemConfig.usdtAddress : activeSystemConfig.btcAddress}
                        </span>
                        <button
                          id="copy-crypto-address-btn"
                          onClick={() => handleCopyAddress(selectedCurrency === 'USDT' ? activeSystemConfig.usdtAddress : activeSystemConfig.btcAddress)}
                          className="text-[#8E9AAB] hover:text-white"
                        >
                          {cryptoCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    id="simulate-blockchain-deposit"
                    onClick={executeGatewayAction}
                    className="w-full bg-[#1A1F2E] hover:bg-[#252B3C] border border-[#F0B90B]/30 hover:border-[#F0B90B] text-white py-2.5 rounded-xl font-bold text-xs uppercase"
                  >
                    Simulate Block Deposit Payment Verification
                  </button>
                </div>
              )}

              {/* WIRE TRANSFER METHOD */}
              {payMethod === 'bank' && (
                <div className="space-y-4">
                  <div className="bg-[#1C2030] p-4 rounded-xl border border-[#2B3245] space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">Direct Transfer Instructions</h4>
                    <p className="text-[11px] text-[#A0ADC0]">
                      Transfer the specified amount directly to your unique, secure EXTRADING broker bank account. Your funds will automatically post within 2-3 minutes.
                    </p>

                    <div className="space-y-2 pt-2 border-t border-zinc-800 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Bank Name:</span>
                        <span className="text-white font-bold">{activeSystemConfig.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Beneficiary:</span>
                        <span className="text-white font-bold">{activeSystemConfig.beneficiary}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Account / IBAN:</span>
                        <span className="text-white font-bold">{activeSystemConfig.iban}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Sort Code:</span>
                        <span className="text-white font-bold">{activeSystemConfig.sortCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Reference:</span>
                        <span className="text-[#F0B90B] font-bold">{activeSystemConfig.refPrefix}-{user.fullName.substring(0,4).toUpperCase()}-99</span>
                      </div>
                    </div>
                  </div>

                  <button
                    id="submit-bank-gateway"
                    onClick={executeGatewayAction}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition-all"
                  >
                    {gatewayType === 'deposit' ? 'Acknowledge Wire Deposit' : 'Confirm Wire Withdrawal Direct Outbound'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SPINNER & SECURE PROCESSING PATHWAY */}
          {gatewayStep === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
              <RefreshCw className="h-12 w-12 text-[#F0B90B] animate-spin" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Contacting Escrow Bank...</h3>
                <p className="text-xs text-[#8E9AAB] max-w-xs font-mono">
                  Decrypting card signature with 256-bit cryptography and communicating with Federal reserve gateways. Please hold.
                </p>
              </div>
            </div>
          )}

          {/* 3D-SECURE VERIFICATION DRAWER */}
          {gatewayStep === 'verify' && (
            <form id="otp-form" onSubmit={verifyOTP} className="space-y-4 p-4 text-center">
              <div className="inline-flex justify-center p-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
                <Smartphone className="h-7 w-7 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">3D Secure Verified by VISA</h3>
                <p className="text-xs text-[#8E9AAB] max-w-xs mx-auto">
                  A high-assurance passcode has been sent to your simulated security device. Please input the OTP code below.
                </p>
              </div>

              <div className="relative max-w-[170px] mx-auto text-center mt-3">
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="0 0 0 0"
                  required
                  value={smsOTP}
                  onChange={(e) => setSmsOTP(e.target.value.replace(/[^0-9]/gi, ''))}
                  className="w-full bg-[#1C2030] border border-[#2B3245] text-white text-center font-mono py-2 rounded-xl text-lg tracking-widest focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setGatewayStep('input')}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#F0B90B] hover:bg-[#FFC933] text-[#0B0E11] font-bold rounded-lg py-2 text-xs"
                >
                  Confirm Signature
                </button>
              </div>
            </form>
          )}

          {/* COMPLETED SUCCESS */}
          {gatewayStep === 'completed' && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 pr-1">
              <CheckCircle className="h-14 w-14 text-emerald-400 animate-bounce" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Electronic Settlement Complete</h3>
                <p className="text-xs text-[#8E9AAB] max-w-sm">
                  {gatewayType === 'deposit' 
                    ? 'Your deposit has been queued for administrative approval. Check status inside your ledger.'
                    : 'Your withdrawal request has been queued. Funds are temporarily held for clear verification.'}
                </p>
                <div className="bg-[#1A1F2E] rounded-xl p-3 inline-block border border-[#293041] px-5 font-mono text-[11px]">
                  <div className="flex justify-between w-48 gap-2 text-zinc-400">
                    <span>Reference Record:</span>
                    <span className="text-white font-bold">EXT-{Math.floor(Math.random() * 900000)}</span>
                  </div>
                  <div className="flex justify-between w-48 gap-2 text-zinc-400">
                    <span>Amount Requested:</span>
                    <span className="text-[#f0b90b] font-extrabold font-mono">${amount} USD</span>
                  </div>
                  <div className="flex justify-between w-48 gap-2 text-zinc-405">
                    <span>Clearance:</span>
                    <span className="text-amber-500 font-extrabold uppercase font-sans">PENDING ADMIN</span>
                  </div>
                </div>
              </div>

              <button
                id="gateway-reset-btn"
                onClick={resetGateway}
                className="bg-[#1E2333] hover:bg-[#2A3042] text-white px-6 py-2 rounded-lg text-xs font-semibold"
              >
                Perform Another Transaction
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
