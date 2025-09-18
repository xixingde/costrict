/**
 * CoworkflowFileWatcher - Central coordinator for file monitoring and provider management
 */

import * as vscode from "vscode"
import * as path from "path"
import {
	ICoworkflowFileWatcher,
	CoworkflowFileContext,
	CoworkflowDocumentType,
	CoworkflowWatcherConfig,
	CoworkflowFileChangeEvent,
} from "./types"
import { CoworkflowErrorHandler } from "./CoworkflowErrorHandler"

export class CoworkflowFileWatcher implements ICoworkflowFileWatcher {
	private disposables: vscode.Disposable[] = []
	private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map()
	private fileContexts: Map<string, CoworkflowFileContext> = new Map()
	private config: CoworkflowWatcherConfig
	private onFileChangedEmitter = new vscode.EventEmitter<CoworkflowFileChangeEvent>()
	private errorHandler: CoworkflowErrorHandler

	/** Event fired when a coworkflow file changes */
	public readonly onDidFileChange = this.onFileChangedEmitter.event

	constructor(config?: Partial<CoworkflowWatcherConfig>) {
		this.config = {
			enabled: true,
			debounceDelay: 300,
			watchPatterns: [
				"**/.coworkflow/**/requirements.md",
				"**/.coworkflow/**/design.md",
				"**/.coworkflow/**/tasks.md",
			],
			...config,
		}
		this.errorHandler = new CoworkflowErrorHandler()
	}

	public initialize(): void {
		if (!this.config.enabled) {
			return
		}

		// Watch for workspace folder changes
		this.disposables.push(
			vscode.workspace.onDidChangeWorkspaceFolders(() => {
				this.refreshWatchers()
			}),
		)

		// Initialize watchers for current workspace
		this.refreshWatchers()
	}

