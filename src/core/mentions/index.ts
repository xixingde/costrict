import fs from "fs/promises"
import * as path from "path"

import * as vscode from "vscode"
import { isBinaryFileWithEncodingDetection } from "../../utils/encoding"

import { mentionRegexGlobal, commandRegexGlobal, unescapeSpaces } from "../../shared/context-mentions"

import { getCommitInfo, getWorkingState } from "../../utils/git"

import { openFile } from "../../integrations/misc/open-file"
import { extractTextFromFile } from "../../integrations/misc/extract-text"
import { diagnosticsToProblemsString } from "../../integrations/diagnostics"

import { UrlContentFetcher } from "../../services/browser/UrlContentFetcher"

import { FileContextTracker } from "../context-tracking/FileContextTracker"

import { RooIgnoreController } from "../ignore/RooIgnoreController"
import { getCommand, type Command } from "../../services/command/commands"

import { t } from "../../i18n"
import { Task } from "../task/Task"

function getUrlErrorMessage(error: unknown): string {
	const errorMessage = error instanceof Error ? error.message : String(error)

	// Check for common error patterns and return appropriate message
	if (errorMessage.includes("timeout")) {
		return t("common:errors.url_timeout")
	}
	if (errorMessage.includes("net::ERR_NAME_NOT_RESOLVED")) {
		return t("common:errors.url_not_found")
	}
	if (errorMessage.includes("net::ERR_INTERNET_DISCONNECTED")) {
		return t("common:errors.no_internet")
	}
	if (errorMessage.includes("net::ERR_ABORTED")) {
		return t("common:errors.url_request_aborted")
	}
	if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
		return t("common:errors.url_forbidden")
	}
	if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
		return t("common:errors.url_page_not_found")
	}

	// Default error message
	return t("common:errors.url_fetch_failed", { error: errorMessage })
}

export async function openMention(cwd: string, mention?: string): Promise<void> {
	if (!mention) {
		return
	}

	if (mention.startsWith("/")) {
		// Slice off the leading slash and unescape any spaces in the path
		const relPath = unescapeSpaces(mention.slice(1))
		const absPath = path.resolve(cwd, relPath)
		if (mention.endsWith("/")) {
			vscode.commands.executeCommand("revealInExplorer", vscode.Uri.file(absPath))
		} else {
			openFile(absPath)
		}
	} else if (mention === "problems") {
		vscode.commands.executeCommand("workbench.actions.view.problems")
	} else if (mention === "terminal") {
		vscode.commands.executeCommand("workbench.action.terminal.focus")
	} else if (mention.startsWith("http")) {
		vscode.env.openExternal(vscode.Uri.parse(mention))
	}
}

