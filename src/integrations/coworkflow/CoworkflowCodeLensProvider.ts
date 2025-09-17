/**
 * CoworkflowCodeLensProvider - Provides contextual actions via CodeLens for different document types
 */

import * as vscode from "vscode"
import * as path from "path"
import { ICoworkflowCodeLensProvider, CoworkflowCodeLens, CoworkflowDocumentType, CoworkflowActionType } from "./types"
import { CoworkflowErrorHandler } from "./CoworkflowErrorHandler"

export class CoworkflowCodeLensProvider implements ICoworkflowCodeLensProvider {
	private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>()
	public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event
	private errorHandler: CoworkflowErrorHandler

	constructor() {
		this.errorHandler = new CoworkflowErrorHandler()
	}

	public dispose(): void {
		this.onDidChangeCodeLensesEmitter.dispose()
		this.errorHandler.dispose()
	}

	public provideCodeLenses(
		document: vscode.TextDocument,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.CodeLens[]> {
		const documentType = this.getDocumentType(document.uri)
		if (!documentType) {
			return []
		}

		try {
			// Validate document content before parsing
			if (!this.isValidDocument(document)) {
				this.errorHandler.logError(
					this.errorHandler.createError(
						"parsing_error",
						"warning",
						"Document appears to be empty or corrupted - providing fallback CodeLenses",
						undefined,
						document.uri,
					),
				)
				return this.provideFallbackCodeLenses(document, documentType)
			}

			switch (documentType) {
				case "requirements":
					return this.provideRequirementsCodeLenses(document)
				case "design":
					return this.provideDesignCodeLenses(document)
				case "tasks":
					return this.provideTasksCodeLenses(document)
				default:
					return []
			}
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"parsing_error",
				"error",
				"Error parsing document for CodeLenses",
				error as Error,
				document.uri,
			)
			this.errorHandler.handleError(coworkflowError)

			// Return fallback CodeLenses instead of empty array
			return this.provideFallbackCodeLenses(document, documentType)
		}
	}

	public resolveCodeLens(
		codeLens: vscode.CodeLens,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<vscode.CodeLens> {
		try {
			const coworkflowCodeLens = codeLens as CoworkflowCodeLens

			if (!coworkflowCodeLens.documentType || !coworkflowCodeLens.actionType) {
				this.errorHandler.logError(
					this.errorHandler.createError(
						"parsing_error",
						"warning",
						"CodeLens missing required properties - returning unresolved",
					),
				)
				return codeLens
			}

			// Set the command based on action type
			const commandId = this.getCommandId(coworkflowCodeLens.actionType)
			codeLens.command = {
				title: this.getActionTitle(coworkflowCodeLens.actionType),
				command: commandId,
				arguments: [coworkflowCodeLens],
			}

			return codeLens
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"parsing_error",
				"warning",
				"Error resolving CodeLens - returning unresolved",
				error as Error,
			)
			this.errorHandler.handleError(coworkflowError)
			return codeLens
		}
	}

	public refresh(): void {
		this.onDidChangeCodeLensesEmitter.fire()
	}

	public getDocumentType(uri: vscode.Uri): CoworkflowDocumentType | undefined {
		const fileName = path.basename(uri.fsPath)
		const parentDir = path.basename(path.dirname(uri.fsPath))

		// Check if this is in a .coworkflow directory
		if (parentDir !== ".coworkflow") {
			return undefined
		}

		switch (fileName) {
			case "requirements.md":
				return "requirements"
			case "design.md":
				return "design"
			case "tasks.md":
				return "tasks"
			default:
				return undefined
		}
	}

