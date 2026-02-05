# 话术模板批量删除功能实现报告

## 修改日期
2025年1月X日

## 功能需求

用户希望在话术模板中增加一次性删除多个话术模板的功能，提高操作效率。

## 实现方案

### 1. 状态管理

添加选中模板ID的集合状态：

```typescript
const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
```

使用 `Set` 数据结构存储选中的模板ID，确保唯一性和高效的查询操作。

### 2. 批量删除函数

实现批量删除逻辑：

```typescript
const handleBatchDeleteTemplates = async () => {
  if (selectedTemplateIds.size === 0) {
    toast.warning('请先选择要删除的模板');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedTemplateIds.size} 个模板吗？`)) return;

  try {
    // 并发删除所有选中的模板
    const promises = Array.from(selectedTemplateIds).map(id =>
      fetch(`/api/proxy/ai/templates/${id}`, { method: 'DELETE' })
    );

    await Promise.all(promises);

    toast.success(`成功删除 ${selectedTemplateIds.size} 个模板`);
    setSelectedTemplateIds(new Set());
    loadMessageTemplates();
  } catch (error) {
    console.error('批量删除失败:', error);
    toast.error('批量删除失败');
  }
};
```

**技术要点**：
- 使用 `Promise.all` 实现并发删除，提高性能
- 删除前进行二次确认，防止误操作
- 删除成功后清空选中状态并重新加载列表
- 错误处理和用户提示

### 3. 切换选中状态

实现单个模板的选中/取消选中：

```typescript
const handleToggleTemplateSelection = (id: string) => {
  const newSelected = new Set(selectedTemplateIds);
  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    newSelected.add(id);
  }
  setSelectedTemplateIds(newSelected);
};
```

### 4. 全选/取消全选

实现全选和取消全选功能：

```typescript
const handleToggleAllTemplates = (checked: boolean) => {
  if (checked) {
    setSelectedTemplateIds(new Set(templates.map(t => t.id)));
  } else {
    setSelectedTemplateIds(new Set());
  }
};
```

### 5. UI优化

#### 5.1 添加批量删除按钮

在CardHeader中添加批量删除按钮，仅在有选中项时显示：

```typescript
{selectedTemplateIds.size > 0 && (
  <Button
    variant="destructive"
    onClick={handleBatchDeleteTemplates}
  >
    <Trash2 className="h-4 w-4 mr-2" />
    批量删除 ({selectedTemplateIds.size})
  </Button>
)}
```

**UI特性**：
- 使用 `variant="destructive"` 样式，红色警告色
- 动态显示选中的模板数量
- 仅在有选中项时显示，保持界面简洁

#### 5.2 添加全选/取消全选控制

在列表上方添加全选控制区：

```typescript
{templates.length > 0 && (
  <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
    <button
      type="button"
      onClick={() => handleToggleAllTemplates(selectedTemplateIds.size === 0)}
      className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors"
    >
      {selectedTemplateIds.size === templates.length ? (
        <CheckSquare className="h-5 w-5 text-primary" />
      ) : (
        <Square className="h-5 w-5 text-muted-foreground" />
      )}
      <span className="text-sm">
        {selectedTemplateIds.size === templates.length ? '取消全选' : '全选'}
      </span>
    </button>
    {selectedTemplateIds.size > 0 && (
      <span className="text-sm text-muted-foreground">
        已选择 {selectedTemplateIds.size} 个模板
      </span>
    )}
  </div>
)}
```

**UI特性**：
- 使用灰色背景区域，与列表区分
- 全选状态使用勾选图标，未全选使用方框图标
- 动态显示全选/取消全选文字
- 显示已选择的模板数量

#### 5.3 添加复选框

在每个模板项左侧添加复选框：

```typescript
<button
  type="button"
  onClick={() => handleToggleTemplateSelection(template.id)}
  className="flex-shrink-0"
>
  {selectedTemplateIds.has(template.id) ? (
    <CheckSquare className="h-5 w-5 text-primary" />
  ) : (
    <Square className="h-5 w-5 text-muted-foreground" />
  )}
