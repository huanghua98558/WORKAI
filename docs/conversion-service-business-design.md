# 转化客服业务设计与技术方案

## 📊 业务背景

### 目标用户
- 每天大量用户加好友
- 用户身份：想做视频号运营的兼职人员
- 用户需求：获取视频号运营兼职机会

### 转化目标
1. **打消疑虑** - 主动引导用户，消除用户顾虑
2. **搭建视频号** - 引导用户完成视频号搭建
3. **扫码登录** - 发送视频号二维码，用户扫码登录
4. **验证合规性** - 检测视频号小店和助手页面是否可访问
5. **提取CK** - 提取并保存网页Cookie
6. **人工审核** - 客服人工检测视频号是否符合规则

---

## 🔄 完整业务流程

```
用户加好友
  ↓
【阶段1：打消疑虑】
  主动联系用户 → 解答疑问 → 建立信任
  ↓
【阶段2：引导搭建】
  发送搭建教程 → 用户完成视频号搭建
  ↓
【阶段3：扫码登录】
  系统获取最新二维码 → 发送给用户 → 用户扫码登录
  ↓
【阶段4：检测登录】
  系统自动检测是否登录成功
  ├─ 成功 → 继续下一步
  └─ 失败 → 提醒用户重新扫码
  ↓
【阶段5：检测页面】
  检测视频号小店页面能否进入
  检测视频号助手页面能否进入
  ├─ 都能进入 → 继续下一步
  └─ 无法进入 → 提示用户检查
  ↓
【阶段6：提取CK】
  系统自动提取网页Cookie
  保存到数据库
  生成CK分享链接
  ↓
【阶段7：人工审核】
  客服人工检测视频号是否符合规则
  ├─ 符合 → 审核通过
  └─ 不符合 → 拒绝并说明原因
  ↓
【阶段8：完成转化】
  用户正式成为兼职人员
  开始视频号运营工作
```

---

## 🎯 转化客服流程设计

### 流程节点设计

