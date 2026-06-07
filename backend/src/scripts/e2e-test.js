const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3001/api';
let testResults = [];
let passed = 0;
let failed = 0;

function logTest(name, passed, message) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(status + ': ' + name);
  if (message) console.log('   ' + message);
  testResults.push({ name, passed, message });
  if (passed) passed++; else failed++;
}

function apiRequest(method, path, data = null, isFormData = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {}
    };
    
    if (data && !isFormData) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      if (isFormData) {
        req.write(data);
      } else {
        req.write(JSON.stringify(data));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('');
  console.log('========================================');
  console.log('  舞台灯光设备租赁系统 - 端到端测试');
  console.log('========================================');
  console.log('');
  
  console.log('第一步: 健康检查...');
  try {
    const res = await apiRequest('GET', '/health');
    logTest('API 服务正常运行', res.status === 200 && res.data.status === 'ok');
  } catch (e) {
    logTest('API 服务正常运行', false, e.message);
  }
  
  console.log('');
  console.log('第二步: 准备测试数据...');
  
  let deviceId, contractId, rentalOrderId, inspectionId;
  
  try {
    const deviceRes = await apiRequest('POST', '/devices', {
      code: 'TEST-' + Date.now(),
      name: '测试灯具-摇头灯',
      type: 'lighting',
      spec: '测试用 230W 摇头灯',
      location: '测试仓库',
      status: 'available'
    });
    deviceId = deviceRes.data.id;
    logTest('创建设备成功', deviceRes.status === 201 && deviceId);
  } catch (e) {
    logTest('创建设备成功', false, e.message);
  }
  
  try {
    const contractRes = await apiRequest('POST', '/contracts', {
      contract_no: 'CT-TEST-' + Date.now(),
      customer_name: '测试客户有限公司',
      project_name: '测试项目-演唱会',
      start_date: '2024-06-01',
      end_date: '2024-06-03',
      total_amount: 50000.00
    });
    contractId = contractRes.data.id;
    logTest('创建合同成功', contractRes.status === 201 && contractId);
  } catch (e) {
    logTest('创建合同成功', false, e.message);
  }
  
  try {
    const rentalRes = await apiRequest('POST', '/rental-orders', {
      order_no: 'RO-TEST-' + Date.now(),
      contract_id: contractId,
      technician: '测试技师',
      remark: '测试租赁单',
      device_ids: [deviceId]
    });
    rentalOrderId = rentalRes.data.id;
    logTest('创建租赁单成功', rentalRes.status === 201 && rentalOrderId);
  } catch (e) {
    logTest('创建租赁单成功', false, e.message);
  }
  
  console.log('');
  console.log('第三步: 测试规则1 - 未完成出库的设备不能生成巡检任务...');
  
  try {
    const inspectRes = await apiRequest('POST', '/inspections', {
      rental_order_id: rentalOrderId,
      device_id: deviceId,
      inspector: '测试巡检员',
      inspect_time: new Date().toISOString(),
      location: '演出现场',
      has_damage: 0,
      damage_description: ''
    });
    logTest('未出库设备禁止生成巡检', inspectRes.status === 400 || inspectRes.status === 403, 
      inspectRes.status === 201 ? '错误: 未出库设备也能生成巡检!' : '正确: 未出库设备被拒绝生成巡检');
  } catch (e) {
    logTest('未出库设备禁止生成巡检', false, e.message);
  }
  
  console.log('');
  console.log('第四步: 确认出库...');
  
  try {
    const outboundRes = await apiRequest('POST', '/rental-orders/' + rentalOrderId + '/outbound');
    logTest('确认出库成功', outboundRes.status === 200 && outboundRes.data.status === 'outbound');
  } catch (e) {
    logTest('确认出库成功', false, e.message);
  }
  
  console.log('');
  console.log('第五步: 出库后创建巡检(有损坏但无照片)...');
  
  try {
    const inspectRes = await apiRequest('POST', '/inspections', {
      rental_order_id: rentalOrderId,
      device_id: deviceId,
      inspector: '测试巡检员',
      inspect_time: new Date().toISOString(),
      location: '演出现场',
      has_damage: 1,
      damage_description: '灯具外壳有划痕，需要维修'
    });
    inspectionId = inspectRes.data.id;
    logTest('出库后可正常创建巡检', inspectRes.status === 201 && inspectionId);
  } catch (e) {
    logTest('出库后可正常创建巡检', false, e.message);
  }
  
  console.log('');
  console.log('第六步: 测试规则2 - 无损坏照片不得录入赔扣金额...');
  
  try {
    const claimRes = await apiRequest('POST', '/damage-claims', {
      claim_no: 'CLAIM-TEST-' + Date.now(),
      inspection_id: inspectionId,
      rental_order_id: rentalOrderId,
      device_id: deviceId,
      damage_amount: 2000.00,
      description: '灯具外壳损坏维修费用'
    });
    logTest('无照片损坏禁止录入赔扣', claimRes.status === 400 || claimRes.status === 403,
      claimRes.status === 201 ? '错误: 无照片也能录入赔扣金额!' : '正确: 无照片的损坏被拒绝录入赔扣 (' + (claimRes.data ? claimRes.data.error : '') + ')');
  } catch (e) {
    logTest('无照片损坏禁止录入赔扣', false, e.message);
  }
  
  console.log('');
  console.log('第七步: 测试规则3 - 客户未确认归还前禁止归档合同...');
  
  try {
    const archiveRes = await apiRequest('POST', '/contracts/' + contractId + '/archive');
    logTest('未确认归还禁止归档合同', archiveRes.status === 400 || archiveRes.status === 403,
      archiveRes.status === 200 ? '错误: 未确认归还也能归档!' : '正确: 未确认归还被禁止归档 (' + (archiveRes.data ? archiveRes.data.error : '') + ')');
  } catch (e) {
    logTest('未确认归还禁止归档合同', false, e.message);
  }
  
  console.log('');
  console.log('第八步: 确认归还...');
  
  try {
    const returnRes = await apiRequest('POST', '/rental-orders/' + rentalOrderId + '/return-confirm', {
      confirmed_by: '测试项目经理',
      remark: '设备已归还，检查完毕'
    });
    logTest('确认归还成功', returnRes.status === 201);
  } catch (e) {
    logTest('确认归还成功', false, e.message);
  }
  
  console.log('');
  console.log('第九步: 确认归还后可以归档合同...');
  
  try {
    const archiveRes = await apiRequest('POST', '/contracts/' + contractId + '/archive');
    logTest('确认归还后可正常归档', archiveRes.status === 200 && archiveRes.data.archived === 1);
  } catch (e) {
    logTest('确认归还后可正常归档', false, e.message);
  }
  
  console.log('');
  console.log('========================================');
  console.log('  测试结果汇总');
  console.log('========================================');
  console.log('总计: ' + (passed + failed) + ' 项测试');
  console.log('通过: ' + passed + ' 项 ✅');
  console.log('失败: ' + failed + ' 项 ❌');
  console.log('');
  
  if (failed > 0) {
    console.log('以下测试失败:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log('  ❌ ' + r.name);
      if (r.message) console.log('     ' + r.message);
    });
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 所有测试通过！核心业务规则验证成功！');
    console.log('');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('测试执行出错:', e);
  process.exit(1);
});
