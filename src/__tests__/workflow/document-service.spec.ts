import { describe, it, expect, vi, beforeEach } from "vitest"
import { DocumentService } from "../../services/document/DocumentService"

// Mock dependencies
vi.mock("fs/promises")
vi.mock("path")

describe("文档管理服务测试", () => {
  let documentService: DocumentService
  let mockFs: any
  let mockPath: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock fs/promises
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      readdir: vi.fn(),
      stat: vi.fn(),
      unlink: vi.fn()
    }
    
    // Mock path
    mockPath = {
      join: vi.fn((...args) => args.join("/")),
      resolve: vi.fn((...args) => args.join("/")),
      dirname: vi.fn((path) => path.substring(0, path.lastIndexOf("/"))),
      basename: vi.fn((path) => path.substring(path.lastIndexOf("/") + 1)),
      extname: vi.fn((path) => path.substring(path.lastIndexOf(".")))
    }

    // Set up mocks
    const fs = require("fs/promises")
    const path = require("path")
    Object.assign(fs, mockFs)
    Object.assign(path, mockPath)

    documentService = new DocumentService()
  })

  describe("文档保存测试", () => {
    it("应该能够保存文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024
      })

      const result = await documentService.saveDocument(workflowId, documentType, content)

      expect(result).toEqual({
        documentId: `doc_${documentType}_${workflowId}`,
        version: "1.0",
        status: "saved",
        savedAt: expect.any(String)
      })
      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it("应该能够更新已存在的文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n3. 新增功能"

      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024
      })

      // First save
      await documentService.saveDocument(workflowId, documentType, "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理")
      
      // Update
      const result = await documentService.saveDocument(workflowId, documentType, content)

      expect(result.version).toBe("2.0")
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)
    })

    it("应该处理文档保存失败的情况", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockFs.mkdir.mockRejectedValue(new Error("权限不足"))

      await expect(documentService.saveDocument(workflowId, documentType, content))
        .rejects.toThrow("文档保存失败：权限不足")
    })
  })

  describe("文档读取测试", () => {
    it("应该能够读取文档", async () => {
      const documentId = "doc_requirements_wf_123456"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockFs.readFile.mockResolvedValue(content)
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.getDocument(documentId)

      expect(result).toEqual({
        id: documentId,
        content: content,
        version: "1.0",
        lastModified: expect.any(Date)
      })
      expect(mockFs.readFile).toHaveBeenCalled()
    })

    it("应该处理文档不存在的情况", async () => {
      const documentId = "doc_requirements_wf_123456"

      mockFs.readFile.mockRejectedValue(new Error("文件不存在"))

      await expect(documentService.getDocument(documentId))
        .rejects.toThrow("文档读取失败：文件不存在")
    })
  })

  describe("文档版本管理测试", () => {
    it("应该能够获取文档版本", async () => {
      const documentId = "doc_requirements_wf_123456"
      const version = "1.0"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockFs.readFile.mockResolvedValue(content)
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.getDocumentVersion(documentId, version)

      expect(result).toEqual({
        id: documentId,
        content: content,
        version: version,
        lastModified: expect.any(Date)
      })
      expect(mockFs.readFile).toHaveBeenCalled()
    })

    it("应该能够获取文档版本历史", async () => {
      const documentId = "doc_requirements_wf_123456"

      mockFs.readdir.mockResolvedValue([
        "doc_requirements_wf_123456_v1.0.md",
        "doc_requirements_wf_123456_v2.0.md"
      ])
      mockFs.readFile.mockImplementation((path: string) => {
        if (path.includes("v1.0")) {
          return Promise.resolve("# 需求文档\n\n## 功能需求\n1. 用户管理")
        } else {
          return Promise.resolve("# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理")
        }
      })
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.getDocumentVersions(documentId)

      expect(result).toHaveLength(2)
      expect(result[0].version).toBe("1.0")
      expect(result[1].version).toBe("2.0")
    })
  })

  describe("临时文档管理测试", () => {
    it("应该能够保存临时文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024
      })

      const result = await documentService.saveTemporaryDocument(workflowId, documentType, content)

      expect(result).toEqual({
        documentId: `temp_${documentType}_${workflowId}`,
        version: "1.0",
        status: "saved",
        savedAt: expect.any(String)
      })
      expect(mockFs.mkdir).toHaveBeenCalled()
      expect(mockFs.writeFile).toHaveBeenCalled()
    })

    it("应该能够读取临时文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      mockFs.readFile.mockResolvedValue(content)
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.getTemporaryDocument(workflowId, documentType)

      expect(result).toEqual({
        documentId: `temp_${documentType}_${workflowId}`,
        content: content,
        version: "1.0",
        savedAt: expect.any(Date)
      })
      expect(mockFs.readFile).toHaveBeenCalled()
    })

    it("应该能够获取临时文档版本历史", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockFs.readdir.mockResolvedValue([
        "temp_requirements_wf_123456_v1.0.md",
        "temp_requirements_wf_123456_v2.0.md"
      ])
      mockFs.readFile.mockImplementation((path: string) => {
        if (path.includes("v1.0")) {
          return Promise.resolve("# 需求文档\n\n## 功能需求\n1. 用户管理")
        } else {
          return Promise.resolve("# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理")
        }
      })
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.getTemporaryDocumentVersions(workflowId, documentType)

      expect(result).toHaveLength(2)
      expect(result[0].version).toBe("1.0")
      expect(result[1].version).toBe("2.0")
    })

    it("应该能够清理过期的临时文档", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockFs.readdir.mockResolvedValue([
        "temp_requirements_wf_123456_v1.0.md",
        "temp_requirements_wf_123456_v2.0.md"
      ])
      mockFs.stat.mockImplementation((path: string) => {
        if (path.includes("v1.0")) {
          return Promise.resolve({
            isFile: () => true,
            size: 1024,
            mtime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8天前
          })
        } else {
          return Promise.resolve({
            isFile: () => true,
            size: 1024,
            mtime: new Date() // 现在
          })
        }
      })
      mockFs.unlink.mockResolvedValue(undefined)

      const result = await documentService.cleanupTemporaryDocuments(workflowId, documentType)

      expect(result).toEqual({
        cleanedCount: 1,
        message: "清理了1个过期的临时文档"
      })
      expect(mockFs.unlink).toHaveBeenCalledTimes(1)
    })
  })

  describe("文档验证测试", () => {
    it("应该能够验证文档内容", async () => {
      const documentId = "doc_requirements_wf_123456"
      const content = "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理"

      const result = await documentService.validateDocument(documentId, content)

      expect(result).toEqual({
        isValid: true,
        errors: []
      })
    })

    it("应该检测到空文档内容", async () => {
      const documentId = "doc_requirements_wf_123456"
      const content = ""

      const result = await documentService.validateDocument(documentId, content)

      expect(result).toEqual({
        isValid: false,
        errors: ["文档内容不能为空"]
      })
    })

    it("应该检测到文档格式错误", async () => {
      const documentId = "doc_requirements_wf_123456"
      const content = "这不是一个有效的Markdown文档"

      const result = await documentService.validateDocument(documentId, content)

      expect(result).toEqual({
        isValid: false,
        errors: ["文档格式不正确：缺少标题"]
      })
    })
  })

  describe("文档提交测试", () => {
    it("应该能够提交文档", async () => {
      const documentId = "doc_requirements_wf_123456"

      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.submitDocument(documentId)

      expect(result).toEqual({
        documentId: documentId,
        status: "submitted",
        submittedAt: expect.any(String)
      })
    })

    it("应该处理文档提交失败的情况", async () => {
      const documentId = "doc_requirements_wf_123456"

      mockFs.stat.mockRejectedValue(new Error("文档不存在"))

      await expect(documentService.submitDocument(documentId))
        .rejects.toThrow("文档提交失败：文档不存在")
    })
  })

  describe("文档删除测试", () => {
    it("应该能够删除文档", async () => {
      const documentId = "doc_requirements_wf_123456"

      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024
      })
      mockFs.unlink.mockResolvedValue(undefined)

      const result = await documentService.deleteDocument(documentId)

      expect(result).toEqual({
        documentId: documentId,
        status: "deleted",
        deletedAt: expect.any(String)
      })
      expect(mockFs.unlink).toHaveBeenCalled()
    })

    it("应该处理文档删除失败的情况", async () => {
      const documentId = "doc_requirements_wf_123456"

      mockFs.stat.mockRejectedValue(new Error("文档不存在"))

      await expect(documentService.deleteDocument(documentId))
        .rejects.toThrow("文档删除失败：文档不存在")
    })
  })

  describe("文档列表查询测试", () => {
    it("应该能够查询文档列表", async () => {
      const workflowId = "wf_123456"

      mockFs.readdir.mockResolvedValue([
        "doc_requirements_wf_123456_v1.0.md",
        "doc_design_wf_123456_v1.0.md",
        "doc_tasks_wf_123456_v1.0.md"
      ])
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.listDocuments(workflowId)

      expect(result).toHaveLength(3)
      expect(result[0].documentId).toBe("doc_requirements_wf_123456")
      expect(result[1].documentId).toBe("doc_design_wf_123456")
      expect(result[2].documentId).toBe("doc_tasks_wf_123456")
    })

    it("应该能够按文档类型过滤", async () => {
      const workflowId = "wf_123456"
      const documentType = "requirements"

      mockFs.readdir.mockResolvedValue([
        "doc_requirements_wf_123456_v1.0.md",
        "doc_design_wf_123456_v1.0.md",
        "doc_requirements_wf_123456_v2.0.md"
      ])
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      })

      const result = await documentService.listDocuments(workflowId, documentType)

      expect(result).toHaveLength(2)
      expect(result[0].documentId).toBe("doc_requirements_wf_123456")
      expect(result[1].documentId).toBe("doc_requirements_wf_123456")
    })
  })
})