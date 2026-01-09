# Production Deployment Guide

## Complete Service Advisor Performance Platform - Enterprise Edition

This guide covers deploying the full production system with:
- PostgreSQL backend
- Node.js/Express API
- React frontend
- Email automation (SendGrid/AWS SES)
- Scheduled reports
- Reynolds & Reynolds integration
- SSO authentication
- Mobile-ready API

---

## Pre-Deployment Checklist

### 1. Server Requirements

**Minimum Specifications:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 100GB SSD
- OS: Ubuntu 20.04 LTS or later

**Recommended Specifications:**
- CPU: 8 cores
- RAM: 16GB
- Storage: 500GB SSD
- OS: Ubuntu 22.04 LTS

### 2. Required Services

- [ ] PostgreSQL 14+ installed
- [ ] Node.js 18+ installed
- [ ] Nginx installed (for reverse proxy)
- [ ] SSL certificate (Let's Encrypt or commercial)
- [ ] SendGrid account OR AWS SES configured
- [ ] Domain name pointing to server
- [ ] Email DNS records (SPF, DKIM, DMARC)

### 3. Access Requirements

- [ ] Reynolds & Reynolds API credentials
- [ ] SMTP credentials (SendGrid or AWS SES)
- [ ] SSL certificate files
- [ ] SSH access to production server
- [ ] Database backup storage (S3, Azure Blob, etc.)

---

## Installation Steps

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git build-essential nginx postgresql postgresql-contrib

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x
psql --version  # Should be 14.x or higher
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE advisor_platform;
CREATE USER advisor_admin WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE advisor_platform TO advisor_admin;

# Exit psql
\q
```

### Step 3: Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/advisor-platform
sudo chown $USER:$USER /opt/advisor-platform

# Clone repository (or upload files)
cd /opt/advisor-platform
git clone <your-repo-url> .

# Install dependencies
npm install --production

# Create environment file
cp .env.example .env
nano .env  # Edit with your production values
```

### Step 4: Environment Configuration

Create `/opt/advisor-platform/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=advisor_platform
DB_USER=advisor_admin
DB_PASSWORD=your-secure-database-password

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://advisors.yourdealership.com

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=7d

# Email - SendGrid (Option 1)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdealership.com

# Email - AWS SES (Option 2)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# SES_FROM_EMAIL=noreply@yourdealership.com

# Reynolds & Reynolds
REYNOLDS_API_URL=https://api.reyrey.com
REYNOLDS_API_KEY=your-reynolds-api-key
REYNOLDS_IMPORT_ENABLED=true
REYNOLDS_IMPORT_TIME=02:00

# Scheduled Reports
REPORT_SCHEDULE_ENABLED=true
MONTHLY_REPORT_DAY=1
MONTHLY_REPORT_TIME=08:00

# SSO (Optional)
# SAML_ENTRY_POINT=https://your-idp.com/saml
# SAML_ISSUER=advisor-platform
# SAML_CERT=your-certificate-content
```

### Step 5: Database Migration

```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### Step 6: Build Frontend

```bash
# Build production bundle
npm run build

# Verify build
ls -la dist/  # Should see index.html and assets/
```

### Step 7: Nginx Configuration

Create `/etc/nginx/sites-available/advisor-platform`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name advisors.yourdealership.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name advisors.yourdealership.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/advisors.yourdealership.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/advisors.yourdealership.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/advisor-platform-access.log;
    error_log /var/log/nginx/advisor-platform-error.log;

    # Frontend (React SPA)
    location / {
        root /opt/advisor-platform/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /opt/advisor-platform/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/advisor-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d advisors.yourdealership.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 9: Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application
cd /opt/advisor-platform
pm2 start server/index.js --name advisor-platform

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions printed by PM2
```

### Step 10: Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Post-Deployment Configuration

### 1. Create Admin User

```bash
# Connect to database
psql -U advisor_admin -d advisor_platform

# Create admin user (password will be hashed on registration via API)
# Or use the API endpoint after deployment
```

Via API (from local machine):

```bash
curl -X POST https://advisors.yourdealership.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdealership.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 2. Upload Initial Data

```bash
# Using the web interface:
# 1. Login as admin
# 2. Go to Performance > Upload Data
# 3. Select CSV file
# 4. Enter period details
# 5. Upload

# Or via API:
curl -X POST https://advisors.yourdealership.com/api/performance/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@december_data.csv" \
  -F "period=2024-12" \
  -F "periodStart=2024-12-01" \
  -F "periodEnd=2024-12-31"
```

### 3. Configure Commission Plans

```bash
# Via web interface: Admin > Commission Plans
# Or via database:
psql -U advisor_admin -d advisor_platform

INSERT INTO commission_plans (
  name, labor_rate, parts_rate, bonus_threshold, bonus_amount,
  effective_from, is_active
) VALUES (
  'Standard Plan 2024',
  0.0750,  -- 7.5%
  0.0400,  -- 4%
  400.00,  -- Bonus threshold
  500.00,  -- Bonus amount
  '2024-01-01',
  true
);
```

### 4. Set Goals

```bash
# Via web interface: Admin > Goals
# Or via database:
INSERT INTO goals (
  period, target_elr, target_ro_avg, target_ops_per_ro, target_labor_mix
) VALUES (
  '2024-12', 115.00, 350.00, 4.50, 60.00
);
```

### 5. Configure Email Templates

Email templates are in `/opt/advisor-platform/server/templates/email/`

Edit these files to match your branding:
- `monthly-report.html`
- `goal-achieved.html`
- `performance-alert.html`
- `welcome.html`

### 6. Test Email Delivery

```bash
# Send test email
curl -X POST https://advisors.yourdealership.com/api/reports/email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "advisorId": "146327",
    "period": "2024-12",
    "email": "test@yourdealership.com"
  }'