export async function parseMentions(
	text: string,
	cwd: string,
	urlContentFetcher: UrlContentFetcher,
	fileContextTracker?: FileContextTracker,
	rooIgnoreController?: RooIgnoreController,
	showRooIgnoredFiles: boolean = false,
	includeDiagnosticMessages: boolean = true,
	maxDiagnosticMessages: number = 50,
	maxReadFileLine?: number,
	maxReadCharacterLimit?: number,
): Promise<string> {
	const mentions: Set<string> = new Set()
	const validCommands: Map<string, Command> = new Map()

	// First pass: check which command mentions exist and cache the results
	const commandMatches = Array.from(text.matchAll(commandRegexGlobal))
	const uniqueCommandNames = new Set(commandMatches.map(([, commandName]) => commandName))

	const commandExistenceChecks = await Promise.all(
		Array.from(uniqueCommandNames).map(async (commandName) => {
			try {
				const command = await getCommand(cwd, commandName)
				return { commandName, command }
			} catch (error) {
				// If there's an error checking command existence, treat it as non-existent
				return { commandName, command: undefined }
			}
		}),
	)

	// Store valid commands for later use
	for (const { commandName, command } of commandExistenceChecks) {
		if (command) {
			validCommands.set(commandName, command)
		}
	}

	// Only replace text for commands that actually exist
	let parsedText = text
	for (const [match, commandName] of commandMatches) {
		if (validCommands.has(commandName)) {
			parsedText = parsedText.replace(match, `Command '${commandName}' (see below for command content)`)
		}
	}

	// Second pass: handle regular mentions
	parsedText = parsedText.replace(mentionRegexGlobal, (match, mention) => {
		mentions.add(mention)
		if (mention.startsWith("http")) {
			return `'${mention}' (see below for site content)`
		} else if (mention.startsWith("/")) {
			const mentionPath = mention.slice(1)
			return mentionPath.endsWith("/")
				? `'${mentionPath}' (see below for folder content)`
				: `'${mentionPath}' (see below for file content)`
		} else if (mention === "problems") {
			return `Workspace Problems (see below for diagnostics)`
		} else if (mention === "git-changes") {
			return `Working directory changes (see below for details)`
		} else if (/^[a-f0-9]{7,40}$/.test(mention)) {
			return `Git commit '${mention}' (see below for commit info)`
		} else if (mention === "terminal") {
			return `Terminal Output (see below for output)`
		}
		return match
	})

	const urlMention = Array.from(mentions).find((mention) => mention.startsWith("http"))
	let launchBrowserError: Error | undefined
	if (urlMention) {
		try {
			await urlContentFetcher.launchBrowser()
		} catch (error) {
			launchBrowserError = error
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(`Error fetching content for ${urlMention}: ${errorMessage}`)
		}
	}

	for (const mention of mentions) {
		if (mention.startsWith("http")) {
			let result: string
			if (launchBrowserError) {
				const errorMessage =
					launchBrowserError instanceof Error ? launchBrowserError.message : String(launchBrowserError)
				result = `Error fetching content: ${errorMessage}`
			} else {
				try {
					const markdown = await urlContentFetcher.urlToMarkdown(mention)
					result = markdown
				} catch (error) {
					console.error(`Error fetching URL ${mention}:`, error)

					// Get raw error message for AI
					const rawErrorMessage = error instanceof Error ? error.message : String(error)

					// Get localized error message for UI notification
					const localizedErrorMessage = getUrlErrorMessage(error)

					vscode.window.showErrorMessage(
						t("common:errors.url_fetch_error_with_url", { url: mention, error: localizedErrorMessage }),
					)

					// Send raw error message to AI model
					result = `Error fetching content: ${rawErrorMessage}`
				}
			}
			parsedText += `\n\n<url_content url="${mention}">\n${result}\n</url_content>`
		} else if (mention.startsWith("/")) {
			const mentionPath = mention.slice(1)
			try {
				const content = await getFileOrFolderContent(
					mentionPath,
					cwd,
					rooIgnoreController,
					showRooIgnoredFiles,
					maxReadFileLine,
					maxReadCharacterLimit,
				)
				if (mention.endsWith("/")) {
					parsedText += `\n\n<folder_content path="${mentionPath}">\n${content}\n</folder_content>`
				} else {
					parsedText += `\n\n<file_content path="${mentionPath}">\n${content}\n</file_content>`
					if (fileContextTracker) {
						await fileContextTracker.trackFileContext(mentionPath, "file_mentioned")
					}
				}
			} catch (error) {
				if (mention.endsWith("/")) {
					parsedText += `\n\n<folder_content path="${mentionPath}">\nError fetching content: ${error.message}\n</folder_content>`
				} else {
					parsedText += `\n\n<file_content path="${mentionPath}">\nError fetching content: ${error.message}\n</file_content>`
				}
			}
		} else if (mention === "problems") {
			try {
				const problems = await getWorkspaceProblems(cwd, includeDiagnosticMessages, maxDiagnosticMessages)
				parsedText += `\n\n<workspace_diagnostics>\n${problems}\n</workspace_diagnostics>`
			} catch (error) {
				parsedText += `\n\n<workspace_diagnostics>\nError fetching diagnostics: ${error.message}\n</workspace_diagnostics>`
			}
		} else if (mention === "git-changes") {
			try {
				const workingState = await getWorkingState(cwd)
				parsedText += `\n\n<git_working_state>\n${workingState}\n</git_working_state>`
			} catch (error) {
				parsedText += `\n\n<git_working_state>\nError fetching working state: ${error.message}\n</git_working_state>`
			}
		} else if (/^[a-f0-9]{7,40}$/.test(mention)) {
			try {
				const commitInfo = await getCommitInfo(mention, cwd)
				parsedText += `\n\n<git_commit hash="${mention}">\n${commitInfo}\n</git_commit>`
			} catch (error) {
				parsedText += `\n\n<git_commit hash="${mention}">\nError fetching commit info: ${error.message}\n</git_commit>`
			}
		} else if (mention === "terminal") {
			try {
				const terminalOutput = await getLatestTerminalOutput()
				parsedText += `\n\n<terminal_output>\n${terminalOutput}\n</terminal_output>`
			} catch (error) {
				parsedText += `\n\n<terminal_output>\nError fetching terminal output: ${error.message}\n</terminal_output>`
			}
		}
	}

	// Process valid command mentions using cached results
	for (const [commandName, command] of validCommands) {
		try {
			let commandOutput = ""
			if (command.description) {
				commandOutput += `Description: ${command.description}\n\n`
			}
			commandOutput += command.content
			parsedText += `\n\n<command name="${commandName}">\n${commandOutput}\n</command>`
		} catch (error) {
			parsedText += `\n\n<command name="${commandName}">\nError loading command '${commandName}': ${error.message}\n</command>`
		}
	}

	if (urlMention) {
		try {
			await urlContentFetcher.closeBrowser()
		} catch (error) {
			console.error(`Error closing browser: ${error.message}`)
		}
	}

	return parsedText
}

