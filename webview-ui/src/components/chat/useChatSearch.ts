import { useMemo, useState, useCallback, useRef } from "react"
import removeMd from "remove-markdown"
import type { ClineMessage } from "@roo-code/types"
import { debounce } from "lodash-es"

export interface SearchResult {
	index: number
	message: ClineMessage
	matches: Match[]
}

export interface Match {
	start: number
	end: number
	text: string
}

export function useChatSearch(messages: ClineMessage[]) {
	const [searchQuery, setSearchQuery] = useState("")
	const [currentResultIndex, setCurrentResultIndex] = useState(0)
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
	const debounceRef = useRef<ReturnType<typeof debounce>>()

	if (!debounceRef.current) {
		debounceRef.current = debounce((query: string) => {
			setDebouncedSearchQuery(query)
		}, 500)
	}

	// 当searchQuery变化时触发防抖
	useMemo(() => {
		debounceRef.current?.(searchQuery)
	}, [searchQuery])

	const searchResults = useMemo(() => {
		if (!debouncedSearchQuery.trim()) {
			return []
		}

		const results: SearchResult[] = []

		const textMessages = messages.filter((msg) => msg.type === "say" && msg.say === "text" && msg.text)

		textMessages.forEach((message) => {
			const plainText = removeMd(message.text || "")
			const matches = searchInText(plainText, debouncedSearchQuery)

			if (matches.length > 0) {
				results.push({
					index: messages.indexOf(message),
					message,
					matches,
				})
			}
		})

		return results
	}, [messages, debouncedSearchQuery])

	const totalResults = searchResults.length
	const hasResults = totalResults > 0
	const currentResult = hasResults ? searchResults[currentResultIndex] : null

	const goToNextResult = useCallback(() => {
		if (hasResults) {
			setCurrentResultIndex((prev) => (prev + 1) % totalResults)
		}
	}, [hasResults, totalResults])

	const goToPreviousResult = useCallback(() => {
		if (hasResults) {
			setCurrentResultIndex((prev) => (prev - 1 + totalResults) % totalResults)
		}
	}, [hasResults, totalResults])

	const resetSearch = useCallback(() => {
		setSearchQuery("")
		setCurrentResultIndex(0)
	}, [])

	return {
		searchQuery,
		setSearchQuery,
		searchResults,
		currentResultIndex,
		setCurrentResultIndex,
		currentResult,
		totalResults,
		hasResults,
		goToNextResult,
		goToPreviousResult,
		resetSearch,
	}
}

function searchInText(text: string, query: string): Match[] {
	const matches: Match[] = []

	if (!query.trim()) return matches

	try {
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		const searchPattern = new RegExp(escapedQuery, "gi")

		let match
		while ((match = searchPattern.exec(text)) !== null) {
			matches.push({
				start: match.index,
				end: match.index + match[0].length,
				text: match[0],
			})

			// 防止零长度匹配的无限循环
			if (match.index === searchPattern.lastIndex) {
				searchPattern.lastIndex++
			}
		}
	} catch (error) {
		console.error("Invalid regex pattern:", error)
	}

	return matches
}
