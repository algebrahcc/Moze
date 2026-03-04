# Moze / 默资记账

Moze 是一款聚焦「日常记账 + 投资净值」的一体化资产管理应用，支持 Web（Nuxt）与桌面端（Tauri）。股票账户采用“净值记账法”：不记录持仓明细，仅按日期记录每个账户的总资产与净入金，自动计算盈亏与趋势。

## 项目亮点

- 同一套数据模型覆盖消费记账与投资净值
- 月度/年度报表与预算执行情况一体化
- 多端同步：本地优先 + 云端同步（Supabase）
- 现代化 UI 与数据可视化（G2Plot）

## 功能概览

### 账户与资产
- 现金/信用/股票账户管理
- 账户余额与净资产聚合

### 日常记账
- 支出/收入/转账
- 分类管理（支持二级分类）

### 投资账户净值
- 记录 total_value 与 net_deposit
- 自动计算当日盈亏与累计盈亏
- 近 30/90 天趋势与回溯重算

### 报表中心
- 月度概览：收入/支出/结余/预算执行
- 年度报表：年度收支、年度预算汇总
- 月度明细表格与分类构成

## 技术栈

- 应用框架：Nuxt 4（Vue 3 + TypeScript）
- 桌面端：Tauri 2
- UI：shadcn-vue（shadcn-nuxt）+ Tailwind CSS
- 状态/工具：@vueuse/core
- 数据与鉴权：Supabase（PostgreSQL + Auth + RLS）
- 图表：AntV G2Plot
- 图标：Iconfont SVG Sprite（AppIcon）

## 数据模型（MVP）

核心按“账户”统一建模，股票账户与现金账户同属账户类型；股票账户的每日净值使用快照表记录。

- accounts
  - type: cash | credit | stock
  - currency: CNY | USD | HKD ...
- transactions（日常收支/转账）
- asset_snapshots（投资账户每日快照）
  - account_id（关联到 type=stock 的账户）
  - date（日期）
  - total_value（当日总资产）
  - net_deposit（当日净入金，可为负）
  - daily_pnl（可由 total_value/昨日 total_value/net_deposit 推导）

## 环境变量（Supabase）

在项目根目录创建 `.env`（不要提交到仓库），并配置：

```bash
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_KEY="<anon/public key>"
```

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器（默认 http://localhost:3000）：

```bash
npm run dev
```

常用脚本：

```bash
npm run lint
npm run typecheck
npm run build
```

## 桌面端（Tauri）

Tauri 配置位于 `src-tauri/`，默认使用：

- devServer：`http://localhost:3000`
- build 输出：`dist`（用于 production 打包）

常见流程：

1) 启动 Nuxt dev server：`npm run dev`
2) 启动 Tauri（需要系统已安装 Rust 工具链与平台依赖）：`npx tauri dev`

## 约定

- 不在代码与文档中写入任何密钥/Token；只通过环境变量注入
- 股票账户使用净值记账法：不追踪持仓、只追踪账户总资产与净入金

---

## 设计理念

**极简 · 静默交互 · 连接消费与投资**  
品牌气质为“默资”：低噪、可信、克制，以清晰的数据层级与秩序建立信任。

- 视觉降噪：减少不必要的装饰，突出数据层级
- 静默反馈：重要状态可见，但不过度打扰
- 可信克制：节制的对比与留白塑造“金融可信”