```json
{
  "name": "视频号兼职人员转化流程",
  "description": "引导兼职人员完成视频号搭建、登录、CK提取、人工审核的完整转化流程",
  "status": "active",
  "triggerType": "webhook",
  "triggerConfig": {
    "webhookUrl": "/webhook/conversion/video",
    "method": "POST"
  },
  "nodes": [
    // ============ 阶段1：接收用户 ============
    {
      "id": "node_1",
      "type": "MESSAGE_RECEIVE",
      "name": "接收新好友",
      "description": "接收新添加的好友信息",
      "data": {
        "config": {
          "saveToDatabase": true,
          "extractFields": {
            "userId": true,
            "userName": true,
            "userType": "potential_parttime"
          }
        }
      },
      "nextNodeId": "node_2"
    },

    // ============ 阶段2：主动联系 ============
    {
      "id": "node_2",
      "type": "AI_REPLY",
      "name": "主动引导",
      "description": "主动联系用户，打消疑虑",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "temperature": 0.8,
          "replyStrategy": "proactive",
          "proactiveMode": "adjustable", // 可调整主动性
          "template": "您好！我是视频号运营客服。看到您添加好友了，想了解一下您对视频号运营兼职感兴趣吗？我可以为您详细介绍。"
        }
      },
      "nextNodeId": "node_3"
    },

    {
      "id": "node_3",
      "type": "INTENT",
      "name": "用户意图识别",
      "description": "识别用户是否愿意继续",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "supportedIntents": [
            "interested",      // 感兴趣
            "hesitant",        // 犹豫
            "reject",          // 拒绝
            "question"         // 有疑问
          ]
        }
      },
      "nextNodeId": "node_4"
    },

    {
      "id": "node_4",
      "type": "DECISION",
      "name": "意向分流",
      "description": "根据用户意向分流",
      "data": {
        "config": {
          "decisionMode": "priority",
          "conditions": [
            {
              "label": "感兴趣",
              "expression": "context.intent === 'interested'",
              "targetNodeId": "node_5"
            },
            {
              "label": "有疑问",
              "expression": "context.intent === 'question'",
              "targetNodeId": "node_6"
            },
            {
              "label": "犹豫",
              "expression": "context.intent === 'hesitant'",
              "targetNodeId": "node_7"
            },
            {
              "label": "拒绝",
              "expression": "context.intent === 'reject'",
              "targetNodeId": "node_end"
            }
          ]
        }
      }
    },

    // ============ 阶段3：解答疑问 ============
    {
      "id": "node_6",
      "type": "AI_REPLY",
      "name": "解答疑问",
      "description": "解答用户疑问，打消疑虑",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "temperature": 0.7,
          "replyStrategy": "answer"
        }
      },
      "nextNodeId": "node_5"
    },

    {
      "id": "node_7",
      "type": "AI_REPLY",
      "name": "打消犹豫",
      "description": "打消用户犹豫，增强信心",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "temperature": 0.8,
          "replyStrategy": "persuade"
        }
      },
      "nextNodeId": "node_5"
    },

    // ============ 阶段4：引导搭建 ============
    {
      "id": "node_5",
      "type": "AI_REPLY",
      "name": "发送搭建教程",
      "description": "发送视频号搭建教程",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "replyStrategy": "guide",
          "includeTutorial": true
        }
      },
      "nextNodeId": "node_8"
    },

    {
      "id": "node_8",
      "type": "DECISION",
      "name": "确认搭建完成",
      "description": "确认用户是否完成视频号搭建",
      "data": {
        "config": {
          "decisionMode": "manual",
          "conditions": [
            {
              "label": "已搭建完成",
              "expression": "context.setupCompleted === true",
              "targetNodeId": "node_9"
            },
            {
              "label": "搭建中",
              "expression": "true",
              "targetNodeId": "node_8"
            }
          ]
        }
      }
    },

    // ============ 阶段5：发送二维码 ============
    {
      "id": "node_9",
      "type": "HTTP_REQUEST",
      "name": "获取最新二维码",
      "description": "从视频号小店接口获取最新的登录二维码",
      "data": {
        "config": {
          "method": "GET",
          "url": "https://channels.weixin.qq.com/api/get_login_qrcode",
          "headers": {
            "Authorization": "Bearer {{context.accessToken}}"
          },
          "timeout": 10000
        }
      },
      "nextNodeId": "node_10"
    },

    {
      "id": "node_10",
      "type": "SEND_COMMAND",
      "name": "发送二维码",
      "description": "发送二维码给用户扫码登录",
      "data": {
        "config": {
          "commandType": "message",
          "messageType": "image",
          "imageUrl": "{{context.qrCodeUrl}}",
          "messageContent": "请扫描上方二维码登录视频号小店"
        }
      },
      "nextNodeId": "node_11"
    },

    // ============ 阶段6：检测登录 ============
    {
      "id": "node_11",
      "type": "HTTP_REQUEST",
      "name": "检测登录状态",
      "description": "轮询检测用户是否扫码登录成功",
      "data": {
        "config": {
          "method": "POST",
          "url": "https://channels.weixin.qq.com/api/check_login_status",
          "headers": {
            "Authorization": "Bearer {{context.accessToken}}"
          },
          "body": {
            "qrCodeId": "{{context.qrCodeId}}"
          },
          "polling": {
            "enabled": true,
            "interval": 3000,
            "maxAttempts": 20,
            "successCondition": "status === 'success'"
          }
        }
      },
      "nextNodeId": "node_12"
    },

    {
      "id": "node_12",
      "type": "DECISION",
      "name": "登录结果判断",
      "description": "判断登录是否成功",
      "data": {
        "config": {
          "decisionMode": "priority",
          "conditions": [
            {
              "label": "登录成功",
              "expression": "context.loginStatus === 'success'",
              "targetNodeId": "node_13"
            },
            {
              "label": "登录失败",
              "expression": "context.loginStatus === 'failed'",
              "targetNodeId": "node_10"
            },
            {
              "label": "超时",
              "expression": "context.loginStatus === 'timeout'",
              "targetNodeId": "node_10"
            }
          ]
        }
      }
    },

    // ============ 阶段7：检测页面 ============
    {
      "id": "node_13",
      "type": "HTTP_REQUEST",
      "name": "检测视频号小店",
      "description": "检测视频号小店页面能否进入",
      "data": {
        "config": {
          "method": "GET",
          "url": "https://channels.weixin.qq.com/shop",
          "headers": {
            "Cookie": "{{context.cookies}}"
          },
          "timeout": 10000
        }
      },
      "nextNodeId": "node_14"
    },

    {
      "id": "node_14",
      "type": "HTTP_REQUEST",
      "name": "检测视频号助手",
      "description": "检测视频号助手页面能否进入",
      "data": {
        "config": {
          "method": "GET",
          "url": "https://channels.weixin.qq.com/assistant",
          "headers": {
            "Cookie": "{{context.cookies}}"
          },
          "timeout": 10000
        }
      },
      "nextNodeId": "node_15"
    },

    {
      "id": "node_15",
      "type": "DECISION",
      "name": "页面检测结果",
      "description": "判断页面是否可访问",
      "data": {
        "config": {
          "decisionMode": "priority",
          "conditions": [
            {
              "label": "都能访问",
              "expression": "context.shopAccessible && context.assistantAccessible",
              "targetNodeId": "node_16"
            },
            {
              "label": "无法访问",
              "expression": "true",
              "targetNodeId": "node_17"
            }
          ]
        }
      }
    },

    {
      "id": "node_17",
      "type": "AI_REPLY",
      "name": "提示检查",
      "description": "提示用户检查视频号状态",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "replyStrategy": "remind"
        }
      },
      "nextNodeId": "node_13"
    },

    // ============ 阶段8：提取并保存CK ============
    {
      "id": "node_16",
      "type": "VARIABLE_SET",
      "name": "提取CK",
      "description": "提取网页Cookie",
      "data": {
        "config": {
          "cookieExtraction": {
            "source": "response_headers",
            "pattern": "Set-Cookie",
            "fields": ["session_id", "access_token", "user_id"]
          }
        }
      },
      "nextNodeId": "node_18"
    },

    {
      "id": "node_18",
      "type": "DATA_QUERY",
      "name": "保存CK",
      "description": "保存CK到数据库",
      "data": {
        "config": {
          "action": "insert",
          "table": "video_account_cookies",
          "data": {
            "userId": "{{context.userId}}",
            "userName": "{{context.userName}}",
            "cookies": "{{context.cookies}}",
            "extractedAt": "{{context.timestamp}}",
            "expiresAt": "{{context.expiresAt}}",
            "status": "active"
          }
        }
      },
      "nextNodeId": "node_19"
    },

    {
      "id": "node_19",
      "type": "VARIABLE_SET",
      "name": "生成分享链接",
      "description": "生成CK的下载和分享链接",
      "data": {
        "config": {
          "generateShareLink": true,
          "linkExpiry": 86400, // 24小时
          "requireAuth": true
        }
      },
      "nextNodeId": "node_20"
    },

    {
      "id": "node_20",
      "type": "AI_REPLY",
      "name": "通知CK提取成功",
      "description": "通知用户CK提取成功，发送分享链接",
      "data": {
        "config": {
          "modelId": "doubao-pro-4k",
          "replyStrategy": "notify",
          "includeShareLink": true
        }
      },
      "nextNodeId": "node_21"
    },

    // ============ 阶段9：人工审核 ============
    {
      "id": "node_21",
      "type": "TASK_ASSIGN",
      "name": "创建审核任务",
      "description": "创建人工审核任务",
      "data": {
        "config": {
          "taskName": "视频号合规性审核",
          "taskType": "manual_review",
          "priority": "normal",
          "assignTo": "customer_service",
          "dueTime": 86400, // 24小时内审核
          "taskData": {
            "userId": "{{context.userId}}",
            "videoAccountId": "{{context.videoAccountId}}",
            "ckId": "{{context.ckId}}"
          }
        }
      },
      "nextNodeId": "node_end"
    },

    // ============ 结束节点 ============
    {
      "id": "node_end",
      "type": "END",
      "name": "流程结束",
      "description": "转化流程结束，等待人工审核",
      "data": {
        "config": {
          "saveStatistics": true
        }
      }
    }
  ]
}
```

