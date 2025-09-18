/**
 * Coworkflow integration activation and registration
 */

import * as vscode from "vscode"
import { CoworkflowFileWatcher } from "./CoworkflowFileWatcher"
import { CoworkflowCodeLensProvider } from "./CoworkflowCodeLensProvider"
import { CoworkflowDecorationProvider } from "./CoworkflowDecorationProvider"
import { registerCoworkflowCommands } from "./commands"

/**
 * Activate coworkflow integration
 */
export function activateCoworkflowIntegration(context: vscode.ExtensionContext): void {
	try {
		// Initialize file watcher
		const fileWatcher = new CoworkflowFileWatcher()
		fileWatcher.initialize()
		context.subscriptions.push(fileWatcher)

		// Initialize CodeLens provider
		const codeLensProvider = new CoworkflowCodeLensProvider()
		context.subscriptions.push(
			vscode.languages.registerCodeLensProvider(
				[
					{ pattern: "**/.cospec/**/requirements.md" },
					{ pattern: "**/.cospec/**/design.md" },
					{ pattern: "**/.cospec/**/tasks.md" },
				],
				codeLensProvider,
			),
		)

		// Initialize decoration provider
		const decorationProvider = new CoworkflowDecorationProvider()
		context.subscriptions.push(decorationProvider)

		// Connect file watcher to providers
		context.subscriptions.push(
			fileWatcher.onDidFileChange(() => {
				codeLensProvider.refresh()
				decorationProvider.refreshAll()
			}),
		)

		// Register commands
		const commandDisposables = registerCoworkflowCommands(context)
		context.subscriptions.push(...commandDisposables)

		console.log("CoworkflowIntegration: Successfully activated")
	} catch (error) {
		console.error("CoworkflowIntegration: Failed to activate", error)
	}
}

/**
 * Deactivate coworkflow integration
 */
export function deactivateCoworkflowIntegration(): void {
	// Cleanup is handled by VS Code disposing of registered disposables
	console.log("CoworkflowIntegration: Deactivated")
}
