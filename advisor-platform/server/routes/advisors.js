import express from 'express';
import { authenticateToken, authorizeAdvisorData } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  res.status(501).json({ error: 'Advisors endpoint not implemented' });
});

router.get('/:advisorId', authenticateToken, authorizeAdvisorData, (req, res) => {
  res.status(501).json({ error: 'Advisor detail endpoint not implemented' });
});

export default router;
