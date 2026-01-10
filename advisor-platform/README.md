# Service Advisor Performance Platform - Enterprise Edition

**Production-ready full-stack application for automotive service advisor performance management**

## Features

### Core Platform
- ✅ **Multi-tenant architecture** with role-based access control
- ✅ **Time-series performance tracking** with historical data
- ✅ **Real-time commission calculations** with configurable pay plans
- ✅ **Automated PDF report generation** with batch processing
- ✅ **Scheduled email reports** with custom templates
- ✅ **Advanced analytics & predictive modeling**
- ✅ **RESTful API** with JWT authentication
- ✅ **PostgreSQL backend** with optimized queries
- ✅ **React SPA frontend** with modern UI/UX

### Advanced Features
- 📊 **Predictive Analytics**: ML-based forecasting for at-risk advisors
- 📈 **Cohort Analysis**: New vs veteran advisor performance tracking
- 🎯 **What-If Scenarios**: Model commission structure changes
- 📱 **Mobile-responsive** design ready for React Native
- 🔐 **SSO Integration** with SAML 2.0 and OAuth 2.0
- 📧 **Email Automation** via SendGrid/AWS SES
- 📄 **Automated CSV Import** from Reynolds & Reynolds DMS

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL 14+
- JWT authentication
- Nodemailer (email)
- PDFKit (PDF generation)
- Node-cron (scheduled tasks)

### Frontend
- React 18
- Vite (build tool)
- Chart.js (visualizations)
- Zustand (state management)
- React Query (data fetching)
- Axios (HTTP client)

## Quick Start

### Prerequisites
```bash
node >= 18.0.0
npm >= 9.0.0
postgresql >= 14.0
```

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd advisor-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up database
npm run migrate
npm run seed

# Start development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Quality checks

```bash
# Run unit tests
npm run test

# Lint the codebase
npm run lint

# Check formatting
npm run format
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/advisor_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=advisor_platform
DB_USER=your_user
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
SESSION_SECRET=your-session-secret

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdealership.com

# Email (AWS SES - alternative)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
SES_FROM_EMAIL=noreply@yourdealership.com

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# SSO (Optional)
SAML_ENTRY_POINT=https://your-idp.com/saml
SAML_ISSUER=advisor-platform
SAML_CERT=your-certificate

# Reynolds & Reynolds Integration
REYNOLDS_API_URL=https://api.reyrey.com
REYNOLDS_API_KEY=your-reynolds-api-key

# Scheduled Reports
REPORT_SCHEDULE_ENABLED=true
MONTHLY_REPORT_DAY=1
MONTHLY_REPORT_TIME=08:00
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL, -- 'admin', 'manager', 'advisor'
  advisor_id VARCHAR(50),
  dealership_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Performance Data Table
```sql
CREATE TABLE performance_data (
  id SERIAL PRIMARY KEY,
  advisor_id VARCHAR(50) NOT NULL,
  period VARCHAR(20) NOT NULL, -- '2024-12'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_sales DECIMAL(12,2),
  ro_count INTEGER,
  elr DECIMAL(8,2),
  op_count INTEGER,
  tech_hours DECIMAL(10,2),
  labor_sales DECIMAL(12,2),
  parts_sales DECIMAL(12,2),
  labor_avg DECIMAL(10,2),
  parts_avg DECIMAL(10,2),
  total_avg DECIMAL(10,2),
  tech_hours_avg DECIMAL(8,2),
  ops_per_ro DECIMAL(8,2),
  labor_mix DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(advisor_id, period)
);
```

### Commission Plans Table
```sql
CREATE TABLE commission_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  labor_rate DECIMAL(5,4), -- 0.0750 for 7.5%
  parts_rate DECIMAL(5,4),
  bonus_threshold DECIMAL(10,2),
  bonus_amount DECIMAL(10,2),
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Goals Table
```sql
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  dealership_id INTEGER,
  period VARCHAR(20),
  target_elr DECIMAL(8,2),
  target_ro_avg DECIMAL(10,2),
  target_ops_per_ro DECIMAL(8,2),
  target_labor_mix DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
```

