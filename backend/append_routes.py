import os
filepath = "src/routes/rentalOrders.js"
content = """
router.post("/:id/reshoot-submit", validateReshootSubmit, (req, res) => {
  try {
    const { remark, submitter, inspection_ids } = req.body;
    const now = new Date().toISOString();
    const orderId = req.params.id;
    db.prepare("UPDATE rental_orders SET reshoot_status = pending, reshoot_remark = ?, reshoot_submit_time = ?, reshoot_submitter = ? WHERE id = ?").run(remark || null, now, submitter || "技师", orderId);
    if (inspection_ids && inspection_ids.length > 0) {
      const updateInspection = db.prepare("UPDATE inspections SET is_reshoot = 1 WHERE id = ?");
      for (const inspId of inspection_ids) {
        updateInspection.run(inspId);
      }
    }
    const order = db.prepare("SELECT * FROM rental_orders WHERE id = ?").get(orderId);
    res.json({ success: true, data: order, message: "补拍申请提交成功，待客户经理复核" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
"""
with open(filepath, "a") as f:
    f.write(content)
print("appended")
