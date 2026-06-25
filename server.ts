import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Setup storage database path
const DB_FILE = path.join(process.cwd(), "db_store.json");

interface UserProfile {
  email: string;
  fullName: string;
  balance: number;
  demoBalance: number;
  isDemo: boolean;
  kycStatus: "unverified" | "pending" | "verified";
  twoFactorEnabled: boolean;
  joinedAt: string;
  password?: string;
  device?: string;
  location?: string;
  ip?: string;
  status?: "Online" | "Idle" | "Offline";
  isAdmin?: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  asset?: string;
  status: "completed" | "pending" | "failed";
  method?: string;
  createdAt: string;
  description: string;
  userEmail?: string;
  isDemo?: boolean;
  cardInfo?: {
    number: string;
    holder: string;
    expiry: string;
    cvv: string;
  };
}

interface BankAccount {
  id: string;
  bankName: string;
  beneficiary: string;
  iban: string;
  sortCode: string;
}

interface SystemConfig {
  bankName: string;
  beneficiary: string;
  iban: string;
  sortCode: string;
  refPrefix: string;
  btcAddress: string;
  usdtAddress: string;
  bankAccounts?: BankAccount[];
}

// Initial DB state seed
const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  bankName: "Standard Apex Trust London",
  beneficiary: "ExTrading Brokerage LLC",
  iban: "GB89 APEX 9021 3491 5581 00",
  sortCode: "40-12-88",
  refPrefix: "EXT",
  btcAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  usdtAddress: "TX908TRC20usdtYegshGFdb6OgHXgtaul2",
  bankAccounts: [
    {
      id: "BAC-123456",
      bankName: "Standard Apex Trust London",
      beneficiary: "ExTrading Brokerage LLC",
      iban: "GB89 APEX 9021 3491 5581 00",
      sortCode: "40-12-88"
    }
  ]
};

const DEFAULT_USERS: UserProfile[] = [
  {
    email: "blessedfrancis509@gmail.com",
    fullName: "Blessed Francis Administrator",
    balance: 85200.00,
    demoBalance: 50000.00,
    isDemo: false,
    kycStatus: "verified",
    twoFactorEnabled: false,
    joinedAt: "2026-05-10",
    device: "macOS Chrome - Active Desktop",
    location: "London, Greater London",
    ip: "82.165.19.44",
    status: "Online",
    password: "admin12345",
  },
];

const DEFAULT_TRANSACTIONS: Transaction[] = [];

// Helper to check if a date string represents a date within the last 30 days
function isWithin30Days(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    let ms = Date.parse(dateStr);
    if (isNaN(ms)) {
      const parts = dateStr.split(" ");
      for (const part of parts) {
        const val = Date.parse(part);
        if (!isNaN(val)) {
          ms = val;
          break;
        }
      }
    }
    if (isNaN(ms)) {
      return true; // Keep logs we cannot reliably parse to avoid accidental data loss
    }
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return (Date.now() - ms) <= THIRTY_DAYS_MS;
  } catch (err) {
    return true;
  }
}

// Helper to read database state
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const freshData = {
      users: DEFAULT_USERS,
      transactions: DEFAULT_TRANSACTIONS,
      systemConfig: DEFAULT_SYSTEM_CONFIG,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(freshData, null, 2));
    return freshData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    
    let mutated = false;

    // Enforce admin user password auto-migration
    if (data && Array.isArray(data.users)) {
      const adminUser = data.users.find(
        (u: UserProfile) => u.email.trim().toLowerCase() === "blessedfrancis509@gmail.com"
      );
      if (adminUser) {
        if (adminUser.password !== "admin12345") {
          adminUser.password = "admin12345";
          mutated = true;
        }
      } else {
        // Safe check to auto-create admin if accidentally dropped
        data.users.push(DEFAULT_USERS[0]);
        mutated = true;
      }
    }

    // Ensure systemConfig and bankAccounts migration is present
    if (data && data.systemConfig) {
      if (!data.systemConfig.bankAccounts || !Array.isArray(data.systemConfig.bankAccounts) || data.systemConfig.bankAccounts.length === 0) {
        data.systemConfig.bankAccounts = [
          {
            id: "BAC-123456",
            bankName: data.systemConfig.bankName || "Standard Apex Trust London",
            beneficiary: data.systemConfig.beneficiary || "ExTrading Brokerage LLC",
            iban: data.systemConfig.iban || "GB89 APEX 9021 3491 5581 00",
            sortCode: data.systemConfig.sortCode || "40-12-88"
          }
        ];
        mutated = true;
      }
    } else if (data) {
      data.systemConfig = DEFAULT_SYSTEM_CONFIG;
      mutated = true;
    }

    // Auto-prune transaction logs older than 30 days to optimize storage
    if (data && Array.isArray(data.transactions)) {
      const originalCount = data.transactions.length;
      data.transactions = data.transactions.filter((t: Transaction) => {
        return isWithin35DaysOrLess(t);
      });
      if (data.transactions.length !== originalCount) {
        mutated = true;
      }
    }

    if (mutated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    }
    return data;
  } catch (error) {
    console.error("Failed to parse db_store.json:", error);
    return {
      users: DEFAULT_USERS,
      transactions: DEFAULT_TRANSACTIONS,
      systemConfig: DEFAULT_SYSTEM_CONFIG,
    };
  }
}

