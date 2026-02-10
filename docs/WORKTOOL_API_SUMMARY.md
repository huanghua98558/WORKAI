# WorkTool 机器人 API 关键接口总结

> **文档版本**: v1.0
> **创建时间**: 2024-01-01
> **基于**: assets/机器人API完整.txt

---

## 📋 目录

- [消息回调接口](#消息回调接口)
- [发送消息接口](#发送消息接口)
- [机器人信息接口](#机器人信息接口)
- [机器人在线状态接口](#机器人在线状态接口)
- [机器人登录日志接口](#机器人登录日志接口)
- [接口限制说明](#接口限制说明)

---

## 1. 消息回调接口

### 接口信息

- **方法**: `POST`
- **Content-Type**: `application/json`
- **Path**: 用户自定义的接口地址（通过"机器人消息回调配置"设置）
- **说明**: 接收企业微信的所有单聊和群聊消息

### 请求参数

```typescript
interface WorkToolMessageCallback {
  /**
   * 问题文本（去除@me后的纯文本）
   */
  spoken: string;

  /**
   * 原始问题文本（包含@me）
   */
  rawSpoken: string;

  /**
   * 提问者名称
   */
  receivedName: string;

  /**
   * QA所在群名（群聊）
   */
  groupName: string;

  /**
   * QA所在群备注名（群聊）
   */
  groupRemark: string;

  /**
   * QA所在房间类型
   * - 1 = 外部群
   * - 2 = 外部联系人
   * - 3 = 内部群
   * - 4 = 内部联系人
   */
  roomType: number;

  /**
   * 是否@机器人（群聊）
   */
  atMe: boolean;

  /**
   * 消息类型
   * - 0 = 未知
   * - 1 = 文本
   * - 2 = 图片
   * - 3 = 语音
   * - 5 = 视频
   * - 7 = 小程序
   * - 8 = 链接
   * - 9 = 文件
   * - 13 = 合并记录
   * - 15 = 带回复文本
   */
  textType: number;

  /**
   * 图片base64 (png) - 仅当textType=2时存在
   */
  fileBase64?: string;
}
```

### 响应格式

```typescript
interface CallbackResponse {
  /**
   * 0 = 调用成功
   * -1或其他值 = 调用失败
   */
  code: number;

  /**
   * 对本次接口调用的信息描述
   */
  message: string;
}
```

### 重要说明

1. **响应时间限制**: 消息回调接口必须在 **3秒内** 处理响应，否则平台将放弃本次请求
2. **异步处理**: 如果接口处理耗时较长，应立即响应，处理消息后异步调用发送消息等指令进行回复
3. **图片消息**: 需要在 WorkTool APP 内打开图片消息回调开关（默认关闭）
4. **文件消息**: 仅可识别消息类型无法提取内容

---

## 2. 发送消息接口

### 接口信息

- **方法**: `POST`
- **Path**: `https://api.worktool.ymdyes.cn/wework/sendRawMessage`
- **Content-Type**: `application/json`

### 请求参数

#### Query 参数

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| robotId | string | 是 | 客户端链接唯一标识 |

#### Body 参数

```typescript
interface SendMessageRequest {
  /**
   * 通讯类型
   * 固定值 = 2
   */
  socketType: number;

  /**
   * 消息列表
   */
  list: SendMessageItem[];
}

interface SendMessageItem {
  /**
   * 消息类型
   * - 203 = 文本消息
   * - 218 = 推送图片/音视频/文件
   * - 205 = 转发消息
   * - 206 = 创建外部群
   * - 207 = 修改群信息
   * - 219 = 解散群
   * - 208 = 推送微盘图片
   * - 209 = 推送微盘文件
   * - 213 = 添加好友/修改好友信息
   * - 220 = 从外部群添加好友
   * - 225 = 修改群成员备注
   * - 234 = 删除联系人
   * - 221 = 添加待办
   * - 226 = 消息撤回
   * - 512 = 获取指定群成员信息
   * - 304 = 清空客户端指令
   * - 305 = 清除指定客户端指令
   */
  type: number;

  /**
   * 待发送姓名（昵称或群名）
   * type=203时必需
   */
  titleList?: string[];

  /**
   * 发送文本内容（\n换行）
   * type=203时必需
   */
  receivedContent?: string;

  /**
   * @的人（at所有人用"@所有人"）
   * type=203时可选
   */
  atList?: string[];

  /**
   * 文件名称（自定义）
   * type=218时必需
   */
  objectName?: string;

  /**
   * 网络文件地址
   * type=218时必需
   */
  fileUrl?: string;

  /**
   * 文件类型
   * - image = 图片
   * - audio = 音频
   * - video = 视频
   * - * = 其他
   * type=218时必需
   */
  fileType?: string;

  /**
   * 附加留言（选填）
   * type=208, 209时可选
   */
  extraText?: string;

  /**
   * 群名（有备注名优先用备注名）
   * type=207时必需
   */
  groupName?: string;

  /**
   * 修改群名（选填）
   * type=207时可选
   */
  newGroupName?: string;

  /**
   * 修改群公告（选填）
   * type=207时可选
   */
  newGroupAnnouncement?: string;

  /**
   * 修改群备注（选填）
   * type=207时可选
   */
  groupRemark?: string;

  /**
   * 添加群成员名称列表（选填）
   * type=207时可选
   */
  selectList?: string[];

  /**
   * 移除群成员名称列表（选填）
   * type=207时可选
   */
  removeList?: string[];

  /**
   * 拉人是否附带历史记录（选填）
   * type=207时可选
   */
  showMessageHistory?: boolean;

  /**
   * 好友信息
   * type=213, 220时可选
   */
  friend?: FriendInfo;
}

interface FriendInfo {
  /**
   * 手机号
   * type=213添加好友时必需
   */
  phone?: string;

  /**
   * 昵称或备注名
   * name和phone只要填一种
   * type=213, 220时必需
   */
  name?: string;

  /**
   * 新备注名（选填）
   */
  markName?: string;

  /**
   * 标注信息（选填）
   */
  markExtra?: string;

  /**
   * 标签列表（选填）
   */
  tagList?: string[];

  /**
   * 留言（选填）
   */
  leavingMsg?: string;
}
```

### 请求示例

#### 发送文本消息

```json
{
  "socketType": 2,
  "list": [
    {
      "type": 203,
      "titleList": ["仑哥"],
      "receivedContent": "你好~",
      "atList": []
    }
  ]
}
```

#### 发送图片消息

```json
{
  "socketType": 2,
  "list": [
    {
      "type": 218,
      "titleList": ["仑哥"],
      "objectName": "logo.png",
      "fileUrl": "https://cdn.asrtts.cn/static/image/logo3_180_raw.png",
      "fileType": "image",
      "extraText": "附加留言（选填）"
    }
  ]
}
```

### 响应格式

```typescript
interface SendMessageResponse {
  code: number;
  message: string;
  data: string;
}
```

---

## 3. 机器人信息接口

### 接口信息

- **方法**: `GET`
- **Path**: `https://api.worktool.ymdyes.cn/robot/robotInfo/get`

### 请求参数

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| robotId | string | 是 | 客户端链接唯一标识 |
| key | string | 否 | 校验码 |

### 响应格式

```typescript
interface RobotInfo {
  code: number;
  message: string;
  data: {
    /**
     * 机器人ID
     */
    robotId: string;

    /**
     * 企微昵称
     */
    name: string;

    /**
     * 消息回调地址（0=关闭，1=开启）
     */
    openCallback: number;

    /**
     * 加解密方式
     * - 0 = 不加密
     * - 1 = AES加密
     */
    encryptType: number;

    /**
     * 创建时间
     */
    createTime: string;

    /**
     * 是否能添加好友
     */
    enableAdd: boolean;

    /**
     * 消息回调策略/回复策略
     * - 0 = 仅回复@我的消息
     * - 1 = 回复所有消息
     */
    replyAll: number;

    /**
     * 是否开启key校验
     * - 0 = 关闭
     * - 1 = 开启
     */
    robotKeyCheck: number;

    /**
     * 回调请求类型
     * - 1 = form-data
     * - 2 = json
     */
    callBackRequestType: number;

    /**
     * 机器人类型
     * - 0 = 企业微信
     * - 1 = 微信
     */
    robotType: number;
  };
}
```

---

## 4. 机器人在线状态接口

### 接口信息

- **方法**: `GET`
- **Path**: `https://api.worktool.ymdyes.cn/robot/robotInfo/online`

### 请求参数

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| robotId | string | 是 | 机器人编号 |

### 响应格式

```typescript
/**
 * 返回在线状态
 * - true = 在线
 * - false = 离线
 */
type OnlineStatus = boolean | {};
```

---

## 5. 机器人登录日志接口

### 接口信息

- **方法**: `GET`
- **Path**: `https://api.worktool.ymdyes.cn/robot/robotInfo/onlineInfos`

### 请求参数

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| robotId | string | 是 | 机器人编号 |
| key | string | 否 | 校验码 |
| date | string | 否 | 日期，格式：yyyy-MM-dd |

### 响应格式

```typescript
interface OnlineLogs {
  // 具体格式待补充
  [key: string]: any;
}
```

---

## 6. 接口限制说明

### QPM 限制

- **指令消息 IP 请求频率**: **60 QPM**（每分钟60次请求）
- **超过限制的请求**: 会被拦截丢弃
- **多次频繁被拦截**: 会对IP进行拦截

### 重要注意事项

1. **批量发送**: 可以使用批量发送接口减少总请求次数（单次最多100条指令）
2. **API 请求频率**: 60 QPM 或 20 QPS，超出的请求会收到 429 错误提示
3. **响应时间**: 消息回调接口必须在3秒内响应

---

## 7. 消息类型映射表

| textType | 说明 | 备注 |
|----------|------|------|
| 0 | 未知 | - |
| 1 | 文本 | - |
| 2 | 图片 | fileBase64 字段存在 |
| 3 | 语音 | - |
| 5 | 视频 | - |
| 7 | 小程序 | - |
| 8 | 链接 | - |
| 9 | 文件 | 仅可识别消息类型无法提取内容 |
| 13 | 合并记录 | - |
| 15 | 带回复文本 | - |

---

## 8. 房间类型映射表

| roomType | 说明 |
|----------|------|
| 1 | 外部群 |
| 2 | 外部联系人 |
| 3 | 内部群 |
| 4 | 内部联系人 |

---

## 9. 指令类型映射表

| type | 说明 | 必需参数 |
|------|------|---------|
| 203 | 文本消息 | titleList, receivedContent |
| 218 | 推送图片/音视频/文件 | titleList, objectName, fileUrl, fileType |
| 205 | 转发消息 | titleList, receivedName, originalContent, nameList, textType |
| 206 | 创建外部群 | groupName, selectList |
| 207 | 修改群信息 | groupName |
| 219 | 解散群 | groupName |
| 208 | 推送微盘图片 | titleList, objectName |
| 209 | 推送微盘文件 | titleList, objectName |
| 213 | 添加好友/修改好友信息 | friend |
| 220 | 从外部群添加好友 | groupName, friend |
| 225 | 修改群成员备注 | groupName, friend |
| 234 | 删除联系人 | friend |
| 221 | 添加待办 | titleList, receivedContent |
| 226 | 消息撤回 | titleList, originalContent, textType |
| 304 | 清空客户端指令 | type |
| 305 | 清除指定客户端指令 | type, originalContent |
| 512 | 获取指定群成员信息 | groupName |

---

## 10. 关键差异说明

### 与之前文档的差异

1. **消息回调参数**:
   - 之前的文档使用了 `roomType`，现在确认是 **必需参数**
   - 之前没有 `groupRemark` 字段，现在确认是 **必需参数**

2. **发送消息接口**:
   - `socketType` 必须为 **2**
   - `type` 根据不同消息类型有不同的值
   - 支持 **批量发送**（最多100条指令）

3. **机器人在线状态**:
   - 返回值为 **boolean** 或空对象 `{}`

---

**文档版本**: v1.0
**创建日期**: 2024-01-01
**状态**: ✅ 已确认
