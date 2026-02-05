#!/bin/bash

# 流程引擎完整功能测试脚本

BASE_URL="http://localhost:5000/api/flow-engine"

echo "========================================="
echo "  流程引擎完整功能测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 保存流程ID
FLOW_ID=""

# 测试1: 创建完整流程定义
echo "测试1: 创建完整流程定义"
echo "----------------------------------------"
RESPONSE=$(curl -X POST "${BASE_URL}/definitions" \
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
        "type": "decision",
        "position": { "x": 500, "y": 100 },
        "data": {
          "name": "意图决策",
          "description": "根据意图判断处理流程",
          "config": {
            "rules": [
              {
                "condition": "intent === 'service'",
                "targetNodeId": "node_4"
              },
              {
                "condition": "intent === 'help'",
                "targetNodeId": "node_5"
              },
              {
                "condition": "intent === 'chat'",
                "targetNodeId": "node_6"
              }
            ]
          }
        }
      },
      {
        "id": "node_4",
        "type": "ai_reply",
        "position": { "x": 700, "y": 50 },
        "data": {
          "name": "客服回复",
          "description": "生成客服回复",
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
        "id": "node_5",
        "type": "send_command",
        "position": { "x": 700, "y": 150 },
        "data": {
          "name": "发送帮助信息",
          "description": "发送帮助文档",
          "config": {
            "messageSource": "template",
            "messageTemplate": "这里是帮助信息，您可以联系客服或查看FAQ。",
            "enableAtList": false,
            "enableRetry": true,
            "maxRetries": 3,
            "retryDelay": 1000
          }
        }
      },
      {
        "id": "node_6",
        "type": "message_dispatch",
        "position": { "x": 700, "y": 250 },
        "data": {
          "name": "消息分发",
          "description": "分发消息到不同目标",
          "config": {
            "groupDispatch": {
              "enabled": true,
              "targetNameSource": "context",
              "customGroupNames": []
            },
            "privateDispatch": {
              "enabled": false,
              "targetNameSource": "context",
              "customTargets": []
            },
            "atMe": {
              "requireAtMe": true,
              "onNotAtMe": "ignore"
            }
          }
        }
      },
      {
        "id": "node_7",
        "type": "command_status",
        "position": { "x": 900, "y": 100 },
        "data": {
          "name": "记录状态",
          "description": "记录指令状态",
          "config": {
            "saveToRobotCommands": true,
            "updateSessionMessages": true,
            "enableWebSocketPush": true,
            "pushTarget": "both"
          }
        }
      },
      {
        "id": "node_8",
        "type": "end",
        "position": { "x": 1100, "y": 100 },
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
        "target": "node_4",
        "label": "service"
      },
      {
        "id": "edge_4",
        "source": "node_3",
        "target": "node_5",
        "label": "help"
      },
      {
        "id": "edge_5",
        "source": "node_3",
        "target": "node_6",
        "label": "chat"
      },
      {
        "id": "edge_6",
        "source": "node_4",
        "target": "node_7"
      },
      {
        "id": "edge_7",
        "source": "node_5",
        "target": "node_7"
      },
      {
        "id": "edge_8",
        "source": "node_6",
        "target": "node_7"
      },
      {
        "id": "edge_9",
        "source": "node_7",
        "target": "node_8"
      }
    ]
  }')

echo "$RESPONSE" | python3 -m json.tool
FLOW_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")
echo "流程ID: $FLOW_ID"
echo ""

# 等待一下
sleep 1

# 测试2: 获取流程列表
echo "测试2: 获取流程列表"
echo "----------------------------------------"
curl -X GET "${BASE_URL}/definitions" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool
echo ""

# 等待一下
sleep 1

# 测试3: 获取流程详情
echo "测试3: 获取流程详情（ID: $FLOW_ID）"
echo "----------------------------------------"
curl -X GET "${BASE_URL}/definitions/$FLOW_ID" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool
echo ""

# 等待一下
sleep 1

# 测试4: 执行流程
echo "测试4: 执行流程（ID: $FLOW_ID）"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/execute/$FLOW_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session_123",
    "messageId": "test_message_456",
    "message": {
      "spoken": "您好，我想咨询一下产品信息",
      "userName": "测试用户",
      "groupName": "客服群",
      "roomType": "group",
      "atMe": true
    },
    "robotId": "robot_123",
    "context": {}
  }' \
  | python3 -m json.tool
echo ""

# 等待一下
sleep 1

# 测试5: 获取流程执行历史
echo "测试5: 获取流程执行历史"
echo "----------------------------------------"
curl -X GET "${BASE_URL}/executions" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool
echo ""

echo "========================================="
echo "  测试完成"
echo "========================================="
