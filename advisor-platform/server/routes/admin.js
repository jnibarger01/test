import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.status(501).json({ error: 'Admin endpoint not implemented' });
});

export default router;