	public dispose(): void {
		try {
			this.onFileChangedEmitter.dispose()
			this.clearAllWatchers()
			this.disposables.forEach((d) => d.dispose())
			this.disposables = []
			this.errorHandler.dispose()
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"file_system_error",
				"warning",
				"Error during CoworkflowFileWatcher disposal",
				error as Error,
			)
			this.errorHandler.handleError(coworkflowError)
		}
	}

	public onFileChanged(uri: vscode.Uri): void {
		try {
			const documentType = this.getDocumentTypeFromUri(uri)
			if (!documentType) {
				return
			}

			// Update file context
			const key = uri.toString()
			const context = this.fileContexts.get(key)
			if (context) {
				context.lastModified = new Date()
			}

			// Emit change event
			this.onFileChangedEmitter.fire({
				uri,
				changeType: vscode.FileChangeType.Changed,
				documentType,
			})
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"file_system_error",
				"warning",
				"Error handling file change event",
				error as Error,
				uri,
			)
			this.errorHandler.handleError(coworkflowError)
		}
	}

	public getCoworkflowPath(): string | undefined {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
			if (!workspaceFolder) {
				this.errorHandler.logError(
					this.errorHandler.createError(
						"file_system_error",
						"info",
						"No workspace folder available for coworkflow monitoring",
					),
				)
				return undefined
			}

			const coworkflowPath = path.join(workspaceFolder.uri.fsPath, ".coworkflow")
			return coworkflowPath
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"file_system_error",
				"error",
				"Error determining coworkflow path",
				error as Error,
			)
			this.errorHandler.handleError(coworkflowError)
			return undefined
		}
	}

	public isMonitoring(uri: vscode.Uri): boolean {
		return this.fileContexts.has(uri.toString())
	}

	private refreshWatchers(): void {
		try {
			this.clearAllWatchers()
			this.setupWatchers()
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"file_system_error",
				"error",
				"Error refreshing file watchers",
				error as Error,
			)
			this.errorHandler.handleError(coworkflowError)
		}
	}

	private clearAllWatchers(): void {
		try {
			this.fileWatchers.forEach((watcher) => {
				try {
					watcher.dispose()
				} catch (error) {
					this.errorHandler.logError(
						this.errorHandler.createError(
							"file_system_error",
							"warning",
							"Error disposing file watcher",
							error as Error,
						),
					)
				}
			})
			this.fileWatchers.clear()
			this.fileContexts.clear()
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"file_system_error",
				"error",
				"Error clearing file watchers",
				error as Error,
			)
			this.errorHandler.handleError(coworkflowError)
		}
	}

	private setupWatchers(): void {
		const coworkflowPath = this.getCoworkflowPath()
		if (!coworkflowPath) {
			return
		}

		// Check if .coworkflow directory exists
		vscode.workspace.fs.stat(vscode.Uri.file(coworkflowPath)).then(
			(stat) => {
				// Verify it's actually a directory
				if (stat.type !== vscode.FileType.Directory) {
					const error = this.errorHandler.createError(
						"file_system_error",
						"warning",
						".coworkflow exists but is not a directory",
						undefined,
						vscode.Uri.file(coworkflowPath),
					)
					this.errorHandler.handleError(error)
					return
				}

				// Directory exists, set up file watchers
				this.setupFileWatchers(coworkflowPath)
			},
			(error) => {
				// Handle different types of file system errors
				if (error.code === "FileNotFound" || error.code === "ENOENT") {
					// Directory doesn't exist - this is normal, just log info
					this.errorHandler.logError(
						this.errorHandler.createError(
							"not_found_error",
							"info",
							".coworkflow directory not found - coworkflow monitoring disabled",
							error,
							vscode.Uri.file(coworkflowPath),
						),
					)
				} else if (error.code === "EACCES" || error.code === "EPERM") {
					// Permission error
					const coworkflowError = this.errorHandler.createError(
						"permission_error",
						"warning",
						"Permission denied accessing .coworkflow directory",
						error,
						vscode.Uri.file(coworkflowPath),
					)
					this.errorHandler.handleError(coworkflowError)
				} else {
					// Other file system error
					const coworkflowError = this.errorHandler.createError(
						"file_system_error",
						"warning",
						"Error accessing .coworkflow directory",
						error,
						vscode.Uri.file(coworkflowPath),
					)
					this.errorHandler.handleError(coworkflowError)
				}
			},
		)
	}

	private setupFileWatchers(coworkflowPath: string): void {
		try {
			this.config.watchPatterns.forEach((pattern) => {
				try {
					const filePath = path.join(coworkflowPath, pattern)
					const fileUri = vscode.Uri.file(filePath)
					const globPattern = new vscode.RelativePattern(coworkflowPath, pattern)

					const watcher = vscode.workspace.createFileSystemWatcher(globPattern)

					// Handle file changes with debouncing
					let debounceTimer: NodeJS.Timeout | undefined
					const handleChange = (uri: vscode.Uri) => {
						try {
							if (debounceTimer) {
								clearTimeout(debounceTimer)
							}
							debounceTimer = setTimeout(() => {
								this.onFileChanged(uri)
							}, this.config.debounceDelay)
						} catch (error) {
							const coworkflowError = this.errorHandler.createError(
								"file_system_error",
								"warning",
								"Error handling file change event",
								error as Error,
								uri,
							)
							this.errorHandler.handleError(coworkflowError)
						}
					}

					const handleDelete = (uri: vscode.Uri) => {
						try {
							const key = uri.toString()
							this.fileContexts.delete(key)
							this.onFileChangedEmitter.fire({
								uri,
								changeType: vscode.FileChangeType.Deleted,
								documentType: this.getDocumentTypeFromUri(uri),
							})
						} catch (error) {
							const coworkflowError = this.errorHandler.createError(
								"file_system_error",
								"warning",
								"Error handling file deletion event",
								error as Error,
								uri,
							)
							this.errorHandler.handleError(coworkflowError)
						}
					}

					watcher.onDidChange(handleChange)
					watcher.onDidCreate(handleChange)
					watcher.onDidDelete(handleDelete)

					this.fileWatchers.set(pattern, watcher)
					this.disposables.push(watcher)

					// Initialize file context if file exists
					vscode.workspace.fs.stat(fileUri).then(
						(stat) => {
							try {
								const documentType = this.getDocumentTypeFromUri(fileUri)
								if (documentType) {
									this.fileContexts.set(fileUri.toString(), {
										uri: fileUri,
										type: documentType,
										lastModified: new Date(stat.mtime),
										isActive: true,
									})
								}
							} catch (error) {
								const coworkflowError = this.errorHandler.createError(
									"file_system_error",
									"warning",
									`Error initializing file context for ${pattern}`,
									error as Error,
									fileUri,
								)
								this.errorHandler.handleError(coworkflowError)
							}
						},
						(error) => {
							// Handle different types of file access errors
							if (error.code === "FileNotFound" || error.code === "ENOENT") {
								// File doesn't exist yet, that's normal
								this.errorHandler.logError(
									this.errorHandler.createError(
										"not_found_error",
										"info",
										`Coworkflow file ${pattern} not found - will monitor for creation`,
										error,
										fileUri,
									),
								)
							} else if (error.code === "EACCES" || error.code === "EPERM") {
								// Permission error
								const coworkflowError = this.errorHandler.createError(
									"permission_error",
									"warning",
									`Permission denied accessing ${pattern}`,
									error,
									fileUri,
								)
								this.errorHandler.handleError(coworkflowError)
							} else {
								// Other file system error
								const coworkflowError = this.errorHandler.createError(
									"file_system_error",
									"warning",
									`Error accessing coworkflow file ${pattern}`,
									error,
									fileUri,
								)
								this.errorHandler.handleError(coworkflowError)
							}
						},
					)
				} catch (error) {
					const coworkflowError = this.errorHandler.createError(
						"file_system_error",
						"error",
						`Error setting up file watcher for ${pattern}`,
						error as Error,
					)
					this.errorHandler.handleError(coworkflowError)
				}
			})
		} catch (error) {
			const coworkflowError = this.errorHandler.createError(
				"file_system_error",
				"error",
				"Error setting up file watchers",
				error as Error,
			)
			this.errorHandler.handleError(coworkflowError)
		}
	}

	private getDocumentTypeFromUri(uri: vscode.Uri): CoworkflowDocumentType | undefined {
		const fileName = path.basename(uri.fsPath)
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
}
