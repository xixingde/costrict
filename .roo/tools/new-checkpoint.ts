import { parametersSchema as z, defineCustomTool } from "@roo-code/types"
import DESCRIPTION from "./checkpoint.txt?raw"

const parametersSchema = z.object({
	action: z.enum(["commit", "list", "show_diff", "restore", "revert"]).describe("The checkpoint action to perform"),
	message: z.string().describe("Commit message (required when action is 'commit')").optional(),
	commit_hash: z.string().describe("Commit hash (required for 'restore', 'show_diff', 'revert' actions)").optional(),
	files: z.array(z.string()).describe("List of file paths to restore (only for 'restore' action)").optional(),
})

export default defineCustomTool({
	name: "custom-checkpoint",
	description: DESCRIPTION,
	parameters: parametersSchema,
	async execute(params: any, context: any) {
		const task = context.task
		const checkpointService = task.checkpointService

		if (!task.enableCheckpoints || !task.checkpointService) {
			return "Checkpoint feature is unavailable. Git is required for this functionality.\n\nPlease install Git and restart the CLI to use checkpoint features."
		}
		try {
			switch (params.action) {
				case "commit": {
					if (!params.message) {
						return "Error: 'message' parameter is required for commit action."
					}
					const result = await checkpointService.saveCheckpoint(params.message)
					if (result && result.commit) {
						return `Checkpoint created successfully.\nCommit: ${result.commit}`
					}
					return "No changes to commit. Checkpoint was not created."
				}

				case "list": {
					const checkpoints = checkpointService.getCheckpoints()
					if (checkpoints.length === 0) {
						return "No checkpoints found."
					}
					const listOutput = checkpoints.map((hash, index) => `${index + 1}. ${hash}`).join("\n")
					return `Checkpoints:\n${listOutput}`
				}

				case "show_diff": {
					const diffs = await checkpointService.getDiff({ from: params.commit_hash, to: undefined })
					if (diffs.length === 0) {
						return "No differences found."
					}
					const diffOutput = diffs
						.map((diff) => {
							return `File: ${diff.paths.relative}\n--- Before ---\n${diff.content.before}\n--- After ---\n${diff.content.after}\n`
						})
						.join("\n")
					return `Differences:\n${diffOutput}`
				}

				case "restore": {
					if (!params.commit_hash) {
						return "Error: 'commit_hash' parameter is required for restore action."
					}
					await checkpointService.restoreCheckpoint(params.commit_hash)
					return `Successfully restored to checkpoint: ${params.commit_hash}`
				}

				case "revert": {
					if (!params.commit_hash) {
						return "Error: 'commit_hash' parameter is required for revert action."
					}
					const revertCommitHash = await checkpointService.revertCheckpoint(params.commit_hash)
					return `Successfully reverted checkpoint ${params.commit_hash}\nNew revert commit: ${revertCommitHash}`
				}

				default:
					return `Unknown action: ${params.action}`
			}
		} catch (error: any) {
			console.error("Checkpoint operation failed", { action: params.action, error })
			return `Checkpoint operation failed.\nAction: ${params.action}\nError: ${error.message || String(error)}`
		}
	},
})

function jsonStringify(data: any) {
	return JSON.stringify(data, null, 2)
}
