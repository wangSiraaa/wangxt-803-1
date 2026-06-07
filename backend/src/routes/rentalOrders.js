const express = require('express');
const router = express.Router();
const { db } = require('../models/database');

router.get('/', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM rental_orders ORDER BY created_at DESC').all();
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: '租赁单不存在' });
    }
    const items = db.prepare(
      'SELECT roi.*, d.code, d.name, d.type FROM rental_order_items roi JOIN devices d ON roi.device_id = d.id WHERE roi.rental_order_id = ?'
    ).all(req.params.id);
    const confirmation = db.prepare('SELECT * FROM return_confirmations WHERE rental_order_id = ?').get(req.params.id);
    res.json({ success: true, data: { ...order, items, return_confirmation: confirmation || null } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { order_no, contract_id, status, items } = req.body;
    const result = db.prepare(
      'INSERT INTO rental_orders (order_no, contract_id, status) VALUES (?, ?, ?)'
    ).run(order_no, contract_id || null, status || 'pending');
    
    const orderId = result.lastInsertRowid;
    if (items && items.length > 0) {
      const insertItem = db.prepare(
        'INSERT INTO rental_order_items (rental_order_id, device_id) VALUES (?, ?)'
      );
      for (const item of items) {
        insertItem.run(orderId, item.device_id);
      }
    }
    
    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM rental_order_items WHERE rental_order_id = ?').all(orderId);
    res.json({ success: true, data: { ...order, items: orderItems } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { order_no, contract_id, status, items } = req.body;
    const result = db.prepare(
      'UPDATE rental_orders SET order_no = ?, contract_id = ?, status = ? WHERE id = ?'
    ).run(order_no, contract_id || null, status || 'pending', req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '租赁单不存在' });
    }
    
    if (items) {
      db.prepare('DELETE FROM rental_order_items WHERE rental_order_id = ?').run(req.params.id);
      const insertItem = db.prepare(
        'INSERT INTO rental_order_items (rental_order_id, device_id) VALUES (?, ?)'
      );
      for (const item of items) {
        insertItem.run(req.params.id, item.device_id);
      }
    }
    
    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(req.params.id);
    const orderItems = db.prepare('SELECT * FROM rental_order_items WHERE rental_order_id = ?').all(req.params.id);
    res.json({ success: true, data: { ...order, items: orderItems } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/checkout', (req, res) => {
  try {
    const { out_operator, item_ids } = req.body;
    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: '租赁单不存在' });
    }
    
    const now = new Date().toISOString();
    if (item_ids && item_ids.length > 0) {
      const updateItem = db.prepare('UPDATE rental_order_items SET out_checked = 1 WHERE id = ?');
      for (const itemId of item_ids) {
        updateItem.run(itemId);
      }
    } else {
      db.prepare('UPDATE rental_order_items SET out_checked = 1 WHERE rental_order_id = ?').run(req.params.id);
    }
    
    db.prepare(
      'UPDATE rental_orders SET out_checked = 1, out_operator = ?, out_time = ?, status = ? WHERE id = ?'
    ).run(out_operator || null, now, 'out', req.params.id);
    
    const updatedOrder = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(req.params.id);
    const items = db.prepare('SELECT * FROM rental_order_items WHERE rental_order_id = ?').all(req.params.id);
    res.json({ success: true, data: { ...updatedOrder, items }, message: '出库确认成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/confirm-return', (req, res) => {
  try {
    const { customer_manager, remark } = req.body;
    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: '租赁单不存在' });
    }
    
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM return_confirmations WHERE rental_order_id = ?').get(req.params.id);
    
    if (existing) {
      db.prepare(
        'UPDATE return_confirmations SET customer_manager = ?, confirm_time = ?, remark = ? WHERE rental_order_id = ?'
      ).run(customer_manager || null, now, remark || null, req.params.id);
    } else {
      db.prepare(
        'INSERT INTO return_confirmations (rental_order_id, customer_manager, confirm_time, remark) VALUES (?, ?, ?, ?)'
      ).run(req.params.id, customer_manager || null, now, remark || null);
    }
    
    db.prepare(
      'UPDATE rental_order_items SET return_checked = 1 WHERE rental_order_id = ?'
    ).run(req.params.id);
    
    db.prepare(
      'UPDATE rental_orders SET return_operator = ?, return_time = ?, status = ? WHERE id = ?'
    ).run(customer_manager || null, now, 'returned', req.params.id);
    
    const confirmation = db.prepare('SELECT * FROM return_confirmations WHERE rental_order_id = ?').get(req.params.id);
    const updatedOrder = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(req.params.id);
    const items = db.prepare('SELECT * FROM rental_order_items WHERE rental_order_id = ?').all(req.params.id);
    
    res.json({ 
      success: true, 
      data: { ...updatedOrder, items, return_confirmation: confirmation }, 
      message: '客户确认归还成功' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
