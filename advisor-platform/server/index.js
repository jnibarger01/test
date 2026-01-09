import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import performanceRoutes from './routes/performance.js';
import advisorRoutes from './routes/advisors.js';
import reportRoutes from './routes/reports.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { scheduleMonthlyReports } from './services/scheduler.js';
import { importReynoldsData } from './services/reynolds.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/advisors', advisorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorHandler);

// Scheduled tasks
if (process.env.REPORT_SCHEDULE_ENABLED === 'true') {
  // Monthly reports on 1st of month at 8 AM
  const reportDay = process.env.MONTHLY_REPORT_DAY || '1';
  const reportTime = process.env.MONTHLY_REPORT_TIME || '08:00';
  const [hour, minute] = reportTime.split(':');
  
  cron.schedule(`${minute} ${hour} ${reportDay} * *`, () => {
    console.log('Running scheduled monthly reports...');
    scheduleMonthlyReports();
  });
}

// Reynolds data import (daily at 2 AM)
if (process.env.REYNOLDS_IMPORT_ENABLED === 'true') {
  cron.schedule('0 2 * * *', () => {
    console.log('Running Reynolds data import...');
    importReynoldsData();
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
});

export default app;