### Performance Data
```
GET    /api/performance              # List all periods
GET    /api/performance/:period      # Get specific period
POST   /api/performance              # Upload new period data
PUT    /api/performance/:period      # Update period data
DELETE /api/performance/:period      # Delete period data
```

### Advisors
```
GET    /api/advisors                 # List all advisors
GET    /api/advisors/:id             # Get advisor details
GET    /api/advisors/:id/history     # Get advisor performance history
GET    /api/advisors/:id/trends      # Get advisor trends
```

### Reports
```
POST   /api/reports/pdf              # Generate PDF report
POST   /api/reports/email            # Send email report
POST   /api/reports/batch            # Batch generate PDFs
GET    /api/reports/scheduled        # Get scheduled reports config
POST   /api/reports/scheduled        # Update scheduled reports
```

### Analytics
```
GET    /api/analytics/overview       # Dashboard overview
GET    /api/analytics/trends         # Trend analysis
GET    /api/analytics/cohorts        # Cohort analysis
GET    /api/analytics/predictions    # Predictive analytics
POST   /api/analytics/whatif         # What-if scenarios
```

### Admin
```
GET    /api/admin/users              # List users
POST   /api/admin/users              # Create user
PUT    /api/admin/users/:id          # Update user
DELETE /api/admin/users/:id          # Delete user
GET    /api/admin/commission-plans   # List commission plans
POST   /api/admin/commission-plans   # Create plan
```

## Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

#### 1. Set up PostgreSQL
```bash
# Create database
createdb advisor_platform

# Run migrations
npm run migrate
```

#### 2. Build frontend
```bash
npm run build
```

#### 3. Start production server
```bash
NODE_ENV=production npm start
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name advisor.yourdealership.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security

### Authentication
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with configurable expiration
- Refresh token rotation
- Rate limiting on authentication endpoints

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Advisors can only see their own data
- Managers see team data
- Admins see everything

### Data Protection
- SQL injection prevention via parameterized queries
- XSS protection via input sanitization
- CSRF tokens for state-changing requests
- HTTPS enforcement in production
- Secure headers via Helmet.js

## Scheduled Tasks

### Monthly Reports
Automatically sends performance reports to all advisors on the 1st of each month.

```javascript
// Configured via environment variables
REPORT_SCHEDULE_ENABLED=true
MONTHLY_REPORT_DAY=1
MONTHLY_REPORT_TIME=08:00
```

### Data Import
Automatically imports CSV data from Reynolds & Reynolds DMS.

```javascript
// Runs daily at 2 AM
REYNOLDS_IMPORT_ENABLED=true
REYNOLDS_IMPORT_TIME=02:00
```

## Email Templates

Templates are located in `server/templates/email/`

- `monthly-report.html` - Monthly performance report
- `welcome.html` - New user welcome email
- `password-reset.html` - Password reset email
- `goal-achieved.html` - Goal achievement notification
- `performance-alert.html` - Underperformance alert

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

## Analytics & Predictions

### Cohort Analysis
Compares new advisors (< 6 months) vs veterans (6+ months) across key metrics.

### Predictive Models
Uses linear regression to predict:
- Next month's sales (based on historical trends)
- At-risk advisors (likely to underperform)
- Commission forecasting

### What-If Scenarios
Model the impact of:
- Commission rate changes
- Bonus threshold adjustments
- Goal modifications

## Reynolds & Reynolds Integration

### Automatic CSV Import
```javascript
// Configure in .env
REYNOLDS_API_URL=https://api.reyrey.com
REYNOLDS_API_KEY=your-api-key
REYNOLDS_IMPORT_SCHEDULE=0 2 * * * // Daily at 2 AM
```

### Manual Import
```bash
# Import via API
POST /api/import/reynolds
Content-Type: application/json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

## Mobile App (React Native)

Coming soon! The API is fully ready for mobile integration.

### Features
- Real-time performance tracking
- Push notifications for goals
- Quick stats dashboard
- Commission calculator
- Historical trends

## Support

For issues, questions, or feature requests:
- Email: support@yourdealership.com
- Internal Slack: #advisor-platform
- GitHub Issues: (if open source)

## License

Proprietary - Hendrick Toyota Merriam

## Credits

Built by the Service Operations team in partnership with Reynolds & Reynolds.
