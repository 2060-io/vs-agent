import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Definition of a single example used in Swagger.
 */
export interface ExampleDefinition {
  // Short title of the example
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
    // lightweight debug — remove or lower verbosity in production
    console.debug(`[DocLoader] Loaded ${mdFilePath} (${Math.max(0, rawContent.length)} bytes)`)
  } catch (err) {
    throw new Error(`Failed to read Markdown file at ${fullPath}: ${(err as Error).message}`)
  }

  /**
   * Escapes special characters for use in a RegExp.
   */
  function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Converts a kebab‐case, spaced or mixed string into camelCase.
   *
   * Examples:
   *   "credential-request" -> "credentialRequest"
   *   "eMRTD Data Request" -> "emrtdDataRequest"
   */
  function toCamelCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase boundaries
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join('')
  }

  /**
   * Normalize an arbitrary heading or type-like input into a canonical kebab-case token.
   *
   * - removes extra spaces
   * - splits camelCase and acronyms into components
   * - removes non alphanumeric characters (turn into hyphens)
   * - lowercases result
   *
   * Example:
   *   "eMRTD Data Request" -> "emrtd-data-request"
   *   "MRZ Data Request"   -> "mrz-data-request"
   */
  function normalizeTypeName(input: string): string {
    if (!input) return ''
    let s = input.trim()

    // replace underscores and repeated whitespace with single space
    s = s.replace(/[_\s]+/g, ' ')

    // Separate boundaries between lower->Upper (fooBar -> foo Bar)
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2')

    // Insert space between letter and digit groups and viceversa
    s = s.replace(/([A-Za-z])([0-9])/g, '$1 $2').replace(/([0-9])([A-Za-z])/g, '$1 $2')

    // Replace non-alphanum with space (we will later join with hyphens)
    s = s.replace(/[^A-Za-z0-9]+/g, ' ')

    // Split into tokens, collapse, and join with hyphen
    const tokens = s
      .split(/\s+/)
      .filter(Boolean)
      .map(tok => tok.toLowerCase())

    return tokens.join('-')
  }

  /**
   * Attempts to parse a JSON string robustly.
   * Returns parsed object or null if not valid JSON.
   */
  function tryParseJson(block: string): any | null {
    try {
      return JSON.parse(block)
    } catch {
      return null
    }
  }

  /**
   * Extract all fenced code blocks (```json ... ``` or ``` ... ```) from the document
   * capturing a chunk of context that precedes each fence (useful to find the heading).
   */
  function extractFencedCodeBlocks(): Array<{ block: string; before: string; fenceLang?: string }> {
    // Match fenced codeblocks with optional language identifier, capture the fence content and the language
    // We will iterate with a global regex to preserve order.
    const regex = /(^|\n)([ \t]*)(```|~~~)\s*([a-zA-Z0-9_-]*)[^\n]*\r?\n([\s\S]*?)(?:\r?\n)\2\3/g
    const blocks: Array<{ block: string; before: string; fenceLang?: string }> = []
    let m: RegExpExecArray | null
    while ((m = regex.exec(rawContent)) !== null) {
      const fenceLang = (m[4] || '').toLowerCase() // e.g. 'json', 'yaml', ''
      const block = m[5]
      // capture up to 8 lines before the fence for context (could include heading)
      const prefixStart = Math.max(0, m.index - 2000) // reasonable window to capture preceding heading
      const beforeChunk = rawContent.slice(prefixStart, m.index)
      const beforeLines = beforeChunk.split(/\r?\n/).slice(-8).join('\n')
      blocks.push({ block, before: beforeLines, fenceLang })
    }
    return blocks
  }

  /**
   * Attempts to detect a "type" token for a given fenced JSON (or other) block.
   *
   * Strategy:
   *  1. If block parses as JSON and has `type` or `messageType` -> normalize that.
   *  2. Else try to find the closest heading above the fence in the `before` text:
   *     - look for lines starting with '#' (markdown headings) and use their text
   *     - else, look for a short line with words that match any known candidate tokens
   */
  function detectTypeFromBlock(block: string, before: string, wantedNormalized: Set<string>): string | null {
    const parsed = tryParseJson(block)
    if (parsed && typeof parsed === 'object') {
      // Common fields used in examples
      const possibleFields = ['type', 'messageType', 'msgType']
      for (const f of possibleFields) {
        if (parsed[f]) {
          const norm = normalizeTypeName(String(parsed[f]))
          if (norm) return norm
        }
      }
    }

    // If not found in JSON, parse heading from before:
    // find last markdown heading in the 'before' chunk
    const headingMatch = before.match(/(^|\n)\s{0,3}(#{1,6})\s*(.+?)\s*(\n|$)/m)
    if (headingMatch && headingMatch[3]) {
      const hd = headingMatch[3].trim()
      const norm = normalizeTypeName(hd)
      if (norm) return norm
    }

    // fallback: attempt to find any token-like word in the before snippet that matches wantedNormalized
    const words = before.split(/[\s\-_]+/).filter(Boolean)
    for (let window = 3; window >= 1; window--) {
      for (let i = 0; i + window <= words.length; i++) {
        const candidate = words.slice(i, i + window).join(' ')
        const norm = normalizeTypeName(candidate)
        if (wantedNormalized.has(norm)) return norm
      }
    }

    return null
  }

  /**
   * Build examples mapping for the requested canonical type values.
   *
   * Input `types` should be the canonical enum values used in the codebase
   * (e.g. ['credential-request', 'text', 'emrtd-data-submit', ...]).
   *
   * Output keys are camelCase versions of the human titles (e.g. credentialRequest)
   * which is compatible with the shape expected by @ApiBody({ examples: { ... } }).
   */
  function getExamples(types: string[]): Record<string, ExampleDefinition> {
    // Build a map of normalized token -> canonical type string
    const wantedNormalized = new Map<string, string>()
    for (const t of types) {
      const norm = normalizeTypeName(String(t))
      wantedNormalized.set(norm, String(t))
    }
    const wantedNormalizedSet = new Set(wantedNormalized.keys())

    const foundExamples: Map<string, ExampleDefinition> = new Map()
    const blocks = extractFencedCodeBlocks()

    // Scan code blocks in document order and attempt to map each to a canonical type
    for (const { block, before, fenceLang } of blocks) {
      // Prefer json fences but accept others
      let parsed = null
      if (fenceLang === 'json' || fenceLang === 'js' || fenceLang === '') {
        parsed = tryParseJson(block)
      } else {
        parsed = tryParseJson(block) // try anyway if it's yaml or unspecified — parsing will return null
      }

      const detectedNorm = detectTypeFromBlock(block, before, wantedNormalizedSet)
      if (!detectedNorm) continue
      const canonical = wantedNormalized.get(detectedNorm)
      if (!canonical) continue

      // Ensure we only register the first example per canonical type (keep simple)
      if (foundExamples.has(canonical)) continue

      // special key Build a friendly summary: turn canonical "emrtd-data-submit" -> "Emrtd Data Submit"
      const humanTitle = canonical
        .split(/[-_]+/)
        .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ')
        .replace(/\bEmrtd\b/i, 'eMRTD') // keep acronym casing nice (optional)
        .replace(/\bMrz\b/i, 'MRZ')

      const description = (() => {
        // Try to fetch the section header and nearby content, prefer fenced example inclusion
        // Attempt various header variants (kebab -> human header)
        const headerCandidate = `#### ${humanTitle}`
        const section = getSection(headerCandidate)
        if (section && !section.includes('Section not found')) return section
        // fallback: return a short snippet from 'before' plus first line of block
        const beforeLines = before.trim().split(/\r?\n/).slice(-6).join('\n')
        const snippetLine = block.split(/\r?\n/)[0]
        return `Example for ${humanTitle}\n\nContext:\n${beforeLines}\n\n\`\`\`\n${snippetLine}\n\`\`\``
      })()

      // Value: prefer parsed JSON, else return raw text
      const value = parsed ?? { raw: block.trim() }

      foundExamples.set(canonical, { summary: humanTitle, description, value })
    }

    // For any requested type not found in document, synthesize a minimal example
    const results: Record<string, ExampleDefinition> = {}
    for (const t of types) {
      if (foundExamples.has(t)) {
        results[toCamelCase(t)] = foundExamples.get(t)!
      } else {
        // generate a minimal helpful
        const humanTitle = t
          .split(/[-_]+/)
          .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
          .join(' ')
        results[toCamelCase(t)] = {
          summary: humanTitle,
          description: `${humanTitle}\n\nAuto-generated example .`,
          value: {
            type: t,
            connectionId: 'REPLACE_WITH_CONNECTION_ID',
            timestamp: new Date().toISOString(),
          },
        }
      }
    }

    return results
  }

  /**
   * Extracts the Markdown content under a specified heading.
   *
   * By default, stops before any code fence (``` or ~~~) or the next
   * heading of the same/higher level. If you pass `includeFences = true`,
   * it will include the first code fence block (and its fences) that follows
   * the heading.
   *
   * @param rawHeader - Exact heading, e.g. '## Messaging' or '#### Text'
   * @param options - control flag to include code fences
   */
  function getSection(rawHeader: string, options: { includeFences?: boolean } = {}): string {
    const { includeFences = false } = options

    // Determine header pattern
    const headerMatch = rawHeader.match(/^(#+)\s*(.*)$/)
    const hashes = headerMatch ? headerMatch[1] : '##'
    const title = headerMatch ? headerMatch[2].trim() : rawHeader.trim()
    const level = hashes.length

    // Start: match the header line
    const startPattern = `^${escapeRegExp(hashes)}\\s*${escapeRegExp(title)}\\s*\\r?\\n`
    // End: next header of same or higher level or EOF
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
      // include the first fence block (if any) fully
      const fenceBlock = content.match(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?\n\1/m)
      if (fenceBlock && fenceBlock.index !== undefined) {
        const endIdx = (fenceBlock.index || 0) + fenceBlock[0].length
        content = content.slice(0, endIdx).trim()
      }
    }

    return `${hashes} ${title}\n\n${content}`
  }

  // Return the loader API
  return { getSection, getExamples }
}
