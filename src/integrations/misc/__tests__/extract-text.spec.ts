import {
	addLineNumbers,
	everyLineHasLineNumbers,
	stripLineNumbers,
	truncateOutput,
	applyRunLengthEncoding,
	processCarriageReturns,
	processBackspaces,
} from "../extract-text"

describe("addLineNumbers", () => {
	it("should add line numbers starting from 1 by default", () => {
		const input = "line 1\nline 2\nline 3"
		const expected = "1 | line 1\n2 | line 2\n3 | line 3\n"
		expect(addLineNumbers(input)).toBe(expected)
	})

	it("should add line numbers starting from specified line number", () => {
		const input = "line 1\nline 2\nline 3"
		const expected = "10 | line 1\n11 | line 2\n12 | line 3\n"
		expect(addLineNumbers(input, 10)).toBe(expected)
	})

	it("should handle empty content", () => {
		expect(addLineNumbers("")).toBe("")
		expect(addLineNumbers("", 5)).toBe("5 | \n")
	})

	it("should handle single line content", () => {
		expect(addLineNumbers("single line")).toBe("1 | single line\n")
		expect(addLineNumbers("single line", 42)).toBe("42 | single line\n")
	})

	it("should pad line numbers based on the highest line number", () => {
		const input = "line 1\nline 2"
		// When starting from 99, highest line will be 100, so needs 3 spaces padding
		const expected = " 99 | line 1\n100 | line 2\n"
		expect(addLineNumbers(input, 99)).toBe(expected)
	})

	it("should preserve trailing newline without adding extra line numbers", () => {
		const input = "line 1\nline 2\n"
		const expected = "1 | line 1\n2 | line 2\n"
		expect(addLineNumbers(input)).toBe(expected)
	})

	it("should handle multiple blank lines correctly", () => {
		const input = "line 1\n\n\n\nline 2"
		const expected = "1 | line 1\n2 | \n3 | \n4 | \n5 | line 2\n"
		expect(addLineNumbers(input)).toBe(expected)
	})

	it("should handle multiple trailing newlines correctly", () => {
		const input = "line 1\nline 2\n\n\n"
		const expected = "1 | line 1\n2 | line 2\n3 | \n4 | \n"
		expect(addLineNumbers(input)).toBe(expected)
	})

	it("should handle numbered trailing newline correctly", () => {
		const input = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\n\n"
		const expected =
			" 1 | Line 1\n 2 | Line 2\n 3 | Line 3\n 4 | Line 4\n 5 | Line 5\n 6 | Line 6\n 7 | Line 7\n 8 | Line 8\n 9 | Line 9\n10 | Line 10\n11 | \n"
		expect(addLineNumbers(input)).toBe(expected)
	})

	it("should handle only blank lines with offset correctly", () => {
		const input = "\n\n\n"
		const expected = "10 | \n11 | \n12 | \n"
		expect(addLineNumbers(input, 10)).toBe(expected)
	})
})

describe("everyLineHasLineNumbers", () => {
	it("should return true for content with line numbers", () => {
		const input = "1 | line one\n2 | line two\n3 | line three"
		expect(everyLineHasLineNumbers(input)).toBe(true)
	})

	it("should return true for content with padded line numbers", () => {
		const input = "  1 | line one\n  2 | line two\n  3 | line three"
		expect(everyLineHasLineNumbers(input)).toBe(true)
	})

	it("should return false for content without line numbers", () => {
		const input = "line one\nline two\nline three"
		expect(everyLineHasLineNumbers(input)).toBe(false)
	})

	it("should return false for mixed content", () => {
		const input = "1 | line one\nline two\n3 | line three"
		expect(everyLineHasLineNumbers(input)).toBe(false)
	})

	it("should handle empty content", () => {
		expect(everyLineHasLineNumbers("")).toBe(false)
	})

	it("should return false for content with pipe but no line numbers", () => {
		const input = "a | b\nc | d"
		expect(everyLineHasLineNumbers(input)).toBe(false)
	})
})