	private isValidDocument(document: vscode.TextDocument): boolean {
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
						"Document is very large - may impact performance",
						undefined,
						document.uri,
					),
				)
			}

			// Check for basic markdown structure
			const lines = text.split("\n")
			const hasHeaders = lines.some((line) => line.trim().startsWith("#"))

			if (!hasHeaders) {
				this.errorHandler.logError(
					this.errorHandler.createError(
						"parsing_error",
						"info",
						"Document does not appear to contain markdown headers",
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
					"Error validating document",
					error as Error,
					document.uri,
				),
			)
			return false
		}
	}

	private provideFallbackCodeLenses(
		document: vscode.TextDocument,
		documentType: CoworkflowDocumentType,
	): CoworkflowCodeLens[] {
		try {
			// Provide a basic CodeLens at the beginning of the document
			const range = new vscode.Range(0, 0, 0, 0)
			const codeLens = new vscode.CodeLens(range) as CoworkflowCodeLens
			codeLens.documentType = documentType
			codeLens.actionType = "update"
			codeLens.context = {
				sectionTitle: "Document (Fallback)",
				lineNumber: 0,
			}

			return [codeLens]
		} catch (error) {
			this.errorHandler.logError(
				this.errorHandler.createError(
					"parsing_error",
					"error",
					"Error creating fallback CodeLenses",
					error as Error,
					document.uri,
				),
			)
			return []
		}
	}

	private provideRequirementsCodeLenses(document: vscode.TextDocument): CoworkflowCodeLens[] {
		const codeLenses: CoworkflowCodeLens[] = []

		try {
			const text = document.getText()
			const lines = text.split("\n")

			// Look for requirement section headers (### Requirement N)
			const requirementHeaderRegex = /^###\s+Requirement\s+\d+/

			lines.forEach((line, index) => {
				try {
					if (requirementHeaderRegex.test(line)) {
						const range = new vscode.Range(index, 0, index, line.length)
						const codeLens = new vscode.CodeLens(range) as CoworkflowCodeLens
						codeLens.documentType = "requirements"
						codeLens.actionType = "update"
						codeLens.context = {
							sectionTitle: line.trim(),
							lineNumber: index,
						}
						codeLenses.push(codeLens)
					}
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"parsing_error",
							"warning",
							`Error processing requirement header at line ${index + 1}`,
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
					"Error parsing requirements document",
					error as Error,
					document.uri,
				),
			)
		}

		return codeLenses
	}

	private provideDesignCodeLenses(document: vscode.TextDocument): CoworkflowCodeLens[] {
		const codeLenses: CoworkflowCodeLens[] = []

		try {
			const text = document.getText()
			const lines = text.split("\n")

			// Look for major section headers (## Section Name)
			const sectionHeaderRegex = /^##\s+[^#]/

			lines.forEach((line, index) => {
				try {
					if (sectionHeaderRegex.test(line)) {
						const range = new vscode.Range(index, 0, index, line.length)
						const codeLens = new vscode.CodeLens(range) as CoworkflowCodeLens
						codeLens.documentType = "design"
						codeLens.actionType = "update"
						codeLens.context = {
							sectionTitle: line.trim(),
							lineNumber: index,
						}
						codeLenses.push(codeLens)
					}
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"parsing_error",
							"warning",
							`Error processing design header at line ${index + 1}`,
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
					"Error parsing design document",
					error as Error,
					document.uri,
				),
			)
		}

		return codeLenses
	}

	private provideTasksCodeLenses(document: vscode.TextDocument): CoworkflowCodeLens[] {
		const codeLenses: CoworkflowCodeLens[] = []

		try {
			const text = document.getText()
			const lines = text.split("\n")

			// Look for task items with checkboxes
			const taskItemRegex = /^-\s+\[([ x-])\]\s+(.+)/

			lines.forEach((line, index) => {
				try {
					const match = taskItemRegex.exec(line)
					if (match) {
						const [, status, taskText] = match

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

						const range = new vscode.Range(index, 0, index, line.length)

						// Extract task ID if present (e.g., "1.1", "2.3")
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

						// Determine available actions based on task status
						const actions: CoworkflowActionType[] = []
						try {
							if (status === " ") {
								actions.push("run")
							} else if (status === "-") {
								actions.push("retry")
							} else if (status === "x") {
								actions.push("retry") // Allow re-running completed tasks
							} else {
								// Unknown status, default to run
								this.errorHandler.logError(
									this.errorHandler.createError(
										"parsing_error",
										"warning",
										`Unknown task status '${status}' at line ${index + 1} - defaulting to 'run'`,
										undefined,
										document.uri,
									),
								)
								actions.push("run")
							}
						} catch (error) {
							this.errorHandler.logError(
								this.errorHandler.createError(
									"parsing_error",
									"warning",
									`Error determining task actions at line ${index + 1}`,
									error as Error,
									document.uri,
								),
							)
							actions.push("run") // Fallback action
						}

						// Create CodeLens for each available action
						actions.forEach((actionType) => {
							try {
								const codeLens = new vscode.CodeLens(range) as CoworkflowCodeLens
								codeLens.documentType = "tasks"
								codeLens.actionType = actionType
								codeLens.context = {
									taskId,
									sectionTitle: taskText.trim(),
									lineNumber: index,
								}
								codeLenses.push(codeLens)
							} catch (error) {
								this.errorHandler.logError(
									this.errorHandler.createError(
										"parsing_error",
										"warning",
										`Error creating CodeLens for task at line ${index + 1}`,
										error as Error,
										document.uri,
									),
								)
							}
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
					"Error parsing tasks document",
					error as Error,
					document.uri,
				),
			)
		}

		return codeLenses
	}

	private getCommandId(actionType: CoworkflowActionType): string {
		switch (actionType) {
			case "update":
				return "coworkflow.updateSection"
			case "run":
				return "coworkflow.runTask"
			case "retry":
				return "coworkflow.retryTask"
			default:
				return "coworkflow.unknown"
		}
	}

	private getActionTitle(actionType: CoworkflowActionType): string {
		switch (actionType) {
			case "update":
				return "$(edit) Update"
			case "run":
				return "$(play) Run"
			case "retry":
				return "$(refresh) Retry"
			default:
				return "Unknown"
		}
	}
}
