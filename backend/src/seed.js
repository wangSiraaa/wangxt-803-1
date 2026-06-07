const { db } = require('./models/database');

function seedDatabase() {
  db.pragma('foreign_keys = OFF');

  const clearTables = db.transaction(() => {
    db.prepare('DELETE FROM damage_claims').run();
    db.prepare('DELETE FROM inspection_photos').run();
    db.prepare('DELETE FROM inspections').run();
    db.prepare('DELETE FROM rental_order_items').run();
    db.prepare('DELETE FROM rental_orders').run();
    db.prepare('DELETE FROM return_confirmations').run();
    db.prepare('DELETE FROM contracts').run();
    db.prepare('DELETE FROM devices').run();
  });

  clearTables();
  console.log('已清空所有表数据');

  db.pragma('foreign_keys = ON');

  const insertDevice = db.prepare(
    'INSERT INTO devices (code, name, type, model, status, daily_rate) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertContract = db.prepare(
    'INSERT INTO contracts (contract_no, customer_name, project_name, start_date, end_date, status, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertRentalOrder = db.prepare(
    'INSERT INTO rental_orders (order_no, contract_id, status, out_checked, out_operator, out_time) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertRentalOrderItem = db.prepare(
    'INSERT INTO rental_order_items (rental_order_id, device_id, out_checked, return_checked) VALUES (?, ?, ?, ?)'
  );
  const insertInspection = db.prepare(
    'INSERT INTO inspections (rental_order_id, device_id, inspector, inspect_time, has_damage, damage_description, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertInspectionPhoto = db.prepare(
    'INSERT INTO inspection_photos (inspection_id, photo_url, photo_type) VALUES (?, ?, ?)'
  );
  const insertDamageClaim = db.prepare(
    'INSERT INTO damage_claims (claim_no, inspection_id, claim_amount, claim_reason, status, accountant) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    const devices = [
      { code: 'DEV-001', name: '摇头灯', type: '灯具', model: 'MH-1000', status: 'available', daily_rate: 200 },
      { code: 'DEV-002', name: '摇头灯', type: '灯具', model: 'MH-1000', status: 'available', daily_rate: 200 },
      { code: 'DEV-003', name: '帕灯', type: '灯具', model: 'PAR-64', status: 'available', daily_rate: 80 },
      { code: 'DEV-004', name: '帕灯', type: '灯具', model: 'PAR-64', status: 'available', daily_rate: 80 },
      { code: 'DEV-005', name: '追光灯', type: '灯具', model: 'FS-2000', status: 'available', daily_rate: 300 },
      { code: 'DEV-006', name: '灯光控台', type: '控台', model: 'MA2', status: 'available', daily_rate: 500 },
      { code: 'DEV-007', name: '调光台', type: '控台', model: 'DMX-512', status: 'available', daily_rate: 350 },
      { code: 'DEV-008', name: 'DMX信号线', type: '线缆', model: '5米', status: 'available', daily_rate: 10 },
      { code: 'DEV-009', name: 'DMX信号线', type: '线缆', model: '10米', status: 'available', daily_rate: 15 },
      { code: 'DEV-010', name: '电源线', type: '线缆', model: '16A', status: 'available', daily_rate: 20 }
    ];

    const deviceIds = [];
    for (const device of devices) {
      const result = insertDevice.run(
        device.code, device.name, device.type, device.model, device.status, device.daily_rate
      );
      deviceIds.push(result.lastInsertRowid);
    }

    const contracts = [
      {
        contract_no: 'HT-2024-001',
        customer_name: '星空传媒有限公司',
        project_name: '2024春季演唱会',
        start_date: '2024-03-15',
        end_date: '2024-03-20',
        status: 'active',
        total_amount: 25000
      },
      {
        contract_no: 'HT-2024-002',
        customer_name: '创新科技集团',
        project_name: '企业年会',
        start_date: '2024-04-10',
        end_date: '2024-04-12',
        status: 'draft',
        total_amount: 8000
      }
    ];

    const contractIds = [];
    for (const contract of contracts) {
      const result = insertContract.run(
        contract.contract_no, contract.customer_name, contract.project_name,
        contract.start_date, contract.end_date, contract.status, contract.total_amount
      );
      contractIds.push(result.lastInsertRowid);
    }

    const now = new Date().toISOString();
    const rentalOrders = [
      {
        order_no: 'ZL-2024-001',
        contract_id: contractIds[0],
        status: 'out',
        out_checked: 1,
        out_operator: '张师傅',
        out_time: now,
        items: [
          { device_id: deviceIds[0], out_checked: 1, return_checked: 0 },
          { device_id: deviceIds[2], out_checked: 1, return_checked: 0 },
          { device_id: deviceIds[5], out_checked: 1, return_checked: 0 }
        ]
      },
      {
        order_no: 'ZL-2024-002',
        contract_id: contractIds[0],
        status: 'pending',
        out_checked: 0,
        out_operator: null,
        out_time: null,
        items: [
          { device_id: deviceIds[1], out_checked: 0, return_checked: 0 },
          { device_id: deviceIds[3], out_checked: 0, return_checked: 0 }
        ]
      },
      {
        order_no: 'ZL-2024-003',
        contract_id: contractIds[1],
        status: 'draft',
        out_checked: 0,
        out_operator: null,
        out_time: null,
        items: [
          { device_id: deviceIds[4], out_checked: 0, return_checked: 0 }
        ]
      }
    ];

    const rentalOrderIds = [];
    for (const order of rentalOrders) {
      const result = insertRentalOrder.run(
        order.order_no, order.contract_id, order.status,
        order.out_checked, order.out_operator, order.out_time
      );
      const orderId = result.lastInsertRowid;
      rentalOrderIds.push(orderId);
      
      for (const item of order.items) {
        insertRentalOrderItem.run(orderId, item.device_id, item.out_checked, item.return_checked);
      }
    }

    const inspections = [
      {
        rental_order_id: rentalOrderIds[0],
        device_id: deviceIds[0],
        inspector: '李巡检',
        inspect_time: now,
        has_damage: 1,
        damage_description: '灯头外壳有划痕，灯罩轻微破损',
        status: 'confirmed',
        photos: [
          { photo_url: '/uploads/inspections/damage_001.jpg', photo_type: 'damage' }
        ]
      },
      {
        rental_order_id: rentalOrderIds[0],
        device_id: deviceIds[2],
        inspector: '李巡检',
        inspect_time: now,
        has_damage: 0,
        damage_description: null,
        status: 'confirmed',
        photos: []
      }
    ];

    const inspectionIds = [];
    for (const inspection of inspections) {
      const result = insertInspection.run(
        inspection.rental_order_id, inspection.device_id, inspection.inspector,
        inspection.inspect_time, inspection.has_damage, inspection.damage_description,
        inspection.status
      );
      const inspectionId = result.lastInsertRowid;
      inspectionIds.push(inspectionId);
      
      for (const photo of inspection.photos) {
        insertInspectionPhoto.run(inspectionId, photo.photo_url, photo.photo_type);
      }
    }

    const damageClaims = [
      {
        claim_no: 'PK-2024-001',
        inspection_id: inspectionIds[0],
        claim_amount: 500,
        claim_reason: '摇头灯外壳划痕及灯罩破损维修费',
        status: 'pending',
        accountant: null
      }
    ];

    for (const claim of damageClaims) {
      insertDamageClaim.run(
        claim.claim_no, claim.inspection_id, claim.claim_amount,
        claim.claim_reason, claim.status, claim.accountant
      );
    }
  });

  transaction();
  console.log('种子数据插入完成');
}

seedDatabase();
