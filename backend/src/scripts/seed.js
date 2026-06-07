const { v4: uuidv4 } = require('uuid');
const { db, initDatabase } = require('../models/database');

initDatabase();

const devices = [
  { id: uuidv4(), code: 'LT-001', name: '摇头灯-230W', type: 'lighting', spec: '230W 摇头光束灯', status: 'available', location: 'A仓库-1区' },
  { id: uuidv4(), code: 'LT-002', name: '帕灯-LED 18颗', type: 'lighting', spec: '18颗10W四合一LED帕灯', status: 'available', location: 'A仓库-1区' },
  { id: uuidv4(), code: 'LT-003', name: '频闪灯-1500W', type: 'lighting', spec: '1500W DMX频闪灯', status: 'available', location: 'A仓库-2区' },
  { id: uuidv4(), code: 'CS-001', name: 'MA2控台-全尺寸', type: 'console', spec: 'grandMA2 Full Size', status: 'available', location: 'B仓库-控台区' },
  { id: uuidv4(), code: 'CS-002', name: 'Tiger Touch控台', type: 'console', spec: 'Avolites Tiger Touch II', status: 'available', location: 'B仓库-控台区' },
  { id: uuidv4(), code: 'CB-001', name: 'DMX信号线-5米', type: 'cable', spec: '5米三芯卡侬DMX线', status: 'available', location: 'C仓库-线材区' },
  { id: uuidv4(), code: 'CB-002', name: '电源线-10米', type: 'cable', spec: '10米2.5平方电源电缆', status: 'available', location: 'C仓库-线材区' },
  { id: uuidv4(), code: 'CB-003', name: 'DMX分配器', type: 'cable', spec: '8路DMX信号分配器', status: 'available', location: 'C仓库-线材区' }
];

const contracts = [
  { 
    id: uuidv4(), 
    contract_no: 'CT-2024-001', 
    customer_name: '星光传媒有限公司', 
    project_name: '2024跨年演唱会', 
    start_date: '2024-12-30', 
    end_date: '2025-01-02', 
    total_amount: 128000.00, 
    status: 'active' 
  }
];

const rentalOrders = [
  {
    id: uuidv4(),
    order_no: 'RO-2024-001',
    contract_id: contracts[0].id,
    technician: '张师傅',
    remark: '跨年演唱会主舞台灯光设备',
    status: 'pending'
  }
];

console.log('开始插入种子数据...');

const insertDevice = db.prepare('INSERT INTO devices (id, code, name, type, spec, status, location) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const d of devices) {
  insertDevice.run(d.id, d.code, d.name, d.type, d.spec, d.status, d.location);
}
console.log('插入 ' + devices.length + ' 条设备数据');

const insertContract = db.prepare('INSERT INTO contracts (id, contract_no, customer_name, project_name, start_date, end_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
for (const c of contracts) {
  insertContract.run(c.id, c.contract_no, c.customer_name, c.project_name, c.start_date, c.end_date, c.total_amount, c.status);
}
console.log('插入 ' + contracts.length + ' 条合同数据');

const insertOrder = db.prepare('INSERT INTO rental_orders (id, order_no, contract_id, technician, remark, status) VALUES (?, ?, ?, ?, ?, ?)');
for (const o of rentalOrders) {
  insertOrder.run(o.id, o.order_no, o.contract_id, o.technician, o.remark, o.status);
}
console.log('插入 ' + rentalOrders.length + ' 条租赁单数据');

const insertItem = db.prepare('INSERT INTO rental_order_items (id, rental_order_id, device_id) VALUES (?, ?, ?)');
const orderDevices = [devices[0].id, devices[1].id, devices[3].id, devices[5].id];
for (const deviceId of orderDevices) {
  insertItem.run(uuidv4(), rentalOrders[0].id, deviceId);
}
console.log('插入 ' + orderDevices.length + ' 条租赁单项数据');

console.log('');
console.log('种子数据插入完成！');
console.log('');
console.log('预览数据:');
console.log('- 设备: ' + db.prepare('SELECT COUNT(*) as cnt FROM devices').get().cnt + ' 条');
console.log('- 合同: ' + db.prepare('SELECT COUNT(*) as cnt FROM contracts').get().cnt + ' 条');
console.log('- 租赁单: ' + db.prepare('SELECT COUNT(*) as cnt FROM rental_orders').get().cnt + ' 条');