describe("stripLineNumbers", () => {
	it("should strip line numbers from content", () => {
		const input = "1 | line one\n2 | line two\n3 | line three"
		const expected = "line one\nline two\nline three"
		expect(stripLineNumbers(input)).toBe(expected)
	})

	it("should strip padded line numbers", () => {
		const input = "  1 | line one\n  2 | line two\n  3 | line three"
		const expected = "line one\nline two\nline three"
		expect(stripLineNumbers(input)).toBe(expected)
	})

	it("should handle content without line numbers", () => {
		const input = "line one\nline two\nline three"
		expect(stripLineNumbers(input)).toBe(input)
	})

	it("should handle empty content", () => {
		expect(stripLineNumbers("")).toBe("")
	})

	it("should preserve content with pipe but no line numbers", () => {
		const input = "a | b\nc | d"
		expect(stripLineNumbers(input)).toBe(input)
	})

	it("should handle windows-style line endings", () => {
		const input = "1 | line one\r\n2 | line two\r\n3 | line three"
		const expected = "line one\r\nline two\r\nline three"
		expect(stripLineNumbers(input)).toBe(expected)
	})

	it("should handle content with varying line number widths", () => {
		const input = "  1 | line one\n 10 | line two\n100 | line three"
		const expected = "line one\nline two\nline three"
		expect(stripLineNumbers(input)).toBe(expected)
	})

	describe("aggressive mode", () => {
		it("should strip content with just a pipe character", () => {
			const input = "| line one\n| line two\n| line three"
			const expected = "line one\nline two\nline three"
			expect(stripLineNumbers(input, true)).toBe(expected)
		})

		it("should strip content with mixed formats in aggressive mode", () => {
			const input = "1 | line one\n| line two\n123 | line three"
			const expected = "line one\nline two\nline three"
			expect(stripLineNumbers(input, true)).toBe(expected)
		})

		it("should not strip content with pipe characters not at start in aggressive mode", () => {
			const input = "text | more text\nx | y"
			expect(stripLineNumbers(input, true)).toBe(input)
		})

		it("should handle empty content in aggressive mode", () => {
			expect(stripLineNumbers("", true)).toBe("")
		})

		it("should preserve padding after pipe in aggressive mode", () => {
			const input = "|  line with extra spaces\n1 |  indented content"
			const expected = " line with extra spaces\n indented content"
			expect(stripLineNumbers(input, true)).toBe(expected)
		})

		it("should preserve windows-style line endings in aggressive mode", () => {
			const input = "| line one\r\n| line two\r\n| line three"
			const expected = "line one\r\nline two\r\nline three"
			expect(stripLineNumbers(input, true)).toBe(expected)
		})

		it("should not affect regular content when using aggressive mode", () => {
			const input = "regular line\nanother line\nno pipes here"
			expect(stripLineNumbers(input, true)).toBe(input)
		})
	})
})

