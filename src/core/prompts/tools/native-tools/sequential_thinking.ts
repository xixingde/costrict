import type OpenAI from "openai"

const SEQUENTIAL_THINKING_DESCRIPTION = ` sequential thinking 工具，支持结构化的分步骤思考。允许 AI 在过程中记录思考步骤并进行修订和分支思考。`

const THOUGHT_PARAMETER_DESCRIPTION = `当前思考步骤的内容描述`
const NEXT_THOUGHT_NEEDED_PARAMETER_DESCRIPTION = `是否需要继续下一个思考步骤`
const THOUGHT_NUMBER_PARAMETER_DESCRIPTION = `当前思考步骤的编号（从 1 开始）`
const TOTAL_THOUGHTS_PARAMETER_DESCRIPTION = `预期的总思考步骤数量`
const IS_REVISION_PARAMETER_DESCRIPTION = `是否这是对之前思考的修订`
const REVISES_THOUGHT_PARAMETER_DESCRIPTION = `被修订的思考步骤编号`
const BRANCH_FROM_THOUGHT_PARAMETER_DESCRIPTION = `从哪个思考步骤开始新的分支思考`
const BRANCH_ID_PARAMETER_DESCRIPTION = `分支的唯一标识符`
const NEEDS_MORE_THOUGHTS_PARAMETER_DESCRIPTION = `是否需要更多的思考步骤`

export default {
	type: "function",
	function: {
		name: "sequential_thinking",
		description: SEQUENTIAL_THINKING_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				thought: {
					type: "string",
					description: THOUGHT_PARAMETER_DESCRIPTION,
				},
				nextThoughtNeeded: {
					type: "boolean",
					description: NEXT_THOUGHT_NEEDED_PARAMETER_DESCRIPTION,
				},
				thoughtNumber: {
					type: "number",
					description: THOUGHT_NUMBER_PARAMETER_DESCRIPTION,
				},
				totalThoughts: {
					type: "number",
					description: TOTAL_THOUGHTS_PARAMETER_DESCRIPTION,
				},
				isRevision: {
					type: "boolean",
					description: IS_REVISION_PARAMETER_DESCRIPTION,
				},
				revisesThought: {
					type: "number",
					description: REVISES_THOUGHT_PARAMETER_DESCRIPTION,
				},
				branchFromThought: {
					type: "number",
					description: BRANCH_FROM_THOUGHT_PARAMETER_DESCRIPTION,
				},
				branchId: {
					type: "string",
					description: BRANCH_ID_PARAMETER_DESCRIPTION,
				},
				needsMoreThoughts: {
					type: "boolean",
					description: NEEDS_MORE_THOUGHTS_PARAMETER_DESCRIPTION,
				},
			},
			required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
