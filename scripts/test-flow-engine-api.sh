#!/bin/bash

# 流程引擎API测试脚本（不含执行功能）

BASE_URL="http://localhost:5000/api/flow-engine"

echo "========================================="
echo "  流程引擎API测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 保存流程ID
FLOW_ID=""

# 测试1: 创建流程定义
echo "测试1: 创建流程定义"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "${BASE_URL}/definitions" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "客服处理完整流程",
    "description": "包含消息接收、意图识别、AI回复、消息分发的完整流程",
    "status": "active",
    "triggerType": "webhook",
    "triggerConfig": {},
    "nodes": [
      {
        "id": "node_1",
        "type": "message_receive",
        "position": { "x": 100, "y": 100 },
        "data": {
          "name": "消息接收",
          "description": "接收WorkTool消息",
          "config": {
            "saveToDatabase": true,
            "saveToContext": true,
            "extractFields": {
              "messageId": true,
              "sessionId": true,
              "userName": true,
              "groupName": true,
              "roomType": true,
              "atMe": true
            },
            "enableWebSocketPush": true,
            "pushTarget": "both"
          }
        }
      },
      {
        "id": "node_2",
        "type": "intent",
        "position": { "x": 300, "y": 100 },
        "data": {
          "name": "意图识别",
          "description": "AI识别用户意图",
          "config": {
            "modelId": "default",
            "temperature": 0.1,
            "systemPrompt": "你是一个意图识别专家，请识别用户消息的意图类型。",
            "allowedIntents": ["service", "help", "chat", "welcome", "risk", "spam"]
          }
        }
      },
      {
        "id": "node_3",
        "type": "ai_reply",
        "position": { "x": 500, "y": 100 },
        "data": {
          "name": "AI客服回复",
          "description": "生成AI回复",
          "config": {
            "defaultModelId": "deepseek",
            "context": {
              "includeHistory": true,
              "maxHistoryMessages": 5
            }
          }
        }
      },
      {
        "id": "node_4",
        "type": "end",
        "position": { "x": 700, "y": 100 },
        "data": {
          "name": "结束",
          "description": "流程结束",
          "config": {}
        }
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "node_1",
        "target": "node_2"
      },
      {
        "id": "edge_2",
        "source": "node_2",
        "target": "node_3"
      },
      {
        "id": "edge_3",
        "source": "node_3",
        "target": "node_4"
      }
    ]
  }')

echo "$RESPONSE" | python3 -m json.tool

# 提取流程ID
FLOW_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['id'])" 2>/dev/null)
echo ""
echo "流程ID: $FLOW_ID"
echo ""

# 检查是否成功
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then
    echo -e "${GREEN}✓ 流程创建成功${NC}"
else
    echo -e "${RED}✗ 流程创建失败${NC}"
fi
echo ""

# 等待一下
sleep 1

# 测试2: 获取流程列表
echo "测试2: 获取流程列表"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "${BASE_URL}/definitions" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | python3 -m json.tool
echo ""

# 检查是否成功
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then
    TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('total', 0))" 2>/dev/null)
    echo -e "${GREEN}✓ 获取列表成功，共 $TOTAL 个流程${NC}"
else
    echo -e "${RED}✗ 获取列表失败${NC}"
fi
echo ""

# 等待一下
sleep 1

# 测试3: 获取流程详情
if [ -n "$FLOW_ID" ]; then
    echo "测试3: 获取流程详情（ID: $FLOW_ID）"
    echo "----------------------------------------"
    RESPONSE=$(curl -s -X GET "${BASE_URL}/definitions/$FLOW_ID" \
      -H "Content-Type: application/json")

    echo "$RESPONSE" | python3 -m json.tool
    echo ""

    # 检查是否成功
    SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
        echo -e "${GREEN}✓ 获取详情成功${NC}"
        
        # 检查节点配置
        NODE_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', {}).get('nodes', [])))" 2>/dev/null)
        echo "节点数量: $NODE_COUNT"
        
        # 检查第一个节点的配置
        FIRST_NODE_CONFIG=$(echo "$RESPONSE" | python3 -c "import sys, json; nodes=json.load(sys.stdin).get('data', {}).get('nodes', []); print(json.dumps(nodes[0].get('data', {}).get('config', {}), indent=2) if nodes else '')" 2>/dev/null)
        if [ -n "$FIRST_NODE_CONFIG" ]; then
            echo "第一个节点配置:"
            echo "$FIRST_NODE_CONFIG"
        fi
    else
        echo -e "${RED}✗ 获取详情失败${NC}"
    fi
    echo ""
