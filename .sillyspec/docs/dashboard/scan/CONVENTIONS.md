---
author: qinyi
created_at: 2026-06-03T10:03:00+08:00
---

# CONVENTIONS — Dashboard 代码约定

## 框架隐形规则

- **全量 script setup**：所有组件使用 `<script setup>` 语法糖，无 Options API 组件
- **Composition API 优先**：使用 `ref` / `reactive` / `computed` / `watch` / `onMounted` 等组合式 API
- **defineProps / defineEmits 编译器宏**：Props 和 Events 通过编译器宏声明，不使用 `props: {}` Options
- **PascalCase 组件命名**：文件名和组件名均为 PascalCase（`ProjectList.vue`、`DocPreview.vue`）
- **`use*` composable 模式**：可复用逻辑封装为 `use*.js`（`useDashboard`、`useWebSocket`、`useKeyboard`、`useLayout`）
- **单根组件**：每个 `.vue` 文件只有一个默认导出组件，不包含子组件定义
- **Naive UI 原生组件**：UI 基础组件使用 Naive UI，不自己实现按钮/输入框/对话框等

## 代码风格

### 命名
- **组件文件**：PascalCase（`PipelineView.vue`）
- **composable 文件**：camelCase，`use` 前缀（`useDashboard.js`）
- **Props**：camelCase（`isOpen`、`projectName`）
- **Events**：kebab-case（`select-project`、`close`）
- **CSS 类**：Tailwind 原子类为主，自定义类用 camelCase

### 状态管理
- **无 Vuex/Pinia**：状态通过 composable 管理（`useDashboard` 使用 `reactive` 存储全局状态）
- **跨组件通信**：通过 Props 下传、Emit 上报，或共享 composable 实例
- **WebSocket 状态**：`useWebSocket` 独立管理连接状态，通过回调通知 `useDashboard`

### 样式
- **Tailwind CSS 为主**：大部分样式用 Tailwind 原子类
- **scoped style 为辅**：组件特有样式用 `<style scoped>`
- **不使用 CSS Modules 或 BEM**

## 典型模式

### 1. Composable 返回对象模式
composable 函数返回包含 state/getters/actions 的对象：
```js
// useDashboard.js
const dashboard = reactive({ projects: [], activeProject: null, logs: [] })
const hasProjects = computed(() => state.projects.length > 0)
return { state: dashboard, hasProjects, loadProjects, ... }
```

### 2. Props + Computed 派生模式
组件通过 Props 接收原始数据，用 Computed 派生展示值：
```js
const props = defineProps({ isOpen: Boolean, projects: Array })
const filteredProjects = computed(() => props.projects.filter(...))
```

### 3. WebSocket 事件驱动模式
`useWebSocket` 监听服务端推送，更新 `useDashboard` 状态：
```js
ws.on('message', (event) => { const data = JSON.parse(event.data); dashboard.handleEvent(data) })
```

### 4. 命令面板 (Command Palette) 模式
`CommandPalette.vue` 支持 Ctrl+K 唤起，输入过滤，选择执行：
```js
const emit = defineEmits(['close', 'select-project', 'select-stage'])
```

### 5. 拖拽分割面板模式
`VResizeHandle.vue` / `HResizeHandle.vue` 实现可拖拽的面板分割，通过 `useLayout` 管理布局尺寸并持久化到 localStorage。
