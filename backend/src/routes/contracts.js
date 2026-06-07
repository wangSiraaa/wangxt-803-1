const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const { validateContractArchive } = require('../middleware/validation');

router.get('/', (req, res) => {
  try {
    const contracts = db.prepare('SELECT * FROM contracts ORDER BY created_at DESC').all();
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { contract_no, customer_name, project_name, start_date, end_date, status, total_amount } = req.body;
    const result = db.prepare(
      'INSERT INTO contracts (contract_no, customer_name, project_name, start_date, end_date, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(contract_no, customer_name, project_name || null, start_date || null, end_date || null, status || 'draft', total_amount || 0);
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { contract_no, customer_name, project_name, start_date, end_date, status, total_amount } = req.body;
    const result = db.prepare(
      'UPDATE contracts SET contract_no = ?, customer_name = ?, project_name = ?, start_date = ?, end_date = ?, status = ?, total_amount = ? WHERE id = ?'
    ).run(contract_no, customer_name, project_name || null, start_date || null, end_date || null, status || 'draft', total_amount || 0, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/archive', validateContractArchive, (req, res) => {
  try {
    const result = db.prepare('UPDATE contracts SET archived = 1, status = ? WHERE id = ?').run('archived', req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '合同不存在' });
    }
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: contract, message: '归档成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
