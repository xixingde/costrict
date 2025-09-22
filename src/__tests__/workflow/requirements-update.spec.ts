import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkflowEngine } from "../../services/workflow/WorkflowEngine"
import { DocumentService } from "../../services/document/DocumentService"
import { DiffService } from "../../services/diff/DiffService"
import { LLMIntegrationService } from "../../services/llm/LLMIntegrationService"

// Mock dependencies
vi.mock("../../services/document/DocumentService")
vi.mock("../../services/diff/DiffService")
vi.mock("../../services/llm/LLMIntegrationService")

describe("需求文档修改流程测试", () => {
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

  describe("需求文档修改测试", () => {
    it("应该能够修改已生成的需求文档", async () => {
      const documentId = "doc_req_123"
      const modifiedContent = "# 需求文档\n\n## 项目概述\n开发一个用户管理系统（更新版）\n\n## 新增功能\n- 用户权限管理"

      mockDocumentService.getDocument.mockResolvedValue({
        id: documentId,
        content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统",
        version: "1.0"
      })

      mockDocumentService.updateDocument.mockResolvedValue({
        documentId: documentId,
        version: "2.0",
        status: "updated"
      })

      const result = await workflowEngine.updateRequirementsDocument(documentId, modifiedContent)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          version: "2.0",
          status: "updated"
        },
        message: "需求文档修改成功"
      })
      expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(documentId, modifiedContent)
    })

    it("应该验证修改后的文档内容", async () => {
      const documentId = "doc_req_123"
      const invalidContent = ""

      await expect(workflowEngine.updateRequirementsDocument(documentId, invalidContent))
        .rejects.toThrow("文档内容不能为空")
    })
  })

  describe("文档提交验证测试", () => {
    it("应该能够验证修改后的文档并接受提交", async () => {
      const documentId = "doc_req_123"
      const content = "# 需求文档\n\n## 项目概述\n开发一个用户管理系统（更新版）"

      mockDocumentService.validateDocument.mockResolvedValue({
        isValid: true,
        errors: []
      })

      mockDocumentService.submitDocument.mockResolvedValue({
        documentId: documentId,
        status: "submitted",
        submittedAt: new Date().toISOString()
      })

      const result = await workflowEngine.submitRequirementsDocument(documentId, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          status: "submitted",
          submittedAt: expect.any(String)
        },
        message: "文档提交成功"
      })
      expect(mockDocumentService.validateDocument).toHaveBeenCalledWith(documentId, content)
      expect(mockDocumentService.submitDocument).toHaveBeenCalledWith(documentId)
    })

    it("应该拒绝提交无效的文档", async () => {
      const documentId = "doc_req_123"
      const content = "# 需求文档\n\n## 项目概述\n开发一个用户管理系统（更新版）"

      mockDocumentService.validateDocument.mockResolvedValue({
        isValid: false,
        errors: ["缺少功能需求章节", "缺少非功能需求章节"]
      })

      await expect(workflowEngine.submitRequirementsDocument(documentId, content))
        .rejects.toThrow("文档验证失败：缺少功能需求章节，缺少非功能需求章节")
    })
  })

  describe("文档差异比较测试", () => {
    it("应该能够比较修改版本与临时保存版本", async () => {
      const documentId = "doc_req_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDiffService.compareDocuments.mockResolvedValue({
        diffs: [
          {
            type: "added",
            content: "## 新增功能\n- 用户权限管理",
            line: 5,
            semanticChange: "content"
          },
          {
            type: "modified",
            content: "开发一个用户管理系统（更新版）",
            line: 3,
            semanticChange: "content"
          }
        ],
        summary: "新增了用户权限管理功能，更新了项目概述"
      })

      const result = await workflowEngine.compareDocumentVersions(documentId, sourceVersion, targetVersion)

      expect(result).toEqual({
        code: 200,
        data: {
          diffs: [
            {
              type: "added",
              content: "## 新增功能\n- 用户权限管理",
              line: 5,
              semanticChange: "content"
            },
            {
              type: "modified",
              content: "开发一个用户管理系统（更新版）",
              line: 3,
              semanticChange: "content"
            }
          ],
          summary: "新增了用户权限管理功能，更新了项目概述"
        },
        message: "差异比较完成"
      })
      expect(mockDiffService.compareDocuments).toHaveBeenCalledWith(documentId, sourceVersion, targetVersion)
    })

    it("应该处理相同版本的比较", async () => {
      const documentId = "doc_req_123"
      const sourceVersion = "1.0"
      const targetVersion = "1.0"

      mockDiffService.compareDocuments.mockResolvedValue({
        diffs: [],
        summary: "文档版本相同，无差异"
      })

      const result = await workflowEngine.compareDocumentVersions(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toEqual([])
      expect(result.data.summary).toBe("文档版本相同，无差异")
    })
  })

  describe("设计文档更新测试", () => {
    it("应该能够基于差异更新设计文档", async () => {
      const workflowId = "wf_123456"
      const diffs = [
        {
          type: "added",
          content: "## 新增功能\n- 用户权限管理",
          line: 5,
          semanticChange: "content"
        }
      ]

      mockLLMService.updateDesignDocument.mockResolvedValue({
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## 权限管理设计\n基于RBAC模型...",
        version: "2.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_design_123",
        version: "2.0",
        status: "saved"
      })

      const result = await workflowEngine.updateDesignDocumentBasedOnDiffs(workflowId, diffs)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_design_123",
          version: "2.0",
          status: "saved"
        },
        message: "设计文档更新成功"
      })
      expect(mockLLMService.updateDesignDocument).toHaveBeenCalledWith(diffs)
      expect(mockDocumentService.saveDocument).toHaveBeenCalledWith(
        workflowId,
        "design",
        expect.any(String),
        true
      )
    })

    it("应该处理空差异的情况", async () => {
      const workflowId = "wf_123456"
      const diffs = []

      const result = await workflowEngine.updateDesignDocumentBasedOnDiffs(workflowId, diffs)

      expect(result).toEqual({
        code: 200,
        data: {
          message: "无差异，无需更新设计文档"
        },
        message: "设计文档更新完成"
      })
      expect(mockLLMService.updateDesignDocument).not.toHaveBeenCalled()
    })
  })

  describe("更新后文档保存测试", () => {
    it("应该能够临时保存更新后的设计文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "design"
      const content = "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## 权限管理设计\n基于RBAC模型..."

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_design_123",
        version: "2.0",
        status: "saved"
      })

      const result = await workflowEngine.saveUpdatedDesignDocument(workflowId, documentType, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_design_123",
          version: "2.0",
          status: "saved"
        },
        message: "更新后的设计文档保存成功"
      })
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该验证保存的文档内容", async () => {
      const workflowId = "wf_123456"
      const documentType = "design"
      const invalidContent = ""

      await expect(workflowEngine.saveUpdatedDesignDocument(workflowId, documentType, invalidContent))
        .rejects.toThrow("文档内容不能为空")
    })
  })

  describe("完整需求文档修改流程测试", () => {
    it("应该能够执行完整的需求文档修改流程", async () => {
      const workflowId = "wf_123456"
      const documentId = "doc_req_123"
      const modifiedContent = "# 需求文档\n\n## 项目概述\n开发一个用户管理系统（更新版）\n\n## 新增功能\n- 用户权限管理"

      // Mock all service calls
      mockDocumentService.getDocument.mockResolvedValue({
        id: documentId,
        content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统",
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
            content: "## 新增功能\n- 用户权限管理",
            line: 5,
            semanticChange: "content"
          }
        ],
        summary: "新增了用户权限管理功能"
      })

      mockLLMService.updateDesignDocument.mockResolvedValue({
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## 权限管理设计\n基于RBAC模型...",
        version: "2.0"
      })

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_design_123",
        version: "2.0",
        status: "saved"
      })

      const result = await workflowEngine.executeRequirementsUpdateWorkflow(workflowId, documentId, modifiedContent)

      expect(result.code).toBe(200)
      expect(result.data.status).toBe("completed")
      
      // Verify all services were called
      expect(mockDocumentService.updateDocument).toHaveBeenCalled()
      expect(mockDocumentService.validateDocument).toHaveBeenCalled()
      expect(mockDocumentService.submitDocument).toHaveBeenCalled()
      expect(mockDiffService.compareDocuments).toHaveBeenCalled()
      expect(mockLLMService.updateDesignDocument).toHaveBeenCalled()
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalled()
    })
  })
})