/**
 * Command registration and handlers for coworkflow operations
 */

import * as vscode from "vscode"
import { CoworkflowCodeLens, CoworkflowCommandContext } from "./types"
import { CoworkflowErrorHandler } from "./CoworkflowErrorHandler"

/**
 * Command identifiers for coworkflow operations
 */
export const COWORKFLOW_COMMANDS = {
	UPDATE_SECTION: "coworkflow.updateSection",
	RUN_TASK: "coworkflow.runTask",
	RETRY_TASK: "coworkflow.retryTask",
	REFRESH_CODELENS: "coworkflow.refreshCodeLens",
	REFRESH_DECORATIONS: "coworkflow.refreshDecorations",
} as const

/**
 * Command handler dependencies
 */
interface CommandHandlerDependencies {
	codeLensProvider?: any // Will be properly typed when providers are connected
	decorationProvider?: any
	fileWatcher?: any
}

let dependencies: CommandHandlerDependencies = {}
let errorHandler: CoworkflowErrorHandler

/**
 * Set command handler dependencies
 */
export function setCommandHandlerDependencies(deps: CommandHandlerDependencies): void {
	dependencies = deps
	if (!errorHandler) {
		errorHandler = new CoworkflowErrorHandler()
	}
}

/**
 * Clear command handler dependencies for cleanup
 */
export function clearCommandHandlerDependencies(): void {
	dependencies = {}
	if (errorHandler) {
		errorHandler.dispose()
	}
}

/**
 * Register all coworkflow commands with VS Code
 */
export function registerCoworkflowCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
	const disposables: vscode.Disposable[] = []

	// Initialize error handler if not already done
	if (!errorHandler) {
		errorHandler = new CoworkflowErrorHandler()
	}

	try {
		// Register update section command
		disposables.push(vscode.commands.registerCommand(COWORKFLOW_COMMANDS.UPDATE_SECTION, handleUpdateSection))

		// Register run task command
		disposables.push(vscode.commands.registerCommand(COWORKFLOW_COMMANDS.RUN_TASK, handleRunTask))

		// Register retry task command
		disposables.push(vscode.commands.registerCommand(COWORKFLOW_COMMANDS.RETRY_TASK, handleRetryTask))

		// Register refresh CodeLens command
		disposables.push(vscode.commands.registerCommand(COWORKFLOW_COMMANDS.REFRESH_CODELENS, handleRefreshCodeLens))

		// Register refresh decorations command
		disposables.push(
			vscode.commands.registerCommand(COWORKFLOW_COMMANDS.REFRESH_DECORATIONS, handleRefreshDecorations),
		)
	} catch (error) {
		const coworkflowError = errorHandler.createError(
			"command_error",
			"critical",
			"Failed to register coworkflow commands",
			error as Error,
		)
		errorHandler.handleError(coworkflowError)

		// Dispose any successfully registered commands
		disposables.forEach((d) => {
			try {
				d.dispose()
			} catch (disposeError) {
				console.error("Error disposing command during cleanup", disposeError)
			}
		})

		throw error
	}

	return disposables
}

/**
 * Handle update section command
 */
async function handleUpdateSection(codeLens: CoworkflowCodeLens): Promise<void> {
	try {
		// Validate CodeLens parameter
		if (!codeLens) {
			throw new Error("CodeLens parameter is required")
		}

		if (!codeLens.documentType) {
			throw new Error("CodeLens documentType is required")
		}

		if (!codeLens.actionType) {
			throw new Error("CodeLens actionType is required")
		}

		const commandContext = createCommandContext(codeLens)

		// Show information message with detailed context
		const sectionTitle = commandContext.context?.sectionTitle || "Unknown"
		const lineNumber =
			commandContext.context?.lineNumber !== undefined ? ` (line ${commandContext.context.lineNumber + 1})` : ""
		const message = `Update ${commandContext.documentType} section: ${sectionTitle}${lineNumber}`

		const result = await vscode.window.showInformationMessage(message, { modal: false }, "Show Details")

		if (result === "Show Details") {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"info",
					`Update section command executed successfully for ${commandContext.documentType}`,
					undefined,
					commandContext.uri,
				),
			)
		}

		// Log detailed context for debugging
		console.log("CoworkflowCommands: Update section requested", {
			documentType: commandContext.documentType,
			actionType: commandContext.actionType,
			uri: commandContext.uri.toString(),
			context: commandContext.context,
		})

		// TODO: Implement actual update logic in later tasks
	} catch (error) {
		handleCommandError("Update Section", error, codeLens?.range)
	}
}

/**
 * Handle run task command
 */