</button>
```

**UI特性**：
- 使用 `CheckSquare` 和 `Square` 图标表示选中状态
- 选中时使用主题色，未选中时使用灰色
- 添加 `flex-shrink-0` 防止压缩

#### 5.4 选中状态视觉反馈

选中的模板项添加背景色和边框高亮：

```typescript
<div
  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
    selectedTemplateIds.has(template.id) ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
  }`}
>
```

**视觉效果**：
- 选中项：浅蓝色背景 + 主题色边框
- 未选中项：白色背景 + 灰色边框
- 平滑的过渡动画

### 6. 图标导入

添加所需的图标组件：

```typescript
import {
  // ... 其他图标
  CheckSquare,  // 选中状态的复选框
  Square       // 未选中状态的复选框
} from 'lucide-react';
```

## 功能特性

### 1. 单选功能
- ✅ 点击复选框选中/取消选中单个模板
- ✅ 视觉状态清晰（勾选图标 vs 方框图标）

### 2. 全选功能
- ✅ 一键全选所有模板
- ✅ 一键取消全选
- ✅ 智能切换（已全选时点击取消全选）

### 3. 批量删除功能
- ✅ 同时删除多个选中的模板
- ✅ 删除前二次确认
- ✅ 显示删除数量
- ✅ 并发删除，提高性能

### 4. 用户体验优化
- ✅ 选中状态视觉反馈（背景色 + 边框）
- ✅ 动态显示选中数量
- ✅ 批量删除按钮仅在有选中项时显示
- ✅ 删除操作有提示消息
- ✅ 错误处理和友好提示

## 修改文件

- `src/components/ai-module.tsx`
  - 第207行：添加 `selectedTemplateIds` 状态
  - 第18-20行：导入 `CheckSquare` 和 `Square` 图标
  - 第553-604行：添加批量删除、切换选中、全选/取消全选函数
  - 第900-985行：更新话术模板UI，添加复选框和批量删除按钮

## 使用流程

### 流程1：批量删除多个模板
1. 点击模板左侧的复选框，选择要删除的模板
2. 或点击"全选"按钮，选择所有模板
3. 点击"批量删除 (N)"按钮（N为选中的模板数量）
4. 确认删除操作
5. 系统并发删除所有选中的模板
6. 显示删除成功的提示消息

### 流程2：取消选择
1. 点击已选中的复选框，取消选中单个模板
2. 或点击"取消全选"按钮，取消所有选择
3. 批量删除按钮自动隐藏

### 流程3：单个删除
1. 保持原有的单个删除功能
2. 点击单个模板的"删除"按钮
3. 确认删除操作
4. 删除该模板

## 技术亮点

1. **并发删除**：使用 `Promise.all` 实现并发删除，提高性能
2. **状态管理**：使用 `Set` 数据结构，确保唯一性和高效查询
3. **UI反馈**：选中状态有明确的视觉反馈（背景色 + 边框 + 图标）
4. **用户体验**：批量删除按钮仅在有选中项时显示，保持界面简洁
5. **错误处理**：完善的错误处理和用户提示
6. **二次确认**：删除前进行二次确认，防止误操作

## 验证步骤

1. 打开浏览器访问 http://localhost:5000
2. 切换到"话术模板"标签页
3. 验证：
   - ✅ 每个模板左侧有复选框
   - ✅ 点击复选框可以选中/取消选中
   - ✅ 选中项有背景色和边框高亮
   - ✅ 有全选/取消全选控制区
   - ✅ 选中数量动态显示
4. 选择多个模板
5. 验证：
   - ✅ 批量删除按钮出现，显示选中数量
   - ✅ 点击批量删除按钮，弹出确认对话框
   - ✅ 确认后，选中的模板被删除
   - ✅ 显示删除成功的提示消息
   - ✅ 选中状态被清空
6. 点击"全选"按钮
7. 验证：
   - ✅ 所有模板被选中
   - ✅ 复选框显示勾选状态
   - ✅ 模板项有背景色高亮
8. 再次点击全选控制区
9. 验证：
   - ✅ 取消全选，所有模板未被选中

## 后续优化建议

1. 可以考虑添加按分类筛选模板的功能
2. 可以考虑添加模板的拖拽排序功能
3. 可以考虑添加模板的导入/导出功能
4. 可以考虑添加模板的批量编辑功能（如批量启用/禁用）
5. 可以考虑添加模板的搜索功能
