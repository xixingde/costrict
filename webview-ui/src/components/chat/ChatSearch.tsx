import React, { useCallback, useEffect } from "react"
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useTranslation } from "react-i18next"
import { StandardTooltip } from "@src/components/ui"
import { useChatSearch } from "./useChatSearch"
import type { ClineMessage } from "@roo-code/types"

export interface ChatSearchProps {
	messages: ClineMessage[]
	onSearchChange?: (hasResults: boolean, searchQuery?: string) => void
	onNavigateToResult: (messageIndex: number) => void
	onClose: () => void
}

export const ChatSearch: React.FC<ChatSearchProps> = ({
	messages,
	onSearchChange = () => {},
	onNavigateToResult,
	onClose,
}) => {
	const { t } = useTranslation()
	const {
		searchQuery,
		setSearchQuery,
		searchResults,
		currentResultIndex,
		totalResults,
		hasResults,
		goToNextResult,
		goToPreviousResult,
		resetSearch,
	} = useChatSearch(messages)

	useEffect(() => {
		onSearchChange(hasResults, searchQuery)
	}, [hasResults, searchQuery, onSearchChange])

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault()
				if (event.shiftKey) {
					goToPreviousResult()
				} else {
					goToNextResult()
				}
			} else if (event.key === "Escape") {
				event.preventDefault()
				onClose()
			}
		},
		[goToNextResult, goToPreviousResult, onClose],
	)

	const handleClose = useCallback(() => {
		resetSearch()
		onClose()
	}, [resetSearch, onClose])

	// 当搜索结果变化时，自动导航到当前结果
	useEffect(() => {
		if (hasResults && searchResults[currentResultIndex]) {
			const messageIndex = searchResults[currentResultIndex].index
			onNavigateToResult(messageIndex)
		}
	}, [currentResultIndex, hasResults, searchResults, onNavigateToResult])

	return (
		<div className="flex items-center gap-4 px-3 py-2 border-b border-vscode-panel-border">
			<div className="flex items-center gap-2 flex-1 min-w-0">
				<VSCodeTextField
					value={searchQuery}
					placeholder={t("settings:experimental.CHAT_SEARCH.placeholder")}
					onInput={(e: any) => setSearchQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					className="flex-1 min-w-0"
					style={{ marginBottom: 0 }}
				/>
			</div>

			<div className="flex items-center gap-3">
				{
					<div className="flex items-center gap-2 px-3 py-1 ">
						<span className="text-xs text-vscode-badge-foreground font-medium">
							{t("settings:experimental.CHAT_SEARCH.resultsCount", {
								current: totalResults ? currentResultIndex + 1 : 0,
								total: totalResults,
							})}
						</span>
						<div className="flex items-center gap-1">
							<StandardTooltip content={t("settings:experimental.CHAT_SEARCH.previous")}>
								<VSCodeButton
									appearance="icon"
									onClick={goToPreviousResult}
									disabled={!hasResults || currentResultIndex === 0}
									className="h-5 px-1">
									<span className="codicon codicon-arrow-up" />
								</VSCodeButton>
							</StandardTooltip>

							<StandardTooltip content={t("settings:experimental.CHAT_SEARCH.next")}>
								<VSCodeButton
									appearance="icon"
									onClick={goToNextResult}
									disabled={!hasResults || currentResultIndex === totalResults - 1}
									className="h-5 px-1">
									<span className="codicon codicon-arrow-down" />
								</VSCodeButton>
							</StandardTooltip>
						</div>
					</div>
				}

				<StandardTooltip content={t("settings:experimental.CHAT_SEARCH.close")}>
					<VSCodeButton appearance="icon" onClick={handleClose} className="h-6 px-1">
						<span className="codicon codicon-close" />
					</VSCodeButton>
				</StandardTooltip>
			</div>
		</div>
	)
}

export default ChatSearch
