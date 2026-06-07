const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const { validateDamageClaim } = require('../middleware/validation');

router.get('/', (req, res) => {
  try {
    const claims = db.prepare('SELECT * FROM damage_claims ORDER BY created_at DESC').all();
    res.json({ success: true, data: claims });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const claim = db.prepare('SELECT * FROM damage_claims WHERE id = ?').get(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: '赔扣单不存在' });
    }
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', validateDamageClaim, (req, res) => {
  try {
    const { claim_no, inspection_id, claim_amount, claim_reason, status, accountant } = req.body;
    const result = db.prepare(
      'INSERT INTO damage_claims (claim_no, inspection_id, claim_amount, claim_reason, status, accountant) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      claim_no, 
      inspection_id, 
      claim_amount, 
      claim_reason || null, 
      status || 'pending', 
      accountant || null
    );
    const claim = db.prepare('SELECT * FROM damage_claims WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { status, accountant } = req.body;
    const result = db.prepare(
      'UPDATE damage_claims SET status = ?, accountant = ? WHERE id = ?'
    ).run(status || 'pending', accountant || null, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '赔扣单不存在' });
    }
    const claim = db.prepare('SELECT * FROM damage_claims WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: claim });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
