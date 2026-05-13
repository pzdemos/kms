/**
 * Express集成示例
 */

import express from 'express';
import { KMSClient, KeyType } from '../src';

const app = express();
app.use(express.json());

// 初始化KMS客户端
const kms = new KMSClient({
  connectionString: 'mongodb://localhost:27017',
  databaseName: 'kms',
});

// 连接KMS
kms.connect().then(() => {
  console.log('KMS connected');
}).catch(console.error);

// 中间件：设置当前用户（简化示例）
app.use((req, res, next) => {
  // 实际应用中应该从JWT session或API密钥中获取
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    kms.setCurrentUser(userId);
  }
  next();
});

/**
 * 创建项目
 */
app.post('/api/projects', async (req, res) => {
  try {
    const { projectName, masterPassword, metadata } = req.body;

    const project = await kms.createProject(projectName, masterPassword, metadata);

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 获取项目
 */
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await kms.getProject(projectId);

    res.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 创建密钥
 */
app.post('/api/projects/:projectId/keys', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { masterPassword, keyName, keyType, value, tags, description } = req.body;

    const key = await kms.createKey(projectId, masterPassword, {
      keyName,
      keyType,
      value,
      tags,
      description,
    });

    res.json({
      success: true,
      data: key,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 获取密钥（解密）
 */
app.get('/api/projects/:projectId/keys/:keyId', async (req, res) => {
  try {
    const { projectId, keyId } = req.params;
    const { masterPassword } = req.headers;

    if (!masterPassword) {
      return res.status(400).json({
        success: false,
        error: 'Master password required',
      });
    }

    const key = await kms.getKey(projectId, masterPassword as string, keyId);

    res.json({
      success: true,
      data: key,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 列出密钥
 */
app.get('/api/projects/:projectId/keys', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { keyType, tags, page, limit } = req.query;

    const filters: any = {};
    if (keyType) filters.keyType = keyType;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    const result = await kms.listKeys(
      projectId,
      filters,
      page && limit ? { page: Number(page), limit: Number(limit) } : undefined
    );

    res.json({
      success: true,
      data: result.keys,
      total: result.total,
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 更新密钥
 */
app.put('/api/projects/:projectId/keys/:keyId', async (req, res) => {
  try {
    const { projectId, keyId } = req.params;
    const { masterPassword, value, tags, description } = req.body;

    const key = await kms.updateKey(projectId, masterPassword, keyId, {
      value,
      tags,
      description,
    });

    res.json({
      success: true,
      data: key,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 删除密钥
 */
app.delete('/api/projects/:projectId/keys/:keyId', async (req, res) => {
  try {
    const { projectId, keyId } = req.params;

    await kms.deleteKey(projectId, keyId);

    res.json({
      success: true,
      message: 'Key deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 获取审计日志
 */
app.get('/api/projects/:projectId/audit-logs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page, limit, startDate, endDate, action } = req.query;

    const query: any = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    };

    if (startDate) query.startDate = new Date(startDate as string);
    if (endDate) query.endDate = new Date(endDate as string);
    if (action) query.action = action;

    const result = await kms.getAuditLogs(projectId, query);

    res.json({
      success: true,
      data: result.logs,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
