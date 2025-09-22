import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkflowEngine } from "../../services/workflow/WorkflowEngine"
import { DocumentService } from "../../services/document/DocumentService"
import { DiffService } from "../../services/diff/DiffService"
import { LLMIntegrationService } from "../../services/llm/LLMIntegrationService"

// Mock dependencies
vi.mock("../../services/document/DocumentService")
vi.mock("../../services/diff/DiffService")
vi.mock("../../services/llm/LLMIntegrationService")

describe("设计文档修改流程测试", () => {
  let workflowEngine: WorkflowEngine
  let mockDocumentService: any
  let mockDiffService: any
  let mockLLMService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentService = new DocumentService() as any
    mockDiffService = new DiffService() as any
    mockLLMService = new LLMIntegrationService() as any
    workflowEngine = new WorkflowEngine(mockDocumentService, mockLLMService, mockDiffService)
  })

  describe("设计文档修改测试", () => {
    it("应该能够修改已生成的设计文档", async () => {
      const documentId = "doc_design_123"
      const modifiedContent = "# 设计文档\n\n## 系统架构\n采用微服务架构（更新版）\n\n## 新增模块\n- 缓存模块设计"

      mockDocumentService.getDocument.mockResolvedValue({
        id: documentId,
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构",
        version: "1.0"
      })

      mockDocumentService.updateDocument.mockResolvedValue({
        documentId: documentId,
        version: "2.0",
        status: "updated"
      })

      const result = await workflowEngine.updateDesignDocument(documentId, modifiedContent)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          version: "2.0",
          status: "updated"
        },
        message: "设计文档修改成功"
      })
      expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(documentId, modifiedContent)
    })

    it("应该验证修改后的设计文档内容", async () => {
      const documentId = "doc_design_123"
      const invalidContent = ""

      await expect(workflowEngine.updateDesignDocument(documentId, invalidContent))
        .rejects.toThrow("设计文档内容不能为空")
    })
  })

  describe("设计文档提交验证测试", () => {
    it("应该能够验证修改后的设计文档并接受提交", async () => {
      const documentId = "doc_design_123"
      const content = "# 设计文档\n\n## 系统架构\n采用微服务架构（更新版）"

      mockDocumentService.validateDocument.mockResolvedValue({
        isValid: true,
        errors: []
      })

      mockDocumentService.submitDocument.mockResolvedValue({
        documentId: documentId,
        status: "submitted",
        submittedAt: new Date().toISOString()
      })

      const result = await workflowEngine.submitDesignDocument(documentId, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          status: "submitted",
          submittedAt: expect.any(String)
        },
        message: "设计文档提交成功"
      })
      expect(mockDocumentService.validateDocument).toHaveBeenCalledWith(documentId, content)
      expect(mockDocumentService.submitDocument).toHaveBeenCalledWith(documentId)
    })

    it("应该拒绝提交无效的设计文档", async () => {
      const documentId = "doc_design_123"
      const content = "# 设计文档\n\n## 系统架构\n采用微服务架构（更新版）"

      mockDocumentService.validateDocument.mockResolvedValue({
        isValid: false,
        errors: ["缺少数据库设计章节", "缺少API设计章节"]
      })

      await expect(workflowEngine.submitDesignDocument(documentId, content))
        .rejects.toThrow("设计文档验证失败：缺少数据库设计章节，缺少API设计章节")
    })
  })

  describe("设计文档差异比较测试", () => {
    it("应该能够比较设计文档的修改版本与临时保存版本", async () => {
      const documentId = "doc_design_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDiffService.compareDocuments.mockResolvedValue({
        diffs: [
          {
            type: "added",
            content: "## 新增模块\n- 缓存模块设计",
            line: 7,
            semanticChange: "structure"
          },
          {
            type: "modified",
            content: "采用微服务架构（更新版）",
            line: 3,
            semanticChange: "content"
          }
        ],
        summary: "新增了缓存模块设计，更新了系统架构描述"
      })

      const result = await workflowEngine.compareDesignDocumentVersions(documentId, sourceVersion, targetVersion)

      expect(result).toEqual({
        code: 200,
        data: {
          diffs: [
            {
              type: "added",
              content: "## 新增模块\n- 缓存模块设计",
              line: 7,
              semanticChange: "structure"
            },
            {
              type: "modified",
              content: "采用微服务架构（更新版）",
              line: 3,
              semanticChange: "content"
            }
          ],
          summary: "新增了缓存模块设计，更新了系统架构描述"
        },
        message: "设计文档差异比较完成"
      })
      expect(mockDiffService.compareDocuments).toHaveBeenCalledWith(documentId, sourceVersion, targetVersion)
    })

    it("应该处理设计文档结构变更的差异比较", async () => {
      const documentId = "doc_design_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDiffService.compareDocuments.mockResolvedValue({
        diffs: [
          {
            type: "added",
            content: "## 缓存设计\n### Redis配置\n### 缓存策略",
            line: 10,
            semanticChange: "structure"
          },
          {
            type: "removed",
            content: "## 旧架构设计",
            line: 5,
            semanticChange: "structure"
          }
        ],
        summary: "新增了缓存设计章节，移除了旧架构设计章节"
      })

      const result = await workflowEngine.compareDesignDocumentVersions(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toHaveLength(2)
      expect(result.data.diffs[0].semanticChange).toBe("structure")
      expect(result.data.diffs[1].semanticChange).toBe("structure")
    })
  })

  describe("任务文档更新测试", () => {
    it("应该能够基于设计文档差异更新任务文档", async () => {
      const workflowId = "wf_123456"
      const diffs = [
        {
          type: "added",
          content: "## 新增模块\n- 缓存模块设计",
          line: 7,
          semanticChange: "structure"
        }
      ]

      mockLLMService.updateTasksDocument.mockResolvedValue({
        content: "# 任务文档\n\n## 开发任务\n1. 用户管理模块开发\n2. 缓存模块开发\n\n## 缓存模块任务\n1. Redis集成\n2. 缓存策略实现",
        version: "2.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_tasks_123",
        version: "2.0",
        status: "saved"
      })

      const result = await workflowEngine.updateTasksDocumentBasedOnDiffs(workflowId, diffs)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_tasks_123",
          version: "2.0",
          status: "saved"
        },
        message: "任务文档更新成功"
      })
      expect(mockLLMService.updateTasksDocument).toHaveBeenCalledWith(diffs)
      expect(mockDocumentService.saveDocument).toHaveBeenCalledWith(
        workflowId,
        "tasks",
        expect.any(String),
        true
      )
    })

    it("应该处理设计文档重大变更时的任务文档更新", async () => {
      const workflowId = "wf_123456"
      const diffs = [
        {
          type: "added",
          content: "## 微服务架构\n### 服务拆分策略\n### 服务通信机制",
          line: 3,
          semanticChange: "structure"
        },
        {
          type: "removed",
          content: "## 单体架构设计",
          line: 3,
          semanticChange: "structure"
        }
      ]

      mockLLMService.updateTasksDocument.mockResolvedValue({
        content: "# 任务文档\n\n## 架构重构任务\n1. 服务拆分\n2. API网关开发\n3. 服务发现实现\n\n## 开发任务\n1. 用户服务开发\n2. 订单服务开发",
        version: "3.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_tasks_123",
        version: "3.0",
        status: "saved"
      })

      const result = await workflowEngine.updateTasksDocumentBasedOnDiffs(workflowId, diffs)

      expect(result.code).toBe(200)
      expect(result.data.version).toBe("3.0")
      expect(mockLLMService.updateTasksDocument).toHaveBeenCalledWith(diffs)
    })
  })

  describe("更新后任务文档保存测试", () => {
    it("应该能够临时保存更新后的任务文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "tasks"
      const content = "# 任务文档\n\n## 开发任务\n1. 用户管理模块开发\n2. 缓存模块开发"

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_tasks_123",
        version: "2.0",
        status: "saved"
      })

      const result = await workflowEngine.saveUpdatedTasksDocument(workflowId, documentType, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_tasks_123",
          version: "2.0",
          status: "saved"
        },
        message: "更新后的任务文档保存成功"
      })
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该验证保存的任务文档内容", async () => {
      const workflowId = "wf_123456"
      const documentType = "tasks"
      const invalidContent = ""

      await expect(workflowEngine.saveUpdatedTasksDocument(workflowId, documentType, invalidContent))
        .rejects.toThrow("任务文档内容不能为空")
    })
  })

  describe("完整设计文档修改流程测试", () => {
    it("应该能够执行完整的设计文档修改流程", async () => {
      const workflowId = "wf_123456"
      const documentId = "doc_design_123"
      const modifiedContent = "# 设计文档\n\n## 系统架构\n采用微服务架构（更新版）\n\n## 新增模块\n- 缓存模块设计"

      // Mock all service calls
      mockDocumentService.getDocument.mockResolvedValue({
        id: documentId,
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构",
        version: "1.0"
      })

      mockDocumentService.updateDocument.mockResolvedValue({
        documentId: documentId,
        version: "2.0",
        status: "updated"
      })

      mockDocumentService.validateDocument.mockResolvedValue({
        isValid: true,
        errors: []
      })

      mockDocumentService.submitDocument.mockResolvedValue({
        documentId: documentId,
        status: "submitted",
        submittedAt: new Date().toISOString()
      })

      mockDiffService.compareDocuments.mockResolvedValue({
        diffs: [
          {
            type: "added",
            content: "## 新增模块\n- 缓存模块设计",
            line: 7,
            semanticChange: "structure"
          }
        ],
        summary: "新增了缓存模块设计"
      })

      mockLLMService.updateTasksDocument.mockResolvedValue({
        content: "# 任务文档\n\n## 开发任务\n1. 用户管理模块开发\n2. 缓存模块开发",
        version: "2.0"
      })

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_tasks_123",
        version: "2.0",
        status: "saved"
      })

      const result = await workflowEngine.executeDesignUpdateWorkflow(workflowId, documentId, modifiedContent)

      expect(result.code).toBe(200)
      expect(result.data.status).toBe("completed")
      
      // Verify all services were called
      expect(mockDocumentService.updateDocument).toHaveBeenCalled()
      expect(mockDocumentService.validateDocument).toHaveBeenCalled()
      expect(mockDocumentService.submitDocument).toHaveBeenCalled()
      expect(mockDiffService.compareDocuments).toHaveBeenCalled()
      expect(mockLLMService.updateTasksDocument).toHaveBeenCalled()
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalled()
    })
  })
})