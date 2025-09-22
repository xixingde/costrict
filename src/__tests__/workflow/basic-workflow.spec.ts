import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkflowEngine } from "../../services/workflow/WorkflowEngine"
import { DocumentService } from "../../services/document/DocumentService"
import { LLMIntegrationService } from "../../services/llm/LLMIntegrationService"

// Mock dependencies
vi.mock("../../services/document/DocumentService")
vi.mock("../../services/llm/LLMIntegrationService")

describe("基础工作流功能测试", () => {
  let workflowEngine: WorkflowEngine
  let mockDocumentService: any
  let mockLLMService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentService = new DocumentService() as any
    mockLLMService = new LLMIntegrationService() as any
    workflowEngine = new WorkflowEngine(mockDocumentService, mockLLMService)
  })

  describe("需求输入接口测试", () => {
    it("应该能够成功创建工作流实例", async () => {
      const input = {
        type: "basic_workflow",
        input: {
          requirements: "开发一个用户管理系统",
          userId: "user_123"
        }
      }

      mockDocumentService.createWorkflow.mockResolvedValue({
        id: "wf_123456",
        status: "created",
        steps: [{ name: "需求文档生成", status: "pending" }]
      })

      const result = await workflowEngine.createWorkflow(input)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: "wf_123456",
          status: "created",
          steps: [{ name: "需求文档生成", status: "pending" }]
        },
        message: "工作流创建成功"
      })
      expect(mockDocumentService.createWorkflow).toHaveBeenCalledWith(input)
    })

    it("应该验证需求输入的必填字段", async () => {
      const invalidInput = {
        type: "basic_workflow",
        input: {
          requirements: "",
          userId: ""
        }
      }

      await expect(workflowEngine.createWorkflow(invalidInput)).rejects.toThrow("需求内容和用户ID不能为空")
    })
  })

  describe("需求文档生成测试", () => {
    it("应该能够基于需求内容生成需求文档", async () => {
      const requirements = "开发一个用户管理系统"
      const workflowId = "wf_123456"

      mockLLMService.generateRequirementsDocument.mockResolvedValue({
        content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统...",
        version: "1.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_req_123",
        version: "1.0",
        status: "saved"
      })

      const result = await workflowEngine.generateRequirementsDocument(workflowId, requirements)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_req_123",
          version: "1.0",
          status: "saved"
        },
        message: "需求文档生成成功"
      })
      expect(mockLLMService.generateRequirementsDocument).toHaveBeenCalledWith(requirements)
      expect(mockDocumentService.saveDocument).toHaveBeenCalledWith(
        workflowId,
        "requirements",
        expect.any(String),
        true
      )
    })
  })

  describe("文档临时保存测试", () => {
    it("应该能够临时保存生成的文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 项目概述\n开发一个用户管理系统..."

      mockDocumentService.saveTemporaryDocument.mockResolvedValue({
        documentId: "doc_req_123",
        version: "1.0",
        status: "saved"
      })

      const result = await workflowEngine.saveTemporaryDocument(workflowId, documentType, content)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_req_123",
          version: "1.0",
          status: "saved"
        },
        message: "文档临时保存成功"
      })
      expect(mockDocumentService.saveTemporaryDocument).toHaveBeenCalledWith(
        workflowId,
        documentType,
        content
      )
    })

    it("应该能够访问临时保存的文档", async () => {
      const documentId = "doc_req_123"

      mockDocumentService.getTemporaryDocument.mockResolvedValue({
        id: documentId,
        content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统...",
        version: "1.0",
        isTemporary: true
      })

      const result = await workflowEngine.getTemporaryDocument(documentId)

      expect(result).toEqual({
        code: 200,
        data: {
          id: documentId,
          content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统...",
          version: "1.0",
          isTemporary: true
        },
        message: "获取临时文档成功"
      })
    })
  })

  describe("设计文档生成测试", () => {
    it("应该能够基于需求文档生成设计文档", async () => {
      const workflowId = "wf_123456"
      const requirementsDocument = "# 需求文档\n\n## 项目概述\n开发一个用户管理系统..."

      mockLLMService.generateDesignDocument.mockResolvedValue({
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构...",
        version: "1.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_design_123",
        version: "1.0",
        status: "saved"
      })

      const result = await workflowEngine.generateDesignDocument(workflowId, requirementsDocument)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_design_123",
          version: "1.0",
          status: "saved"
        },
        message: "设计文档生成成功"
      })
      expect(mockLLMService.generateDesignDocument).toHaveBeenCalledWith(requirementsDocument)
    })
  })

  describe("任务文档生成测试", () => {
    it("应该能够基于设计文档生成任务文档", async () => {
      const workflowId = "wf_123456"
      const designDocument = "# 设计文档\n\n## 系统架构\n采用微服务架构..."

      mockLLMService.generateTasksDocument.mockResolvedValue({
        content: "# 任务文档\n\n## 开发任务\n1. 用户管理模块开发...",
        version: "1.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_tasks_123",
        version: "1.0",
        status: "saved"
      })

      const result = await workflowEngine.generateTasksDocument(workflowId, designDocument)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_tasks_123",
          version: "1.0",
          status: "saved"
        },
        message: "任务文档生成成功"
      })
      expect(mockLLMService.generateTasksDocument).toHaveBeenCalledWith(designDocument)
    })
  })

  describe("完整工作流测试", () => {
    it("应该能够执行完整的基础工作流", async () => {
      const input = {
        type: "basic_workflow",
        input: {
          requirements: "开发一个用户管理系统",
          userId: "user_123"
        }
      }

      // Mock all service calls
      mockDocumentService.createWorkflow.mockResolvedValue({
        id: "wf_123456",
        status: "created"
      })

      mockLLMService.generateRequirementsDocument.mockResolvedValue({
        content: "# 需求文档",
        version: "1.0"
      })

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_req_123",
        version: "1.0",
        status: "saved"
      })

      mockLLMService.generateDesignDocument.mockResolvedValue({
        content: "# 设计文档",
        version: "1.0"
      })

      mockLLMService.generateTasksDocument.mockResolvedValue({
        content: "# 任务文档",
        version: "1.0"
      })

      const result = await workflowEngine.executeBasicWorkflow(input)

      expect(result.code).toBe(200)
      expect(result.data.workflowId).toBe("wf_123456")
      expect(result.data.status).toBe("completed")
      
      // Verify all services were called
      expect(mockDocumentService.createWorkflow).toHaveBeenCalled()
      expect(mockLLMService.generateRequirementsDocument).toHaveBeenCalled()
      expect(mockLLMService.generateDesignDocument).toHaveBeenCalled()
      expect(mockLLMService.generateTasksDocument).toHaveBeenCalled()
    })
  })
})