async function handleRunTask(codeLens: CoworkflowCodeLens): Promise<void> {
	try {
		// Validate CodeLens parameter
		if (!codeLens) {
			throw new Error("CodeLens parameter is required")
		}

		if (!codeLens.documentType || codeLens.documentType !== "tasks") {
			throw new Error("Run task command requires a tasks document CodeLens")
		}

		if (!codeLens.actionType || codeLens.actionType !== "run") {
			throw new Error('CodeLens actionType must be "run" for run task command')
		}

		const commandContext = createCommandContext(codeLens)

		// Validate task context
		if (!commandContext.context?.taskId) {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"warning",
					"Task ID not found - proceeding with generic task execution",
					undefined,
					commandContext.uri,
				),
			)
		}

		// Show information message with detailed context
		const taskId = commandContext.context?.taskId || "Unknown"
		const taskTitle = commandContext.context?.sectionTitle || "Unknown"
		const lineNumber =
			commandContext.context?.lineNumber !== undefined ? ` (line ${commandContext.context.lineNumber + 1})` : ""
		const message = `Run task: ${taskId} - ${taskTitle}${lineNumber}`

		const result = await vscode.window.showInformationMessage(message, { modal: false }, "Show Details", "Cancel")

		if (result === "Cancel") {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"info",
					"Task execution cancelled by user",
					undefined,
					commandContext.uri,
				),
			)
			return
		}

		if (result === "Show Details") {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"info",
					`Run task command executed successfully for task ${taskId}`,
					undefined,
					commandContext.uri,
				),
			)
		}

		// Log detailed context for debugging
		console.log("CoworkflowCommands: Run task requested", {
			documentType: commandContext.documentType,
			actionType: commandContext.actionType,
			uri: commandContext.uri.toString(),
			taskId,
			context: commandContext.context,
		})

		// TODO: Implement actual task execution logic in later tasks
	} catch (error) {
		handleCommandError("Run Task", error, codeLens?.range)
	}
}

/**
 * Handle retry task command
 */
async function handleRetryTask(codeLens: CoworkflowCodeLens): Promise<void> {
	try {
		// Validate CodeLens parameter
		if (!codeLens) {
			throw new Error("CodeLens parameter is required")
		}

		if (!codeLens.documentType || codeLens.documentType !== "tasks") {
			throw new Error("Retry task command requires a tasks document CodeLens")
		}

		if (!codeLens.actionType || codeLens.actionType !== "retry") {
			throw new Error('CodeLens actionType must be "retry" for retry task command')
		}

		const commandContext = createCommandContext(codeLens)

		// Validate task context
		if (!commandContext.context?.taskId) {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"warning",
					"Task ID not found - proceeding with generic task retry",
					undefined,
					commandContext.uri,
				),
			)
		}

		// Show confirmation dialog for retry
		const taskId = commandContext.context?.taskId || "Unknown"
		const taskTitle = commandContext.context?.sectionTitle || "Unknown"
		const lineNumber =
			commandContext.context?.lineNumber !== undefined ? ` (line ${commandContext.context.lineNumber + 1})` : ""
		const message = `Retry task: ${taskId} - ${taskTitle}${lineNumber}`

		const result = await vscode.window.showWarningMessage(
			message,
			{ modal: true },
			"Retry",
			"Show Details",
			"Cancel",
		)

		if (result === "Cancel") {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"info",
					"Task retry cancelled by user",
					undefined,
					commandContext.uri,
				),
			)
			return
		}

		if (result === "Show Details") {
			errorHandler.logError(
				errorHandler.createError(
					"command_error",
					"info",
					`Retry task command executed successfully for task ${taskId}`,
					undefined,
					commandContext.uri,
				),
			)
		}

		if (result === "Retry") {
			// Log detailed context for debugging
			console.log("CoworkflowCommands: Retry task requested", {
				documentType: commandContext.documentType,
				actionType: commandContext.actionType,
				uri: commandContext.uri.toString(),
				taskId,
				context: commandContext.context,
			})

			// TODO: Implement actual task retry logic in later tasks
			vscode.window.showInformationMessage(`Task ${taskId} retry initiated`)
		}
	} catch (error) {
		handleCommandError("Retry Task", error, codeLens?.range)
	}
}

/**
 * Handle refresh CodeLens command
 */
async function handleRefreshCodeLens(): Promise<void> {
	try {
		let refreshed = false

		// Try to refresh through the provider if available
		if (dependencies.codeLensProvider && typeof dependencies.codeLensProvider.refresh === "function") {
			try {
				dependencies.codeLensProvider.refresh()
				refreshed = true
				errorHandler.logError(
					errorHandler.createError("command_error", "info", "CodeLens refreshed through provider"),
				)
			} catch (providerError) {
				errorHandler.logError(
					errorHandler.createError(
						"provider_error",
						"warning",
						"Error refreshing CodeLens through provider - trying fallback",
						providerError as Error,
					),
				)
			}
		}

		// Fallback to VS Code command if provider refresh failed
		if (!refreshed) {
			try {
				await vscode.commands.executeCommand("vscode.executeCodeLensProvider")
				refreshed = true
				errorHandler.logError(
					errorHandler.createError("command_error", "info", "CodeLens refreshed through VS Code command"),
				)
			} catch (vscodeError) {
				errorHandler.logError(
					errorHandler.createError(
						"command_error",
						"warning",
						"Error refreshing CodeLens through VS Code command",
						vscodeError as Error,
					),
				)
			}
		}

		if (refreshed) {
			vscode.window.showInformationMessage("CodeLens refreshed")
		} else {
			throw new Error("Failed to refresh CodeLens through all available methods")
		}
	} catch (error) {
		handleCommandError("Refresh CodeLens", error)
	}
}

