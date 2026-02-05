/**
 * File Outline Tool - 提取代码文件的结构信息（类、函数、方法定义）
 */

import * as vscode from "vscode"
import * as path from "path"

import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { getReadablePath } from "../../utils/path"
import { isPathOutsideWorkspace } from "../../utils/pathUtils"
import type { ToolUse } from "../../shared/tools"

import { BaseTool, ToolCallbacks } from "./BaseTool"

interface FileOutlineParams {
	file_path: string
	include_docstrings?: boolean
}

/**
 * 定义信息
 */
interface Definition {
	line: number
	name: string
	kind: string
	detail?: string
	children?: Definition[]
}

/**
 * 将 VSCode SymbolKind 映射到字符串
 */
function getSymbolKindName(kind: vscode.SymbolKind): string {
	switch (kind) {
		case vscode.SymbolKind.File:
			return "File"
		case vscode.SymbolKind.Module:
			return "Module"
		case vscode.SymbolKind.Namespace:
			return "Namespace"
		case vscode.SymbolKind.Package:
			return "Package"
		case vscode.SymbolKind.Class:
			return "Class"
		case vscode.SymbolKind.Method:
			return "Method"
		case vscode.SymbolKind.Property:
			return "Property"
		case vscode.SymbolKind.Field:
			return "Field"
		case vscode.SymbolKind.Constructor:
			return "Constructor"
		case vscode.SymbolKind.Enum:
			return "Enum"
		case vscode.SymbolKind.Interface:
			return "Interface"
		case vscode.SymbolKind.Function:
			return "Function"
		case vscode.SymbolKind.Variable:
			return "Variable"
		case vscode.SymbolKind.Constant:
			return "Constant"
		case vscode.SymbolKind.String:
			return "String"
		case vscode.SymbolKind.Number:
			return "Number"
		case vscode.SymbolKind.Boolean:
			return "Boolean"
		case vscode.SymbolKind.Array:
			return "Array"
		case vscode.SymbolKind.Object:
			return "Object"
		case vscode.SymbolKind.Key:
			return "Key"
		case vscode.SymbolKind.Null:
			return "Null"
		case vscode.SymbolKind.EnumMember:
			return "EnumMember"
		case vscode.SymbolKind.Struct:
			return "Struct"
		case vscode.SymbolKind.Event:
			return "Event"
		case vscode.SymbolKind.Operator:
			return "Operator"
		case vscode.SymbolKind.TypeParameter:
			return "TypeParameter"
		default:
			return "Unknown"
	}
}

/**
 * 将 DocumentSymbol 转换为 Definition（支持嵌套）
 */
function convertDocumentSymbolToDefinition(symbol: vscode.DocumentSymbol): Definition {
	const result: Definition = {
		line: symbol.range.start.line + 1,
		name: symbol.name,
		kind: getSymbolKindName(symbol.kind),
		detail: symbol.detail || undefined,
	}

	// 递归处理子符号
	if (symbol.children && symbol.children.length > 0) {
		result.children = symbol.children.map((child) => convertDocumentSymbolToDefinition(child))
	}

	return result
}

/**
 * 格式化定义列表（支持嵌套结构）
 */
function formatDefinitions(definitions: Definition[], level = 0): string[] {
	if (definitions.length === 0) {
		return []
	}

	const lines: string[] = []
	const indent = "  ".repeat(level)

	definitions.forEach((def) => {
		const lineNum = `Line ${def.line}`
		const kindAndName = `${def.kind}: ${def.name}`
		const detail = def.detail ? ` (${def.detail})` : ""

		lines.push(`${indent}**${lineNum}: ${kindAndName}${detail}**`)

		// 递归格式化子定义
		if (def.children && def.children.length > 0) {
			const childrenLines = formatDefinitions(def.children, level + 1)
			childrenLines.forEach((line) => lines.push(line))
		}
	})

	return lines
}

/**
 * 格式化根级别的输出
 */
function formatRootOutput(definitions: Definition[], filePath: string): string {
	if (definitions.length === 0) {
		return `# ${filePath}\n\nNo definitions found.`
	}

	const lines: string[] = [`# ${filePath}\n`]

	definitions.forEach((def) => {
		const lineNum = `Line ${def.line}`
		const kindAndName = `${def.kind}: ${def.name}`
		const detail = def.detail ? ` (${def.detail})` : ""

		lines.push(`\n**${lineNum}: ${kindAndName}${detail}**`)

		// 递归格式化子定义并添加额外缩进
		if (def.children && def.children.length > 0) {
			const childrenLines = formatDefinitions(def.children, 1)
			childrenLines.forEach((line) => lines.push(line))
		}
	})

	return lines.join("\n")
}

export class FileOutlineTool extends BaseTool<"file_outline"> {
	readonly name = "file_outline" as const

	async execute(params: FileOutlineParams, task: Task, callbacks: ToolCallbacks): Promise<void> {
		const { file_path, include_docstrings = true } = params
		const { askApproval, handleError, pushToolResult } = callbacks

		try {
			if (!file_path) {
				task.consecutiveMistakeCount++
				task.recordToolError("file_outline")
				task.didToolFailInCurrentTurn = true
				pushToolResult(await task.sayAndCreateMissingParamError("file_outline", "file_path"))
				return
			}

			task.consecutiveMistakeCount = 0

			const absolutePath = path.resolve(task.cwd, file_path)
			const isOutsideWorkspace = isPathOutsideWorkspace(absolutePath)

			// 获取文档 URI
			const uri = vscode.Uri.file(absolutePath)

			// 获取文档符号
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				uri,
			)

			if (!symbols || symbols.length === 0) {
				const result = `# ${file_path}\n\nNo definitions found.`
				pushToolResult(result)
				return
			}

			// 转换符号
			const definitions: Definition[] = symbols.map((symbol) => convertDocumentSymbolToDefinition(symbol))

			// 按行号排序
			const sortDefinitions = (defs: Definition[]): Definition[] => {
				const sorted = [...defs].sort((a, b) => a.line - b.line)
				sorted.forEach((def) => {
					if (def.children) {
						def.children = sortDefinitions(def.children)
					}
				})
				return sorted
			}

			const sortedDefinitions = sortDefinitions(definitions)

			// 格式化输出
			const result = formatRootOutput(sortedDefinitions, getReadablePath(task.cwd, file_path))

			pushToolResult(result)
		} catch (error) {
			// 如果是文件不存在或无法读取
			if (error instanceof vscode.FileSystemError) {
				const errorMsg = `Error: ${error.message}`
				pushToolResult(await formatResponse.toolError(errorMsg))
				return
			}
			// 如果是 VSCode 相关错误
			if (error instanceof Error && error.name === "CancellationError") {
				const errorMsg = `Error: Operation was cancelled`
				pushToolResult(await formatResponse.toolError(errorMsg))
				return
			}

			await handleError("extracting file outline", error)
		}
	}

	override async handlePartial(task: Task, block: ToolUse<"file_outline">): Promise<void> {
		const filePath: string | undefined = block.params.file_path
		if (filePath) {
			const absolutePath = path.resolve(task.cwd, filePath)
			const isOutsideWorkspace = isPathOutsideWorkspace(absolutePath)
			const readablePath = getReadablePath(task.cwd, filePath)

			await task
				.ask(
					"tool",
					JSON.stringify({
						tool: "file_outline",
						path: readablePath,
						isOutsideWorkspace,
					}),
					block.partial,
				)
				.catch(() => {})
		}
	}
}

export const fileOutlineTool = new FileOutlineTool()