fi

# 测试4: 更新流程定义
if [ -n "$FLOW_ID" ]; then
    echo "测试4: 更新流程定义（ID: $FLOW_ID）"
    echo "----------------------------------------"
    RESPONSE=$(curl -s -X PUT "${BASE_URL}/definitions/$FLOW_ID" \
      -H "Content-Type: application/json" \
      -d "{
        \"id\": \"$FLOW_ID\",
        \"name\": \"客服处理完整流程（已更新）\",
        \"description\": \"包含消息接收、意图识别、AI回复的完整流程 - 已更新\",
        \"status\": \"active\",
        \"triggerType\": \"webhook\",
        \"triggerConfig\": {},
        \"nodes\": [
          {
            \"id\": \"node_1\",
            \"type\": \"message_receive\",
            \"position\": { \"x\": 100, \"y\": 100 },
            \"data\": {
              \"name\": \"消息接收\",
              \"description\": \"接收WorkTool消息\",
              \"config\": {
                \"saveToDatabase\": true,
                \"saveToContext\": true,
                \"extractFields\": {
                  \"messageId\": true,
                  \"sessionId\": true,
                  \"userName\": true,
                  \"groupName\": true,
                  \"roomType\": true,
                  \"atMe\": true
                },
                \"enableWebSocketPush\": true,
                \"pushTarget\": \"both\"
              }
            }
          },
          {
            \"id\": \"node_2\",
            \"type\": \"intent\",
            \"position\": { \"x\": 300, \"y\": 100 },
            \"data\": {
              \"name\": \"意图识别\",
              \"description\": \"AI识别用户意图\",
              \"config\": {
                \"modelId\": \"default\",
                \"temperature\": 0.1,
                \"systemPrompt\": \"你是一个意图识别专家\",
                \"allowedIntents\": [\"service\", \"help\", \"chat\"]
              }
            }
          },
          {
            \"id\": \"node_3\",
            \"type\": \"end\",
            \"position\": { \"x\": 500, \"y\": 100 },
            \"data\": {
              \"name\": \"结束\",
              \"description\": \"流程结束\",
              \"config\": {}
            }
          }
        ],
        \"edges\": [
          {
            \"id\": \"edge_1\",
            \"source\": \"node_1\",
            \"target\": \"node_2\"
          },
          {
            \"id\": \"edge_2\",
            \"source\": \"node_2\",
            \"target\": \"node_3\"
          }
        ]
      }")

    echo "$RESPONSE" | python3 -m json.tool
    echo ""

    # 检查是否成功
    SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
        echo -e "${GREEN}✓ 流程更新成功${NC}"
    else
        echo -e "${RED}✗ 流程更新失败${NC}"
    fi
    echo ""
fi

# 测试5: 删除流程定义
if [ -n "$FLOW_ID" ]; then
    echo "测试5: 删除流程定义（ID: $FLOW_ID）"
    echo "----------------------------------------"
    RESPONSE=$(curl -s -X DELETE "${BASE_URL}/definitions/$FLOW_ID" \
      -H "Content-Type: application/json")

    echo "$RESPONSE" | python3 -m json.tool
    echo ""

    # 检查是否成功
    SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
        echo -e "${GREEN}✓ 流程删除成功${NC}"
    else
        echo -e "${RED}✗ 流程删除失败${NC}"
    fi
    echo ""
fi

echo "========================================="
echo "  测试完成"
echo "========================================="
