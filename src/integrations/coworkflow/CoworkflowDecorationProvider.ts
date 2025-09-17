/**
 * CoworkflowDecorationProvider - Manages visual status indicators for tasks
 */

import * as vscode from "vscode"
import { ICoworkflowDecorationProvider, TaskStatus, TaskStatusType } from "./types"
import { CoworkflowErrorHandler } from "./CoworkflowErrorHandler"

export class CoworkflowDecorationProvider implements ICoworkflowDecorationProvider {
	private disposables: vscode.Disposable[] = []
	private decorationTypes: Map<TaskStatusType, vscode.TextEditorDecorationType> = new Map()
	private documentDecorations: Map<string, TaskStatus[]> = new Map()
	private errorHandler: CoworkflowErrorHandler

	constructor() {
		this.errorHandler = new CoworkflowErrorHandler()
		this.initializeDecorationTypes()
		this.setupEventHandlers()
	}

	public dispose(): void {
		try {
			this.decorationTypes.forEach((decorationType) => {
				try {
					decorationType.dispose()
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"provider_error",
							"warning",
							"Error disposing decoration type",
							error as Error,
						),
					)
				}
			})
			this.decorationTypes.clear()
			this.documentDecorations.clear()
			this.disposables.forEach((d) => {
				try {
					d.dispose()
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"provider_error",
							"warning",
							"Error disposing event handler",
							error as Error,
						),
					)
				}
			})
			this.disposables = []
			this.errorHandler.dispose()
		} catch (error) {
			console.error("CoworkflowDecorationProvider: Error during disposal", error)
		}
	}

	public updateDecorations(document: vscode.TextDocument): void {
		// Only process tasks.md files in .coworkflow directories
		if (!this.isTasksDocument(document)) {
			return
		}

		try {
			// Validate document before parsing
			if (!this.isValidTasksDocument(document)) {
				this.errorHandler.logError(
					this.errorHandler.createError(
						"parsing_error",
						"warning",
						"Tasks document appears to be invalid - skipping decorations",
						undefined,
						document.uri,
					),
				)
				return
			}

			const taskStatuses = this.parseTaskStatuses(document)
			this.documentDecorations.set(document.uri.toString(), taskStatuses)
			this.applyDecorations(document, taskStatuses)
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"parsing_error",
				"error",
				"Error updating task decorations",
				error as Error,
				document.uri,
			)
			this.errorHandler.handleError(coworkflowError)

			// Clear decorations on error to avoid stale state
			this.clearDecorations(document)
		}
	}

	public clearDecorations(document: vscode.TextDocument): void {
		const documentKey = document.uri.toString()
		this.documentDecorations.delete(documentKey)

		// Clear all decoration types for this document
		const editors = vscode.window.visibleTextEditors.filter(
			(editor) => editor.document.uri.toString() === documentKey,
		)

		editors.forEach((editor) => {
			this.decorationTypes.forEach((decorationType) => {
				editor.setDecorations(decorationType, [])
			})
		})
	}

	public refreshAll(): void {
		// Refresh decorations for all open tasks.md documents
		vscode.window.visibleTextEditors.forEach((editor) => {
			if (this.isTasksDocument(editor.document)) {
				this.updateDecorations(editor.document)
			}
		})
	}

	private initializeDecorationTypes(): void {
		// No decoration for not_started tasks ([ ])
		this.decorationTypes.set("not_started", vscode.window.createTextEditorDecorationType({}))

		// Light yellow background for in_progress tasks ([-])
		this.decorationTypes.set(
			"in_progress",
			vscode.window.createTextEditorDecorationType({
				backgroundColor: "rgba(255, 255, 0, 0.2)",
				isWholeLine: true,
			}),
		)

		// Light green background for completed tasks ([x])
		this.decorationTypes.set(
			"completed",
			vscode.window.createTextEditorDecorationType({
				backgroundColor: "rgba(0, 255, 0, 0.2)",
				isWholeLine: true,
			}),
		)
	}

	private setupEventHandlers(): void {
		// Update decorations when document content changes
		this.disposables.push(
			vscode.workspace.onDidChangeTextDocument((event) => {
				if (this.isTasksDocument(event.document)) {
					// Debounce rapid changes
					setTimeout(() => {
						this.updateDecorations(event.document)
					}, 100)
				}
			}),
		)

		// Update decorations when editor becomes visible
		this.disposables.push(
			vscode.window.onDidChangeVisibleTextEditors(() => {
				this.refreshAll()
			}),
		)

		// Clear decorations when document is closed
		this.disposables.push(
			vscode.workspace.onDidCloseTextDocument((document) => {
				this.clearDecorations(document)
			}),
		)
	}

	private isTasksDocument(document: vscode.TextDocument): boolean {
		const fileName = document.uri.path.split("/").pop()
		const parentDir = document.uri.path.split("/").slice(-2, -1)[0]
		return fileName === "tasks.md" && parentDir === ".coworkflow"
	}

	private isValidTasksDocument(document: vscode.TextDocument): boolean {
		try {
			const text = document.getText()

			// Check if document is empty
			if (!text || text.trim().length === 0) {
				return false
			}

			// Check if document is too large (potential memory issue)
			if (text.length > 1000000) {
				// 1MB limit
				this.errorHandler.logError(
					this.errorHandler.createError(
						"parsing_error",
						"warning",
						"Tasks document is very large - may impact performance",
						undefined,
						document.uri,
					),
				)
			}

			return true
		} catch (error) {
			this.errorHandler.logError(
				this.errorHandler.createError(
					"parsing_error",
					"error",
					"Error validating tasks document",
					error as Error,
					document.uri,
				),
			)
			return false
		}
	}

	private parseTaskStatuses(document: vscode.TextDocument): TaskStatus[] {
		const taskStatuses: TaskStatus[] = []

		try {
			const text = document.getText()
			const lines = text.split("\n")

			// Regex to match task items: - [ ], - [-], - [x]
			const taskItemRegex = /^-\s+\[([ x-])\]\s+(.+)/

			lines.forEach((line, index) => {
				try {
					const match = taskItemRegex.exec(line)
					if (match) {
						const [, statusChar, taskText] = match

						// Validate extracted data
						if (!taskText || taskText.trim().length === 0) {
							this.errorHandler.logError(
								this.errorHandler.createError(
									"parsing_error",
									"warning",
									`Empty task text at line ${index + 1}`,
									undefined,
									document.uri,
								),
							)
							return
						}

						const status = this.parseTaskStatus(statusChar)
						const range = new vscode.Range(index, 0, index, line.length)

						// Extract task ID if present
						let taskId: string | undefined
						try {
							const taskIdMatch = taskText.match(/^(\d+(?:\.\d+)?)\s+/)
							taskId = taskIdMatch ? taskIdMatch[1] : undefined
						} catch (error) {
							this.errorHandler.logError(
								this.errorHandler.createError(
									"parsing_error",
									"info",
									`Error extracting task ID at line ${index + 1}`,
									error as Error,
									document.uri,
								),
							)
						}

						taskStatuses.push({
							line: index,
							range,
							status,
							text: taskText.trim(),
							taskId,
						})
					}
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"parsing_error",
							"warning",
							`Error processing task at line ${index + 1}`,
							error as Error,
							document.uri,
						),
					)
				}
			})
		} catch (error) {
			this.errorHandler.logError(
				this.errorHandler.createError(
					"parsing_error",
					"error",
					"Error parsing task statuses",
					error as Error,
					document.uri,
				),
			)
		}

		return taskStatuses
	}

	private parseTaskStatus(statusChar: string): TaskStatusType {
		try {
			switch (statusChar) {
				case " ":
					return "not_started"
				case "-":
					return "in_progress"
				case "x":
					return "completed"
				default:
					this.errorHandler.logError(
						this.errorHandler.createError(
							"parsing_error",
							"warning",
							`Unknown task status character '${statusChar}' - defaulting to 'not_started'`,
						),
					)
					return "not_started"
			}
		} catch (error) {
			this.errorHandler.logError(
				this.errorHandler.createError(
					"parsing_error",
					"warning",
					"Error parsing task status - defaulting to not_started",
					error as Error,
				),
			)
			return "not_started"
		}
	}

	private applyDecorations(document: vscode.TextDocument, taskStatuses: TaskStatus[]): void {
		try {
			const editors = vscode.window.visibleTextEditors.filter(
				(editor) => editor.document.uri.toString() === document.uri.toString(),
			)

			if (editors.length === 0) {
				return
			}

			// Group task statuses by status type
			const decorationsByStatus = new Map<TaskStatusType, vscode.Range[]>()

			taskStatuses.forEach((task) => {
				try {
					if (!decorationsByStatus.has(task.status)) {
						decorationsByStatus.set(task.status, [])
					}
					decorationsByStatus.get(task.status)!.push(task.range)
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"provider_error",
							"warning",
							`Error grouping decoration for task at line ${task.line + 1}`,
							error as Error,
							document.uri,
						),
					)
				}
			})

			// Apply decorations for each status type
			editors.forEach((editor) => {
				try {
					this.decorationTypes.forEach((decorationType, status) => {
						try {
							const ranges = decorationsByStatus.get(status) || []
							editor.setDecorations(decorationType, ranges)
						} catch (error) {
							this.errorHandler.logError(
								this.errorHandler.createError(
									"provider_error",
									"warning",
									`Error applying ${status} decorations`,
									error as Error,
									document.uri,
								),
							)
						}
					})
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"provider_error",
							"warning",
							"Error applying decorations to editor",
							error as Error,
							document.uri,
						),
					)
				}
			})
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"provider_error",
				"error",
				"Error applying task decorations",
				error as Error,
				document.uri,
			)
			this.errorHandler.handleError(coworkflowError)
		}
	}
}
