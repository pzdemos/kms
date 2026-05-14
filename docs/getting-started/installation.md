# 安装指南

本文介绍如何在不同环境中安装和配置 KMS。

## 前置要求

- **Node.js**: >= 18.0.0
- **MongoDB**: >= 4.4
- **npm** 或 **yarn**

## 安装方式

### 1. 作为项目依赖安装

在你的项目目录中运行：

```bash
npm install @pengzi/kms
```

或使用 yarn：

```bash
yarn add @pengzi/kms
```

### 2. 全局安装（CLI 工具）

如果你只想使用 CLI 工具：

```bash
npm install -g @pengzi/kms
```

安装后可以直接使用 `kms` 命令：

```bash
kms
```

### 3. 开发模式安装

如果你想参与 KMS 的开发：

```bash
# 克隆项目
git clone https://github.com/pengzi/kms.git
cd kms

# 安装依赖
npm install

# 构建
npm run build
npm run build:cli

# 全局链接
npm link
```

## 验证安装

### 验证 npm 包

```bash
npm list @pengzi/kms
```

应该显示类似：
```
@pengzi/kms@1.2.0
```

### 验证 CLI 工具

```bash
kms --help
```

或直接运行：

```bash
kms
```

应该看到 KMS CLI 的欢迎界面。

### 验证 API

创建测试文件 `test-kms.js`：

```javascript
const { KMSClient } = require('@pengzi/kms');

const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});

console.log('KMS 客户端创建成功！');
```

运行测试：

```bash
node test-kms.js
```

应该输出：`KMS 客户端创建成功！`

## 配置

### MongoDB 连接

KMS 需要连接到 MongoDB 数据库。支持以下连接方式：

#### 本地 MongoDB

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms'
});
```

#### MongoDB Atlas（推荐）

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net',
  databaseName: 'kms'
});
```

#### 使用 TLS（生产环境）

```javascript
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms',
  connectionOptions: {
    tls: true,
    tlsCAFile: '/path/to/ca.pem'
  }
});
```

详细配置请参考：[TLS 配置指南](../guides/tls-guide.md)

### CLI 工具配置

CLI 工具支持多种配置方式：

#### 方式 1: 配置文件（推荐）

创建 `~/.kms/config.json`：

```json
{
  "connectionString": "mongodb://localhost:27017",
  "databaseName": "kms"
}
```

#### 方式 2: 环境变量

```bash
export KMS_CONNECTION_STRING="mongodb://localhost:27017"
export KMS_DATABASE_NAME="kms"
```

#### 方式 3: 命令行参数

```bash
kms --connection "mongodb://localhost:27017" --database "kms"
```

详细说明请参考：[CLI 指南](../guides/cli-guide.md)

## 开发环境设置

### 推荐的开发工具

- **IDE**: VS Code, WebStorm
- **Node.js**: 18.x 或更高
- **MongoDB**: 6.x 或更高
- **Git**: 最新版本

### VS Code 配置

创建 `.vscode/settings.json`：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug KMS",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/index.js",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## 常见问题

### Q: 安装失败，提示权限错误

**A**: 尝试使用 `sudo`（全局安装时）：

```bash
sudo npm install -g @pengzi/kms
```

或配置 npm 全局目录：

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Q: bcrypt 编译失败

**A**: bcrypt 需要编译本地模块。确保已安装构建工具：

**macOS**:
```bash
xcode-select --install
```

**Ubuntu/Debian**:
```bash
sudo apt-get install build-essential
```

**Windows**:
安装 [Windows Build Tools](https://github.com/felixrieseberg/windows-build-tools)

### Q: MongoDB 连接失败

**A**: 检查以下几点：

1. MongoDB 是否正在运行
2. 连接字符串是否正确
3. 防火墙是否阻止连接
4. MongoDB 用户权限是否正确

### Q: CLI 工具命令找不到

**A**: 确认已全局安装或使用 npm script：

```bash
# 全局安装
npm install -g @pengzi/kms

# 或使用 npx
npx @pengzi/kms
```

## 卸载

### 卸载项目依赖

```bash
npm uninstall @pengzi/kms
```

### 卸载全局安装

```bash
npm uninstall -g @pengzi/kms
```

## 下一步

安装完成后，建议阅读：

- [5分钟快速入门](quickstart.md) - 快速上手
- [CLI 工具指南](../guides/cli-guide.md) - 使用交互式工具
- [API 参考](../api/reference.md) - 深入了解 API

---

**遇到问题？**

- 查看 [常见问题](../development/testing.md)
- [提交 Issue](https://github.com/pengzi/kms/issues)
- [讨论区](https://github.com/pengzi/kms/discussions)
