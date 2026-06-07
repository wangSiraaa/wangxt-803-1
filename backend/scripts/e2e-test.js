const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE_URL = 'localhost';
const PORT = 3001;
const SERVER_PATH = path.join(__dirname, '../src/server.js');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let serverProcess = null;

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
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
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('正在启动服务器...');
    serverProcess = spawn('node', [SERVER_PATH], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: PORT }
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('服务器运行在') || output.includes(PORT.toString())) {
        console.log('服务器已启动，等待2秒...');
        setTimeout(resolve, 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('服务器错误:', data.toString());
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`服务器进程退出，代码: ${code}`);
      }
    });

    setTimeout(() => {
      resolve();
    }, 3000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess) {
      console.log('正在关闭服务器...');
      serverProcess.kill('SIGTERM');
      serverProcess.on('exit', () => {
        console.log('服务器已关闭');
        resolve();
      });
      setTimeout(resolve, 2000);
    } else {
      resolve();
    }
  });
}

async function runE2ETest() {
  console.log('========================================');
  console.log('  舞台灯光设备租赁系统 - 端到端测试');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      process.stdout.write(`  测试: ${name}... `);
      try {
        await fn();
        console.log(`${GREEN}✅ 通过${RESET}`);
        passed++;
      } catch (e) {
        console.log(`${RED}❌ 失败: ${e.message}${RESET}`);
        failed++;
      }
    };
  }

  const tests = [
    test('健康检查接口正常', async () => {
      const res = await request('GET', '/health');
      if (res.status !== 200) throw new Error(`状态码 ${res.status}`);
    }),

    test('归还时录入无照片损坏并验证赔扣被拒绝', async () => {
      const devicesRes = await request('GET', '/devices');
      if (!devicesRes.data.success || devicesRes.data.data.length === 0) {
        throw new Error('无法获取设备列表');
      }
      const device = devicesRes.data.data[0];

      const contractsRes = await request('GET', '/contracts');
      if (!contractsRes.data.success || contractsRes.data.data.length === 0) {
        throw new Error('无法获取合同列表');
      }
      const contract = contractsRes.data.data[0];

      const orderNo = 'ZL-E2E-' + Date.now();
      const orderRes = await request('POST', '/rental-orders', {
        order_no: orderNo,
        contract_id: contract.id,
        items: [{ device_id: device.id }]
      });
      if (!orderRes.data.success) throw new Error('创建租赁单失败: ' + JSON.stringify(orderRes.data));
      const order = orderRes.data.data;

      await request('POST', `/rental-orders/${order.id}/checkout`, {
        out_operator: '调度员张三',
        item_ids: order.items.map(i => i.id)
      });

      const inspectionRes = await request('POST', '/inspections', {
        rental_order_id: order.id,
        device_id: device.id,
        inspector: '技师李四',
        has_damage: 1,
        damage_description: '灯壳有划痕'
      });
      if (!inspectionRes.data.success) throw new Error('创建巡检失败');
      const inspection = inspectionRes.data.data;

      const claimNo = 'PK-E2E-' + Date.now();
      const claimRes = await request('POST', '/damage-claims', {
        claim_no: claimNo,
        inspection_id: inspection.id,
        claim_amount: 300,
        claim_reason: '设备损坏赔偿'
      });

      if (claimRes.status !== 400) {
        throw new Error(`期望返回400，实际返回${claimRes.status}。无照片时赔扣应该被拒绝！`);
      }
      if (!claimRes.data.error || !claimRes.data.error.includes('照片')) {
        throw new Error('错误信息未提示需要照片');
      }
    }),
  ];

  for (const t of tests) {
    await t();
  }

  console.log('\n========================================');
  if (failed === 0) {
    console.log(`${GREEN}  测试结果: ${passed} 通过, ${failed} 失败${RESET}`);
    console.log(`${GREEN}  所有测试通过！${RESET}`);
  } else {
    console.log(`${RED}  测试结果: ${passed} 通过, ${failed} 失败${RESET}`);
  }
  console.log('========================================');

  return failed === 0;
}

async function main() {
  try {
    await startServer();
    const success = await runE2ETest();
    await stopServer();
    process.exit(success ? 0 : 1);
  } catch (e) {
    console.error(`${RED}测试运行出错: ${e.message}${RESET}`);
    await stopServer();
    process.exit(1);
  }
}

main();
