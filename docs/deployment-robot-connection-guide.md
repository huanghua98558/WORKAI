# 部署环境机器人连接配置指南

## 问题描述

在沙盒环境中可以成功连接 WorkTool 机器人，但在部署后无法连接。

## 常见原因

1. **网络隔离**：部署环境可能无法访问外网的 WorkTool API 服务
2. **内网地址**：需要使用内网 IP 地址而不是公网域名
3. **防火墙限制**：防火墙阻止了对 WorkTool API 服务的访问
4. **代理配置**：需要通过代理服务器访问 WorkTool API

## 解决方案

### 方案一：使用环境变量配置（推荐）

1. 编辑 `.env.local` 文件（部署时修改为实际环境变量）：

```bash
# WorkTool API 服务地址
# 根据实际部署环境修改为可访问的地址
NEXT_PUBLIC_WORKTOOL_API_BASE_URL=http://内网IP:端口/wework/
# 或者
NEXT_PUBLIC_WORKTOOL_API_BASE_URL=https://api.worktool.ymdyes.cn/wework/
```

2. 重启应用使环境变量生效

### 方案二：在界面中手动修改

1. 打开"机器人管理"页面
2. 点击"添加机器人"或编辑现有机器人
3. 在"API 配置"部分，找到"API Base URL"字段
4. 修改为实际可访问的地址，例如：
   - `http://192.168.1.100:8080/wework/`（内网地址）
   - `https://api.worktool.ymdyes.cn/wework/`（公网地址）
5. 点击"测试连接"按钮验证配置是否正确
6. 点击"保存"按钮保存配置

### 方案三：使用代理服务

如果部署环境需要通过代理访问 WorkTool API：

1. 确保后端服务可以访问 WorkTool API
2. 在后端配置代理设置（修改 `server/.env` 文件）：

```bash
HTTP_PROXY=http://proxy-server:port
HTTPS_PROXY=http://proxy-server:port
```

3. 重启后端服务

## 诊断步骤

### 1. 测试连接

在添加/编辑机器人时：
1. 输入正确的 Robot ID 和 API Base URL
2. 点击"测试连接"按钮
3. 查看测试结果：
   - ✅ **成功**：可以保存配置
   - ❌ **失败**：检查 API Base URL 是否正确

### 2. 验证配置

点击"验证配置"按钮，检查：
- Robot ID 是否有效
- 机器人是否已激活
- 连接参数是否正确

### 3. 查看详细错误

如果测试失败，会显示详细的错误信息：
- **连接超时**：检查网络连接和防火墙设置
- **404 Not Found**：检查 API Base URL 是否正确
- **401 Unauthorized**：检查 Robot ID 是否有效
- **500 Server Error**：联系 WorkTool 技术支持

## 常见配置示例

### 内网部署

如果 WorkTool API 服务部署在内网：

```bash
NEXT_PUBLIC_WORKTOOL_API_BASE_URL=http://192.168.1.100:8080/wework/
```

### 公网部署

如果 WorkTool API 服务部署在公网：

```bash
NEXT_PUBLIC_WORKTOOL_API_BASE_URL=https://api.worktool.ymdyes.cn/wework/
```

### Docker 环境

如果使用 Docker 部署：

```bash
# 使用 Docker 网络内部地址
NEXT_PUBLIC_WORKTOOL_API_BASE_URL=http://worktool-api:8080/wework/
```

## 技术支持

如果以上方案都无法解决问题：

1. 检查 WorkTool API 服务是否正常运行
2. 检查网络连接和防火墙设置
3. 查看 `/app/work/logs/bypass/app.log` 日志文件
4. 联系系统管理员或 WorkTool 技术支持

## 注意事项

- ⚠️ 部署前请确保在沙盒环境中测试所有功能
- ⚠️ 修改 API Base URL 会影响所有使用该地址的机器人
- ⚠️ 建议在非生产环境先进行测试
- ✅ 定期检查机器人连接状态
- ✅ 配置合适的回调地址以确保消息正常接收
