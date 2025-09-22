import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkflowEngine } from "../../services/workflow/WorkflowEngine"
import { DocumentService } from "../../services/document/DocumentService"
import { LLMIntegrationService } from "../../services/llm/LLMIntegrationService"

// Mock dependencies
vi.mock("../../services/document/DocumentService")
vi.mock("../../services/llm/LLMIntegrationService")

describe("临时保存功能测试", () => {
  let workflowEngine: WorkflowEngine
  let mockDocumentService: any
  let mockLLMService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentService = new DocumentService() as any
    mockLLMService = new LLMIntegrationService() as any
    workflowEngine = new WorkflowEngine(mockDocumentService, mockLLMService)
  })

  describe("需求文档临时保存测试", () => {
    it("应该能够临时保存需求文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_req_123",
        version: "1.0",
        status: "saved",
        savedAt: new Date().toISOString()
      })

      const result = await workflowEngine.saveTemporaryDocument(workflowId, documentType, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_req_123",
          version: "1.0",
          status: "saved",
          savedAt: expect.any(String)
        },
        message: "需求文档临时保存成功"
      })
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该验证需求文档内容", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const invalidContent = ""

      await expect(workflowEngine.saveTemporaryDocument(workflowId, documentType, invalidContent))
        .rejects.toThrow("需求文档内容不能为空")
    })

    it("应该处理需求文档临时保存失败的情况", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockDocumentService.saveTemporaryDocument.mockRejectedValue(new Error("存储空间不足"))

      await expect(workflowEngine.saveTemporaryDocument(workflowId, documentType, content))
        .rejects.toThrow("需求文档临时保存失败：存储空间不足")
    })
  })

  describe("设计文档临时保存测试", () => {
    it("应该能够临时保存设计文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "design"
      const content = "# 设计文档\n\n## 系统架构\n采用微服务架构"

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_design_123",
        version: "1.0",
        status: "saved",
        savedAt: new Date().toISOString()
      })

      const result = await workflowEngine.saveTemporaryDocument(workflowId, documentType, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_design_123",
          version: "1.0",
          status: "saved",
          savedAt: expect.any(String)
        },
        message: "设计文档临时保存成功"
      })
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该验证设计文档内容", async () => {
      const workflowId = "wf_123456"
      const documentType = "design"
      const invalidContent = ""

      await expect(workflowEngine.saveTemporaryDocument(workflowId, documentType, invalidContent))
        .rejects.toThrow("设计文档内容不能为空")
    })
  })

  describe("任务文档临时保存测试", () => {
    it("应该能够临时保存任务文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "tasks"
      const content = "# 任务文档\n\n## 开发任务\n1. 用户管理模块开发\n2. 数据管理模块开发"

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_tasks_123",
        version: "1.0",
        status: "saved",
        savedAt: new Date().toISOString()
      })

      const result = await workflowEngine.saveTemporaryDocument(workflowId, documentType, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_tasks_123",
          version: "1.0",
          status: "saved",
          savedAt: expect.any(String)
        },
        message: "任务文档临时保存成功"
      })
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该验证任务文档内容", async () => {
      const workflowId = "wf_123456"
      const documentType = "tasks"
      const invalidContent = ""

      await expect(workflowEngine.saveTemporaryDocument(workflowId, documentType, invalidContent))
        .rejects.toThrow("任务文档内容不能为空")
    })
  })

  describe("临时文档恢复测试", () => {
    it("应该能够恢复临时保存的需求文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockDocumentService.getTemporaryDocument.mockResolvedValue({
        documentId: "doc_req_123",
        content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
        version: "1.0",
        savedAt: new Date().toISOString()
      })

      const result = await workflowEngine.restoreTemporaryDocument(workflowId, documentType)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_req_123",
          content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
          version: "1.0",
          savedAt: expect.any(String)
        },
        message: "需求文档恢复成功"
      })
      expect(mockDocumentService.getTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType
      )
    })

    it("应该处理临时文档不存在的情况", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockDocumentService.getTemporaryDocument.mockRejectedValue(new Error("临时文档不存在"))

      await expect(workflowEngine.restoreTemporaryDocument(workflowId, documentType))
        .rejects.toThrow("需求文档恢复失败：临时文档不存在")
    })
  })

  describe("临时文档版本管理测试", () => {
    it("应该能够管理临时文档的多个版本", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n3. 新增功能"

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_req_123",
        version: "2.0",
        status: "saved",
        savedAt: new Date().toISOString()
      })

      const result = await workflowEngine.saveTemporaryDocument(workflowId, documentType, content)

      expect(result.data.version).toBe("2.0")
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该能够获取临时文档的版本历史", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockDocumentService.getTemporaryDocumentVersions.mockResolvedValue([
        {
          version: "1.0",
          savedAt: "2023-01-01T10:00:00Z",
          content: "# 需求文档\n\n## 功能需求\n1. 用户管理"
        },
        {
          version: "2.0",
          savedAt: "2023-01-01T11:00:00Z",
          content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"
        }
      ])

      const result = await workflowEngine.getTemporaryDocumentVersions(workflowId, documentType)

      expect(result).toEqual({
        code: 200,
        data: [
          {
            version: "1.0",
            savedAt: "2023-01-01T10:00:00Z",
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理"
          },
          {
            version: "2.0",
            savedAt: "2023-01-01T11:00:00Z",
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"
          }
        ],
        message: "临时文档版本历史获取成功"
      })
      expect(mockDocumentService.getTemporaryDocumentVersions).toHaveBeenCalledWith(
        workflowId,
        documentType
      )
    })
  })

  describe("临时文档清理测试", () => {
    it("应该能够清理过期的临时文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockDocumentService.cleanupTemporaryDocuments.mockResolvedValue({
        cleanedCount: 5,
        message: "清理了5个过期的临时文档"
      })

      const result = await workflowEngine.cleanupTemporaryDocuments(workflowId, documentType)

      expect(result).toEqual({
        code: 200,
        data: {
          cleanedCount: 5,
          message: "清理了5个过期的临时文档"
        },
        message: "临时文档清理成功"
      })
      expect(mockDocumentService.cleanupTemporaryDocuments).toHaveBeenCalledWith(
        workflowId,
        documentType
      )
    })

    it("应该处理临时文档清理失败的情况", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockDocumentService.cleanupTemporaryDocuments.mockRejectedValue(new Error("清理失败"))

      await expect(workflowEngine.cleanupTemporaryDocuments(workflowId, documentType))
        .rejects.toThrow("临时文档清理失败：清理失败")
    })
  })

  describe("完整临时保存流程测试", () => {
    it("应该能够执行完整的临时保存流程", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      // Mock all service calls
      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_req_123",
        version: "1.0",
        status: "saved",
        savedAt: new Date().toISOString()
      })

      mockDocumentService.getTemporaryDocument.mockResolvedValue({
        documentId: "doc_req_123",
        content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
        version: "1.0",
        savedAt: new Date().toISOString()
      })

      // Save temporary document
      const saveResult = await workflowEngine.saveTemporaryDocument(workflowId, documentType, content)
      expect(saveResult.code).toBe(200)

      // Restore temporary document
      const restoreResult = await workflowEngine.restoreTemporaryDocument(workflowId, documentType)
      expect(restoreResult.code).toBe(200)
      expect(restoreResult.data.content).toBe(content)

      // Verify all services were called
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalled()
      expect(mockDocumentService.getTemporaryDocument).toHaveBeenCalled()
    })
  })
})