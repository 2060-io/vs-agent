import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Definition of a single example used in Swagger.
 */
export interface ExampleDefinition {
  //Short title of the example
  summary: string
  // Detailed description (Markdown) shown below the example
  description: string
  // JSON value for the example payload
  value: any
}

/**
 * Loader interface for extracting sections and examples from a Markdown spec.
 */
export interface DocLoader {
  /**
   * Extracts the Markdown content under a specified heading.
   *
   * - By default, cuts before any code fence (``` or ~~~) or the next
   *   heading of equal or higher level.
   * - If `options.includeFences` is true, preserves the first code fence
   *   block (including its fences) in the output.
   *
   * @param rawHeader      The exact heading line, e.g. '## Messaging' or '#### Text'.
   * @param options        Optional flags to control extraction behavior:
   *   - includeFences?: boolean — when true, keeps the first code fence block.
   * @returns              The heading plus its content (with or without fence),
   *                       or a “Section not found” notice.
   */
  getSection(rawHeader: string, options?: { includeFences?: boolean }): string

  /**
   * Builds a map of examples keyed by camelCased heading names, for each given message type.
   *
   * @param types - Array of messageType strings (e.g. ['credential-request','text',...]).
   * @returns Object whose keys are camelCased titles (e.g. credentialRequest) and values ExampleDefinition.
   */
  getExamples(types: string[]): Record<string, ExampleDefinition>
}

/**
 * Factory: creates a DocLoader bound to a specific Markdown file.
 *
 * @param mdFilePath - Path to the Markdown file (absolute or relative).
 * @throws Error if the file cannot be read.
 */
export function createDocLoader(mdFilePath: string): DocLoader {
  // Resolve full path (allow either absolute or project‐relative)
  const fullPath = mdFilePath.startsWith('/') ? mdFilePath : join(process.cwd(), mdFilePath)

  let rawContent: string
  try {
    rawContent = readFileSync(fullPath, 'utf8')
    console.log(
      `[DocLoader] Loaded ${mdFilePath}, first 20 lines:\n`,
      rawContent.split('\n').slice(0, 20).join('\n'),
    )
  } catch (err) {
    throw new Error(`Failed to read Markdown file at ${fullPath}: ${(err as Error).message}`)
  }

  /**
   * Extracts the Markdown content under a specified heading.
   *
   * By default, stops before any code fence (``` or ~~~) or the next
   * heading of the same/higher level. If you pass `includeFences = true`,
   * incluirá el primer bloque de código junto con su fence.
   *
   * @param rawHeader - Exact heading, e.g. '## Messaging' or '#### Text'
   * @param includeFences - If true, preserves the first code fence and its content
   * @returns The heading plus its cleaned content (with or without fences)
   */
  function getSection(rawHeader: string, options: { includeFences?: boolean } = {}): string {
    const { includeFences = false } = options

    // 1) Determine heading level and title
    const headerMatch = rawHeader.match(/^(#+)\s*(.*)$/)
    const hashes = headerMatch ? headerMatch[1] : '##'
    const title = headerMatch ? headerMatch[2].trim() : rawHeader.trim()
    const level = hashes.length

    // 2) Capture between this header and the next of same/higher level
    const startPattern = `^${escapeRegExp(hashes)}\\s*${escapeRegExp(title)}\\s*\\r?\\n`
    const endPattern = `(?=^#{1,${level}}\\s|\\z)`
    const sectionRegex = new RegExp(startPattern + '([\\s\\S]*?)' + endPattern, 'm')
    const match = rawContent.match(sectionRegex)
    if (!match) {
      console.warn(`[DocLoader] Header "${rawHeader}" not found in spec`)
      return `${hashes} ${title}\nSection not found`
    }

    let content = match[1].trim()

    if (!includeFences) {
      // default: cut before first fence
      const fenceIdx = content.search(/^[ \t]*(?:```|~~~)/m)
      if (fenceIdx !== -1) {
        content = content.slice(0, fenceIdx).trim()
      }
    } else {
      // include the first fence block
      const fenceBlock = content.match(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?\n\1/m)
      if (fenceBlock && fenceBlock.index !== undefined) {
        const endIdx = fenceBlock.index + fenceBlock[0].length
        content = content.slice(0, endIdx).trim()
      }
    }

    return `${hashes} ${title}\n\n${content}`
  }

  /**
   * Parses the first JSON code fence following a given heading,
   * but only up to the next Markdown heading.
   */
  function parseExample(rawHeader: string): any {
    // Locate the header in the full content
    const idx = rawContent.indexOf(rawHeader)
    if (idx === -1) {
      console.warn(`[DocLoader] Header not found: "${rawHeader}"`)
      return {}
    }

    // Slice everything after the header line
    let snippet = rawContent.slice(idx + rawHeader.length)

    // Trim at the next Markdown heading (#...)
    const nextHdr = snippet.match(/^#+\s.*$/m)
    if (nextHdr && nextHdr.index !== undefined) {
      snippet = snippet.slice(0, nextHdr.index)
    }

    // 4. Extract the first ```json ... ``` block (allow indent before fences)
    const fenceRegex = /^[ \t]*```json[ \t]*\r?\n([\s\S]*?)[ \t]*\r?\n^[ \t]*```/m
    const m = snippet.match(fenceRegex)
    if (!m) {
      console.warn(`[DocLoader] No JSON block found for "${rawHeader}"`)
      return {}
    }

    const jsonText = m[1].trim()
    console.log(`[DocLoader] JSON for "${rawHeader}":\n${jsonText}`)

    // Parse or return raw on error
    try {
      return JSON.parse(jsonText)
    } catch (err) {
      console.warn(`[DocLoader] Invalid JSON for "${rawHeader}": ${(err as Error).message}`)
      return { raw: jsonText }
    }
  }

  /**
   * Converts a kebab‐case or spaced string into camelCase.
   */
  function toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join('')
  }

  /**
   * Builds example definitions for an array of messageType values.
   */
  function getExamples(types: string[]): Record<string, ExampleDefinition> {
    const examples: Record<string, ExampleDefinition> = {}

    for (const typeValue of types) {
      // Build human title: "credential-request" → "Credential Request"
      const humanTitle = typeValue
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      const rawHeader = `#### ${humanTitle}`

      // Extract description and value
      const description = getSection(rawHeader)
      const value = parseExample(rawHeader)

      // Use camelCase key: "Credential Request" → "credentialRequest"
      const key = toCamelCase(humanTitle)

      examples[key] = { summary: humanTitle, description, value }
    }

    return examples
  }

  // Return the loader API
  return { getSection, getExamples }
}

/**
 * Escapes special characters for use in a RegExp.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
