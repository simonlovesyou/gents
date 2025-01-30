// import { format } from "logform"
import { createLogger, format, transports } from "winston"
import chalk from "chalk"
import boxen from "boxen"
import { getBorderCharacters, table as createTable } from "table"
import terminalSize from "terminal-size"

function createGrid(data: Record<string, unknown>): string[][] {
  // Extract the keys to form the header
  const keys = Object.keys(data).filter((key) => {
    const value = data[key]
    return value ? (Array.isArray(value) ? value.length > 0 : value) : value
  })

  // Initialize rows starting with headers
  const rows: string[][] = [keys.map((key) => chalk.bold(key))]

  // Find the maximum number of entries in any category
  const maxEntries = Math.max(
    ...keys.map((key) => {
      const value = data[key]
      return Array.isArray(value)
        ? value.length
        : typeof value === "object" && data !== null
          ? Object.keys(value || {}).length
          : 1
    }),
  )

  // Populate rows with values
  for (let i = 0; i < maxEntries; i++) {
    const row: string[] = keys.map((key) => {
      const value = data[key]
      if (!value) return ""
      if ((typeof value === "string" || typeof value === "number") && i === 0) {
        return value.toString()
      }
      if (Array.isArray(value)) {
        return value[i] ? `• ${value[i]}` : ""
      } else {
        // Handle objects with formatted key-value pairs
        const entries = Object.entries(value)
        if (i < entries.length) {
          const [entryKey, entryValue] = entries[i] ?? []
          if (typeof entryValue === "number") {
            // Format number entries with their key names
            return `• ${entryKey} ${chalk.dim(`(${entryValue})`)}`
          } else if (typeof entryValue === "boolean") {
            // Show checkmark for true boolean values
            return entryValue ? `✔ ${entryKey}` : `❌ ${entryKey}`
          }
        }
        return ""
      }
    })

    rows.push(row)
  }

  return rows
}

const createLogBox = ({
  text,
  highlightedText,
  title,
}: {
  text: string
  title: string | undefined
  highlightedText?: string
}) => {
  const boxText =
    highlightedText && highlightedText !== text
      ? text.replace(
          highlightedText,
          chalk.italic(chalk.bold(chalk.black(highlightedText))),
        )
      : text

  return boxen(boxText.trim(), {
    textAlignment: "left",
    ...(title ? { title } : {}),
    titleAlignment: "left",
    padding: 0,
    margin: 0,
  })
}

const createDataTable = (data: Record<string, unknown>, depth: number) => {
  const grid = createGrid(data)

  const availableSpace = terminalSize().columns - depth * 4 - 1

  const columns =
    Object.keys(data).length > 0
      ? createTable(grid, {
          border: getBorderCharacters("void"),
          columnDefault: {
            width: Math.floor(availableSpace / Object.keys(data).length - 1),
            paddingLeft: 0,
            paddingRight: 1,
          },
          drawHorizontalLine: () => false,
        })
      : "{}"

  return columns
}

const formatLog = format.combine(
  format.printf((logInformation) => {
    if ("details" in logInformation || "details" in logInformation.message) {
      const { text, fullText, pos, filePath, ...restDetails } =
        logInformation.details ?? logInformation.message.details ?? {}

      const { depth } = logInformation ?? {}

      const table = createDataTable(restDetails, depth ?? 0)

      const message =
        typeof logInformation.message !== "string" ? "" : logInformation.message

      const box =
        (fullText ?? text)
          ? createLogBox({
              text: fullText ?? text,
              highlightedText: text,
              title: filePath ? `${filePath}:${pos}` : undefined,
            })
          : undefined

      return [message, box, table]
        .filter((item) => item)
        .join("\n")
        .split("\n")
        .map((line, index) => {
          const depthLines = Array.from({ length: depth + 1 }, (_, index_) =>
            index_ === depth && index === 0 ? "┌ " : "| ",
          ).join(" ")

          return depthLines + line
        })
        .join("\n")
        .trimEnd()
    }
    return "undefined"
  }),
)

const logger = createLogger({
  format: format.combine(format.timestamp(), formatLog),
  transports: [new transports.Console()],
})

logger.warn({
  details: {
    depth: 2,
    flags: {
      type: 128,
      object: 0,
      apparentTypeObject: 2,
    },
    apparentType: {
      isClassOrInterface: true,
      isInterface: true,
      isObject: true,
    },
    type: {
      isLiteral: true,
      isStringLiteral: true,
    },
    symbols: ["apparentType", "lol"],
    fullText: `
interface MyInterface {
  foo?: Date
}
    `,
  },
})

/*
Flags:
*/

export default logger
