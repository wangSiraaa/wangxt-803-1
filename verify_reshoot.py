import sys
import json
import urllib.request
import urllib.error

def api_request(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode()), resp.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode()), e.code
    except Exception as e:
        return {"error": str(e)}, 500

def main():
    api_base = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001/api"
    print()
    print("2. 获取或创建已归档合同...")
    
    contracts, status = api_request(f"{api_base}/contracts")
    contract_list = contracts.get("data", contracts) if isinstance(contracts, dict) else contracts
    
    archived_contract = None
    for c in contract_list:
        if c.get("archived") == 1 or c.get("status") == "archived":
            archived_contract = c
            break
    
    if not archived_contract:
        print("  未找到已归档合同，正在创建并归档一个测试合同...")
        import time
        contract_data = {
            "contract_no": f"TEST-{int(time.time())}",
            "customer_name": "测试客户",
            "project_name": "测试项目",
            "status": "active"
        }
        result, status = api_request(f"{api_base}/contracts", "POST", contract_data)
        archived_contract = result.get("data", result)
        if archived_contract and archived_contract.get("id"):
            api_request(f"{api_base}/contracts/{archived_contract[\"id\"]}/archive", "POST")
            print(f"  ✅ 已创建并归档测试合同 (ID: {archived_contract[\"id\"]})")
        else:
            print("  ❌ 创建合同失败")
            sys.exit(1)
    else:
        print(f"  ✅ 找到已归档合同 (ID: {archived_contract[\"id\"]})")

    print()
    print("3. 获取或创建关联该合同的租赁单...")
    
    orders, status = api_request(f"{api_base}/rental-orders")
    order_list = orders.get("data", orders) if isinstance(orders, dict) else orders
    
    rental_order = None
    for o in order_list:
        if o.get("contract_id") == archived_contract.get("id"):
            rental_order = o
            break
    
    if not rental_order:
        print("  未找到关联租赁单，正在创建一个测试租赁单...")
        import time
        order_data = {
            "order_no": f"RENT-{int(time.time())}",
            "contract_id": archived_contract["id"],
            "status": "returned"
        }
        result, status = api_request(f"{api_base}/rental-orders", "POST", order_data)
        rental_order = result.get("data", result)
        if rental_order and rental_order.get("id"):
            print(f"  ✅ 已创建测试租赁单 (ID: {rental_order[\"id\"]})")
        else:
            print("  ❌ 创建租赁单失败")
            sys.exit(1)
    else:
        print(f"  ✅ 找到关联租赁单 (ID: {rental_order[\"id\"]})")

    print()
    print("4. 验证：对已归档合同的租赁单提交补拍申请...")
    
    reshoot_data = {
        "remark": "测试补拍备注",
        "submitter": "测试技师"
    }
    
    result, status = api_request(
        f"{api_base}/rental-orders/{rental_order[\"id\"]}/reshoot-submit",
        "POST",
        reshoot_data
    )
    
    print()
    print("5. 验证结果：")
    error_msg = result.get("error") or result.get("message", "")
    
    if status == 400 and "归档" in error_msg and "不允许" in error_msg:
        print(f"  ✅ 验证通过！")
        print(f"  状态码: {status}")
        print(f"  错误信息: {error_msg}")
        print()
        print("=== 所有验证通过 ===")
        sys.exit(0)
    else:
        print(f"  ❌ 验证失败！")
        print(f"  状态码: {status}")
        print(f"  返回信息: {error_msg}")
        print(f"  期望: 状态码400，错误信息包含归档且不允许")
        sys.exit(1)

if __name__ == "__main__":
    main()
