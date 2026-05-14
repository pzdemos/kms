# KMS 文档结构重组计划

## 当前问题

### 文档分布混乱
- 根目录有 8 个 MD 文件
- docs 目录有 6 个 MD 文件
- 文档分类不清晰
- 命名不统一

## 建议的新结构

### 根目录（保持简洁）
```
kms/
├── README.md                    # 主文档（保留）
├── LICENSE                      # 许可证（保留）
└── docs/                        # 所有文档移到此处
```

### docs/ 目录结构
```
docs/
├── README.md                    # 文档导航
│
├── getting-started/             # 快速开始
│   ├── installation.md          # 安装指南
│   ├── quickstart.md            # 5分钟入门
│   └── first-project.md         # 第一个项目
│
├── guides/                      # 使用指南
│   ├── cli-guide.md             # CLI 工具使用
│   ├── tls-guide.md             # TLS/SSL 配置
│   ├── encrypted-connection.md  # 加密连接配置
│   └── api-usage.md             # API 使用示例
│
├── api/                         # API 文档
│   ├── reference.md             # API 参考
│   └── types.md                 # 类型定义
│
├── security/                    # 安全相关
│   ├── best-practices.md        # 安全最佳实践
│   └── password-security.md     # 密码安全
│
├── development/                 # 开发相关
│   ├── testing.md               # 测试指南
│   └── contributing.md          # 贡献指南
│
└── about/                       # 关于项目
    ├── changelog.md             # 更新日志
    ├── architecture.md          # 架构说明
    └── test-reports/            # 测试报告
        ├── v1.1.1.md
        └── v1.2.0.md
```

## 文档映射表

### 根目录 → docs/

| 当前位置 | 新位置 | 新文件名 |
|---------|--------|---------|
| QUICKSTART.md | docs/getting-started/quickstart.md | ✅ |
| TESTING.md | docs/development/testing.md | ✅ |
| docs/CLI_GUIDE.md | docs/guides/cli-guide.md | ✅ |
| docs/TLS_GUIDE.md | docs/guides/tls-guide.md | ✅ |
| docs/ENCRYPTED_CONNECTION.md | docs/guides/encrypted-connection.md | ✅ |
| docs/API.md | docs/api/reference.md | ✅ |
| docs/SECURITY.md | docs/security/best-practices.md | ✅ |
| docs/PASSWORD.md | docs/security/password-security.md | ✅ |

### 归档或合并

| 当前位置 | 处理方式 | 说明 |
|---------|---------|------|
| PROJECT_SUMMARY.md | → docs/about/architecture.md | 改写为架构说明 |
| TEST_RESULTS.md | → docs/about/test-reports/v1.1.1.md | 移动到测试报告 |
| FINAL_TEST_REPORT.md | → docs/about/test-reports/v1.1.1.md | 合并到上面的文件 |
| RELEASE_NOTES_v1.2.0.md | → docs/about/changelog.md | 作为 changelog 的第一部分 |
| TLS_UPDATE_SUMMARY.md | → docs/about/changelog.md | 合并到 changelog |

## 执行步骤

1. 创建新的目录结构
2. 移动和重命名文件
3. 更新文档内部的链接
4. 创建文档导航（docs/README.md）
5. 更新主 README.md 的链接

## 好处

✅ 文档分类清晰
✅ 易于查找和维护
✅ 符合开源项目标准结构
✅ 便于扩展
