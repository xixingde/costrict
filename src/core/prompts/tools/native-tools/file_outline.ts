import type OpenAI from "openai"

const FILE_OUTLINE_DESCRIPTION = `提取文件的大纲结构,显示函数、类、接口的定义。用于快速了解代码文件的组织结构和主要组件。`

const FILE_PATH_PARAMETER_DESCRIPTION = `文件的相对路径`

const INCLUDE_DOCSTRINGS_PARAMETER_DESCRIPTION = `是否包含文档字符串注释`

export default {
	type: "function",
	function: {
		name: "file_outline",
		description: FILE_OUTLINE_DESCRIPTION,
		strict: true,
		parameters: {
			type: "object",
			properties: {
				file_path: {
					type: "string",
					description: FILE_PATH_PARAMETER_DESCRIPTION,
				},
				include_docstrings: {
					type: "boolean",
					description: INCLUDE_DOCSTRINGS_PARAMETER_DESCRIPTION,
				},
			},
			required: ["file_path"],
			additionalProperties: false,
		},
	},
} satisfies OpenAI.Chat.ChatCompletionTool
