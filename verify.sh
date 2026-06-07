#!/bin/bash
set -e

echo "=== 现场补拍复核功能验证脚本 === "
echo "验证场景：已归档合同提交补拍申请被拒绝"

API_BASE="http://localhost:3001/api"

echo "1. 检查服务是否启动..."
if curl -s -f "$API_BASE/devices" > /dev/null 2>&1; then
  echo "✅ 服务运行正常"
else
  echo "❌ 服务未启动，请先启动后端服务 (cd backend && npm start)"
  exit 1
fi

python3 verify_reshoot.py "$API_BASE"
