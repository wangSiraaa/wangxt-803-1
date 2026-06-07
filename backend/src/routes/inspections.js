const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const { validateInspectionCreation } = require('../middleware/validation');

router.get('/', (req, res) => {
  try {
    const inspections = db.prepare('SELECT * FROM inspections ORDER BY created_at DESC').all();
    res.json({ success: true, data: inspections });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, error: '巡检记录不存在' });
    }
    const photos = db.prepare('SELECT * FROM inspection_photos WHERE inspection_id = ?').all(req.params.id);
    res.json({ success: true, data: { ...inspection, photos } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', validateInspectionCreation, (req, res) => {
  try {
    const { rental_order_id, device_id, inspector, inspect_time, has_damage, damage_description, status } = req.body;
    const result = db.prepare(
      'INSERT INTO inspections (rental_order_id, device_id, inspector, inspect_time, has_damage, damage_description, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      rental_order_id, 
      device_id, 
      inspector || null, 
      inspect_time || new Date().toISOString(), 
      has_damage || 0, 
      damage_description || null, 
      status || 'draft'
    );
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: inspection });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/photos', (req, res) => {
  try {
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, error: '巡检记录不存在' });
    }
    const { photo_url, photo_type } = req.body;
    const result = db.prepare(
      'INSERT INTO inspection_photos (inspection_id, photo_url, photo_type) VALUES (?, ?, ?)'
    ).run(req.params.id, photo_url, photo_type || null);
    const photo = db.prepare('SELECT * FROM inspection_photos WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: photo, message: '照片上传成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { inspector, inspect_time, has_damage, damage_description, status } = req.body;
    const result = db.prepare(
      'UPDATE inspections SET inspector = ?, inspect_time = ?, has_damage = ?, damage_description = ?, status = ? WHERE id = ?'
    ).run(
      inspector || null, 
      inspect_time || new Date().toISOString(), 
      has_damage || 0, 
      damage_description || null, 
      status || 'draft',
      req.params.id
    );
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '巡检记录不存在' });
    }
    const inspection = db.prepare('SELECT * FROM inspections WHERE id = ?').get(req.params.id);
    const photos = db.prepare('SELECT * FROM inspection_photos WHERE inspection_id = ?').all(req.params.id);
    res.json({ success: true, data: { ...inspection, photos } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
