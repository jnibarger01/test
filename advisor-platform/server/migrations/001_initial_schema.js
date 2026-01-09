import { query } from '../db/index.js';

export async function up() {
  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'advisor')),
      advisor_id VARCHAR(50),
      dealership_id INTEGER,
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Performance data table
  await query(`
    CREATE TABLE IF NOT EXISTS performance_data (
      id SERIAL PRIMARY KEY,
      advisor_id VARCHAR(50) NOT NULL,
      period VARCHAR(20) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      total_sales DECIMAL(12,2) DEFAULT 0,
      ro_count INTEGER DEFAULT 0,
      elr DECIMAL(8,2) DEFAULT 0,
      op_count INTEGER DEFAULT 0,
      tech_hours DECIMAL(10,2) DEFAULT 0,
      labor_sales DECIMAL(12,2) DEFAULT 0,
      parts_sales DECIMAL(12,2) DEFAULT 0,
      labor_avg DECIMAL(10,2) DEFAULT 0,
      parts_avg DECIMAL(10,2) DEFAULT 0,
      total_avg DECIMAL(10,2) DEFAULT 0,
      tech_hours_avg DECIMAL(8,2) DEFAULT 0,
      ops_per_ro DECIMAL(8,2) DEFAULT 0,
      labor_mix DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(advisor_id, period)
    );
  `);

  // Create index on period for faster queries
  await query(`
    CREATE INDEX IF NOT EXISTS idx_performance_period 
    ON performance_data(period);
  `);

  // Create index on advisor_id for faster queries
  await query(`
    CREATE INDEX IF NOT EXISTS idx_performance_advisor 
    ON performance_data(advisor_id);
  `);

  // Commission plans table
  await query(`
    CREATE TABLE IF NOT EXISTS commission_plans (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      labor_rate DECIMAL(5,4) DEFAULT 0.0750,
      parts_rate DECIMAL(5,4) DEFAULT 0.0400,
      bonus_threshold DECIMAL(10,2) DEFAULT 400.00,
      bonus_amount DECIMAL(10,2) DEFAULT 500.00,
      effective_from DATE,
      effective_to DATE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Goals table
  await query(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      dealership_id INTEGER,
      period VARCHAR(20),
      target_elr DECIMAL(8,2) DEFAULT 115.00,
      target_ro_avg DECIMAL(10,2) DEFAULT 350.00,
      target_ops_per_ro DECIMAL(8,2) DEFAULT 4.50,
      target_labor_mix DECIMAL(5,2) DEFAULT 60.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Email logs table
  await query(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id SERIAL PRIMARY KEY,
      recipient_email VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      template_name VARCHAR(100),
      status VARCHAR(50),
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Report generation logs
  await query(`
    CREATE TABLE IF NOT EXISTS report_logs (
      id SERIAL PRIMARY KEY,
      report_type VARCHAR(100),
      advisor_id VARCHAR(50),
      period VARCHAR(20),
      file_path VARCHAR(500),
      status VARCHAR(50),
      generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Scheduled reports configuration
  await query(`
    CREATE TABLE IF NOT EXISTS scheduled_reports (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      report_type VARCHAR(100) NOT NULL,
      schedule_cron VARCHAR(100),
      recipient_emails TEXT[],
      is_active BOOLEAN DEFAULT true,
      last_run TIMESTAMP,
      next_run TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Advisor metadata (extended info)
  await query(`
    CREATE TABLE IF NOT EXISTS advisor_metadata (
      id SERIAL PRIMARY KEY,
      advisor_id VARCHAR(50) UNIQUE NOT NULL,
      hire_date DATE,
      termination_date DATE,
      email VARCHAR(255),
      phone VARCHAR(50),
      manager_id VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ All tables created successfully');
}

export async function down() {
  const tables = [
    'email_logs',
    'report_logs',
    'scheduled_reports',
    'advisor_metadata',
    'goals',
    'commission_plans',
    'performance_data',
    'users'
  ];

  for (const table of tables) {
    await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
  }

  console.log('✅ All tables dropped successfully');
}

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
