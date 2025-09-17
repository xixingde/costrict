/**
 * TypeScript interfaces and types for coworkflow support
 */

import * as vscode from "vscode"

/**
 * Task status enumeration matching the checkbox patterns in tasks.md
 */
export type TaskStatusType = "not_started" | "in_progress" | "completed"

/**
 * Document types supported by coworkflow
 */
export type CoworkflowDocumentType = "requirements" | "design" | "tasks"

/**
 * CodeLens action types for different operations
 */
export type CoworkflowActionType = "update" | "run" | "retry" | "loading"

/**
 * Task status model representing a task item in tasks.md
 */
export interface TaskStatus {
	/** Line number where the task appears */
	line: number
	/** Text range of the task item */
	range: vscode.Range
	/** Current status of the task */
	status: TaskStatusType
	/** Full text content of the task */
	text: string
	/** Optional task identifier for sub-tasks (e.g., "1.1", "2.3") */
	taskId?: string
}

/**
 * Extended CodeLens with coworkflow-specific context
 */
export interface CoworkflowCodeLens extends vscode.CodeLens {
	/** Type of document this CodeLens belongs to */
	documentType: CoworkflowDocumentType
	/** Type of action this CodeLens performs */
	actionType: CoworkflowActionType
	/** Additional context for the action */
	context?: {
		/** Task identifier for task-specific actions */
		taskId?: string
		/** Section title for section-specific actions */
		sectionTitle?: string
		/** Line number for precise positioning */
		lineNumber?: number
	}
}

/**
 * File context model for tracking coworkflow files
 */
export interface CoworkflowFileContext {
	/** URI of the file */
	uri: vscode.Uri
	/** Type of coworkflow document */
	type: CoworkflowDocumentType
	/** Last modification timestamp */
	lastModified: Date
	/** Whether the file is currently active/monitored */
	isActive: boolean
}

/**
 * Configuration for coworkflow file monitoring
 */
export interface CoworkflowWatcherConfig {
	/** Whether to enable file watching */
	enabled: boolean
	/** Debounce delay for file change events (ms) */
	debounceDelay: number
	/** File patterns to watch */
	watchPatterns: string[]
}

/**
 * Interface for coworkflow file watcher
 */
export interface ICoworkflowFileWatcher extends vscode.Disposable {
	/** Initialize the file watcher */
	initialize(): void
	/** Handle file change events */
	onFileChanged(uri: vscode.Uri): void
	/** Get the current coworkflow directory path */
	getCoworkflowPath(): string | undefined
	/** Check if a file is being monitored */
	isMonitoring(uri: vscode.Uri): boolean
}

/**
 * Interface for coworkflow CodeLens provider
 */
export interface ICoworkflowCodeLensProvider extends vscode.CodeLensProvider {
	/** Refresh CodeLens for all documents */
	refresh(): void
	/** Get document type from URI */
	getDocumentType(uri: vscode.Uri): CoworkflowDocumentType | undefined
}

/**
 * Interface for coworkflow decoration provider
 */
export interface ICoworkflowDecorationProvider extends vscode.Disposable {
	/** Update decorations for a document */
	updateDecorations(document: vscode.TextDocument): void
	/** Clear decorations for a document */
	clearDecorations(document: vscode.TextDocument): void
	/** Refresh all decorations */
	refreshAll(): void
}

/**
 * Command context for coworkflow operations
 */
export interface CoworkflowCommandContext {
	/** Document URI */
	uri: vscode.Uri
	/** Document type */
	documentType: CoworkflowDocumentType
	/** Action type */
	actionType: CoworkflowActionType
	/** Additional context data */
	context?: {
		taskId?: string
		sectionTitle?: string
		lineNumber?: number
	}
}

/**
 * Event data for file change notifications
 */
export interface CoworkflowFileChangeEvent {
	/** URI of the changed file */
	uri: vscode.Uri
	/** Type of change */
	changeType: vscode.FileChangeType
	/** Document type if applicable */
	documentType?: CoworkflowDocumentType
}

/**
 * Error severity levels for coworkflow operations
 */
export type CoworkflowErrorSeverity = "info" | "warning" | "error" | "critical"

/**
 * Error types for coworkflow operations
 */
export type CoworkflowErrorType =
	| "file_system_error"
	| "parsing_error"
	| "provider_error"
	| "command_error"
	| "permission_error"
	| "not_found_error"

/**
 * Structured error information for coworkflow operations
 */
export interface CoworkflowError {
	/** Error type classification */
	type: CoworkflowErrorType
	/** Error severity level */
	severity: CoworkflowErrorSeverity
	/** Human-readable error message */
	message: string
	/** Technical details for debugging */
	details?: string
	/** URI of the file related to the error */
	uri?: vscode.Uri
	/** Original error object if available */
	originalError?: Error
	/** Timestamp when error occurred */
	timestamp: Date
}

/**
 * Error handling configuration
 */
export interface CoworkflowErrorConfig {
	/** Whether to log errors to console */
	logToConsole: boolean
	/** Whether to show user notifications for errors */
	showUserNotifications: boolean
	/** Minimum severity level for user notifications */
	notificationThreshold: CoworkflowErrorSeverity
	/** Whether to include technical details in user messages */
	includeTechnicalDetails: boolean
}

