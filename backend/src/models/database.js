const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'rental.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      model TEXT,
      status TEXT DEFAULT 'available',
      daily_rate REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      project_name TEXT,
      start_date DATE,
      end_date DATE,
      status TEXT DEFAULT 'draft',
      total_amount REAL DEFAULT 0,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rental_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      contract_id INTEGER,
      status TEXT DEFAULT 'pending',
      out_checked INTEGER DEFAULT 0,
      out_operator TEXT,
      out_time DATETIME,
      return_operator TEXT,
      return_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contract_id) REFERENCES contracts(id)
    );

    CREATE TABLE IF NOT EXISTS rental_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_order_id INTEGER NOT NULL,
      device_id INTEGER NOT NULL,
      out_checked INTEGER DEFAULT 0,
      return_checked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id),
      FOREIGN KEY (device_id) REFERENCES devices(id),
      UNIQUE(rental_order_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_order_id INTEGER NOT NULL,
      device_id INTEGER NOT NULL,
      inspector TEXT,
      inspect_time DATETIME,
      has_damage INTEGER DEFAULT 0,
      damage_description TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_id INTEGER NOT NULL,
      photo_url TEXT NOT NULL,
      photo_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id)
    );

    CREATE TABLE IF NOT EXISTS return_confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_order_id INTEGER NOT NULL,
      customer_manager TEXT,
      confirm_time DATETIME,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_order_id) REFERENCES rental_orders(id),
      UNIQUE(rental_order_id)
    );

    CREATE TABLE IF NOT EXISTS damage_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_no TEXT UNIQUE NOT NULL,
      inspection_id INTEGER NOT NULL,
      claim_amount REAL NOT NULL,
      claim_reason TEXT,
      status TEXT DEFAULT 'pending',
      accountant TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id)
    );
  `);

  console.log('数据库初始化完成');
}

initDatabase();

module.exports = { db, initDatabase };