---

## 🔧 技术实现方案

### 1. 获取视频号小店二维码

**接口**：
```
GET https://channels.weixin.qq.com/api/get_login_qrcode
```

**实现**：
```javascript
async function getLatestQrcode() {
  const response = await fetch('https://channels.weixin.qq.com/api/get_login_qrcode', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  return {
    qrCodeId: data.qr_code_id,
    qrCodeUrl: data.qr_code_url,
    expiresAt: data.expires_at
  };
}
```

### 2. 检测登录状态

**接口**：
```
POST https://channels.weixin.qq.com/api/check_login_status
```

**实现**：
```javascript
async function checkLoginStatus(qrCodeId) {
  const maxAttempts = 20;
  const interval = 3000; // 3秒

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, interval));

    const response = await fetch('https://channels.weixin.qq.com/api/check_login_status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ qr_code_id: qrCodeId })
    });

    const data = await response.json();

    if (data.status === 'success') {
      return {
        success: true,
        cookies: data.cookies,
        userId: data.user_id
      };
    }

    if (data.status === 'failed') {
      return {
        success: false,
        error: 'Login failed'
      };
    }
  }

  return {
    success: false,
    error: 'Timeout'
  };
}
```

### 3. 检测页面可访问性

**视频号小店页面**：
```javascript
async function checkShopPage(cookies) {
  const response = await fetch('https://channels.weixin.qq.com/shop', {
    method: 'GET',
    headers: {
      'Cookie': cookies
    }
  });

  return {
    accessible: response.ok,
    statusCode: response.status
  };
}
```

