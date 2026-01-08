import * as vscode from "vscode"
import { isJetbrainsPlatform } from "../../../utils/platform"

const isJetbrains = isJetbrainsPlatform()

export const renderModes = {
	noLimit: {
		limit: 0,
		interval: 5,
	},
	fast: {
		limit: isJetbrains ? 1 : 0,
		interval: isJetbrains ? 30 : 15,
	},
	medium: {
		limit: isJetbrains ? 3 : 0,
		interval: isJetbrains ? 60 : 30,
	},
	slow: {
		limit: isJetbrains ? 5 : 0,
		interval: isJetbrains ? 120 : 60,
	},
}

export function getApiResponseRenderMode() {
	if (isJetbrains) {
		return renderModes.medium
	}
	const apiResponseRenderMode = vscode.workspace
		.getConfiguration("zgsm")
		.get<string>("apiResponseRenderMode", "medium") as "fast" | "medium" | "slow" | "noLimit"

	return renderModes[apiResponseRenderMode] || renderModes["fast"]
}
