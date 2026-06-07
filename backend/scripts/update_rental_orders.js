const fs = require('fs');

const content = `const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const { validateReshootSubmit, validateReshootReview } = require('../middleware/validation');

router.get('/', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM rental_orders ORDER BY created_at DESC').all();
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reshoot/todo', (req, res) => {
  try {
    const orders = db.prepare(\`
      SELECT ro.*, c.contract_no, c.customer_name, c.project_name
      FROM rental_orders ro
      LEFT JOIN contracts c ON ro.contract_id = c.id
      WHERE ro.reshoot_status = 'pending'
      ORDER BY ro.reshoot_submit_time DESC
    \`).all();
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
    const reshootInspections = db.prepare(\`
      SELECT i.*
      FROM inspections i
      WHERE i.rental_order_id = ? AND i.is_reshoot = 1
      ORDER BY i.created_at DESC
    \`).all(req.params.id);
    res.json({ 
      success: true, 
      data: { 
        ...order, 
        items, 
        return_confirmation: confirmation || null,
        reshoot_inspections: reshootInspections
      } 
    });
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

router.post('/:id/reshoot-submit', validateReshootSubmit, (req, res) => {
  try {
    const { remark, submitter, inspection_ids } = req.body;
    const now = new Date().toISOString();
    const orderId = req.params.id;

    const updateOrder = db.prepare(\`
      UPDATE rental_orders 
      SET reshoot_status = 'pending', 
          reshoot_remark = ?, 
          reshoot_submit_time = ?, 
          reshoot_submitter = ?
      WHERE id = ?
    \`);
    updateOrder.run(remark || null, now, submitter || '技师', orderId);

    if (inspection_ids && inspection_ids.length > 0) {
      const updateInspection = db.prepare('UPDATE inspections SET is_reshoot = 1 WHERE id = ?');
      for (const inspId of inspection_ids) {
        updateInspection.run(inspId);
      }
    }

    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(orderId);
    res.json({ 
      success: true, 
      data: order, 
      message: '补拍申请提交成功，待客户经理复核' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/reshoot-confirm', validateReshootReview, (req, res) => {
  try {
    const { reviewer } = req.body;
    const now = new Date().toISOString();
    const orderId = req.params.id;

    db.prepare(\`
      UPDATE rental_orders 
      SET reshoot_status = 'confirmed', 
          reshoot_review_time = ?, 
          reshoot_reviewer = ?
      WHERE id = ?
    \`).run(now, reviewer || '客户经理', orderId);

    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(orderId);
    res.json({ 
      success: true, 
      data: order, 
      message: '补拍申请已确认，财务可调整赔扣单' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/reshoot-reject', validateReshootReview, (req, res) => {
  try {
    const { reviewer, reject_reason } = req.body;
    const now = new Date().toISOString();
    const orderId = req.params.id;

    db.prepare(\`
      UPDATE rental_orders 
      SET reshoot_status = 'rejected', 
          reshoot_review_time = ?, 
          reshoot_reviewer = ?,
          reshoot_reject_reason = ?
      WHERE id = ?
    \`).run(now, reviewer || '客户经理', reject_reason || null, orderId);

    const order = db.prepare('SELECT * FROM rental_orders WHERE id = ?').get(orderId);
    res.json({ 
      success: true, 
      data: order, 
      message: '补拍申请已退回' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
`;

fs.writeFileSync('src/routes/rentalOrders.js', content);
console.log('rentalOrders.js updated successfully');
