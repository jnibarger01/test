import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { query, getMany, transaction } from '../db/index.js';
import { parseNumber, parseInteger } from '../utils/numberParsing.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all periods
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const periods = await query(`
      SELECT DISTINCT period, period_start, period_end, COUNT(*) as advisor_count
      FROM performance_data
      GROUP BY period, period_start, period_end
      ORDER BY period DESC
    `);

    res.json(periods.rows);
  } catch (error) {
    next(error);
  }
});

// Get specific period data
router.get('/:period', authenticateToken, async (req, res, next) => {
  try {
    const { period } = req.params;

    const data = await getMany(
      'SELECT * FROM performance_data WHERE period = $1 ORDER BY total_sales DESC',
      [period]
    );

    if (data.length === 0) {
      return res.status(404).json({ error: 'Period not found' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Upload CSV and parse performance data
router.post('/upload', authenticateToken, authorizeRoles('admin', 'manager'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { period, periodStart, periodEnd } = req.body;

    if (!period || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Period, periodStart, and periodEnd are required' });
    }

    // Parse CSV
    const csvData = req.file.buffer.toString('utf-8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Transform and insert data
    const inserted = await transaction(async (client) => {
      const results = [];

      for (const record of records) {
        // Skip invalid rows
        if (!record['Advisor Name'] || record['Advisor Name'] === 'XTIME ADVISOR') {
          continue;
        }

        const advisorId = record['Advisor'];

        const totalSales = parseNumber(record['Labor & Parts']);
        const roCount = parseInteger(record['Repair Order Count']);
        const elr = parseNumber(record['Effective Labor Rate']);
        const opCount = parseInteger(record['Operation Count']);
        const techHours = parseNumber(record['Tech Hours']);
        const laborSales = parseNumber(record['Labor Sales']);
        const partsSales = parseNumber(record['Parts Sales']);
        const laborAvg = parseNumber(record['Labor Sale Average']);
        const partsAvg = parseNumber(record['Parts Sales Average']);
        const totalAvg = parseNumber(record['Labor & Parts Average']);
        const techHoursAvg = parseNumber(record['Tech Hours Average']);

        // Calculate derived metrics
        const opsPerRO = roCount > 0 ? opCount / roCount : 0;
        const laborMix = totalSales > 0 ? (laborSales / totalSales) * 100 : 0;

        // Insert or update
        const result = await client.query(`
          INSERT INTO performance_data (
            advisor_id, period, period_start, period_end,
            total_sales, ro_count, elr, op_count, tech_hours,
            labor_sales, parts_sales, labor_avg, parts_avg,
            total_avg, tech_hours_avg, ops_per_ro, labor_mix
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (advisor_id, period)
          DO UPDATE SET
            total_sales = EXCLUDED.total_sales,
            ro_count = EXCLUDED.ro_count,
            elr = EXCLUDED.elr,
            op_count = EXCLUDED.op_count,
            tech_hours = EXCLUDED.tech_hours,
            labor_sales = EXCLUDED.labor_sales,
            parts_sales = EXCLUDED.parts_sales,
            labor_avg = EXCLUDED.labor_avg,
            parts_avg = EXCLUDED.parts_avg,
            total_avg = EXCLUDED.total_avg,
            tech_hours_avg = EXCLUDED.tech_hours_avg,
            ops_per_ro = EXCLUDED.ops_per_ro,
            labor_mix = EXCLUDED.labor_mix
          RETURNING *
        `, [
          advisorId, period, periodStart, periodEnd,
          totalSales, roCount, elr, opCount, techHours,
          laborSales, partsSales, laborAvg, partsAvg,
          totalAvg, techHoursAvg, opsPerRO, laborMix
        ]);

        results.push(result.rows[0]);
      }

      return results;
    });

    res.json({
      message: 'Data uploaded successfully',
      period,
      recordsProcessed: inserted.length
    });
  } catch (error) {
    next(error);
  }
});

// Delete period
router.delete('/:period', authenticateToken, authorizeRoles('admin'), async (req, res, next) => {
  try {
    const { period } = req.params;

    const result = await query(
      'DELETE FROM performance_data WHERE period = $1 RETURNING period',
      [period]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Period not found' });
    }

    res.json({ message: 'Period deleted successfully', period });
  } catch (error) {
    next(error);
  }
});

export default router;
