import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { query } from '../db/index.js';

// Calculate commission
function calculateCommission(advisor, rates = null) {
  const defaultRates = {
    laborRate: 0.075,
    partsRate: 0.04,
    bonusThreshold: 400,
    bonusAmount: 500
  };

  const r = rates || defaultRates;
  const laborComm = advisor.labor_sales * r.laborRate;
  const partsComm = advisor.parts_sales * r.partsRate;
  const bonus = advisor.total_avg >= r.bonusThreshold ? r.bonusAmount : 0;

  return {
    laborComm,
    partsComm,
    bonus,
    total: laborComm + partsComm + bonus
  };
}

// Generate PDF report for a single advisor
export async function generateAdvisorReport(advisorId, period, outputPath) {
  // Get advisor data
  const advisorData = await query(`
    SELECT * FROM performance_data
    WHERE advisor_id = $1 AND period = $2
  `, [advisorId, period]);

  if (advisorData.rows.length === 0) {
    throw new Error(`No data found for advisor ${advisorId} in period ${period}`);
  }

  const advisor = advisorData.rows[0];

  // Get commission plan
  const planResult = await query(`
    SELECT * FROM commission_plans
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const plan = planResult.rows[0];
  const commission = calculateCommission(advisor, plan);

  // Get rankings
  const rankingResult = await query(`
    WITH ranked AS (
      SELECT 
        advisor_id,
        RANK() OVER (ORDER BY total_sales DESC) as sales_rank,
        RANK() OVER (ORDER BY elr DESC) as elr_rank,
        RANK() OVER (ORDER BY total_avg DESC) as ro_avg_rank,
        COUNT(*) OVER () as total_advisors
      FROM performance_data
      WHERE period = $1 AND ro_count >= 500
    )
    SELECT * FROM ranked WHERE advisor_id = $2
  `, [period, advisorId]);

  const ranking = rankingResult.rows[0] || { 
    sales_rank: 0, 
    elr_rank: 0, 
    ro_avg_rank: 0, 
    total_advisors: 0 
  };

  // Create PDF
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Header
  doc.fontSize(24)
     .fillColor('#CC0000')
     .text('Service Advisor Performance Report', { align: 'center' });

  doc.moveDown(0.5);
  doc.fontSize(12)
     .fillColor('#666666')
     .text(`Advisor ID: ${advisorId}`, { align: 'center' })
     .text(`Period: ${period}`, { align: 'center' })
     .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

  doc.moveDown(2);

  // Key Metrics Section
  doc.fontSize(16)
     .fillColor('#000000')
     .text('Key Performance Metrics');

  doc.moveDown(1);

  const metrics = [
    { label: 'Total Sales', value: formatCurrency(advisor.total_sales) },
    { label: 'RO Count', value: advisor.ro_count.toLocaleString() },
    { label: 'Effective Labor Rate', value: `$${formatNumber(advisor.elr)}` },
    { label: 'RO Average', value: formatCurrency(advisor.total_avg) },
    { label: 'Operations/RO', value: formatNumber(advisor.ops_per_ro) },
    { label: 'Labor Mix', value: `${formatNumber(advisor.labor_mix)}%` },
    { label: 'Tech Hours/RO', value: formatNumber(advisor.tech_hours_avg) },
  ];

  doc.fontSize(11);
  metrics.forEach(metric => {
    doc.fillColor('#333333')
       .text(`${metric.label}: `, { continued: true })
       .fillColor('#000000')
       .text(metric.value);
  });

  doc.moveDown(2);

  // Commission Section
  doc.fontSize(16)
     .fillColor('#000000')
     .text('Commission Breakdown');

  doc.moveDown(1);

  doc.fontSize(11)
     .fillColor('#333333');

  doc.text(`Labor Commission (${(plan.labor_rate * 100).toFixed(2)}%): `, { continued: true })
     .fillColor('#000000')
     .text(formatCurrency(commission.laborComm));

  doc.fillColor('#333333')
     .text(`Parts Commission (${(plan.parts_rate * 100).toFixed(2)}%): `, { continued: true })
     .fillColor('#000000')
     .text(formatCurrency(commission.partsComm));

  doc.fillColor('#333333')
     .text('Performance Bonus: ', { continued: true })
     .fillColor('#000000')
     .text(formatCurrency(commission.bonus));

  doc.moveDown(0.5);

  doc.fontSize(14)
     .fillColor('#CC0000')
     .text('Total Commission: ', { continued: true })
     .text(formatCurrency(commission.total));

  doc.moveDown(2);

  // Rankings Section
  doc.fontSize(16)
     .fillColor('#000000')
     .text('Performance Rankings');

  doc.moveDown(1);

  doc.fontSize(11)
     .fillColor('#333333');

  const percentile = ((ranking.total_advisors - ranking.sales_rank + 1) / ranking.total_advisors) * 100;

  doc.text(`Total Sales Rank: `, { continued: true })
     .fillColor('#000000')
     .text(`#${ranking.sales_rank} of ${ranking.total_advisors} (${Math.round(percentile)}th percentile)`);

  doc.fillColor('#333333')
     .text(`ELR Rank: `, { continued: true })
     .fillColor('#000000')
     .text(`#${ranking.elr_rank} of ${ranking.total_advisors}`);

  doc.fillColor('#333333')
     .text(`RO Average Rank: `, { continued: true })
     .fillColor('#000000')
     .text(`#${ranking.ro_avg_rank} of ${ranking.total_advisors}`);

  // Footer
  doc.moveDown(4);
  doc.fontSize(9)
     .fillColor('#999999')
     .text('Hendrick Toyota Merriam • Service Operations', { align: 'center' })
     .text('This report is confidential and intended for the addressee only', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      // Log report generation
      query(`
        INSERT INTO report_logs (report_type, advisor_id, period, file_path, status)
        VALUES ($1, $2, $3, $4, $5)
      `, ['advisor_performance', advisorId, period, outputPath, 'completed']);

      resolve(outputPath);
    });
    stream.on('error', reject);
  });
}

// Generate batch reports for all active advisors
export async function generateBatchReports(period, outputDir) {
  // Get all active advisors for the period
  const result = await query(`
    SELECT advisor_id FROM performance_data
    WHERE period = $1 AND ro_count >= 500
  `, [period]);

  const advisorIds = result.rows.map(row => row.advisor_id);
  const reports = [];

  for (const advisorId of advisorIds) {
    const filename = `${advisorId}_${period}_report.pdf`;
    const outputPath = path.join(outputDir, filename);

    try {
      await generateAdvisorReport(advisorId, period, outputPath);
      reports.push({ advisorId, path: outputPath, status: 'success' });
    } catch (error) {
      console.error(`Failed to generate report for ${advisorId}:`, error);
      reports.push({ advisorId, error: error.message, status: 'failed' });
    }
  }

  return reports;
}

// Helper functions
function formatCurrency(val) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default {
  generateAdvisorReport,
  generateBatchReports
};