```

---

## Monitoring and Maintenance

### Application Logs

```bash
# View PM2 logs
pm2 logs advisor-platform

# View last 100 lines
pm2 logs advisor-platform --lines 100

# View only errors
pm2 logs advisor-platform --err

# Nginx logs
sudo tail -f /var/log/nginx/advisor-platform-access.log
sudo tail -f /var/log/nginx/advisor-platform-error.log
```

### Database Backups

Create automated backup script `/opt/advisor-platform/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/advisor-platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

pg_dump -U advisor_admin -h localhost advisor_platform > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Make executable and add to cron:

```bash
chmod +x /opt/advisor-platform/scripts/backup-db.sh

# Add to crontab (daily at 3 AM)
crontab -e
# Add line:
0 3 * * * /opt/advisor-platform/scripts/backup-db.sh >> /var/log/advisor-platform-backup.log 2>&1
```

### Application Updates

```bash
# Pull latest code
cd /opt/advisor-platform
git pull

# Install new dependencies
npm install --production

# Run migrations if needed
npm run migrate

# Rebuild frontend
npm run build

# Restart application
pm2 restart advisor-platform

# Reload nginx if config changed
sudo nginx -t && sudo systemctl reload nginx
```

### Health Checks

```bash
# Application health
curl https://advisors.yourdealership.com/health

# Database connection
psql -U advisor_admin -d advisor_platform -c "SELECT COUNT(*) FROM users;"

# Disk space
df -h

# Memory usage
free -h

# PM2 status
pm2 status
```

---

## Security Best Practices

### 1. Database Security

```bash
# Create read-only user for reporting
CREATE USER advisor_readonly WITH PASSWORD 'readonly-password';
GRANT CONNECT ON DATABASE advisor_platform TO advisor_readonly;
GRANT USAGE ON SCHEMA public TO advisor_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO advisor_readonly;
```

### 2. Rate Limiting

Add to Nginx config:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... rest of config
}
```

### 3. Fail2Ban (Brute Force Protection)

```bash
sudo apt install -y fail2ban

# Create filter
sudo nano /etc/fail2ban/filter.d/advisor-platform.conf
```

Add:

```ini
[Definition]
failregex = .*"POST /api/auth/login.*" 401
ignoreregex =
```

Configure jail:

```bash
sudo nano /etc/fail2ban/jail.local
```

Add:

```ini
[advisor-platform]
enabled = true
port = http,https
filter = advisor-platform
logpath = /var/log/nginx/advisor-platform-access.log
maxretry = 5
bantime = 3600
```

Restart Fail2Ban:

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status advisor-platform
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs advisor-platform --err

# Check database connection
psql -U advisor_admin -d advisor_platform -c "SELECT 1"

# Check environment variables
pm2 show advisor-platform

# Restart application
pm2 restart advisor-platform
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
psql -U advisor_admin -h localhost -d advisor_platform
```

### Email Not Sending

```bash
# Check email logs
psql -U advisor_admin -d advisor_platform -c "SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;"

# Test SendGrid API key
curl -i -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@yourdealership.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test email"}]
  }'
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart application to clear memory
pm2 restart advisor-platform

# Increase swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Performance Optimization

### Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_perf_period_advisor ON performance_data(period, advisor_id);
CREATE INDEX idx_perf_total_sales ON performance_data(total_sales DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_advisor ON users(advisor_id);
```

### Database Connection Pooling

Already configured in `server/db/index.js` with 20 max connections.

### Frontend Caching

Nginx is configured to cache static assets for 1 year.

### API Response Caching

Consider adding Redis for API response caching:

```bash
npm install redis

# Update server code to use Redis for caching
```

---

## Scaling Considerations

### Horizontal Scaling

To handle more traffic:

1. Add load balancer (Nginx, HAProxy, AWS ALB)
2. Run multiple API instances
3. Share session storage via Redis
4. Use managed PostgreSQL (AWS RDS, Azure Database)

### Vertical Scaling

Increase server resources:
- CPU: More cores for concurrent requests
- RAM: Larger database cache
- Storage: Faster SSD for database

---

## Support and Maintenance

### Regular Maintenance Schedule

**Daily:**
- Monitor application logs
- Check error rates
- Verify scheduled tasks ran

**Weekly:**
- Review performance metrics
- Check disk space
- Update dependencies if needed

**Monthly:**
- Review security logs
- Update SSL certificates if needed
- Performance tuning
- Database optimization (VACUUM, ANALYZE)

**Quarterly:**
- Full security audit
- Load testing
- Disaster recovery drill

---

## Contact Information

For deployment issues or questions:
- Technical Support: tech@yourdealership.com
- After-Hours Emergency: 1-800-XXX-XXXX
- Internal Slack: #advisor-platform-support

---

## License

Proprietary - Hendrick Toyota Merriam
All rights reserved.