**视频号助手页面**：
```javascript
async function checkAssistantPage(cookies) {
  const response = await fetch('https://channels.weixin.qq.com/assistant', {
    method: 'GET',
    headers: {
      'Cookie': cookies
    }
  });

  return {
    accessible: response.ok,
    statusCode: response.status
  };
}
```

### 4. 提取和保存CK

**提取CK**：
```javascript
function extractCookies(responseHeaders) {
  const cookies = {};

  // 从Set-Cookie头提取
  const setCookie = responseHeaders.get('set-cookie');
  if (setCookie) {
    const cookiePairs = setCookie.split(';');
    cookiePairs.forEach(pair => {
      const [name, value] = pair.split('=');
      if (name && value) {
        cookies[name.trim()] = value.trim();
      }
    });
  }

  return cookies;
}
```

**保存到数据库**：
```javascript
async function saveCookies(userId, cookies) {
  await db.insert(videoAccountCookies).values({
    id: uuidv4(),
    userId,
    cookies: JSON.stringify(cookies),
    extractedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
    status: 'active'
  });
}
```

### 5. 生成分享链接

```javascript
async function generateShareLink(ckId) {
  const shareToken = generateToken();
  const shareCode = generateShareCode();

  await db.insert(ckShareLinks).values({
    id: uuidv4(),
    ckId,
    shareToken,
    shareCode,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
    status: 'active'
  });

  return {
    downloadLink: `${baseUrl}/api/cookies/${shareToken}/download`,
    shareCode
  };
}
```

### 6. 人工检测接口

**客服人工检测按钮**：
```javascript
// API端点：POST /api/video-accounts/:id/check
async function checkVideoAccountCompliance(videoAccountId) {
  // 检测视频号小店
  const shopCheck = await checkShopPage(cookies);

  // 检测视频号助手
  const assistantCheck = await checkAssistantPage(cookies);

  // 检测是否符合规则
  const complianceResult = await checkComplianceRules(videoAccountId, {
    shopAccessible: shopCheck.accessible,
    assistantAccessible: assistantCheck.accessible
  });

  return {
    videoAccountId,
    shopCheck,
    assistantCheck,
    compliance: complianceResult,
    checkedAt: new Date()
  };
}
```

