import { describe, it, expect, vi, beforeEach } from "vitest"
import { LLMIntegrationService } from "../../services/llm/LLMIntegrationService"

// Mock dependencies
vi.mock("axios")

describe("LLM集成服务测试", () => {
  let llmService: LLMIntegrationService
  let mockAxios: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock axios
    mockAxios = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }

    // Set up mocks
    const axios = require("axios")
    Object.assign(axios, mockAxios)

    llmService = new LLMIntegrationService()
  })

  describe("需求文档生成测试", () => {
    it("应该能够生成需求文档", async () => {
      const userInput = "我需要开发一个用户管理系统，包含用户注册、登录、权限管理等功能"
      const expectedResponse = {
        data: {
          choices: [
            {
              message: {
                content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 权限管理\n4. 用户信息管理"
              }
            }
          ]
        }
      }

      mockAxios.post.mockResolvedValue(expectedResponse)

      const result = await llmService.generateRequirementsDocument(userInput)

      expect(result).toEqual({
        content: "# 需求文档\n\n## 项目概述\n开发一个用户管理系统\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 权限管理\n4. 用户信息管理",
        version: "1.0",
        generatedAt: expect.any(String)
      })
      expect(mockAxios.post).toHaveBeenCalled()
    })

    it("应该处理需求文档生成失败的情况", async () => {
      const userInput = "我需要开发一个用户管理系统"

      mockAxios.post.mockRejectedValue(new Error("LLM服务不可用"))

      await expect(llmService.generateRequirementsDocument(userInput))
        .rejects.toThrow("需求文档生成失败：LLM服务不可用")
    })

    it("应该处理空输入的情况", async () => {
      const userInput = ""

      await expect(llmService.generateRequirementsDocument(userInput))
        .rejects.toThrow("用户输入不能为空")
    })
  })

  describe("设计文档生成测试", () => {
    it("应该能够基于需求文档生成设计文档", async () => {
      const requirementsContent = "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 权限管理"
      const expectedResponse = {
        data: {
          choices: [
            {
              message: {
                content: "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## 技术栈\n- 前端：React\n- 后端：Node.js\n- 数据库：MongoDB\n\n## API设计\n1. 用户注册API\n2. 用户登录API\n3. 权限管理API"
              }
            }
          ]
        }
      }

      mockAxios.post.mockResolvedValue(expectedResponse)

      const result = await llmService.generateDesignDocument(requirementsContent)

      expect(result).toEqual({
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## 技术栈\n- 前端：React\n- 后端：Node.js\n- 数据库：MongoDB\n\n## API设计\n1. 用户注册API\n2. 用户登录API\n3. 权限管理API",
        version: "1.0",
        generatedAt: expect.any(String)
      })
      expect(mockAxios.post).toHaveBeenCalled()
    })

    it("应该处理设计文档生成失败的情况", async () => {
      const requirementsContent = "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录"

      mockAxios.post.mockRejectedValue(new Error("网络错误"))

      await expect(llmService.generateDesignDocument(requirementsContent))
        .rejects.toThrow("设计文档生成失败：网络错误")
    })
  })

  describe("任务文档生成测试", () => {
    it("应该能够基于需求文档和设计文档生成任务文档", async () => {
      const requirementsContent = "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录"
      const designContent = "# 设计文档\n\n## 系统架构\n采用微服务架构"
      const expectedResponse = {
        data: {
          choices: [
            {
              message: {
                content: "# 任务文档\n\n## 开发任务\n1. 用户注册功能开发\n2. 用户登录功能开发\n3. 权限管理功能开发\n\n## 测试任务\n1. 单元测试\n2. 集成测试\n3. 系统测试"
              }
            }
          ]
        }
      }

      mockAxios.post.mockResolvedValue(expectedResponse)

      const result = await llmService.generateTasksDocument(requirementsContent, designContent)

      expect(result).toEqual({
        content: "# 任务文档\n\n## 开发任务\n1. 用户注册功能开发\n2. 用户登录功能开发\n3. 权限管理功能开发\n\n## 测试任务\n1. 单元测试\n2. 集成测试\n3. 系统测试",
        version: "1.0",
        generatedAt: expect.any(String)
      })
      expect(mockAxios.post).toHaveBeenCalled()
    })

    it("应该处理任务文档生成失败的情况", async () => {
      const requirementsContent = "# 需求文档\n\n## 功能需求\n1. 用户注册"
      const designContent = "# 设计文档\n\n## 系统架构\n采用微服务架构"

      mockAxios.post.mockRejectedValue(new Error("LLM响应超时"))

      await expect(llmService.generateTasksDocument(requirementsContent, designContent))
        .rejects.toThrow("任务文档生成失败：LLM响应超时")
    })
  })

  describe("需求文档更新测试", () => {
    it("应该能够基于用户反馈更新需求文档", async () => {
      const originalContent = "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录"
      const userFeedback = "需要添加用户信息修改功能"
      const expectedResponse = {
        data: {
          choices: [
            {
              message: {
                content: "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 用户信息修改\n4. 用户信息查看"
              }
            }
          ]
        }
      }

      mockAxios.post.mockResolvedValue(expectedResponse)

      const result = await llmService.updateRequirementsDocument(originalContent, userFeedback)

      expect(result).toEqual({
        content: "# 需求文档\n\n## 功能需求\n1. 用户注册\n2. 用户登录\n3. 用户信息修改\n4. 用户信息查看",
        version: "2.0",
        generatedAt: expect.any(String)
      })
      expect(mockAxios.post).toHaveBeenCalled()
    })

    it("应该处理需求文档更新失败的情况", async () => {
      const originalContent = "# 需求文档\n\n## 功能需求\n1. 用户注册"
      const userFeedback = "需要添加用户信息修改功能"

      mockAxios.post.mockRejectedValue(new Error("API调用失败"))

      await expect(llmService.updateRequirementsDocument(originalContent, userFeedback))
        .rejects.toThrow("需求文档更新失败：API调用失败")
    })
  })

  describe("设计文档更新测试", () => {
    it("应该能够基于需求文档差异更新设计文档", async () => {
      const diffs = [
        {
          type: "added",
          content: "3. 用户信息修改",
          line: 5,
          semanticChange: "content"
        }
      ]
      const expectedResponse = {
        data: {
          choices: [
            {
              message: {
                content: "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## API设计\n1. 用户注册API\n2. 用户登录API\n3. 用户信息修改API\n4. 用户信息查看API"
              }
            }
          ]
        }
      }

      mockAxios.post.mockResolvedValue(expectedResponse)

      const result = await llmService.updateDesignDocument(diffs)

      expect(result).toEqual({
        content: "# 设计文档\n\n## 系统架构\n采用微服务架构\n\n## API设计\n1. 用户注册API\n2. 用户登录API\n3. 用户信息修改API\n4. 用户信息查看API",
        version: "2.0",
        generatedAt: expect.any(String)
      })
      expect(mockAxios.post).toHaveBeenCalled()
    })

    it("应该处理设计文档更新失败的情况", async () => {
      const diffs = [
        {
          type: "added",
          content: "3. 用户信息修改",
          line: 5,
          semanticChange: "content"
        }
      ]

      mockAxios.post.mockRejectedValue(new Error("服务器错误"))

      await expect(llmService.updateDesignDocument(diffs))
        .rejects.toThrow("设计文档更新失败：服务器错误")
    })
  })

  describe("任务文档更新测试", () => {
    it("应该能够基于设计文档差异更新任务文档", async () => {
      const diffs = [
        {
          type: "added",
          content: "3. 用户信息修改API",
          line: 7,
          semanticChange: "content"
        }
      ]
      const expectedResponse = {
        data: {
          choices: [
            {
              message: {
                content: "# 任务文档\n\n## 开发任务\n1. 用户注册功能开发\n2. 用户登录功能开发\n3. 用户信息修改功能开发\n4. 用户信息查看功能开发\n\n## 测试任务\n1. 单元测试\n2. 集成测试\n3. 系统测试"
              }
            }
          ]
        }
      }

      mockAxios.post.mockResolvedValue(expectedResponse)

      const result = await llmService.updateTasksDocument(diffs)

      expect(result).toEqual({
        content: "# 任务文档\n\n## 开发任务\n1. 用户注册功能开发\n2. 用户登录功能开发\n3. 用户信息修改功能开发\n4. 用户信息查看功能开发\n\n## 测试任务\n1. 单元测试\n2. 集成测试\n3. 系统测试",
        version: "2.0",
        generatedAt: expect.any(String)
      })
      expect(mockAxios.post).toHaveBeenCalled()
    })

    it("应该处理任务文档更新失败的情况", async () => {
      const diffs = [
        {
          type: "added",
          content: "3. 用户信息修改API",
          line: 7,
          semanticChange: "content"
        }
      ]

      mockAxios.post.mockRejectedValue(new Error("请求超时"))

      await expect(llmService.updateTasksDocument(diffs))
        .rejects.toThrow("任务文档更新失败：请求超时")
    })
  })

  describe("LLM服务配置测试", () => {
    it("应该能够配置LLM服务参数", async () => {
      const config = {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
        timeout: 30000
      }

      llmService.configure(config)

      expect(llmService.getConfig()).toEqual(config)
    })

    it("应该验证LLM服务配置", async () => {
      const invalidConfig = {
        model: "",
        temperature: 2.0,
        maxTokens: -1,
        timeout: 0
      }

      await expect(llmService.configure(invalidConfig))
        .rejects.toThrow("LLM服务配置无效")
    })
  })

  describe("LLM服务健康检查测试", () => {
    it("应该能够检查LLM服务健康状态", async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          status: "healthy",
          models: ["gpt-3.5-turbo", "gpt-4"]
        }
      })

      const result = await llmService.healthCheck()

      expect(result).toEqual({
        status: "healthy",
        models: ["gpt-3.5-turbo", "gpt-4"],
        checkedAt: expect.any(String)
      })
      expect(mockAxios.get).toHaveBeenCalled()
    })

    it("应该处理LLM服务健康检查失败的情况", async () => {
      mockAxios.get.mockRejectedValue(new Error("服务不可用"))

      await expect(llmService.healthCheck())
        .rejects.toThrow("LLM服务健康检查失败：服务不可用")
    })
  })

  describe("LLM服务使用统计测试", () => {
    it("应该能够获取LLM服务使用统计", async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          totalRequests: 100,
          totalTokens: 50000,
          averageResponseTime: 1500,
          errorRate: 0.02
        }
      })

      const result = await llmService.getUsageStats()

      expect(result).toEqual({
        totalRequests: 100,
        totalTokens: 50000,
        averageResponseTime: 1500,
        errorRate: 0.02,
        retrievedAt: expect.any(String)
      })
      expect(mockAxios.get).toHaveBeenCalled()
    })

    it("应该处理LLM服务使用统计获取失败的情况", async () => {
      mockAxios.get.mockRejectedValue(new Error("统计数据不可用"))

      await expect(llmService.getUsageStats())
        .rejects.toThrow("LLM服务使用统计获取失败：统计数据不可用")
    })
  })
})