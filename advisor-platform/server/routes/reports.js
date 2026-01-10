import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  res.status(501).json({ error: 'Reports endpoint not implemented' });
});

export default router;