describe("truncateOutput", () => {
	it("returns original content when no line limit provided", () => {
		const content = "line1\nline2\nline3"
		expect(truncateOutput(content)).toBe(content)
	})

	it("returns original content when lines are under limit", () => {
		const content = "line1\nline2\nline3"
		expect(truncateOutput(content, 5)).toBe(content)
	})

	it("truncates content with 20/80 split when over limit", () => {
		// Create 25 lines of content
		const lines = Array.from({ length: 25 }, (_, i) => `line${i + 1}`)
		const content = lines.join("\n")

		// Set limit to 10 lines
		const result = truncateOutput(content, 10)

		// Should keep:
		// - First 2 lines (20% of 10)
		// - Last 8 lines (80% of 10)
		// - Omission indicator in between
		const expectedLines = [
			"line1",
			"line2",
			"",
			"[...15 lines omitted...]",
			"",
			"line18",
			"line19",
			"line20",
			"line21",
			"line22",
			"line23",
			"line24",
			"line25",
		]
		expect(result).toBe(expectedLines.join("\n"))
	})

	it("handles empty content", () => {
		expect(truncateOutput("", 10)).toBe("")
	})

	it("handles single line content", () => {
		expect(truncateOutput("single line", 10)).toBe("single line")
	})

	describe("processBackspaces", () => {
		it("should handle basic backspace deletion", () => {
			const input = "abc\b\bxy"
			const expected = "axy"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle backspaces at start of input", () => {
			const input = "\b\babc"
			const expected = "abc"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle backspaces with newlines", () => {
			const input = "abc\b\n123\b\b"
			const expected = "ab\n1"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle consecutive backspaces", () => {
			const input = "abcdef\b\b\b\bxy"
			const expected = "abxy"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle backspaces at end of input", () => {
			const input = "abc\b\b"
			const expected = "a"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle mixed backspaces and content", () => {
			const input = "abc\bx\byz\b\b123"
			const expected = "ab123"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle multiple groups of consecutive backspaces", () => {
			const input = "abc\b\bdef\b\b\bghi\b\b\b\bjkl"
			const expected = "jkl"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle backspaces with empty content between them", () => {
			const input = "abc\b\b\b\b\b\bdef"
			const expected = "def"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle complex mixed content with backspaces", () => {
			const input = "Loading[\b\b\b\b\b\b\b\bProgress[\b\b\b\b\b\b\b\b\bStatus: \b\b\b\b\b\b\b\bDone!"
			// Technically terminal displays "Done!s: [" but we assume \b is destructive as an optimization
			const expected = "Done!"
			expect(processBackspaces(input)).toBe(expected)
		})

		it("should handle backspaces with special characters", () => {
			const input = "abc😀\b\bdef🎉\b\b\bghi"
			const expected = "abcdeghi"
			expect(processBackspaces(input)).toBe(expected)
		})
	})

	it("handles windows-style line endings", () => {
		// Create content with windows line endings
		const lines = Array.from({ length: 15 }, (_, i) => `line${i + 1}`)
		const content = lines.join("\r\n")

		const result = truncateOutput(content, 5)

		// Should keep first line (20% of 5 = 1) and last 4 lines (80% of 5 = 4)
		// Split result by either \r\n or \n to normalize line endings
		const resultLines = result.split(/\r?\n/)
		const expectedLines = ["line1", "", "[...10 lines omitted...]", "", "line12", "line13", "line14", "line15"]
		expect(resultLines).toEqual(expectedLines)
	})

	describe("character limit functionality", () => {
		it("returns original content when no character limit provided", () => {
			const content = "a".repeat(1000)
			expect(truncateOutput(content, undefined, undefined)).toBe(content)
		})

		it("returns original content when characters are under limit", () => {
			const content = "a".repeat(100)
			expect(truncateOutput(content, undefined, 200)).toBe(content)
		})

		it("truncates content by character limit with 20/80 split", () => {
			// Create content with 1000 characters
			const content = "a".repeat(1000)

			// Set character limit to 100
			const result = truncateOutput(content, undefined, 100)

			// Should keep:
			// - First 20 characters (20% of 100)
			// - Last 80 characters (80% of 100)
			// - Omission indicator in between
			const expectedStart = "a".repeat(20)
			const expectedEnd = "a".repeat(80)
			const expected = expectedStart + "\n[...900 characters omitted...]\n" + expectedEnd

			expect(result).toBe(expected)
		})

		it("prioritizes character limit over line limit", () => {
			// Create content with few lines but many characters per line
			const longLine = "a".repeat(500)
			const content = `${longLine}\n${longLine}\n${longLine}`

			// Set both limits - character limit should take precedence
			const result = truncateOutput(content, 10, 100)

			// Should truncate by character limit, not line limit
			const expectedStart = "a".repeat(20)
			const expectedEnd = "a".repeat(80)
			// Total content: 1502 chars, limit: 100, so 1402 chars omitted
			const expected = expectedStart + "\n[...1402 characters omitted...]\n" + expectedEnd

			expect(result).toBe(expected)
		})

		it("falls back to line limit when character limit is satisfied", () => {
			// Create content with many short lines
			const lines = Array.from({ length: 25 }, (_, i) => `line${i + 1}`)
			const content = lines.join("\n")

			// Character limit is high enough, so line limit should apply
			const result = truncateOutput(content, 10, 10000)

			// Should truncate by line limit
			const expectedLines = [
				"line1",
				"line2",
				"",
				"[...15 lines omitted...]",
				"",
				"line18",
				"line19",
				"line20",
				"line21",
				"line22",
				"line23",
				"line24",
				"line25",
			]
			expect(result).toBe(expectedLines.join("\n"))
		})

		it("handles edge case where character limit equals content length", () => {
			const content = "exactly100chars".repeat(6) + "1234" // exactly 100 chars
			const result = truncateOutput(content, undefined, 100)
			expect(result).toBe(content)
		})

		it("handles very small character limits", () => {
			const content = "a".repeat(1000)
			const result = truncateOutput(content, undefined, 10)

			// 20% of 10 = 2, 80% of 10 = 8
			const expected = "aa\n[...990 characters omitted...]\n" + "a".repeat(8)
			expect(result).toBe(expected)
		})

		it("handles character limit with mixed content", () => {
			const content = "Hello world! This is a test with mixed content including numbers 123 and symbols @#$%"
			const result = truncateOutput(content, undefined, 50)

			// 20% of 50 = 10, 80% of 50 = 40
			const expectedStart = content.slice(0, 10) // "Hello worl"
			const expectedEnd = content.slice(-40) // last 40 chars
			const omittedChars = content.length - 50
			const expected = expectedStart + `\n[...${omittedChars} characters omitted...]\n` + expectedEnd

			expect(result).toBe(expected)
		})

		describe("edge cases with very small character limits", () => {
			it("handles character limit of 1", () => {
				const content = "abcdefghijklmnopqrstuvwxyz"
				const result = truncateOutput(content, undefined, 1)

				// 20% of 1 = 0.2 (floor = 0), so beforeLimit = 0
				// afterLimit = 1 - 0 = 1
				// Should keep 0 chars from start and 1 char from end
				const expected = "\n[...25 characters omitted...]\nz"
				expect(result).toBe(expected)
			})

			it("handles character limit of 2", () => {
				const content = "abcdefghijklmnopqrstuvwxyz"
				const result = truncateOutput(content, undefined, 2)

				// 20% of 2 = 0.4 (floor = 0), so beforeLimit = 0
				// afterLimit = 2 - 0 = 2
				// Should keep 0 chars from start and 2 chars from end
				const expected = "\n[...24 characters omitted...]\nyz"
				expect(result).toBe(expected)
			})

			it("handles character limit of 5", () => {
				const content = "abcdefghijklmnopqrstuvwxyz"
				const result = truncateOutput(content, undefined, 5)

				// 20% of 5 = 1, so beforeLimit = 1
				// afterLimit = 5 - 1 = 4
				// Should keep 1 char from start and 4 chars from end
				const expected = "a\n[...21 characters omitted...]\nwxyz"
				expect(result).toBe(expected)
			})

			it("handles character limit with multi-byte characters", () => {
				const content = "🚀🎉🔥💻🌟🎨🎯🎪🎭🎬" // 10 emojis, each is multi-byte
				const result = truncateOutput(content, undefined, 10)

				// Character limit works on string length, not byte count
				// 20% of 10 = 2, 80% of 10 = 8
				// Note: In JavaScript, each emoji is actually 2 characters (surrogate pair)
				// So the content is actually 20 characters long, not 10
				const expected = "🚀\n[...10 characters omitted...]\n🎯🎪🎭🎬"
				expect(result).toBe(expected)
			})

			it("handles character limit with newlines in content", () => {
				const content = "line1\nline2\nline3\nline4\nline5"
				const result = truncateOutput(content, undefined, 15)

				// Total length is 29 chars (including newlines)
				// 20% of 15 = 3, 80% of 15 = 12
				// The slice will take first 3 chars: "lin"
				// And last 12 chars: "e4\nline5" (counting backwards)
				const expected = "lin\n[...14 characters omitted...]\n\nline4\nline5"
				expect(result).toBe(expected)
			})

			it("handles character limit exactly matching content with omission message", () => {
				// Edge case: when the omission message would make output longer than original
				const content = "short"
				const result = truncateOutput(content, undefined, 10)

				// Content is 5 chars, limit is 10, so no truncation needed
				expect(result).toBe(content)
			})

			it("handles character limit smaller than omission message", () => {
				const content = "a".repeat(100)
				const result = truncateOutput(content, undefined, 3)

				// 20% of 3 = 0.6 (floor = 0), so beforeLimit = 0
				// afterLimit = 3 - 0 = 3
				const expected = "\n[...97 characters omitted...]\naaa"
				expect(result).toBe(expected)
			})

			it("prioritizes character limit even with very high line limit", () => {
				const content = "a".repeat(1000)
				const result = truncateOutput(content, 999999, 50)

				// Character limit should still apply despite high line limit
				const expectedStart = "a".repeat(10) // 20% of 50
				const expectedEnd = "a".repeat(40) // 80% of 50
				const expected = expectedStart + "\n[...950 characters omitted...]\n" + expectedEnd
				expect(result).toBe(expected)
			})
		})
	})
})

