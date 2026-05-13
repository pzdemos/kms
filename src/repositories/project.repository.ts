/**
 * 项目仓储
 * 负责项目的数据访问
 */

import { BaseRepository } from './base.repository';
import { Project, ProjectFilter, ProjectStatus } from '../types';
import { ProjectNotFoundError } from '../types';

export class ProjectRepository extends BaseRepository<Project> {
  constructor(db: any) {
    super(db, 'projects');
    this.initializeIndexes();
  }

  /**
   * 初始化索引
   */
  private async initializeIndexes(): Promise<void> {
    await this.createIndexes([
      { projectId: 1 },
      { projectName: 1 },
      { status: 1 },
      { createdAt: -1 },
    ]);
  }

  /**
   * 根据项目ID查找
   */
  async findByProjectId(projectId: string): Promise<Project | null> {
    return await this.findOne({ projectId } as any);
  }

  /**
   * 根据项目ID查找，如果不存在则抛出错误
   */
  async getByProjectId(projectId: string): Promise<Project> {
    const project = await this.findByProjectId(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return project;
  }

  /**
   * 根据项目名称查找
   */
  async findByProjectName(projectName: string): Promise<Project | null> {
    return await this.findOne({ projectName } as any);
  }

  /**
   * 查询项目列表
   */
  async findProjects(filter?: ProjectFilter): Promise<Project[]> {
    const query: any = {};

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.projectName) {
      query.projectName = { $regex: filter.projectName, $options: 'i' };
    }

    return await this.findMany(query, { sort: { createdAt: -1 } });
  }

  /**
   * 更新项目
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
    return await this.updateOne(
      { projectId } as any,
      { $set: { ...updates, updatedAt: new Date() } }
    );
  }

  /**
   * 删除项目（软删除）
   */
  async softDeleteProject(projectId: string): Promise<boolean> {
    return await this.updateOne(
      { projectId } as any,
      { $set: { status: ProjectStatus.DELETED, updatedAt: new Date() } }
    );
  }

  /**
   * 永久删除项目
   */
  async hardDeleteProject(projectId: string): Promise<boolean> {
    return await this.deleteOne({ projectId } as any);
  }
}
