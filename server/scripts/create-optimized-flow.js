/**
 * 创建优化后的统一消息处理流程
 * 确保消息能正确流转，AI回复后能发送给机器人
 */

const { v4: uuidv4 } = require('uuid');
const { getDb } = require('coze-coding-dev-sdk');
const { flowDefinitions } = require('../database/schema');

async function createOptimizedUnifiedFlow() {
  console.log('🚀 开始创建优化后的统一消息处理流程...\n');

  try {
    const db = await getDb();

    // 删除旧的流程（如果存在）
    const existing = await db
      .delete(flowDefinitions)
      .where(flowDefinitions.id === 'flow_unified_message_handling_optimized')
      .returning();

    if (existing.length > 0) {
      console.log('✅ 已删除旧流程');
    }

    // 优化后的流程配置
    const flowConfig = {
      id: 'flow_unified_message_handling_optimized',
      name: '统一消息处理流程（优化版）',
      description: '优化后的统一消息处理流程，确保消息正确流转，AI回复后能发送给机器人',
      version: '4.1.0',
      isActive: true,
      isDefault: true,
      priority: 100,
      category: '消息处理',
      tags: ['优化', '统一', '消息处理'],
      triggerType: 'webhook',
      triggerConfig: {
        webhookUrl: '/api/worktool/callback/message',
        eventType: 'message',
        method: 'POST'
      },
      nodes: [
        {
          id: 'node_start',
          type: 'start',
          position: { x: 0, y: 100 },
          data: {
            name: '开始',
            description: '流程开始',
            icon: '🚀',
            color: '#10b981',
            config: {
              initialVariables: {
                flowStartTime: '{{now}}',
                flowVersion: '4.1.0'
              }
            }
          }
        },
        {
          id: 'node_message_receive',
          type: 'message_receive',
          position: { x: 150, y: 100 },
          data: {
            name: '消息接收',
            description: '接收WorkTool消息并保存到数据库',
            icon: '📥',
            color: '#3b82f6',
            config: {
              saveToInfoCenter: true,
              senderIdentification: true,
              messageDeduplication: true,
              dedupWindow: 600
            }
          }
        },
        {
          id: 'node_session_create',
          type: 'session_create',
          position: { x: 300, y: 100 },
          data: {
            name: '会话创建',
            description: '创建或获取会话',
            icon: '💬',
            color: '#8b5cf6',
            config: {
              autoCreate: true,
              sessionTimeout: 1800000,
              sessionTTL: 86400000,
              mergeConcurrentSessions: true
            }
          }
        },
        {
          id: 'node_qa_match',
          type: 'qa_match',
          position: { x: 450, y: 100 },
          data: {
            name: '问答匹配',
            description: '问答库关键词匹配',
            icon: '🔍',
            color: '#f59e0b',
            config: {
              enabled: true,
              matchType: 'keyword',
              isExactMatch: false,
              matchThreshold: 0.8,
              maxResults: 3,
              priority: 10,
              groupLimit: true
            }
          }
        },
        {
          id: 'node_intent',
          type: 'intent',
          position: { x: 600, y: 100 },
          data: {
            name: '意图识别',
            description: 'AI识别用户消息意图',
            icon: '🧠',
            color: '#ec4899',
            config: {
              modelId: 'doubao-pro-4k-intent',
              supportedIntents: ['咨询', '投诉', '售后', '互动', '购买', '预约', '查询', '其他'],
              useContext: true,
              confidenceThreshold: 0.7,
              fallbackIntent: '咨询',
              skipDirectReply: true // 关键：跳过直接回复，必须经过AI回复节点
            }
          }
        },
        {
          id: 'node_emotion',
          type: 'emotion_analyze',
          position: { x: 750, y: 100 },
          data: {
            name: '情绪分析',
            description: '分析用户情绪',
            icon: '😊',
            color: '#06b6d4',
            config: {
              modelId: 'doubao-pro-4k-intent',
              emotionTypes: ['positive', 'neutral', 'negative', 'angry', 'sad', 'happy'],
              emotionThreshold: 0.6,
              useKeywords: true
            }
          }
        },
        {
          id: 'node_risk_detect',
          type: 'risk_detect',
          position: { x: 900, y: 100 },
          data: {
            name: '风险检测',
            description: '检测消息中的敏感内容',
            icon: '⚠️',
            color: '#ef4444',
            config: {
              modelId: 'doubao-pro-4k-intent',
              riskKeywords: ['暴力', '色情', '政治', '诈骗', '辱骂', '威胁'],
              riskLevels: {
                low: 0.3,
                medium: 0.5,
                high: 0.8
              }
            }
          }
        },
        {
          id: 'node_decision',
          type: 'decision',
          position: { x: 1050, y: 100 },
          data: {
            name: '决策分流',
            description: '根据意图、情绪、风险判断处理方式',
            icon: '🔀',
            color: '#f59e0b',
            config: {
              conditions: [
                {
                  expression: 'context.riskLevel >= 4',
                  label: '高风险告警',
                  targetNodeId: 'node_alert_save'
                },
                {
                  expression: 'context.intent === "投诉" || context.emotion === "negative" || context.emotion === "angry"',
                  label: '转人工',
                  targetNodeId: 'node_staff_intervention'
                },
                {
                  expression: 'context.qaMatched === true',
                  label: '直接问答回复',
                  targetNodeId: 'node_ai_reply'
                },
                {
                  expression: 'context.needReply === true',
                  label: 'AI回复',
                  targetNodeId: 'node_ai_reply'
                }
              ],
              defaultTarget: 'node_ai_reply' // 默认走AI回复
            }
          }
        },
        {
          id: 'node_ai_reply',
          type: 'ai_reply',
          position: { x: 1200, y: 100 },
          data: {
            name: 'AI回复',
            description: '生成智能客服回复',
            icon: '🤖',
            color: '#3b82f6',
            config: {
              modelId: 'doubao-pro-32k-general',
              temperature: 0.7,
              maxTokens: 1000,
              useHistory: true,
              useContext: true,
              useDocuments: true,
              useTemplate: true,
              responseStyle: 'professional',
              templateMapping: {
                default: 'template_default',
                sales: 'template_sales',
                support: 'template_support',
                vip: 'template_vip'
              },
              historyLength: 10
            }
          }
        },
        {
          id: 'node_send_command',
          type: 'send_command',
          position: { x: 1350, y: 100 },
          data: {
            name: '发送消息',
            description: '发送AI回复给机器人',
            icon: '📤',
            color: '#22c55e',
            config: {
              commandType: 'message',
              messageSource: 'aiReply', // 从AI回复节点获取
              saveLog: true,
              retryCount: 3,
              retryInterval: 1000
            }
          }
        },
        {
          id: 'node_staff_intervention',
          type: 'staff_intervention',
          position: { x: 1200, y: 250 },
          data: {
            name: '人工转接',
            description: '转人工客服处理',
            icon: '👥',
            color: '#8b5cf6',
            config: {
              allowUserSelect: true,
              autoAssign: true,
              assignStrategy: 'least_busy',
              escalationTimeout: 300000,
              notifyChannels: ['email', 'websocket', 'sms'],
              teamMapping: {
                default: 'general_team',
                sales: 'sales_team',
                support: 'support_team',
                vip: 'vip_team'
              }
            }
          }
        },
        {
          id: 'node_alert_save',
          type: 'alert_save',
          position: { x: 1350, y: 250 },
          data: {
            name: '告警入库',
            description: '保存风险告警',
            icon: '🔔',
            color: '#f97316',
            config: {
              alertType: 'risk',
              alertLevel: 'high',
              autoEscalate: true,
              enableNotification: true,
              escalationLevel: 'high',
              saveToDatabase: true
            }
          }
        },
        {
          id: 'node_end',
          type: 'end',
          position: { x: 1500, y: 100 },
          data: {
            name: '结束',
            description: '流程结束',
            icon: '✅',
            color: '#10b981'
          }
        }
      ],
      edges: [
        {
          id: 'edge_start_receive',
          source: 'node_start',
          target: 'node_message_receive'
        },
        {
          id: 'edge_receive_session',
          source: 'node_message_receive',
          target: 'node_session_create'
        },
        {
          id: 'edge_session_qa',
          source: 'node_session_create',
          target: 'node_qa_match'
        },
        {
          id: 'edge_qa_intent',
          source: 'node_qa_match',
          target: 'node_intent'
        },
        {
          id: 'edge_intent_emotion',
          source: 'node_intent',
          target: 'node_emotion'
        },
        {
          id: 'edge_emotion_risk',
          source: 'node_emotion',
          target: 'node_risk_detect'
        },
        {
          id: 'edge_risk_decision',
          source: 'node_risk_detect',
          target: 'node_decision'
        },
        {
          id: 'edge_decision_ai_reply',
          source: 'node_decision',
          target: 'node_ai_reply',
          label: 'AI回复'
        },
        {
          id: 'edge_decision_staff',
          source: 'node_decision',
          target: 'node_staff_intervention',
          label: '转人工'
        },
        {
          id: 'edge_decision_alert',
          source: 'node_decision',
          target: 'node_alert_save',
          label: '风险'
        },
        {
          id: 'edge_ai_reply_send',
          source: 'node_ai_reply',
          target: 'node_send_command'
        },
        {
          id: 'edge_send_end',
          source: 'node_send_command',
          target: 'node_end'
        },
        {
          id: 'edge_staff_end',
          source: 'node_staff_intervention',
          target: 'node_end'
        },
        {
          id: 'edge_alert_end',
          source: 'node_alert_save',
          target: 'node_end'
        }
      ],
      variables: {
        flowStartTime: '{{now}}',
        flowVersion: '4.1.0',
        skipDirectReply: true
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryInterval: 1000
      }
    };

    // 创建流程
    await db.insert(flowDefinitions).values(flowConfig);

    console.log('✅ 优化后的统一消息处理流程创建成功！');
    console.log('\n流程配置：');
    console.log('  - 流程ID: flow_unified_message_handling_optimized');
    console.log('  - 流程名称: 统一消息处理流程（优化版）');
    console.log('  - 节点数量: 12 个');
    console.log('  - 边数量: 13 条');
    console.log('\n流程路径：');
    console.log('  开始 → 消息接收 → 会话创建 → 问答匹配 → 意图识别 → 情绪分析 → 风险检测 → 决策分流');
    console.log('  ├── AI回复 → 发送消息 → 结束');
    console.log('  ├── 人工转接 → 结束');
    console.log('  └── 告警入库 → 结束');
    console.log('\n关键优化：');
    console.log('  ✅ 意图识别节点设置了 skipDirectReply: true');
    console.log('  ✅ AI回复节点后必须经过发送指令节点');
    console.log('  ✅ 发送指令节点会将AI回复发送给机器人');
    console.log('  ✅ 默认走AI回复路径，确保消息能被处理');
    console.log('\n');

  } catch (error) {
    console.error('❌ 创建优化流程失败:', error);
    throw error;
  }
}

// 导出函数
module.exports = { createOptimizedUnifiedFlow };

// 如果直接运行此脚本
if (require.main === module) {
  createOptimizedUnifiedFlow()
    .then(() => {
      console.log('✅ 优化流程创建成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 优化流程创建失败:', error);
      process.exit(1);
    });
}
