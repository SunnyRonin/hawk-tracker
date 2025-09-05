# PV/UV 数据实时更新测试指南

## 📊 功能概述

DashboardPage 现在支持实时显示 PV（页面访问量）和 UV（独立访客数）数据，数据来源于 Hawk Tracker 监控系统。

## 🚀 快速开始

### 1. 启动服务

确保以下服务正在运行：

```bash
# 启动服务器（端口 3001）
cd apps/server
pnpm dev

# 启动 Web 应用（端口 3000）
cd apps/web
pnpm dev
```

### 2. 访问 Dashboard

打开浏览器访问：`http://localhost:3000`

## 📈 数据来源

### PV（页面访问量）

- **数据来源**：`BehaviorPlugin` 收集的页面加载和路由变化事件
- **事件类型**：`load`、`route_change`、`pageView`
- **计算方式**：统计所有页面访问相关事件的总数

### UV（独立访客数）

- **数据来源**：从行为数据中提取用户唯一标识
- **标识字段**：`userUuid`、`sdkUserUuid`、`userId`、`sessionId`
- **计算方式**：使用 `Set` 去重统计不同用户数量

## 🧪 测试方法

### 方法1：使用测试脚本

1. 在浏览器控制台中运行测试脚本：

```javascript
// 加载测试脚本
fetch('/test-pv-uv.js')
  .then((r) => r.text())
  .then(eval);

// 测试页面访问
testPVUV.testPageView();

// 测试用户行为
testPVUV.testUserAction();

// 测试错误上报
testPVUV.testError();

// 检查服务器状态
testPVUV.checkServerStatus();
```

### 方法2：手动触发事件

1. **页面访问测试**：
   - 刷新页面
   - 点击导航链接
   - 使用浏览器的前进/后退按钮

2. **用户行为测试**：
   - 点击页面上的按钮
   - 滚动页面
   - 输入表单

3. **错误测试**：
   - 在控制台执行：`throw new Error('测试错误')`

### 方法3：直接 API 调用

```bash
# 检查统计数据
curl http://localhost:3001/api/stats

# 查看行为数据
curl http://localhost:3001/api/data?type=behaviors&limit=10
```

## 🔄 实时更新机制

### 自动刷新

- **频率**：每 30 秒自动刷新一次
- **触发条件**：页面加载后自动开始
- **停止条件**：页面卸载时自动停止

### 手动刷新

- **按钮位置**：Dashboard 右上角的"刷新数据"按钮
- **功能**：立即获取最新数据
- **状态显示**：刷新时显示加载动画

## 📊 数据展示

### 指标卡片

1. **活跃用户数 (UV)**：独立访客数量
2. **页面浏览量 (PV)**：总页面访问量
3. **总事件数**：所有监控事件总数
4. **错误率**：错误事件占比

### 状态信息

- **最后更新时间**：显示在页面标题下方
- **自动刷新提示**：显示刷新频率
- **实时状态指示器**：绿色圆点表示数据正常

## 🛠️ 故障排除

### 常见问题

1. **数据不更新**
   - 检查服务器是否运行在 `localhost:3001`
   - 检查网络连接
   - 查看浏览器控制台错误信息

2. **PV/UV 数据为 0**
   - 确认 `BehaviorPlugin` 已正确配置
   - 检查是否有用户访问页面
   - 验证数据上报是否成功

3. **API 请求失败**
   - 检查 CORS 配置
   - 确认 API 端点正确
   - 查看服务器日志

### 调试步骤

1. **检查服务器状态**：

```bash
curl http://localhost:3001/api/stats
```

2. **查看行为数据**：

```bash
curl http://localhost:3001/api/data?type=behaviors
```

3. **检查浏览器网络请求**：
   - 打开开发者工具
   - 查看 Network 标签页
   - 检查 API 请求状态

## 📝 配置说明

### 监控配置

在 `apps/web/app/monitor.ts` 中确保以下配置：

```typescript
const monitorConfig = {
  // ... 其他配置
  pv: true, // 启用页面访问统计
  // ...
};

// 确保 BehaviorPlugin 已启用
monitorInstance.use(BehaviorPlugin, {
  // ... 插件配置
});
```

### API 端点

- **统计数据**：`http://localhost:3001/api/stats`
- **行为数据**：`http://localhost:3001/api/data?type=behaviors`
- **数据上报**：`http://localhost:3001/api`

## 🎯 预期结果

### 正常情况

- PV 数据应该随着页面访问增加
- UV 数据应该反映不同用户的数量
- 数据每 30 秒自动更新
- 手动刷新按钮可以立即更新数据

### 数据示例

```json
{
  "active-users": "15",
  "page-views": "127",
  "total-events": "342",
  "error-rate": "2.3%"
}
```

## 🔗 相关文件

- `apps/web/app/components/dashboardPage/DashboardPage.tsx` - 主组件
- `apps/web/app/components/dashboardPage/util.ts` - 数据获取逻辑
- `apps/web/app/monitor.ts` - 监控配置
- `packages/plugin-behavior/src/index.ts` - 行为数据收集
- `apps/server/src/router.ts` - 服务器 API