async function getFileOrFolderContent(
	mentionPath: string,
	cwd: string,
	rooIgnoreController?: any,
	showRooIgnoredFiles: boolean = false,
	maxReadFileLine?: number,
	maxReadCharacterLimit?: number,
): Promise<string> {
	const unescapedPath = unescapeSpaces(mentionPath)
	const absPath = path.resolve(cwd, unescapedPath)

	try {
		const stats = await fs.stat(absPath)

		if (stats.isFile()) {
			if (rooIgnoreController && !rooIgnoreController.validateAccess(absPath)) {
				return `(File ${mentionPath} is ignored by .rooignore)`
			}
			try {
				const content = await extractTextFromFile(absPath, maxReadFileLine, maxReadCharacterLimit)
				return content
			} catch (error) {
				return `(Failed to read contents of ${mentionPath}): ${error.message}`
			}
		} else if (stats.isDirectory()) {
			const entries = await fs.readdir(absPath, { withFileTypes: true })
			let folderContent = ""
			const fileContentPromises: Promise<string | undefined>[] = []
			const LOCK_SYMBOL = "🔒"

			for (let index = 0; index < entries.length; index++) {
				const entry = entries[index]
				const isLast = index === entries.length - 1
				const linePrefix = isLast ? "└── " : "├── "
				const entryPath = path.join(absPath, entry.name)

				let isIgnored = false
				if (rooIgnoreController) {
					isIgnored = !rooIgnoreController.validateAccess(entryPath)
				}

				if (isIgnored && !showRooIgnoredFiles) {
					continue
				}

				const displayName = isIgnored ? `${LOCK_SYMBOL} ${entry.name}` : entry.name

				if (entry.isFile()) {
					folderContent += `${linePrefix}${displayName}\n`
					if (!isIgnored) {
						const filePath = path.join(mentionPath, entry.name)
						const absoluteFilePath = path.resolve(absPath, entry.name)
						fileContentPromises.push(
							(async () => {
								try {
									const isBinary = await isBinaryFileWithEncodingDetection(absoluteFilePath)
									if (isBinary) {
										return undefined
									}
									const content = await extractTextFromFile(
										absoluteFilePath,
										maxReadFileLine,
										maxReadCharacterLimit,
									)
									return `<file_content path="${filePath.toPosix()}">\n${content}\n</file_content>`
								} catch (error) {
									return undefined
								}
							})(),
						)
					}
				} else if (entry.isDirectory()) {
					folderContent += `${linePrefix}${displayName}/\n`
				} else {
					folderContent += `${linePrefix}${displayName}\n`
				}
			}
			const fileContents = (await Promise.all(fileContentPromises)).filter((content) => content)
			return `${folderContent}\n${fileContents.join("\n\n")}`.trim()
		} else {
			return `(Failed to read contents of ${mentionPath})`
		}
	} catch (error) {
		throw new Error(`Failed to access path "${mentionPath}": ${error.message}`)
	}
}

async function getWorkspaceProblems(
	cwd: string,
	includeDiagnosticMessages: boolean = true,
	maxDiagnosticMessages: number = 50,
): Promise<string> {
	const diagnostics = vscode.languages.getDiagnostics()
	const result = await diagnosticsToProblemsString(
		diagnostics,
		[vscode.DiagnosticSeverity.Error, vscode.DiagnosticSeverity.Warning],
		cwd,
		includeDiagnosticMessages,
		maxDiagnosticMessages,
	)
	if (!result) {
		return "No errors or warnings detected."
	}
	return result
}

/**
 * Gets the contents of the active terminal
 * @returns The terminal contents as a string
 */
export async function getLatestTerminalOutput(): Promise<string> {
	// Store original clipboard content to restore later
	const originalClipboard = await vscode.env.clipboard.readText()

	try {
		// Select terminal content
		await vscode.commands.executeCommand("workbench.action.terminal.selectAll")

		// Copy selection to clipboard
		await vscode.commands.executeCommand("workbench.action.terminal.copySelection")

		// Clear the selection
		await vscode.commands.executeCommand("workbench.action.terminal.clearSelection")

		// Get terminal contents from clipboard
		let terminalContents = (await vscode.env.clipboard.readText()).trim()

		// Check if there's actually a terminal open
		if (terminalContents === originalClipboard) {
			return ""
		}

		// Clean up command separation
		const lines = terminalContents.split("\n")
		const lastLine = lines.pop()?.trim()

		if (lastLine) {
			let i = lines.length - 1

			while (i >= 0 && !lines[i].trim().startsWith(lastLine)) {
				i--
			}

			terminalContents = lines.slice(Math.max(i, 0)).join("\n")
		}

		return terminalContents
	} finally {
		// Restore original clipboard content
		await vscode.env.clipboard.writeText(originalClipboard)
	}
}

// Export processUserContentMentions from its own file
export { processUserContentMentions } from "./processUserContentMentions"

// function getTruncatedFileNotice(file: string, totalLines: number) {
// 	return `\n(The content of \`${file}\` was truncated (total ${totalLines} lines). Use \`new_task\` to continue reading. Note: the \`read_file\` tool reads at most 500 lines at a time.)`
// }
function getTruncatedFileNotice(file: string, totalLines: number) {
	return `\n(The content of \`${file}\` was truncated(total ${totalLines} lines). To read more, Use the \`read_file\` tool with the same file path.)`
}
