import { useEffect, useRef, useState } from "react"
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
 */
export function useZgsmUserInfo(apiConfiguration?: ProviderSettings): ZgsmUserData {
	const [userInfo, setUserInfo] = useState<ZgsmUserInfo | null>(null)
	const [hash, setHash] = useState("")
	const [logoPic, setLogoPic] = useState("")
	const wasAuthenticatedRef = useRef(false)

	useEffect(() => {
		const token = apiConfiguration?.zgsmAccessToken

		if (token) {
			wasAuthenticatedRef.current = true

			try {
				const jwt = parseJwt(token)

				const basicInfo: ZgsmUserInfo = {
					id: jwt.id,
					name: jwt?.properties?.oauth_GitHub_username || jwt.id,
					picture: undefined,
					email: jwt.email,
					phone: jwt.phone,
					organizationName: jwt.organizationName,
					organizationImageUrl: jwt.organizationImageUrl,
				}
				setUserInfo(basicInfo)

				// 处理头像
				if (jwt.avatar) {
					imageUrlToBase64(jwt.avatar).then((base64) => {
						if (!base64) return
						setLogoPic(base64)
					})
				} else {
					setLogoPic("")
				}

				// 计算token哈希
				hashToken(token).then((result) => {
					console.log("New Credit hash: ", result)
					setHash(result)
				})
			} catch (error) {
				console.error("Failed to parse JWT token:", error)
				setUserInfo(null)
				setLogoPic("")
				setHash("")
			}
		} else if (wasAuthenticatedRef.current && !token) {
			// 检测到登出
			telemetryClient.capture(TelemetryEventName.ACCOUNT_LOGOUT_SUCCESS)
			wasAuthenticatedRef.current = false
			setUserInfo(null)
			setLogoPic("")
			setHash("")
		}
	}, [apiConfiguration?.zgsmAccessToken])

	return {
		userInfo,
		logoPic,
		hash,
		isAuthenticated: !!apiConfiguration?.zgsmAccessToken,
	}
}