**规则检测**：
```javascript
async function checkComplianceRules(videoAccountId, checks) {
  const rules = [
    {
      name: '视频号小店可访问',
      check: checks.shopAccessible,
      required: true
    },
    {
      name: '视频号助手可访问',
      check: checks.assistantAccessible,
      required: true
    },
    {
      name: '视频号名称合规',
      check: await checkAccountName(videoAccountId),
      required: true
    },
    {
      name: '视频号头像合规',
      check: await checkAccountAvatar(videoAccountId),
      required: true
    },
    {
      name: '视频号简介合规',
      check: await checkAccountBio(videoAccountId),
      required: true
    }
  ];

  const passed = rules.filter(r => r.check).length;
  const total = rules.length;

  return {
    passed,
    total,
    passedRate: (passed / total) * 100,
    rules,
    compliant: passed === total
  };
}
```

---

## 🗄️ 数据库设计

### video_account_cookies 表

```sql
CREATE TABLE video_account_cookies (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  video_account_id VARCHAR(255),
  cookies TEXT NOT NULL, -- JSON格式
  extracted_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### ck_share_links 表

```sql
CREATE TABLE ck_share_links (
  id VARCHAR(36) PRIMARY KEY,
  ck_id VARCHAR(36) NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  share_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  created_by VARCHAR(255),
  download_count INT DEFAULT 0,
  FOREIGN KEY (ck_id) REFERENCES video_account_cookies(id)
);
```

### video_account_compliance_checks 表

```sql
CREATE TABLE video_account_compliance_checks (
  id VARCHAR(36) PRIMARY KEY,
  video_account_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  checked_by VARCHAR(255), -- 客服人员ID
  shop_accessible BOOLEAN,
  assistant_accessible BOOLEAN,
  account_name_compliant BOOLEAN,
  account_avatar_compliant BOOLEAN,
  account_bio_compliant BOOLEAN,
  passed INT,
  total INT,
  passed_rate DECIMAL(5,2),
  compliant BOOLEAN,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 人工审核界面

### 客服工作台

```javascript
// 审核列表
const auditTasks = await db.query(`
  SELECT
    vac.*,
    u.user_name,
    u.user_avatar
  FROM video_account_cookies vac
  JOIN users u ON vac.user_id = u.id
  WHERE vac.status = 'pending_audit'
  ORDER BY vac.extracted_at DESC
`);

// 审核操作
async function approveAudit(ckId) {
  await db.update(video_account_cookies)
    .set({ status: 'approved', reviewedAt: new Date() })
    .where(eq(video_account_cookies.id, ckId));
}

async function rejectAudit(ckId, reason) {
  await db.update(video_account_cookies)
    .set({
      status: 'rejected',
      reviewReason: reason,
      reviewedAt: new Date()
    })
    .where(eq(video_account_cookies.id, ckId));
}

// 检测按钮
async function manualCheck(ckId) {
  const checkResult = await checkVideoAccountCompliance(ckId);
  return checkResult;
}
```

---

## 🎯 总结

### 系统能实现的功能

✅ **1. 获取最新的视频号小店二维码**
- 通过API调用获取
- 自动发送给用户

✅ **2. 检测登录成功**
- 轮询检测登录状态
- 自动重试机制

✅ **3. 检测页面可访问性**
- 检测视频号小店页面
- 检测视频号助手页面

✅ **4. 提取并保存CK**
- 自动提取Cookie
- 保存到数据库

✅ **5. 下载和分享CK**
- 生成下载链接
- 生成分享码
- 设置过期时间

✅ **6. 人工检测**
- 客服点击按钮检测
- 检测视频号合规性
- 规则配置灵活

### 技术关键点

1. **二维码获取**：调用微信视频号API
2. **登录检测**：轮询机制，最多20次
3. **页面检测**：HTTP请求检测可访问性
4. **CK提取**：从响应头提取Cookie
5. **CK管理**：数据库存储，分享链接生成
6. **人工审核**：任务系统，审核操作，合规性检测

这个方案完整覆盖了你们的业务需求！