describe("applyRunLengthEncoding", () => {
	it("should handle empty input", () => {
		expect(applyRunLengthEncoding("")).toBe("")
		expect(applyRunLengthEncoding(null as any)).toBe(null as any)
		expect(applyRunLengthEncoding(undefined as any)).toBe(undefined as any)
	})

	it("should compress repeated single lines when beneficial", () => {
		const input = "longerline\nlongerline\nlongerline\nlongerline\nlongerline\nlongerline\n"
		const expected = "longerline\n<previous line repeated 5 additional times>\n"
		expect(applyRunLengthEncoding(input)).toBe(expected)
	})

	it("should not compress when not beneficial", () => {
		const input = "y\ny\ny\ny\ny\n"
		expect(applyRunLengthEncoding(input)).toBe(input)
	})
})

describe("processCarriageReturns", () => {
	it("should return original input if no carriage returns (\r) present", () => {
		const input = "Line 1\nLine 2\nLine 3"
		expect(processCarriageReturns(input)).toBe(input)
	})

	it("should process basic progress bar with carriage returns (\r)", () => {
		const input = "Progress: [===>---------] 30%\rProgress: [======>------] 60%\rProgress: [==========>] 100%"
		const expected = "Progress: [==========>] 100%%"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle multi-line outputs with carriage returns (\r)", () => {
		const input = "Line 1\rUpdated Line 1\nLine 2\rUpdated Line 2\rFinal Line 2"
		const expected = "Updated Line 1\nFinal Line 2 2"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle carriage returns (\r) at end of line", () => {
		// A carriage return (\r) at the end of a line should be treated as if the cursor is at the start
		// with no content following it, so we keep the existing content
		const input = "Initial text\rReplacement text\r"
		// Depending on terminal behavior:
		// Option 1: If last carriage return (\r) is ignored because nothing follows it to replace text
		const expected = "Replacement text"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	// Additional test to clarify behavior with a terminal-like example
	it("should handle carriage returns (\r) in a way that matches terminal behavior", () => {
		// In a real terminal:
		// 1. "Hello" is printed
		// 2. Carriage return (\r) moves cursor to start of line
		// 3. "World" overwrites, becoming "World"
		// 4. Carriage return (\r) moves cursor to start again
		// 5. Nothing follows, so the line remains "World" (cursor just sitting at start)
		const input = "Hello\rWorld\r"
		const expected = "World"
		expect(processCarriageReturns(input)).toBe(expected)

		// Same principle applies to carriage return (\r) + line feed (\n)
		// 1. "Line1" is printed
		// 2. Carriage return (\r) moves cursor to start
		// 3. Line feed (\n) moves to next line, so the line remains "Line1"
		expect(processCarriageReturns("Line1\r\n")).toBe("Line1\n")
	})

	it("should preserve lines without carriage returns (\r)", () => {
		const input = "Line 1\nLine 2\rUpdated Line 2\nLine 3"
		const expected = "Line 1\nUpdated Line 2\nLine 3"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle complex tqdm-like progress bars", () => {
		const input =
			"10%|██        | 10/100 [00:01<00:09, 10.00it/s]\r20%|████      | 20/100 [00:02<00:08, 10.00it/s]\r100%|██████████| 100/100 [00:10<00:00, 10.00it/s]"
		const expected = "100%|██████████| 100/100 [00:10<00:00, 10.00it/s]"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle ANSI escape sequences", () => {
		const input = "\x1b]633;C\x07Loading\rLoading.\rLoading..\rLoading...\x1b]633;D\x07"
		const expected = "Loading...\x1b]633;D\x07"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle mixed content with carriage returns (\r) and line feeds (\n)", () => {
		const input =
			"Step 1: Starting\rStep 1: In progress\rStep 1: Done\nStep 2: Starting\rStep 2: In progress\rStep 2: Done"
		const expected = "Step 1: Donerogress\nStep 2: Donerogress"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle empty input", () => {
		expect(processCarriageReturns("")).toBe("")
	})

	it("should handle large number of carriage returns (\r) efficiently", () => {
		// Create a string with many carriage returns (\r)
		let input = ""
		for (let i = 0; i < 10000; i++) {
			input += `Progress: ${i / 100}%\r`
		}
		input += "Progress: 100%"

		const expected = "Progress: 100%9%"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	// Additional edge cases to stress test processCarriageReturns
	it("should handle consecutive carriage returns (\r)", () => {
		const input = "Initial\r\r\r\rFinal"
		const expected = "Finalal"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle carriage returns (\r) at the start of a line", () => {
		const input = "\rText after carriage return"
		const expected = "Text after carriage return"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle only carriage returns (\r)", () => {
		const input = "\r\r\r\r"
		const expected = ""
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle carriage returns (\r) with empty strings between them", () => {
		const input = "Start\r\r\r\r\rEnd"
		const expected = "Endrt"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle multiline with carriage returns (\r) at different positions", () => {
		const input = "Line1\rLine1Updated\nLine2\nLine3\rLine3Updated\rLine3Final\nLine4"
		const expected = "Line1Updated\nLine2\nLine3Finaled\nLine4"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle carriage returns (\r) with special characters", () => {
		// This test demonstrates our handling of multi-byte characters (like emoji) when they get partially overwritten.
		// When a carriage return (\r) causes partial overwrite of a multi-byte character (like an emoji),
		// we need to handle this special case to prevent display issues or corruption.
		//
		// In this example:
		// 1. "Line with 🚀 emoji" is printed (note that the emoji is a multi-byte character)
		// 2. Carriage return (\r) moves cursor to start of line
		// 3. "Line with a" is printed, which partially overwrites the line
		// 4. The 'a' character ends at a position that would split the 🚀 emoji
		// 5. Instead of creating corrupted output, we insert a space to replace the partial emoji
		//
		// This behavior mimics terminals that can detect and properly handle these situations
		// by replacing partial characters with spaces to maintain text integrity.
		const input = "Line with 🚀 emoji\rLine with a"
		const expected = "Line with a  emoji"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should correctly handle multiple consecutive line feeds (\n) with carriage returns (\r)", () => {
		// Another test case for multi-byte character handling during carriage return (\r) overwrites.
		// In this case, we're testing with a different emoji and pattern to ensure robustness.
		//
		// When a new line with an emoji partially overlaps with text from the previous line,
		// we need to properly detect surrogate pairs and other multi-byte sequences to avoid
		// creating invalid Unicode output.
		//
		// Note: The expected result might look strange but it's consistent with how real
		// terminals process such content - they only overwrite at character boundaries
		// and don't attempt to interpret or normalize the resulting text.
		const input = "Line with not a emoji\rLine with 🔥 emoji"
		const expected = "Line with 🔥 emojioji"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle carriage returns (\r) in the middle of non-ASCII text", () => {
		// Tests handling of non-Latin text (like Chinese characters)
		// Non-ASCII text uses multi-byte encodings, so this test verifies our handling works
		// properly with such character sets.
		//
		// Our implementation ensures we preserve character boundaries and don't create
		// invalid sequences when carriage returns (\r) cause partial overwrites.
		const input = "你好世界啊\r你好地球"
		const expected = "你好地球啊"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should correctly handle complex patterns of alternating carriage returns (\r) and line feeds (\n)", () => {
		// Break down the example:
		// 1. "Line1" + carriage return (\r) + line feed (\n): carriage return (\r) moves cursor to start of line, line feed (\n) moves to next line, preserving "Line1"
		// 2. "Line2" + carriage return (\r): carriage return (\r) moves cursor to start of line
		// 3. "Line2Updated" overwrites "Line2"
		// 4. Line feed (\n): moves to next line
		// 5. "Line3" + carriage return (\r) + line feed (\n): carriage return (\r) moves cursor to start, line feed (\n) moves to next line, preserving "Line3"
		const input = "Line1\r\nLine2\rLine2Updated\nLine3\r\n"
		const expected = "Line1\nLine2Updated\nLine3\n"
		expect(processCarriageReturns(input)).toBe(expected)
	})

	it("should handle partial overwrites with carriage returns (\r)", () => {
		// In this case:
		// 1. "Initial text" is printed
		// 2. Carriage return (\r) moves cursor to start of line
		// 3. "next" is printed, overwriting only the first 4 chars
		// 4. Carriage return (\r) moves cursor to start, but nothing follows
		// Final result should be "nextial text" (first 4 chars overwritten)
		const input = "Initial text\rnext\r"
		const expected = "nextial text"
		expect(processCarriageReturns(input)).toBe(expected)
	})
})

describe("extractTextFromFile with character limit", () => {
	const fs = require("fs/promises")
	const path = require("path")
	const os = require("os")

	let tempDir: string
	let testFilePath: string

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "extract-text-test-"))
		testFilePath = path.join(tempDir, "test.txt")
	})

	afterEach(async () => {
		try {
			await fs.rm(tempDir, { recursive: true, force: true })
		} catch (error) {
			// Ignore cleanup errors
		}
	})

	it("should apply character limit when file content exceeds limit", async () => {
		// 创建一个包含大量字符的文件
		const longContent = "a".repeat(1000)
		await fs.writeFile(testFilePath, longContent)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, undefined, 100)

		// 应该被字符限制截断
		expect(result.length).toBeLessThan(longContent.length + 50) // 加上行号和截断信息
		expect(result).toContain("[...") // 应该包含截断标识
		expect(result).toContain("characters omitted...]")
	})

	it("should apply character limit even when line limit is not exceeded", async () => {
		// 创建少量行但每行很长的文件
		const longLine = "x".repeat(500)
		const content = `${longLine}\n${longLine}\n${longLine}`
		await fs.writeFile(testFilePath, content)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, 10, 200) // 行数限制10，字符限制200

		// 字符限制应该优先生效
		expect(result).toContain("characters omitted")
		expect(result).not.toContain("lines omitted")
	})

	it("should apply both line and character limits when line limit is exceeded first", async () => {
		// 创建很多短行的文件
		const lines = Array.from({ length: 50 }, (_, i) => `line${i + 1}`)
		const content = lines.join("\n")
		await fs.writeFile(testFilePath, content)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, 10, 10000) // 行数限制10，字符限制很大

		// 行数限制应该先生效，应该只显示行数截断信息
		expect(result).toContain("showing 10 of 50 total lines")
		expect(result).not.toContain("character limit")
	})

	it("should show different truncation messages for different scenarios", async () => {
		// 测试场景1：只有行数限制
		const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`)
		const content1 = lines.join("\n")
		await fs.writeFile(testFilePath, content1)

		const { extractTextFromFile } = await import("../extract-text")
		const result1 = await extractTextFromFile(testFilePath, 5, undefined)
		expect(result1).toContain("showing 5 of 20 total lines")
		expect(result1).not.toContain("character limit")

		// 测试场景2：行数限制 + 字符限制都生效
		const longLines = Array.from({ length: 20 }, (_, i) => `${"x".repeat(100)}_line${i + 1}`)
		const content2 = longLines.join("\n")
		await fs.writeFile(testFilePath, content2)

		const result2 = await extractTextFromFile(testFilePath, 5, 200)
		expect(result2).toContain("showing 5 of 20 total lines")
		expect(result2).toContain("character limit (200)")

		// 测试场景3：只有字符限制
		const longContent = "a".repeat(1000)
		await fs.writeFile(testFilePath, longContent)

		const result3 = await extractTextFromFile(testFilePath, undefined, 100)
		expect(result3).toContain("characters omitted")
		expect(result3).toContain("character limit (100)")
		expect(result3).not.toContain("total lines")
	})

	it("should not apply character limit when content is within limit", async () => {
		const shortContent = "short content"
		await fs.writeFile(testFilePath, shortContent)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, undefined, 1000)

		// 内容应该完整保留，只添加行号
		expect(result).toBe("1 | short content\n")
		expect(result).not.toContain("characters omitted")
	})

	it("should handle character limit with line limit when both are exceeded", async () => {
		// 创建很多长行的文件
		const longLine = "y".repeat(100)
		const lines = Array.from({ length: 30 }, (_, i) => `${longLine}_${i + 1}`)
		const content = lines.join("\n")
		await fs.writeFile(testFilePath, content)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, 5, 500) // 行数限制5，字符限制500

		// 行数限制先生效，然后字符限制应用到截断后的内容
		expect(result).toContain("showing 5 of 30 total lines")
		// 字符限制也应该应用
		expect(result).toContain("characters omitted")
	})

	it("should validate maxReadCharacterLimit parameter", async () => {
		await fs.writeFile(testFilePath, "test content")

		const { extractTextFromFile } = await import("../extract-text")

		// 测试无效的字符限制参数
		await expect(extractTextFromFile(testFilePath, undefined, 0)).rejects.toThrow(
			"Invalid maxReadCharacterLimit: 0. Must be a positive integer or undefined for unlimited.",
		)

		await expect(extractTextFromFile(testFilePath, undefined, -1)).rejects.toThrow(
			"Invalid maxReadCharacterLimit: -1. Must be a positive integer or undefined for unlimited.",
		)
	})

	it("should work correctly when maxReadCharacterLimit is undefined", async () => {
		const content = "test content without limit"
		await fs.writeFile(testFilePath, content)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, undefined, undefined)

		// 应该返回完整内容加行号
		expect(result).toBe("1 | test content without limit\n")
	})

	it("should apply character limit to line-limited content correctly", async () => {
		// 创建内容，行数超限但字符数在限制内
		const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`)
		const content = lines.join("\n")
		await fs.writeFile(testFilePath, content)

		const { extractTextFromFile } = await import("../extract-text")
		const result = await extractTextFromFile(testFilePath, 5, 200) // 行数限制5，字符限制200

		// 行数限制先生效
		expect(result).toContain("showing 5 of 20 total lines")

		// 然后字符限制应用到结果上
		if (result.length > 200) {
			expect(result).toContain("characters omitted")
		}
	})
})