/**
 * Handle refresh decorations command
 */
async function handleRefreshDecorations(): Promise<void> {
	try {
		let refreshed = false

		// Try to refresh through the provider if available
		if (dependencies.decorationProvider && typeof dependencies.decorationProvider.refreshAll === "function") {
			try {
				dependencies.decorationProvider.refreshAll()
				refreshed = true
				errorHandler.logError(
					errorHandler.createError("command_error", "info", "Decorations refreshed through provider"),
				)
			} catch (providerError) {
				errorHandler.logError(
					errorHandler.createError(
						"provider_error",
						"warning",
						"Error refreshing decorations through provider",
						providerError as Error,
					),
				)
			}
		} else {
			errorHandler.logError(
				errorHandler.createError(
					"provider_error",
					"warning",
					"Decoration provider not available or does not support refreshAll",
				),
			)
		}

		if (refreshed) {
			vscode.window.showInformationMessage("Decorations refreshed")
		} else {
			vscode.window.showWarningMessage("Decorations refresh failed - provider not available")
		}

		console.log("CoworkflowCommands: Refresh decorations requested")
	} catch (error) {
		handleCommandError("Refresh Decorations", error)
	}
}

/**
 * Create command context from CodeLens
 */
function createCommandContext(codeLens: CoworkflowCodeLens): CoworkflowCommandContext {
	try {
		// Extract URI from the current active editor
		const activeEditor = vscode.window.activeTextEditor
		if (!activeEditor) {
			throw new Error("No active editor found - please open a coworkflow document")
		}

		// Validate that the active editor is a coworkflow document
		if (!isCoworkflowDocument(activeEditor.document.uri)) {
			throw new Error("Active editor is not a coworkflow document - expected .coworkflow/*.md file")
		}

		// Validate CodeLens range is within document bounds
		if (codeLens.range) {
			const documentLineCount = activeEditor.document.lineCount
			if (codeLens.range.start.line >= documentLineCount || codeLens.range.end.line >= documentLineCount) {
				errorHandler.logError(
					errorHandler.createError(
						"command_error",
						"warning",
						`CodeLens range (${codeLens.range.start.line}-${codeLens.range.end.line}) exceeds document bounds (${documentLineCount} lines)`,
						undefined,
						activeEditor.document.uri,
					),
				)
			}
		}

		return {
			uri: activeEditor.document.uri,
			documentType: codeLens.documentType,
			actionType: codeLens.actionType,
			context: codeLens.context,
		}
	} catch (error) {
		const coworkflowError = errorHandler.createError(
			"command_error",
			"error",
			"Error creating command context",
			error as Error,
		)
		errorHandler.handleError(coworkflowError)
		throw error
	}
}

/**
 * Handle command execution errors gracefully
 */
function handleCommandError(commandName: string, error: unknown, range?: vscode.Range): void {
	try {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		const originalError = error instanceof Error ? error : new Error(String(error))

		// Create structured error
		const coworkflowError = errorHandler.createError(
			"command_error",
			"error",
			`${commandName} command failed: ${errorMessage}`,
			originalError,
			vscode.window.activeTextEditor?.document.uri,
		)

		// Handle the error through the error handler
		errorHandler.handleError(coworkflowError)

		// Show user-friendly error message with actions
		const actions: string[] = ["Show Details"]
		if (range && vscode.window.activeTextEditor) {
			actions.push("Go to Location")
		}

		vscode.window
			.showErrorMessage(`Coworkflow ${commandName} failed: ${errorMessage}`, ...actions)
			.then((action) => {
				if (action === "Show Details") {
					// Show detailed error information
					const detailMessage = `Command: ${commandName}\nError: ${errorMessage}\nTime: ${new Date().toLocaleString()}`
					if (originalError.stack) {
						vscode.window.showInformationMessage(detailMessage, { modal: true })
					}
				} else if (action === "Go to Location" && range && vscode.window.activeTextEditor) {
					// Navigate to the error location
					const editor = vscode.window.activeTextEditor
					editor.selection = new vscode.Selection(range.start, range.end)
					editor.revealRange(range, vscode.TextEditorRevealType.InCenter)
				}
			})
	} catch (handlerError) {
		// Fallback error handling if the error handler itself fails
		console.error(`CoworkflowCommands: Error in ${commandName}`, error)
		console.error("CoworkflowCommands: Error handler also failed", handlerError)

		// Basic user notification as last resort
		const basicMessage = error instanceof Error ? error.message : "Unknown error"
		vscode.window.showErrorMessage(`Coworkflow ${commandName} failed: ${basicMessage}`)
	}
}

/**
 * Utility function to check if a URI is a coworkflow document
 */
export function isCoworkflowDocument(uri: vscode.Uri): boolean {
	const path = uri.path
	const fileName = path.split("/").pop()
	const parentDir = path.split("/").slice(-2, -1)[0]

	return parentDir === ".coworkflow" && ["requirements.md", "design.md", "tasks.md"].includes(fileName || "")
}
