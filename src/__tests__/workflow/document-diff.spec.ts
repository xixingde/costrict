import { describe, it, expect, vi, beforeEach } from "vitest"
import { DiffService } from "../../services/diff/DiffService"
import { DocumentService } from "../../services/document/DocumentService"

// Mock dependencies
vi.mock("../../services/document/DocumentService")

describe("文档差异比较功能测试", () => {
  let diffService: DiffService
  let mockDocumentService: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDocumentService = new DocumentService() as any
    diffService = new DiffService(mockDocumentService)
  })

  describe("文档差异比较测试", () => {
    it("应该能够比较两个文档的差异", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n3. 新增功能",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

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
      expect(mockDocumentService.getDocumentVersion).toHaveBeenCalledWith(documentId, sourceVersion)
      expect(mockDocumentService.getDocumentVersion).toHaveBeenCalledWith(documentId, targetVersion)
    })

    it("应该处理文档结构变更的差异比较", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n\n## 非功能需求\n1. 性能要求",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toHaveLength(2)
      expect(result.data.diffs[0].type).toBe("added")
      expect(result.data.diffs[0].content).toBe("")
      expect(result.data.diffs[1].type).toBe("added")
      expect(result.data.diffs[1].content).toBe("## 非功能需求\n1. 性能要求")
    })

    it("应该处理文档内容删除的差异比较", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n3. 旧功能",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toHaveLength(1)
      expect(result.data.diffs[0].type).toBe("removed")
      expect(result.data.diffs[0].content).toBe("3. 旧功能")
    })

    it("应该处理文档内容修改的差异比较", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理（更新）\n2. 数据管理",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toHaveLength(1)
      expect(result.data.diffs[0].type).toBe("modified")
      expect(result.data.diffs[0].content).toBe("1. 用户管理（更新）")
    })
  })

  describe("语义变更分析测试", () => {
    it("应该能够分析文档的语义变更", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n\n## 系统架构\n采用微服务架构",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toHaveLength(2)
      expect(result.data.diffs[0].semanticChange).toBe("content")
      expect(result.data.diffs[1].semanticChange).toBe("structure")
    })

    it("应该识别重大语义变更", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 系统架构\n采用微服务架构\n\n## 技术栈\n- 前端：React\n- 后端：Node.js",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.diffs).toHaveLength(4)
      expect(result.data.diffs[0].type).toBe("removed")
      expect(result.data.diffs[0].semanticChange).toBe("structure")
      expect(result.data.diffs[1].type).toBe("removed")
      expect(result.data.diffs[1].semanticChange).toBe("content")
      expect(result.data.diffs[2].type).toBe("added")
      expect(result.data.diffs[2].semanticChange).toBe("structure")
      expect(result.data.diffs[3].type).toBe("added")
      expect(result.data.diffs[3].semanticChange).toBe("structure")
    })
  })

  describe("差异摘要生成测试", () => {
    it("应该能够生成差异摘要", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理\n3. 新增功能",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.summary).toBe("新增了数据管理和新增功能需求")
    })

    it("应该生成结构变更的摘要", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n\n## 非功能需求\n1. 性能要求",
            version: "2.0"
          })
        }
      })

      const result = await diffService.compareDocuments(documentId, sourceVersion, targetVersion)

      expect(result.data.summary).toBe("新增了非功能需求章节")
    })
  })

  describe("错误处理测试", () => {
    it("应该处理文档版本不存在的情况", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockRejectedValue(new Error("文档版本不存在"))

      await expect(diffService.compareDocuments(documentId, sourceVersion, targetVersion))
        .rejects.toThrow("文档差异比较失败：文档版本不存在")
    })

    it("应该处理文档内容为空的情况", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockResolvedValue({
        id: documentId,
        content: "",
        version: "1.0"
      })

      await expect(diffService.compareDocuments(documentId, sourceVersion, targetVersion))
        .rejects.toThrow("文档内容为空")
    })
  })

  describe("批量差异比较测试", () => {
    it("应该能够批量比较多个文档的差异", async () => {
      const documentIds = ["doc_123", "doc_456"]
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (id === "doc_123") {
          if (version === "1.0") {
            return Promise.resolve({
              id: "doc_123",
              content: "# 需求文档\n\n## 功能需求\n1. 用户管理",
              version: "1.0"
            })
          } else {
            return Promise.resolve({
              id: "doc_123",
              content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
              version: "2.0"
            })
          }
        } else {
          if (version === "1.0") {
            return Promise.resolve({
              id: "doc_456",
              content: "# 设计文档\n\n## 系统架构\n采用单体架构",
              version: "1.0"
            })
          } else {
            return Promise.resolve({
              id: "doc_456",
              content: "# 设计文档\n\n## 系统架构\n采用微服务架构",
              version: "2.0"
            })
          }
        }
      })

      const result = await diffService.batchCompareDocuments(documentIds, sourceVersion, targetVersion)

      expect(result).toEqual({
        code: 200,
        data: [
          {
            documentId: "doc_123",
            diffs: [
              {
                type: "added",
                content: "2. 数据管理",
                line: 4,
                semanticChange: "content"
              }
            ],
            summary: "新增了数据管理需求"
          },
          {
            documentId: "doc_456",
            diffs: [
              {
                type: "modified",
                content: "采用微服务架构",
                line: 3,
                semanticChange: "content"
              }
            ],
            summary: "系统架构从单体架构变更为微服务架构"
          }
        ],
        message: "批量文档差异比较完成"
      })
    })
  })

  describe("差异可视化测试", () => {
    it("应该能够生成差异可视化数据", async () => {
      const documentId = "doc_123"
      const sourceVersion = "1.0"
      const targetVersion = "2.0"

      mockDocumentService.getDocumentVersion.mockImplementation((id: string, version: string) => {
        if (version === "1.0") {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理",
            version: "1.0"
          })
        } else {
          return Promise.resolve({
            id: documentId,
            content: "# 需求文档\n\n## 功能需求\n1. 用户管理\n2. 数据管理",
            version: "2.0"
          })
        }
      })

      const result = await diffService.generateDiffVisualization(documentId, sourceVersion, targetVersion)

      expect(result).toEqual({
        code: 200,
        data: {
          documentId: documentId,
          sourceVersion: sourceVersion,
          targetVersion: targetVersion,
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
        message: "差异可视化数据生成成功"
      })
    })
  })
})