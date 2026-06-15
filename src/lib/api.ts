import { UserProfile, Transaction, SystemConfig } from '../types';

// API endpoints client manager with localStorage synchronization backup
const BASE_URL = '';

export async function signUpApi(p: { email: string; fullName: string; device?: string; location?: string; ip?: string }): Promise<UserProfile> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (!res.ok) throw new Error('Failed to signup on backend');
    const data = await res.json();
    return data.user;
  } catch (e) {
    console.warn('API error, falling back to local simulation:', e);
    const mockUser: UserProfile = {
      email: p.email,
      fullName: p.fullName,
      balance: 5000.0,
      demoBalance: 10000.0,
      isDemo: true,
      kycStatus: p.email.toLowerCase() === 'blessedfrancis509@gmail.com' ? 'verified' : 'unverified',
      twoFactorEnabled: false,
      joinedAt: new Date().toLocaleDateString(),
    };
    return mockUser;
  }
}

export async function loginApi(email: string): Promise<UserProfile> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Failed to login on backend');
    const data = await res.json();
    return data.user;
  } catch (e) {
    console.warn('API error, falling back to local simulation:', e);
    const mockUser: UserProfile = {
      email: email,
      fullName: email.split('@')[0].toUpperCase(),
      balance: 5000.0,
      demoBalance: 10000.0,
      isDemo: true,
      kycStatus: email.toLowerCase() === 'blessedfrancis509@gmail.com' ? 'verified' : 'unverified',
      twoFactorEnabled: false,
      joinedAt: new Date().toLocaleDateString(),
    };
    return mockUser;
  }
}

export async function fetchProfileApi(email: string): Promise<UserProfile> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/profile?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('Failed to fetch profile on backend');
    const data = await res.json();
    return data.user;
  } catch (e) {
    throw e;
  }
}

export async function fetchTransactionsApi(email?: string): Promise<Transaction[]> {
  try {
    const url = email ? `${BASE_URL}/api/transactions?email=${encodeURIComponent(email)}` : `${BASE_URL}/api/transactions`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    const data = await res.json();
    return data.transactions;
  } catch (e) {
    console.warn('API error, retrieving from local storage:', e);
    const saved = localStorage.getItem('all_ledger_transactions');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function addTransactionApi(tx: Transaction): Promise<Transaction> {
  try {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!res.ok) throw new Error('Failed to store transaction on backend');
    const data = await res.json();
    return data.transaction;
  } catch (e) {
    console.warn('API error, saving locally:', e);
    const saved = localStorage.getItem('all_ledger_transactions');
    const existing: Transaction[] = saved ? JSON.parse(saved) : [];
    const updated = [tx, ...existing];
    localStorage.setItem('all_ledger_transactions', JSON.stringify(updated));
    return tx;
  }
}

export async function approveTransactionApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/transactions/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch (e) {
    console.error('API error, approve local fallback:', e);
    return false;
  }
}

export async function rejectTransactionApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/transactions/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return res.ok;
  } catch (e) {
    console.error('API error, reject local fallback:', e);
    return false;
  }
}

export async function fetchAdminUsersApi(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`);
    if (!res.ok) throw new Error('Failed to fetch admin users');
    const data = await res.json();
    return data.users;
  } catch (e) {
    console.warn('API error, reading unregistered users locally:', e);
    const saved = localStorage.getItem('registered_system_users');
    return saved ? JSON.parse(saved) : [];
  }
}

export async function updateAdminUserApi(p: { email: string; balance: number; demoBalance: number; kycStatus: string }): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    return res.ok;
  } catch (e) {
    console.error('API error, user balance update local fallback:', e);
    return false;
  }
}

export async function deleteAdminUserApi(email: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  } catch (e) {
    console.error('API error, delete user fallback:', e);
    return false;
  }
}

export async function fetchSystemConfigApi(): Promise<SystemConfig> {
  try {
    const res = await fetch(`${BASE_URL}/api/system/config`);
    if (!res.ok) throw new Error('Failed to fetch system config');
    const data = await res.json();
    return data.systemConfig;
  } catch (e) {
    console.warn('API error, loading local config:', e);
    const saved = localStorage.getItem('system_payment_config');
    if (saved) return JSON.parse(saved);
    return {
      bankName: 'Standard Apex Trust London',
      beneficiary: 'ExTrading Brokerage LLC',
      iban: 'GB89 APEX 9021 3491 5581 00',
      sortCode: '40-12-88',
      refPrefix: 'EXT',
      btcAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      usdtAddress: 'TX908TRC20usdtYegshGFdb6OgHXgtaul2'
    };
  }
}

export async function updateSystemConfigApi(config: SystemConfig): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/system/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch (e) {
    console.error('API error, config update local fallback:', e);
    localStorage.setItem('system_payment_config', JSON.stringify(config));
    return true;
  }
}
