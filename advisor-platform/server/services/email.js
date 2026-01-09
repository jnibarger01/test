import nodemailer from 'nodemailer';
import { query } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';

// Configure email transporter
let transporter;

if (process.env.SENDGRID_API_KEY) {
  // SendGrid configuration
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
} else if (process.env.AWS_ACCESS_KEY_ID) {
  // AWS SES configuration
  transporter = nodemailer.createTransport({
    SES: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
} else {
  // Development: use ethereal email (fake SMTP)
  console.warn('⚠️  No email service configured, using test account');
  nodemailer.createTestAccount().then(testAccount => {
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  });
}

// Load email template
async function loadTemplate(templateName) {
  const templatePath = path.join(process.cwd(), 'server', 'templates', 'email', `${templateName}.html`);
  try {
    const template = await fs.readFile(templatePath, 'utf-8');
    return template;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return null;
  }
}

// Replace template variables
function replaceTemplateVars(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

// Send email
export async function sendEmail({ to, subject, templateName, templateVars, html, text }) {
  try {
    let emailHtml = html;
    let emailText = text;

    // Load template if specified
    if (templateName) {
      const template = await loadTemplate(templateName);
      if (template) {
        emailHtml = replaceTemplateVars(template, templateVars || {});
      }
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SES_FROM_EMAIL || 'noreply@dealership.com',
      to,
      subject,
      html: emailHtml,
      text: emailText
    };

    const info = await transporter.sendMail(mailOptions);

    // Log email
    await query(`
      INSERT INTO email_logs (recipient_email, subject, template_name, status, sent_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [to, subject, templateName, 'sent']);

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);

    // Log error
    await query(`
      INSERT INTO email_logs (recipient_email, subject, template_name, status, error_message, sent_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [to, subject, templateName, 'failed', error.message]);

    throw error;
  }
}

// Send monthly performance report
export async function sendMonthlyReport(advisorEmail, advisorData, period) {
  const subject = `Your Performance Report - ${period}`;
  
  const templateVars = {
    advisorName: advisorData.name.split(' ')[0],
    period,
    totalSales: formatCurrency(advisorData.totalSales),
    roCount: advisorData.roCount.toLocaleString(),
    elr: formatNumber(advisorData.elr),
    roAvg: formatCurrency(advisorData.totalAvg),
    opsPerRO: formatNumber(advisorData.opsPerRO),
    laborMix: formatNumber(advisorData.laborMix),
    laborComm: formatCurrency(advisorData.commission.laborComm),
    partsComm: formatCurrency(advisorData.commission.partsComm),
    bonus: formatCurrency(advisorData.commission.bonus),
    totalComm: formatCurrency(advisorData.commission.total),
    rank: advisorData.rank,
    percentile: Math.round(advisorData.percentile)
  };

  return sendEmail({
    to: advisorEmail,
    subject,
    templateName: 'monthly-report',
    templateVars
  });
}

// Send goal achievement notification
export async function sendGoalAchievement(advisorEmail, advisorName, metric, value, period) {
  const subject = `🎉 Goal Achieved: ${metric}`;
  
  const templateVars = {
    advisorName,
    metric,
    value,
    period
  };

  return sendEmail({
    to: advisorEmail,
    subject,
    templateName: 'goal-achieved',
    templateVars
  });
}

// Send performance alert (underperformance)
export async function sendPerformanceAlert(advisorEmail, advisorName, issues, period) {
  const subject = `Performance Alert - ${period}`;
  
  const templateVars = {
    advisorName,
    period,
    issues: issues.join(', ')
  };

  return sendEmail({
    to: advisorEmail,
    subject,
    templateName: 'performance-alert',
    templateVars
  });
}

// Helper functions
function formatCurrency(val) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default {
  sendEmail,
  sendMonthlyReport,
  sendGoalAchievement,
  sendPerformanceAlert
};
