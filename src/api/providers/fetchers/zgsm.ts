import axios from "axios"
import { v7 as uuidv7 } from "uuid"
import { COSTRICT_DEFAULT_HEADERS } from "../../../shared/headers"
import type { IZgsmModelResponseData } from "@roo-code/types"
import { readModels } from "./modelCache"

// let modelsCache = new WeakRef<string[]>([])

export async function getZgsmModels(baseUrl?: string, apiKey?: string, openAiHeaders?: Record<string, string>) {
	try {
		if (!baseUrl) {
			return []
		}

		// Trim whitespace from baseUrl to handle cases where users accidentally include spaces
		const trimmedBaseUrl = baseUrl.trim()

		if (!URL.canParse(trimmedBaseUrl)) {
			return []
		}

		const config: Record<string, any> = {}
		const headers: Record<string, string> = {
			...COSTRICT_DEFAULT_HEADERS,
			...(openAiHeaders || {}),
			"X-Request-ID": uuidv7(),
		}

		if (apiKey) {
			headers["Authorization"] = `Bearer ${apiKey}`
		}

		if (Object.keys(headers).length > 0) {
			config["headers"] = headers
		}

		const response = await axios.get(`${baseUrl}/ai-gateway/api/v1/models`, config)
		const fullResponseData = response.data?.data || []
		return fullResponseData as Array<IZgsmModelResponseData>
	} catch (error) {
		console.warn(`Error fetching zgsmModels from [${baseUrl}/ai-gateway/api/v1/models]:`, error.message)
		const modelCache = (await readModels("zgsm")) || {}

		return Object.keys(modelCache).map((key) => modelCache[key])
	}
}