/**
 * Interface for error handling utilities
 */
export interface ICoworkflowErrorHandler {
	/** Handle an error with appropriate logging and user feedback */
	handleError(error: CoworkflowError): void
	/** Create a structured error from an exception */
	createError(
		type: CoworkflowErrorType,
		severity: CoworkflowErrorSeverity,
		message: string,
		originalError?: Error,
		uri?: vscode.Uri,
	): CoworkflowError
	/** Log an error without user notification */
	logError(error: CoworkflowError): void
	/** Show user notification for an error */
	showErrorNotification(error: CoworkflowError): void
}

/**
 * 扩展的层级任务状态接口
 * 在原有 TaskStatus 基础上添加层级信息
 */
export interface HierarchicalTaskStatus extends TaskStatus {
	/** 层级深度（0为根级别） */
	hierarchyLevel: number
	/** 父任务的行号（如果有） */
	parentLine?: number
	/** 子任务的行号列表 */
	childrenLines: number[]
	/** 子内容的行号列表（包括普通文本、列表项等） */
	childContentLines: number[]
	/** 层级路径（如 [0, 1, 2] 表示第1个根任务的第2个子任务的第3个子任务） */
	hierarchyPath: number[]
	/** 完整的层级ID（如 "1.2.3"） */
	hierarchicalId: string
}

/**
 * 子内容项接口
 * 表示任务下的非任务内容（如普通文本、列表项等）
 */
export interface TaskChildContent {
	/** 行号 */
	line: number
	/** 文本范围 */
	range: vscode.Range
	/** 内容文本 */
	text: string
	/** 缩进层级 */
	indentLevel: number
	/** 父任务行号 */
	parentTaskLine: number
	/** 父任务状态（用于继承装饰） */
	parentTaskStatus: TaskStatusType
}

/**
 * 层级节点结构
 * 用于构建任务的层级关系树
 */
export interface HierarchyNode {
	/** 任务状态信息 */
	task: HierarchicalTaskStatus
	/** 父节点引用 */
	parent: HierarchyNode | null
	/** 子节点列表 */
	children: HierarchyNode[]
	/** 层级深度 */
	level: number
}

/**
 * 缩进风格配置
 * 用于智能检测和适应项目的缩进风格
 */
export interface IndentStyle {
	/** 缩进类型：空格或制表符 */
	type: "space" | "tab"
	/** 缩进大小：空格数量或制表符数量 */
	size: number
}

/**
 * 层级装饰配置
 * 定义层级装饰的视觉样式和行为
 */
export interface HierarchyDecorationConfig {
	/** 最大支持层级深度 */
	maxDepth: number
	/** 左边框宽度配置 */
	borderWidth: {
		/** 基础宽度（px） */
		base: number
		/** 每级递增（px） */
		increment: number
	}
	/** 颜色配置 */
	colors: {
		/** 不同层级的未开始颜色 */
		notStarted: string[]
		/** 不同层级的进行中颜色 */
		inProgress: string[]
		/** 不同层级的已完成颜色 */
		completed: string[]
	}
	/** 缩进可视化配置 */
	indentVisualization: {
		/** 是否启用缩进可视化 */
		enabled: boolean
		/** 可视化样式 */
		style: "line" | "block" | "gradient"
	}
}

/**
 * 层级装饰策略接口
 * 定义如何应用层级装饰的策略
 */
export interface IHierarchyDecorationStrategy {
	/**
	 * 应用层级装饰
	 * @param document 文档对象
	 * @param hierarchyTree 层级关系树
	 * @param editor 编辑器实例
	 */
	applyDecorations(document: vscode.TextDocument, hierarchyTree: HierarchyNode[], editor: vscode.TextEditor): void
}

/**
 * 层级检测器接口
 * 定义层级识别和解析的核心功能
 */
export interface IHierarchyDetector {
	/**
	 * 检测任务的层级深度
	 * @param line 文本行内容
	 * @returns 层级深度（-1表示非任务行，0为根级别）
	 */
	detectHierarchyLevel(line: string): number

	/**
	 * 构建层级关系树
	 * @param tasks 层级任务状态列表
	 * @returns 层级关系树的根节点列表
	 */
	buildHierarchyTree(tasks: HierarchicalTaskStatus[]): HierarchyNode[]

	/**
	 * 分析文档的缩进风格
	 * @param document 文档对象
	 * @returns 缩进风格配置
	 */
	analyzeIndentStyle(document: vscode.TextDocument): IndentStyle
}

/**
 * 扩展的装饰提供器接口
 * 在原有基础上添加层级装饰支持
 */
export interface IHierarchicalCoworkflowDecorationProvider extends ICoworkflowDecorationProvider {
	/**
	 * 解析文档中的层级任务状态
	 * @param document 文档对象
	 * @returns 层级任务状态列表
	 */
	parseHierarchicalTaskStatuses(document: vscode.TextDocument): HierarchicalTaskStatus[]

	/**
	 * 更新层级装饰配置
	 * @param config 新的层级装饰配置
	 */
	updateHierarchyConfig(config: HierarchyDecorationConfig): void

	/**
	 * 获取当前层级装饰配置
	 * @returns 当前配置
	 */
	getHierarchyConfig(): HierarchyDecorationConfig
}
