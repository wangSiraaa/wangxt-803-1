const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

router.get('/', (req, res) => {
  try {
    const devices = db.prepare('SELECT * FROM devices ORDER BY created_at DESC').all();
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, error: '设备不存在' });
    }
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { code, name, type, model, status, daily_rate } = req.body;
    const result = db.prepare(
      'INSERT INTO devices (code, name, type, model, status, daily_rate) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(code, name, type, model || null, status || 'available', daily_rate || 0);
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { code, name, type, model, status, daily_rate } = req.body;
    const result = db.prepare(
      'UPDATE devices SET code = ?, name = ?, type = ?, model = ?, status = ?, daily_rate = ? WHERE id = ?'
    ).run(code, name, type, model || null, status || 'available', daily_rate || 0, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '设备不存在' });
    }
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '设备不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
