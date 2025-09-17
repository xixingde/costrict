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
export type CoworkflowActionType = "update" | "run" | "retry"

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
