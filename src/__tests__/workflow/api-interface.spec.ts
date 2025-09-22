import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkflowAPI } from "../../api/workflow/WorkflowAPI"
import { WorkflowEngine } from "../../services/workflow/WorkflowEngine"
import { DocumentService } from "../../services/document/DocumentService"
import { DiffService } from "../../services/diff/DiffService"
import { LLMIntegrationService } from "../../services/llm/LLMIntegrationService"

// Mock dependencies
vi.mock("../../services/workflow/WorkflowEngine")
vi.mock("../../services/document/DocumentService")
vi.mock("../../services/diff/DiffService")
vi.mock("../../services/llm/LLMIntegrationService")

describe("API接口测试", () => {
  let workflowAPI: WorkflowAPI
  let mockWorkflowEngine: any
  let mockDocumentService: any
  let mockDiffService: any
  let mockLLMService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowEngine = new WorkflowEngine() as any
    mockDocumentService = new DocumentService() as any
    mockDiffService = new DiffService() as any
    mockLLMService = new LLMIntegrationService() as any
    workflowAPI = new WorkflowAPI(mockWorkflowEngine, mockDocumentService, mockDiffService, mockLLMService)
  })

  describe("工作流管理API测试", () => {
    it("应该能够创建工作流实例", async () => {
      const workflowData = {
        name: "用户管理系统开发",
        description: "开发一个完整的用户管理系统",
        initialState: "requirements_input"
      }

      mockWorkflowEngine.createWorkflow.mockResolvedValue({
        workflowId: "wf_123456",
        name: "用户管理系统开发",
        description: "开发一个完整的用户管理系统",
        currentState: "requirements_input",
        createdAt: new Date().toISOString()
      })

      const result = await workflowAPI.createWorkflow(workflowData)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: "wf_123456",
          name: "用户管理系统开发",
          description: "开发一个完整的用户管理系统",
          currentState: "requirements_input",
          createdAt: expect.any(String)
        },
        message: "工作流创建成功"
      })
      expect(mockWorkflowEngine.createWorkflow).toHaveBeenCalledWith(workflowData)
    })

    it("应该能够获取工作流实例", async () => {
      const workflowId = "wf_123456"

      mockWorkflowEngine.getWorkflow.mockResolvedValue({
        workflowId: workflowId,
        name: "用户管理系统开发",
        description: "开发一个完整的用户管理系统",
        currentState: "requirements_input",
        createdAt: new Date().toISOString()
      })

      const result = await workflowAPI.getWorkflow(workflowId)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: workflowId,
          name: "用户管理系统开发",
          description: "开发一个完整的用户管理系统",
          currentState: "requirements_input",
          createdAt: expect.any(String)
        },
        message: "工作流获取成功"
      })
      expect(mockWorkflowEngine.getWorkflow).toHaveBeenCalledWith(workflowId)
    })

    it("应该能够更新工作流实例", async () => {
      const workflowId = "wf_123456"
      const updateData = {
        name: "用户管理系统开发（更新）",
        description: "开发一个完整的用户管理系统，包含权限管理"
      }

      mockWorkflowEngine.updateWorkflow.mockResolvedValue({
        workflowId: workflowId,
        name: "用户管理系统开发（更新）",
        description: "开发一个完整的用户管理系统，包含权限管理",
        currentState: "requirements_input",
        updatedAt: new Date().toISOString()
      })

      const result = await workflowAPI.updateWorkflow(workflowId, updateData)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: workflowId,
          name: "用户管理系统开发（更新）",
          description: "开发一个完整的用户管理系统，包含权限管理",
          currentState: "requirements_input",
          updatedAt: expect.any(String)
        },
        message: "工作流更新成功"
      })
      expect(mockWorkflowEngine.updateWorkflow).toHaveBeenCalledWith(workflowId, updateData)
    })

    it("应该能够删除工作流实例", async () => {
      const workflowId = "wf_123456"

      mockWorkflowEngine.deleteWorkflow.mockResolvedValue({
        workflowId: workflowId,
        deletedAt: new Date().toISOString()
      })

      const result = await workflowAPI.deleteWorkflow(workflowId)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: workflowId,
          deletedAt: expect.any(String)
        },
        message: "工作流删除成功"
      })
      expect(mockWorkflowEngine.deleteWorkflow).toHaveBeenCalledWith(workflowId)
    })

    it("应该能够获取工作流列表", async () => {
      mockWorkflowEngine.listWorkflows.mockResolvedValue([
        {
          workflowId: "wf_123456",
          name: "用户管理系统开发",
          currentState: "requirements_input",
          createdAt: new Date().toISOString()
        },
        {
          workflowId: "wf_789012",
          name: "订单管理系统开发",
          currentState: "design_generation",
          createdAt: new Date().toISOString()
        }
      ])

      const result = await workflowAPI.listWorkflows()

      expect(result).toEqual({
        code: 200,
        data: [
          {
            workflowId: "wf_123456",
            name: "用户管理系统开发",
            currentState: "requirements_input",
            createdAt: expect.any(String)
          },
          {
            workflowId: "wf_789012",
            name: "订单管理系统开发",
            currentState: "design_generation",
            createdAt: expect.any(String)
          }
        ],
        message: "工作流列表获取成功"
      })
      expect(mockWorkflowEngine.listWorkflows).toHaveBeenCalled()
    })
  })

  describe("文档管理API测试", () => {
    it("应该能够保存文档", async () => {
      const workflowId = "wf_123456"
      const documentData = {
        type: "requirements",
        content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"
      }

      mockDocumentService.saveDocument.mockResolvedValue({
        documentId: "doc_req_123",
        workflowId: workflowId,
        type: "requirements",
        version: "1.0",
        savedAt: new Date().toISOString()
      })

      const result = await workflowAPI.saveDocument(workflowId, documentData)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: "doc_req_123",
          workflowId: workflowId,
          type: "requirements",
          version: "1.0",
          savedAt: expect.any(String)
        },
        message: "文档保存成功"
      })
      expect(mockDocumentService.saveDocument).toHaveBeenCalledWith(
        workflowId,
        documentData.type,
        documentData.content
      )
    })

    it("应该能够获取文档", async () => {
      const documentId = "doc_req_123"

      mockDocumentService.getDocument.mockResolvedValue({
        id: documentId,
        content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
        version: "1.0",
        lastModified: new Date().toISOString()
      })

      const result = await workflowAPI.getDocument(documentId)

      expect(result).toEqual({
        code: 200,
        data: {
          id: documentId,
          content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
          version: "1.0",
          lastModified: expect.any(String)
        },
        message: "文档获取成功"
      })
      expect(mockDocumentService.getDocument).toHaveBeenCalledWith(documentId)
    })

    it("应该能够更新文档", async () => {
      const documentId = "doc_req_123"
      const updateData = {
        content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n3. 新增功能"
      }

      mockDocumentService.updateDocument.mockResolvedValue({
        documentId: documentId,
        version: "2.0",
        updatedAt: new Date().toISOString()
      })

      const result = await workflowAPI.updateDocument(documentId, updateData)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          version: "2.0",
          updatedAt: expect.any(String)
        },
        message: "文档更新成功"
      })
      expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(
        documentId,
        updateData.content
      )
    })

    it("应该能够删除文档", async () => {
      const documentId = "doc_req_123"

      mockDocumentService.deleteDocument.mockResolvedValue({
        documentId: documentId,
        deletedAt: new Date().toISOString()
      })

      const result = await workflowAPI.deleteDocument(documentId)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          deletedAt: expect.any(String)
        },
        message: "文档删除成功"
      })
      expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith(documentId)
    })

    it("应该能够获取文档列表", async () => {
      const workflowId = "wf_123456"

      mockDocumentService.listDocuments.mockResolvedValue([
        {
          documentId: "doc_req_123",
          type: "requirements",
          version: "1.0",
          lastModified: new Date().toISOString()
        },
        {
          documentId: "doc_design_123",
          type: "design",
          version: "1.0",
          lastModified: new Date().toISOString()
        }
      ])

      const result = await workflowAPI.listDocuments(workflowId)

      expect(result).toEqual({
        code: 200,
        data: [
          {
            documentId: "doc_req_123",
            type: "requirements",
            version: "1.0",
            lastModified: expect.any(String)
          },
          {
            documentId: "doc_design_123",
            type: "design",
            version: "1.0",
            lastModified: expect.any(String)
          }
        ],
        message: "文档列表获取成功"
      })
      expect(mockDocumentService.listDocuments).toHaveBeenCalledWith(workflowId)
    })
  })

  describe("文档差异比较API测试", () => {
    it("应该能够比较文档差异", async () => {
      const documentId = "doc_req_123"
      const diffRequest = {
        sourceVersion: "1.0",
        targetVersion: "2.0"
      }

      mockDiffService.compareDocuments.mockResolvedValue({
        diffs: [
          {
            type: "added",
            content: "3. 新增功能",
            line: 5,
            semanticChange: "content"
          }
        ],
        summary: "新增了第3个功能需求"
      })

      const result = await workflowAPI.compareDocuments(documentId, diffRequest)

      expect(result).toEqual({
        code: 200,
        data: {
          diffs: [
            {
              type: "added",
              content: "3. 新增功能",
              line: 5,
              semanticChange: "content"
            }
          ],
          summary: "新增了第3个功能需求"
        },
        message: "文档差异比较完成"
      })
      expect(mockDiffService.compareDocuments).toHaveBeenCalledWith(
        documentId,
        diffRequest.sourceVersion,
        diffRequest.targetVersion
      )
    })

    it("应该能够生成差异可视化", async () => {
      const documentId = "doc_req_123"
      const visualizationRequest = {
        sourceVersion: "1.0",
        targetVersion: "2.0"
      }

      mockDiffService.generateDiffVisualization.mockResolvedValue({
        documentId: documentId,
        sourceVersion: "1.0",
        targetVersion: "2.0",
        visualization: {
          added: [
            {
              line: 4,
              content: "2. 数据管理"
            }
          ],
          removed: [],
          modified: [],
          stats: {
            added: 1,
            removed: 0,
            modified: 0
          }
        }
      })

      const result = await workflowAPI.generateDiffVisualization(documentId, visualizationRequest)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          sourceVersion: "1.0",
          targetVersion: "2.0",
          visualization: {
            added: [
              {
                line: 4,
                content: "2. 数据管理"
              }
            ],
            removed: [],
            modified: [],
            stats: {
              added: 1,
              removed: 0,
              modified: 0
            }
          }
        },
        message: "差异可视化生成成功"
      })
      expect(mockDiffService.generateDiffVisualization).toHaveBeenCalledWith(
        documentId,
        visualizationRequest.sourceVersion,
        visualizationRequest.targetVersion
      )
    })
  })

  describe("LLM集成API测试", () => {
    it("应该能够生成需求文档", async () => {
      const generateRequest = {
        userInput: "我需要开发一个用户管理系统，包含用户注册、登录、权限管理等功能"
      }

      mockLLMService.generateRequirementsDocument.mockResolvedValue({
        content: "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 权限管理",
        version: "1.0",
        generatedAt: new Date().toISOString()
      })

      const result = await workflowAPI.generateRequirementsDocument(generateRequest)

      expect(result).toEqual({
        code: 200,
        data: {
          content: "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 权限管理",
          version: "1.0",
          generatedAt: expect.any(String)
        },
        message: "需求文档生成成功"
      })
      expect(mockLLMService.generateRequirementsDocument).toHaveBeenCalledWith(
        generateRequest.userInput
      )
    })

    it("应该能够生成设计文档", async () => {
      const generateRequest = {
        requirementsContent: "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录"
      }

      mockLLMService.generateDesignDocument.mockResolvedValue({
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构",
        version: "1.0",
        generatedAt: new Date().toISOString()
      })

      const result = await workflowAPI.generateDesignDocument(generateRequest)

      expect(result).toEqual({
        code: 200,
        data: {
          content: "# 设计文档\n\n## 系统架构\n采用微服务架构",
          version: "1.0",
          generatedAt: expect.any(String)
        },
        message: "设计文档生成成功"
      })
      expect(mockLLMService.generateDesignDocument).toHaveBeenCalledWith(
        generateRequest.requirementsContent
      )
    })

    it("应该能够生成任务文档", async () => {
      const generateRequest = {
        requirementsContent: "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录",
        designContent: "# 设计文档\n\n## 系统架构\n采用微服务架构"
      }

      mockLLMService.generateTasksDocument.mockResolvedValue({
        content: "# 任务文档\n\n## 开发任务\n1. 用户注册功能开发\n2. 用户登录功能开发",
        version: "1.0",
        generatedAt: new Date().toISOString()
      })

      const result = await workflowAPI.generateTasksDocument(generateRequest)

      expect(result).toEqual({
        code: 200,
        data: {
          content: "# 任务文档\n\n## 开发任务\n1. 用户注册功能开发\n2. 用户登录功能开发",
          version: "1.0",
          generatedAt: expect.any(String)
        },
        message: "任务文档生成成功"
      })
      expect(mockLLMService.generateTasksDocument).toHaveBeenCalledWith(
        generateRequest.requirementsContent,
        generateRequest.designContent
      )
    })
  })

  describe("工作流执行API测试", () => {
    it("应该能够执行完整工作流", async () => {
      const workflowId = "wf_123456"
      const executeRequest = {
        userInput: "我需要开发一个用户管理系统，包含用户注册、登录、权限管理等功能"
      }

      mockWorkflowEngine.executeFullWorkflow.mockResolvedValue({
        workflowId: workflowId,
        status: "completed",
        documents: {
          requirements: {
            documentId: "doc_req_123",
            version: "1.0"
          },
          design: {
            documentId: "doc_design_123",
            version: "1.0"
          },
          tasks: {
            documentId: "doc_tasks_123",
            version: "1.0"
          }
        },
        completedAt: new Date().toISOString()
      })

      const result = await workflowAPI.executeFullWorkflow(workflowId, executeRequest)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: workflowId,
          status: "completed",
          documents: {
            requirements: {
              documentId: "doc_req_123",
              version: "1.0"
            },
            design: {
              documentId: "doc_design_123",
              version: "1.0"
            },
            tasks: {
              documentId: "doc_tasks_123",
              version: "1.0"
            }
          },
          completedAt: expect.any(String)
        },
        message: "工作流执行完成"
      })
      expect(mockWorkflowEngine.executeFullWorkflow).toHaveBeenCalledWith(
        workflowId,
        executeRequest.userInput
      )
    })

    it("应该能够获取工作流状态", async () => {
      const workflowId = "wf_123456"

      mockWorkflowEngine.getWorkflowStatus.mockResolvedValue({
        workflowId: workflowId,
        currentState: "requirements_input",
        progress: 25,
        status: "in_progress",
        lastUpdated: new Date().toISOString()
      })

      const result = await workflowAPI.getWorkflowStatus(workflowId)

      expect(result).toEqual({
        code: 200,
        data: {
          workflowId: workflowId,
          currentState: "requirements_input",
          progress: 25,
          status: "in_progress",
          lastUpdated: expect.any(String)
        },
        message: "工作流状态获取成功"
      })
      expect(mockWorkflowEngine.getWorkflowStatus).toHaveBeenCalledWith(workflowId)
    })
  })

  describe("错误处理测试", () => {
    it("应该处理工作流创建失败的情况", async () => {
      const workflowData = {
        name: "用户管理系统开发",
        description: "开发一个完整的用户管理系统",
        initialState: "requirements_input"
      }

      mockWorkflowEngine.createWorkflow.mockRejectedValue(new Error("工作流创建失败"))

      const result = await workflowAPI.createWorkflow(workflowData)

      expect(result).toEqual({
        code: 500,
        error: "工作流创建失败",
        message: "工作流创建失败：工作流创建失败"
      })
    })

    it("应该处理文档保存失败的情况", async () => {
      const workflowId = "wf_123456"
      const documentData = {
        type: "requirements",
        content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"
      }

      mockDocumentService.saveDocument.mockRejectedValue(new Error("文档保存失败"))

      const result = await workflowAPI.saveDocument(workflowId, documentData)

      expect(result).toEqual({
        code: 500,
        error: "文档保存失败",
        message: "文档保存失败：文档保存失败"
      })
    })

    it("应该处理LLM服务不可用的情况", async () => {
      const generateRequest = {
        userInput: "我需要开发一个用户管理系统，包含用户注册、登录、权限管理等功能"
      }

      mockLLMService.generateRequirementsDocument.mockRejectedValue(new Error("LLM服务不可用"))

      const result = await workflowAPI.generateRequirementsDocument(generateRequest)

      expect(result).toEqual({
        code: 503,
        error: "LLM服务不可用",
        message: "需求文档生成失败：LLM服务不可用"
      })
    })
  })
})