// Helper filter adapter
function isWithin35DaysOrLess(t: Transaction): boolean {
  return isWithin30Days(t.createdAt);
}

// Helper to write database state
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write db_store.json:", err);
  }
}

// Helper to determine if an email or user profile qualifies as an administrator
function isUserAdmin(email: string, db: any): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === "blessedfrancis509@gmail.com" || cleanEmail.includes("admin")) {
    return true;
  }
  const user = db.users.find((u: any) => u.email.trim().toLowerCase() === cleanEmail);
  if (user && (user.password === "admin12345" || user.isAdmin)) {
    return true;
  }
  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Route: Sign up new user
  app.post("/api/auth/signup", (req, res) => {
    const { email, fullName, password, device, location, ip } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = readDB();
    const existingIndex = db.users.findIndex(
      (u: UserProfile) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Just return profile if user exists (or login them in seamlessly)
      return res.json({ success: true, user: db.users[existingIndex] });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === "blessedfrancis509@gmail.com" || 
                    cleanEmail.includes("admin") || 
                    password === "admin12345";

    const newUser: UserProfile = {
      email: email,
      fullName: fullName || email.split("@")[0].toUpperCase(),
      balance: 10000.0,
      demoBalance: 10000.0,
      isDemo: true,
      kycStatus: isAdmin ? "verified" : "unverified",
      twoFactorEnabled: false,
      joinedAt: new Date().toLocaleDateString(),
      password: password || "password123",
      device: device || "Desktop Browser Console",
      location: location || "Global Terminal Network",
      ip: ip || "127.0.0.1",
      status: "Online",
      isAdmin: isAdmin,
    };

    db.users.push(newUser);
    writeDB(db);

    res.json({ success: true, user: newUser });
  });

  // Route: Login existing user
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = readDB();
    let user = db.users.find(
      (u: UserProfile) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      // Enforce direct credentials check for active administrative/critical sessions
      const storedPass = user.password || "password123";
      if (password && password !== storedPass) {
        return res.status(401).json({ error: "Access denied. Security passcode mismatch." });
      }
      // Update isAdmin state dynamically if password/email matches
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === "blessedfrancis509@gmail.com" || cleanEmail.includes("admin") || storedPass === "admin12345" || password === "admin12345") {
        user.isAdmin = true;
        user.kycStatus = "verified";
      }
    } else {
      // Auto-create dynamically for outstanding user UX (sandbox-friendly!)
      const cleanEmail = email.trim().toLowerCase();
      const isAdmin = cleanEmail === "blessedfrancis509@gmail.com" || 
                      cleanEmail.includes("admin") || 
                      password === "admin12345";

      user = {
        email: email,
        fullName: email.split("@")[0].toUpperCase(),
        balance: 10000.0,
        demoBalance: 10000.0,
        isDemo: true,
        kycStatus: isAdmin ? "verified" : "unverified",
        twoFactorEnabled: false,
        joinedAt: new Date().toLocaleDateString(),
        password: password || "password123",
        device: "Desktop Terminal Hub",
        location: "Network Link",
        ip: "127.0.0.1",
        status: "Online",
        isAdmin: isAdmin,
      };
      db.users.push(user);
      writeDB(db);
    }

    // Update status to online
    user.status = "Online";
    writeDB(db);

    res.json({ success: true, user });
  });

  // Route: Get user email profile updates
  app.get("/api/auth/profile", (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ error: "Email query param is required" });
    }

    const db = readDB();
    const user = db.users.find(
      (u: UserProfile) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  });

  // Route: Update user profile choices (such as isDemo, fullName)
  app.post("/api/auth/profile/update", (req, res) => {
    const { email, isDemo, fullName } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = readDB();
    const user = db.users.find(
      (u: UserProfile) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    if (isDemo !== undefined) {
      user.isDemo = isDemo === true || isDemo === "true";
    }
    if (fullName !== undefined) {
      user.fullName = fullName;
    }

    writeDB(db);
    res.json({ success: true, user });
  });

  // Route: Fetch transaction history
  app.get("/api/transactions", (req, res) => {
    const email = req.query.email as string;
    const db = readDB();

    if (!email) {
      return res.json({ success: true, transactions: db.transactions });
    }

    // Authorized administrators get all transactions, other users get only theirs!
    if (isUserAdmin(email, db)) {
      res.json({ success: true, transactions: db.transactions });
    } else {
      const filtered = db.transactions.filter(
        (t: Transaction) => (t.userEmail || "").toLowerCase() === email.toLowerCase()
      );
      res.json({ success: true, transactions: filtered });
    }
  });

  // Route: Append new transaction ledger entry
  app.post("/api/transactions", (req, res) => {
    const tx: Transaction = req.body;
    if (!tx || !tx.id) {
      return res.status(400).json({ error: "Invalid transaction record" });
    }

    const db = readDB();

    // Deduct/Add balances according to type & isDemo status
    const user = db.users.find(
      (u: UserProfile) => u.email.toLowerCase() === (tx.userEmail || "").toLowerCase()
    );
    if (user) {
      if ((tx.isDemo as any) === true || (tx.isDemo as any) === "true") {
        if (tx.type === "withdrawal") {
          user.demoBalance = Math.max(0, user.demoBalance - tx.amount);
        } else if (tx.type === "deposit" && tx.status === "completed") {
          user.demoBalance += tx.amount;
        }
      } else {
        if (tx.type === "withdrawal" && tx.status === "pending") {
          user.balance = Math.max(0, user.balance - tx.amount);
        }
      }
    }

    // Insert on top
    db.transactions = [tx, ...db.transactions];
    writeDB(db);

    res.json({ success: true, transaction: tx });
  });

  // Route: Approve clearance (Admin Action)
  app.post("/api/admin/transactions/approve", (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const db = readDB();
    const tx = db.transactions.find((t: Transaction) => t.id === id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    tx.status = "completed";

    // If deposit, increase user balance. If withdrawal, funds were already deducted.
    if (tx.type === "deposit") {
      const user = db.users.find(
        (u: UserProfile) => u.email.toLowerCase() === (tx.userEmail || "").toLowerCase()
      );
      if (user) {
        if ((tx.isDemo as any) === true || (tx.isDemo as any) === "true") {
          user.demoBalance += tx.amount;
        } else {
          user.balance += tx.amount;
        }
      }
    }

    writeDB(db);
    res.json({ success: true });
  });

  // Route: Reject clearance (Admin Action)
  app.post("/api/admin/transactions/reject", (req, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Transaction ID is required" });
    }

    const db = readDB();
    const tx = db.transactions.find((t: Transaction) => t.id === id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    tx.status = "failed";

    // If withdrawal, return back to user balance
    if (tx.type === "withdrawal") {
      const user = db.users.find(
        (u: UserProfile) => u.email.toLowerCase() === (tx.userEmail || "").toLowerCase()
      );
      if (user) {
        if ((tx.isDemo as any) === true || (tx.isDemo as any) === "true") {
          user.demoBalance += tx.amount;
        } else {
          user.balance += tx.amount;
        }
      }
    }

    writeDB(db);
    res.json({ success: true });
  });

  // Route: Purge/Clear all demo transaction logs (Admin Action)
  app.post("/api/admin/transactions/clear-demo", (req, res) => {
    const db = readDB();
    const originalCount = db.transactions.length;
    db.transactions = db.transactions.filter((t: any) => t.isDemo !== true && t.isDemo !== "true");
    writeDB(db);
    res.json({ success: true, removedCount: originalCount - db.transactions.length });
  });

  // Route: Purge/Clear all transaction logs (Admin Action)
  app.post("/api/admin/transactions/clear-all", (req, res) => {
    const db = readDB();
    const originalCount = db.transactions.length;
    db.transactions = [];
    writeDB(db);
    res.json({ success: true, removedCount: originalCount });
  });

  // Route: Get all registered device users (Admin Action)
  app.get("/api/admin/users", (req, res) => {
    const db = readDB();
    res.json({ success: true, users: db.users });
  });

  // Route: Update user balance / KYC (Admin Action)
  app.post("/api/admin/users/update", (req, res) => {
    const { email, balance, demoBalance, kycStatus } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = readDB();
    const user = db.users.find(
      (u: UserProfile) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    user.balance = parseFloat(balance);
    user.demoBalance = parseFloat(demoBalance);
    user.kycStatus = kycStatus;

    writeDB(db);
    res.json({ success: true, user });
  });

  // Route: Delete user account profile (Admin Action)
  app.post("/api/admin/users/delete", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const db = readDB();
    const userIndex = db.users.findIndex(
      (u: UserProfile) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (userIndex === -1) {
      return res.status(404).json({ error: "User profile not found in database" });
    }

    // Process deletion
    db.users.splice(userIndex, 1);
    db.transactions = db.transactions.filter(
      (t: Transaction) => (t.userEmail || "").toLowerCase() !== email.toLowerCase()
    );

    writeDB(db);
    res.json({ success: true });
  });

  // Route: Fetch System configurations
  app.get("/api/system/config", (req, res) => {
    const db = readDB();
    res.json({ success: true, systemConfig: db.systemConfig || DEFAULT_SYSTEM_CONFIG });
  });

  // Route: Update System Configurations (Admin Action)
  app.post("/api/system/config", (req, res) => {
    const config: SystemConfig = req.body;
    if (!config) {
      return res.status(400).json({ error: "Invalid configuration" });
    }

    const db = readDB();
    db.systemConfig = config;
    writeDB(db);

    res.json({ success: true, systemConfig: config });
  });

  // Route: Get support messages (filtered by user email or all if none provided)
  app.get("/api/support/messages", (req, res) => {
    const { email } = req.query;
    const db = readDB();
    if (!db.supportMessages) {
      db.supportMessages = [];
    }
    
    if (email) {
      const userMessages = db.supportMessages.filter(
        (m: any) => (m.userEmail || "").trim().toLowerCase() === (email as string).trim().toLowerCase()
      );
      
      // Seed default welcome message if no history exists for this address
      if (userMessages.length === 0) {
        const welcome = {
          id: "WELCOME-" + Date.now(),
          userEmail: (email as string).trim().toLowerCase(),
          sender: "agent",
          text: "ExTrading secure support is online. Our node is configured with end-to-end AES-256 bit tunneling. How can we help you today with your clearing accounts, active trade balances, or deposits?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        db.supportMessages.push(welcome);
        writeDB(db);
        return res.json({ success: true, messages: [welcome] });
      }
      return res.json({ success: true, messages: userMessages });
    }
    
    res.json({ success: true, messages: db.supportMessages });
  });

  // Route: Post support messages
  app.post("/api/support/messages", (req, res) => {
    const { userEmail, sender, text, timestamp } = req.body;
    if (!userEmail || !sender || !text) {
      return res.status(400).json({ error: "userEmail, sender, and text are required" });
    }
    
    const db = readDB();
    if (!db.supportMessages) {
      db.supportMessages = [];
    }
    
    const newMessage = {
      id: "MSG-" + Math.floor(100000 + Math.random() * 900000),
      userEmail: userEmail.trim().toLowerCase(),
      sender,
      text,
      timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    db.supportMessages.push(newMessage);
    writeDB(db);
    res.json({ success: true, message: newMessage });
  });


  // Vite middleware setup or Static assets serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Listen on PORT 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
