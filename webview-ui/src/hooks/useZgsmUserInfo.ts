import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import axios from "axios"
import type { ProviderSettings, ZgsmUserInfo } from "@roo-code/types"
import { TelemetryEventName } from "@roo-code/types"
import { telemetryClient } from "@src/utils/TelemetryClient"

export interface ZgsmUserData {
	userInfo: ZgsmUserInfo | null
	logoPic: string
	hash: string
	isAuthenticated: boolean
}

/**
 * 解析JWT token获取用户信息
 */
function parseJwt(token: string) {
	const parts = token.split(".")
	if (parts.length !== 3) {
		throw new Error("Invalid JWT")
	}
	const payload = parts[1]
	const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/")) // base64url → base64 → decode
	return JSON.parse(decoded)
}

/**
 * 对token进行SHA-256哈希处理
 */
async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(token)
	const hashBuffer = await crypto.subtle.digest("SHA-256", data)
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

/**
 * 将图片URL转换为base64格式
 */
export async function imageUrlToBase64(url: string): Promise<string | null> {
	try {
		const response = await axios.get(url, {
			responseType: "blob", // Key! Ensure axios returns Blob
		})

		const blob = response.data as Blob

		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => resolve(reader.result as string)
			reader.onerror = () => reject("Failed to convert blob to base64")
			reader.readAsDataURL(blob) // Automatically adds data:image/png;base64,...
		})
	} catch (error) {
		console.error("Failed to convert image to base64", error)
		return null
	}
}

/**
 * 用于管理ZGSM用户信息的自定义Hook
 * 提供用户信息解析、头像处理、token哈希等功能
 * 优化版本：使用 useMemo 缓存昂贵的计算操作，避免滚动时重复计算
 */
export function useZgsmUserInfo(tokenOrConfig?: string | ProviderSettings): ZgsmUserData {
	const [logoPic, setLogoPic] = useState("")
	const [hash, setHash] = useState("")
	const wasAuthenticatedRef = useRef(false)

	// 提取实际的 token 值
	const token = useMemo(() => {
		if (typeof tokenOrConfig === "string") {
			return tokenOrConfig
		}
		return tokenOrConfig?.zgsmAccessToken
	}, [tokenOrConfig])

	// 使用 useMemo 缓存 JWT 解析结果，只有当 token 真正变化时才重新解析
	const parsedJwt = useMemo(() => {
		if (!token) return null

		try {
			return parseJwt(token)
		} catch (error) {
			console.error("Failed to parse JWT token:", error)
			return null
		}
	}, [token])

	// 使用 useMemo 缓存用户基本信息，只有当解析结果变化时才重新计算
	const userInfo = useMemo((): ZgsmUserInfo | null => {
		if (!parsedJwt) return null

		return {
			id: parsedJwt.id,
			name: parsedJwt?.properties?.oauth_GitHub_username || parsedJwt.id,
			picture: undefined,
			email: parsedJwt.email,
			phone: parsedJwt.phone,
			organizationName: parsedJwt.organizationName,
			organizationImageUrl: parsedJwt.organizationImageUrl,
		}
	}, [parsedJwt])

	// 使用 useCallback 缓存头像处理函数
	const processAvatar = useCallback(async (avatarUrl: string) => {
		try {
			const base64 = await imageUrlToBase64(avatarUrl)
			if (base64) {
				setLogoPic(base64)
			}
		} catch (error) {
			console.error("Failed to process avatar:", error)
			setLogoPic("")
		}
	}, [])

	// 使用 useCallback 缓存哈希计算函数
	const processTokenHash = useCallback(async (tokenValue: string) => {
		try {
			const result = await hashToken(tokenValue)
			setHash(result)
		} catch (error) {
			console.error("Failed to hash token:", error)
			setHash("")
		}
	}, [])

	// 处理副作用：头像和哈希计算
	useEffect(() => {
		if (token && parsedJwt) {
			wasAuthenticatedRef.current = true

			// 处理头像
			if (parsedJwt.avatar) {
				processAvatar(parsedJwt.avatar)
			} else {
				setLogoPic("")
			}

			// 计算token哈希
			processTokenHash(token)
		} else if (wasAuthenticatedRef.current && !token) {
			// 检测到登出
			telemetryClient.capture(TelemetryEventName.ACCOUNT_LOGOUT_SUCCESS)
			wasAuthenticatedRef.current = false
			setLogoPic("")
			setHash("")
		} else if (!token) {
			// 确保在没有token时清空状态
			setLogoPic("")
			setHash("")
		}
	}, [token, parsedJwt, processAvatar, processTokenHash])

	return {
		userInfo,
		logoPic,
		hash,
		isAuthenticated: !!token,
	}
}
