# Dashboard - 测试文档

> author: qinyi | created_at: 2026-06-03T10:03:00+08:00

## 测试框架

| 项目 | 状态 |
|------|------|
| 测试框架 | ❌ 未配置 |
| package.json test 脚本 | ❌ 不存在 |
| vitest / jest 依赖 | ❌ 未安装 |
| 测试配置文件 | ❌ 无 vitest.config / jest.config |
| CI 测试步骤 | ❌ 无 |

## 测试文件结构

```
packages/dashboard/
├── tests/              # ❌ 不存在
├── __tests__/          # ❌ 不存在
├── src/
│   └── *.spec.js       # ❌ 无任何测试文件
│   └── *.test.js       # ❌ 无任何测试文件
└── *.test.ts           # ❌ 无任何测试文件
```

源码中未发现任何 `describe(`、`it(`、`test(`、`vitest` 相关引用。

## 测试覆盖率

| 指标 | 值 |
|------|-----|
| 覆盖率工具 | ❌ 未配置 |
| 行覆盖率 | N/A |
| 分支覆盖率 | N/A |
| 函数覆盖率 | N/A |

> ⚠️ 项目当前没有任何测试。建议优先为核心模块（composables、server/parser）添加单元测试。
