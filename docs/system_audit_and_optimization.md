# Moze 项目现状评估与优化路线图

**生成日期**: 2026-03-05
**版本**: 1.0

## 1. 项目概览 (Project Overview)

Moze 是一个基于 **Nuxt 3** 全栈框架构建的现代化个人财务管理应用，集成了 **Supabase** 作为后端服务（Auth + DB），并采用 **Tailwind CSS** 实现了一套独特的 Glassmorphism（毛玻璃）UI 风格。项目结构包含 `src-tauri` 目录，具备构建跨平台桌面应用（Windows/macOS/Linux）的潜力。

*   **核心技术栈**: 
    *   **Frontend Framework**: Nuxt 3 (Vue 3 Composition API)
    *   **Language**: TypeScript
    *   **Styling**: Tailwind CSS (Glassmorphism Theme)
    *   **Backend/BaaS**: Supabase (PostgreSQL, Auth, Realtime)
    *   **Visualization**: AntV G2Plot
    *   **UI Components**: Shadcn UI (部分集成), Radix Vue, 手写 Tailwind 组件
    *   **Desktop Wrapper**: Tauri (Rust)
*   **当前状态**: 功能基本完备的 MVP（最小可行性产品）阶段。UI 风格鲜明，但代码复用率、架构规范性及部分用户体验细节有待提升。

## 2. 功能模块梳理 (Functional Module Audit)

| 模块名称 | 功能描述 | 当前状态 | 关键文件/路径 | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **身份认证** | 用户注册、登录、会话管理 | **已修改** | `app/pages/login.vue`<br>`app/middleware/auth.global.ts` | 已移除 Magic Link/WeChat，集成 **GitHub OAuth**。需完善登录回调的加载状态和错误处理。 |
| **仪表盘** | 资产概览、收支趋势、快捷入口 | **运行中** | `app/pages/dashboard.vue` | 核心页面，逻辑较为臃肿。包含大量直接的 API 调用和数据处理逻辑，急需重构。 |
| **交易管理** | 记账列表、增删改查、筛选 | **运行中** | `app/pages/transactions/index.vue` | 核心业务模块。列表渲染性能和交互体验有优化空间。 |
| **账户体系** | 资产账户管理（现金/银行卡/投资） | **运行中** | `app/pages/accounts/index.vue` | 需确保账户余额与交易记录的实时联动（目前依赖页面刷新或手动触发）。 |
| **分类管理** | 收支分类配置、图标映射 | **已优化** | `app/pages/categories/index.vue` | 最近修复了图标显示问题，增加了名称到图标的动态映射逻辑。 |
| **报表分析** | 多维度财务报表可视化 | **运行中** | `app/pages/reports/index.vue`<br>`components/report/*` | 使用 AntV G2Plot。部分图表逻辑已封装，但缺乏统一的配置管理。 |
| **投资追踪** | 投资组合快照、收益分析 | **运行中** | `app/pages/investments/snapshots.vue` | 针对特定资产类型的管理，功能相对独立。 |
| **UI 系统** | 界面布局、图标、通用组件 | **混合** | `app/layouts/*`<br>`components/ui/*`<br>`assets/iconfont/sprite.svg` | 混用了 Shadcn 组件和手写 Tailwind 样式。图标系统使用 SVG Sprite。 |

## 3. 系统深度分析 (System Analysis)

### 3.1 架构与代码质量 (Architecture & Code Quality)
*   **逻辑耦合严重**: 在 `dashboard.vue` 等页面中，业务逻辑（数据获取、计算、转换）与 UI 渲染代码高度耦合。例如 `loadSummary` 函数包含数百行代码，难以维护和测试。
*   **状态管理缺失**: 项目虽然使用了 Nuxt 的 `useState`，但 `package.json` 中**未发现 Pinia** 依赖。对于财务类应用，全局状态（如用户偏好、缓存的分类数据、当前账户列表）的管理至关重要，缺乏 Pinia 会导致频繁的 API 重复请求。
*   **API 调用分散**: `supabase.from('...')` 的调用散落在各个页面组件中。一旦数据库 Schema 变更，需要修改多处代码。应封装为 Service 层或 Composables (e.g., `useTransactionService`).
*   **类型安全**: 项目定义了 `database.types.ts`，这是一个很好的实践，但需要确保在所有 API 调用中严格使用这些类型，避免 `any` 类型的使用。

### 3.2 性能与体验 (Performance & UX)
*   **加载性能**: 图表库（AntV G2Plot）体积较大，如果未进行动态导入优化，可能会影响首屏加载速度（LCP）。
*   **UI 一致性**: 项目引入了 `shadcn-nuxt` 和 `radix-vue`，但在部分页面仍大量使用原生的 HTML 元素和复杂的 Tailwind 类名。建议统一使用 UI 组件库以保持风格一致。
*   **交互反馈**: 部分异步操作（如删除交易、更新账户）缺乏明确的 Loading 状态或 Toast 提示。

### 3.3 数据库与后端 (Database & Backend)
*   **安全性**: 依赖 Supabase 的 RLS (Row Level Security) 策略。需定期审计策略，确保用户只能访问自己的财务数据。
*   **计算压力**: 目前大部分数据聚合（如“本月支出”、“分类汇总”）是在前端通过 JavaScript 计算的。随着数据量增长，这会导致前端卡顿。建议利用 Supabase 的 **Database Functions (RPC)** 或 **Views** 将聚合计算下沉到数据库层。

## 4. 优化建议清单 (Optimization Roadmap)

为了将 Moze 从 MVP 提升为生产级应用，建议按以下优先级进行优化：

### 第一阶段：基础重构与规范化 (Immediate - High Priority)
1.  **引入 Pinia 状态管理**:
    *   安装 Pinia。
    *   创建 `stores/user.ts` (用户信息), `stores/categories.ts` (分类缓存), `stores/accounts.ts` (账户列表)。
    *   目标：减少页面切换时的 API 请求，提升响应速度。
2.  **封装业务逻辑 (Composables)**:
    *   创建 `composables/useTransactions.ts`：封装交易的增删改查逻辑。
    *   创建 `composables/useReports.ts`：封装报表数据的聚合计算逻辑。
    *   将 `dashboard.vue` 中的 `loadSummary` 拆解并移入 Composable。
3.  **UI 组件标准化**:
    *   全面使用 `components/ui` 下的 Shadcn 组件替换手写的 `input`, `button`, `card` 等元素。
    *   提取通用布局组件，如 `PageHeader`, `DataCard`。

### 第二阶段：功能增强与体验提升 (Short-term)
1.  **数据库性能优化**:
    *   在 Supabase 中创建 SQL 视图（Views）来处理复杂的报表查询（如“按月分类汇总”），替代前端的循环计算。
2.  **增强图表交互**:
    *   封装统一的图表组件 `components/charts/BaseChart.vue`，统一配色和交互行为。
    *   添加图表下钻功能（点击分类查看明细）。
3.  **完善 GitHub 登录体验**:
    *   处理登录回调的加载状态（Loading Skeleton）。
    *   完善错误提示机制（Toast Notification）。

### 第三阶段：长期演进与平台特性 (Long-term)
1.  **Tauri 桌面端深度集成**:
    *   配置 GitHub Actions 自动构建桌面端安装包。
    *   利用 Tauri API 实现本地数据加密存储或离线模式。
2.  **自动化测试**:
    *   引入 Vitest 进行单元测试（特别是针对财务计算逻辑）。
    *   引入 Playwright 进行 E2E 测试（确保登录和记账流程稳定）。
