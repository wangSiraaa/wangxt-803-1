
const { db } = require('../models/database');

function validateInspectionCreation(req, res, next) {
  const { rental_order_id, device_id } = req.body;
  const orderItem = db.prepare(
    "SELECT roi.*, ro.status as order_status FROM rental_order_items roi JOIN rental_orders ro ON roi.rental_order_id = ro.id WHERE roi.rental_order_id = ? AND roi.device_id = ?"
  ).get(rental_order_id, device_id);
  if (!orderItem || orderItem.out_checked !== 1) {
    return res.status(400).json({ error: '未完成出库的设备不能生成巡检任务' });
  }
  next();
}

function validateDamageClaim(req, res, next) {
  const { inspection_id } = req.body;
  if (!inspection_id) return res.status(400).json({ error: '必须关联巡检记录' });
  const photos = db.prepare("SELECT COUNT(*) as count FROM inspection_photos WHERE inspection_id = ?").get(inspection_id);
  if (photos.count === 0) return res.status(400).json({ error: '无损坏照片不得录入赔扣金额' });
  const inspection = db.prepare("SELECT * FROM inspections WHERE id = ?").get(inspection_id);
  if (!inspection || inspection.has_damage !== 1) return res.status(400).json({ error: '该巡检记录未标注损坏' });
  next();
}

function validateContractArchive(req, res, next) {
  const { id } = req.params;
  const contract = db.prepare("SELECT * FROM contracts WHERE id = ?").get(id);
  if (!contract) return res.status(404).json({ error: '合同不存在' });
  const orders = db.prepare("SELECT ro.* FROM rental_orders ro WHERE ro.contract_id = ?").all(id);
  for (const order of orders) {
    const confirmation = db.prepare("SELECT * FROM return_confirmations WHERE rental_order_id = ?").get(order.id);
    if (!confirmation) return res.status(400).json({ error: '客户未确认归还前禁止归档合同' });
  }
  next();
}

module.exports = { validateInspectionCreation, validateDamageClaim, validateContractArchive };
