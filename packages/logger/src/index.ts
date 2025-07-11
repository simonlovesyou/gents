import { createLogger, format, transports } from "winston"
import chalk from "chalk"
import * as ts from "typescript"
// Add ts-morph imports for type analysis
import { Type, ObjectFlags, SymbolFlags } from "ts-morph"

// Helper function to get node kind name
function getNodeKindName(node: ts.Node): string {
  return ts.SyntaxKind[node.kind] || "Unknown"
}

// Helper function to get node name if available
function getNodeName(node: ts.Node): string {
  if ((node as any).name) {
    const name = (node as any).name
    if (typeof name === 'string') return name
    if (name && typeof name === 'object' && 'text' in name) return name.text
    if (name && typeof name === 'object' && 'escapedText' in name) return name.escapedText
  }
  return ""
}

// Helper function to format node flags (simplified to avoid version-specific issues)
function formatNodeFlags(flags: ts.NodeFlags): string {
  const flagNames: string[] = []
  
  // Only use basic flags that are guaranteed to exist
  if (flags & ts.NodeFlags.Let) flagNames.push("Let")
  if (flags & ts.NodeFlags.Const) flagNames.push("Const")
  
  // Convert the rest as a numeric value for now
  if (flags > 0 && flagNames.length === 0) {
    flagNames.push(`Flags(${flags})`)
  }
  
  return flagNames.length > 0 ? flagNames.join(" | ") : "None"
}

// Helper function to format modifier flags
function formatModifierFlags(modifiers?: ts.NodeArray<ts.ModifierLike>): string {
  if (!modifiers || modifiers.length === 0) return "None"
  
  const flagNames: string[] = []
  
  modifiers.forEach(modifier => {
    switch (modifier.kind) {
      case ts.SyntaxKind.PublicKeyword: flagNames.push("Public"); break
      case ts.SyntaxKind.PrivateKeyword: flagNames.push("Private"); break
      case ts.SyntaxKind.ProtectedKeyword: flagNames.push("Protected"); break
      case ts.SyntaxKind.StaticKeyword: flagNames.push("Static"); break
      case ts.SyntaxKind.ReadonlyKeyword: flagNames.push("Readonly"); break
      case ts.SyntaxKind.AbstractKeyword: flagNames.push("Abstract"); break
      case ts.SyntaxKind.AsyncKeyword: flagNames.push("Async"); break
      case ts.SyntaxKind.ExportKeyword: flagNames.push("Export"); break
      case ts.SyntaxKind.DefaultKeyword: flagNames.push("Default"); break
      case ts.SyntaxKind.DeclareKeyword: flagNames.push("Declare"); break
      case ts.SyntaxKind.ConstKeyword: flagNames.push("Const"); break
      case ts.SyntaxKind.OverrideKeyword: flagNames.push("Override"); break
      default: flagNames.push(ts.SyntaxKind[modifier.kind] || "Unknown")
    }
  })
  
  return flagNames.length > 0 ? flagNames.join(" | ") : "None"
}

// Helper function to format type flags
function formatTypeFlags(flags: ts.TypeFlags): string {
  const flagNames: string[] = []
  
  if (flags & ts.TypeFlags.Any) flagNames.push("Any")
  if (flags & ts.TypeFlags.Unknown) flagNames.push("Unknown")
  if (flags & ts.TypeFlags.String) flagNames.push("String")
  if (flags & ts.TypeFlags.Number) flagNames.push("Number")
  if (flags & ts.TypeFlags.Boolean) flagNames.push("Boolean")
  if (flags & ts.TypeFlags.Enum) flagNames.push("Enum")
  if (flags & ts.TypeFlags.BigInt) flagNames.push("BigInt")
  if (flags & ts.TypeFlags.StringLiteral) flagNames.push("StringLiteral")
  if (flags & ts.TypeFlags.NumberLiteral) flagNames.push("NumberLiteral")
  if (flags & ts.TypeFlags.BooleanLiteral) flagNames.push("BooleanLiteral")
  if (flags & ts.TypeFlags.EnumLiteral) flagNames.push("EnumLiteral")
  if (flags & ts.TypeFlags.BigIntLiteral) flagNames.push("BigIntLiteral")
  if (flags & ts.TypeFlags.ESSymbol) flagNames.push("ESSymbol")
  if (flags & ts.TypeFlags.UniqueESSymbol) flagNames.push("UniqueESSymbol")
  if (flags & ts.TypeFlags.Void) flagNames.push("Void")
  if (flags & ts.TypeFlags.Undefined) flagNames.push("Undefined")
  if (flags & ts.TypeFlags.Null) flagNames.push("Null")
  if (flags & ts.TypeFlags.Never) flagNames.push("Never")
  if (flags & ts.TypeFlags.TypeParameter) flagNames.push("TypeParameter")
  if (flags & ts.TypeFlags.Object) flagNames.push("Object")
  if (flags & ts.TypeFlags.Union) flagNames.push("Union")
  if (flags & ts.TypeFlags.Intersection) flagNames.push("Intersection")
  if (flags & ts.TypeFlags.Index) flagNames.push("Index")
  if (flags & ts.TypeFlags.IndexedAccess) flagNames.push("IndexedAccess")
  if (flags & ts.TypeFlags.Conditional) flagNames.push("Conditional")
  if (flags & ts.TypeFlags.Substitution) flagNames.push("Substitution")
  if (flags & ts.TypeFlags.NonPrimitive) flagNames.push("NonPrimitive")
  
  return flagNames.length > 0 ? flagNames.join(" | ") : "None"
}

// Helper function to format symbol flags
function formatSymbolFlags(flags: ts.SymbolFlags): string {
  const flagNames: string[] = []
  
  if (flags & ts.SymbolFlags.None) flagNames.push("None")
  if (flags & ts.SymbolFlags.FunctionScopedVariable) flagNames.push("FunctionScopedVariable")
  if (flags & ts.SymbolFlags.BlockScopedVariable) flagNames.push("BlockScopedVariable")
  if (flags & ts.SymbolFlags.Property) flagNames.push("Property")
  if (flags & ts.SymbolFlags.EnumMember) flagNames.push("EnumMember")
  if (flags & ts.SymbolFlags.Function) flagNames.push("Function")
  if (flags & ts.SymbolFlags.Class) flagNames.push("Class")
  if (flags & ts.SymbolFlags.Interface) flagNames.push("Interface")
  if (flags & ts.SymbolFlags.ConstEnum) flagNames.push("ConstEnum")
  if (flags & ts.SymbolFlags.RegularEnum) flagNames.push("RegularEnum")
  if (flags & ts.SymbolFlags.ValueModule) flagNames.push("ValueModule")
  if (flags & ts.SymbolFlags.NamespaceModule) flagNames.push("NamespaceModule")
  if (flags & ts.SymbolFlags.TypeLiteral) flagNames.push("TypeLiteral")
  if (flags & ts.SymbolFlags.ObjectLiteral) flagNames.push("ObjectLiteral")
  if (flags & ts.SymbolFlags.Method) flagNames.push("Method")
  if (flags & ts.SymbolFlags.Constructor) flagNames.push("Constructor")
  if (flags & ts.SymbolFlags.GetAccessor) flagNames.push("GetAccessor")
  if (flags & ts.SymbolFlags.SetAccessor) flagNames.push("SetAccessor")
  if (flags & ts.SymbolFlags.Signature) flagNames.push("Signature")
  if (flags & ts.SymbolFlags.TypeParameter) flagNames.push("TypeParameter")
  if (flags & ts.SymbolFlags.TypeAlias) flagNames.push("TypeAlias")
  if (flags & ts.SymbolFlags.ExportValue) flagNames.push("ExportValue")
  if (flags & ts.SymbolFlags.Alias) flagNames.push("Alias")
  if (flags & ts.SymbolFlags.Prototype) flagNames.push("Prototype")
  if (flags & ts.SymbolFlags.ExportStar) flagNames.push("ExportStar")
  if (flags & ts.SymbolFlags.Optional) flagNames.push("Optional")
  if (flags & ts.SymbolFlags.Transient) flagNames.push("Transient")
  
  return flagNames.length > 0 ? flagNames.join(" | ") : "None"
}

// Helper function to highlight text within source code
function highlightInSource(fullText: string, highlightText: string): string {
  if (!fullText || !highlightText) return fullText || ""
  
  // Find the text to highlight and wrap it in bold yellow
  const highlighted = fullText.replace(
    new RegExp(highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    chalk.bold(chalk.yellow(highlightText))
  )
  
  return highlighted
}

// Helper function to create tree structure with proper indentation
function createTreePrefix(depth: number, isLast: boolean = false): string {
  if (depth === 0) return "• "
  
  const spaces = "  ".repeat(depth - 1)
  const connector = isLast ? "└─ " : "├─ "
  return spaces + connector
}

// Helper function to create indentation for source code
function createSourceIndentation(depth: number): string {
  return "  ".repeat(depth + 1)
}

// Helper function to get position information from a node
function getNodePosition(node: ts.Node, sourceFile?: ts.SourceFile): { line: number; column: number } | null {
  if (!sourceFile || !node) return null
  
  try {
    if (typeof node.getStart === 'function') {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      return { line: line + 1, column: character + 1 }
    }
  } catch (error) {
    // Position extraction failed, that's okay
  }
  
  return null
}

// Type analysis functions moved from parser
function findTypeFlags(type: Type) {
  const keys = [
    "isAnonymous",
    "isAny",
    "isNever",
    "isArray",
    "isReadonlyArray", 
    "isTemplateLiteral",
    "isBoolean",
    "isString",
    "isNumber",
    "isLiteral",
    "isBooleanLiteral",
    "isEnumLiteral",
    "isNumberLiteral",
    "isStringLiteral",
    "isClass",
    "isClassOrInterface",
    "isEnum",
    "isInterface",
    "isObject",
    "isTypeParameter",
    "isTuple",
    "isUnion",
    "isIntersection",
    "isUnionOrIntersection",
    "isUnknown",
    "isNull",
    "isUndefined",
    "isVoid",
  ] as const
  return keys
    .filter((key) => type[key]())
    .reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<(typeof keys)[number], boolean>>,
    )
}

function isTypeReference(type: Type): boolean {
  return (type.getObjectFlags() & ObjectFlags.Reference) !== 0
}

function extractTypeAnalysis(type: Type, apparentType?: Type, symbol?: any, node?: any, typeChecker?: any) {
  const analysis: any = {
    typeText: type.getText(),
    typeFlags: findTypeFlags(type),
    isTypeReference: isTypeReference(type),
    flags: type.getFlags(),
    objectFlags: type.getObjectFlags(),
  }

  if (apparentType) {
    analysis.apparentTypeText = apparentType.getText()
    analysis.apparentTypeFlags = findTypeFlags(apparentType)
    analysis.apparentTypeObjectFlags = apparentType.getObjectFlags()
  }

  if (symbol) {
    analysis.symbolFlags = symbol.getFlags()
    analysis.hasTypeAliasExcludes = (symbol.getFlags() & SymbolFlags.TypeAliasExcludes) !== 0
    
    // Add value declaration information if available
    const valueDeclaration = symbol.getValueDeclaration?.()
    if (valueDeclaration) {
      analysis.valueDeclaration = valueDeclaration.getText()
    }
  }

  // Add alias information
  const aliasSymbol = type.getAliasSymbol()
  if (aliasSymbol) {
    analysis.aliasSymbol = aliasSymbol.getEscapedName()
  }

  const apparentTypeAliasSymbol = apparentType?.getAliasSymbol()
  if (apparentTypeAliasSymbol) {
    analysis.apparentTypeAliasSymbol = apparentTypeAliasSymbol.getEscapedName()
  }

  const apparentTypeSymbol = apparentType?.getSymbol()
  if (apparentTypeSymbol) {
    analysis.apparentTypeSymbol = apparentTypeSymbol.getEscapedName()
  }

  if (typeChecker && symbol && node) {
    const typeAtLocation = symbol.getTypeAtLocation(node)
    if (typeAtLocation) {
      analysis.typeAtLocation = typeAtLocation.getText()
    }

    const aliasedSymbol = typeChecker.getAliasedSymbol(symbol)
    if (aliasedSymbol) {
      analysis.aliasedSymbol = aliasedSymbol.getEscapedName()
    }
  }

  const targetType = type.getTargetType()
  if (targetType) {
    analysis.targetTypeObjectFlags = targetType.getObjectFlags()
  }

  return analysis
}

// Main function to extract node information
function extractNodeInfo(node: ts.Node, typeChecker?: ts.TypeChecker, sourceFile?: ts.SourceFile) {
  // Safety check for valid TypeScript nodes
  if (!node || typeof node !== 'object') {
    return {
      nodeKind: "Invalid",
      nodeName: "",
      nodeFlags: "None",
      modifierFlags: "None",
      typeInfo: "Unknown",
      typeFlags: "None",
      symbolFlags: "None",
      nodeText: "",
      fullText: "",
      position: null
    }
  }

  const nodeKind = getNodeKindName(node)
  const nodeName = getNodeName(node)
  const nodeFlags = formatNodeFlags(node.flags || 0)
  
  // Get modifier information if available
  const modifiers = (node as any).modifiers
  const modifierFlags = formatModifierFlags(modifiers)
  
  // Get type information if type checker is available
  let typeInfo = "Unknown"
  let typeFlags = "None"
  let symbolFlags = "None"
  
  if (typeChecker) {
    try {
      const type = typeChecker.getTypeAtLocation(node)
      if (type) {
        typeInfo = typeChecker.typeToString(type)
        typeFlags = formatTypeFlags(type.flags)
        
        if (type.symbol) {
          symbolFlags = formatSymbolFlags(type.symbol.flags)
        }
      }
    } catch (error) {
      // Type checking might fail for some nodes, that's okay
    }
  }
  
  // Get source text with safety check
  let nodeText = ""
  let fullText = ""
  
  try {
    if (typeof node.getText === 'function') {
      nodeText = node.getText(sourceFile)
      fullText = nodeText
    } else {
      nodeText = node.toString?.() || String(node)
      fullText = nodeText
    }
  } catch (error) {
    nodeText = String(node)
    fullText = nodeText
  }
  
  // Try to get more context from parent if available
  try {
    if (node.parent && sourceFile && typeof node.parent.getText === 'function') {
      const parentText = node.parent.getText(sourceFile)
      if (parentText.length < 500) { // Don't include massive parent contexts
        fullText = parentText
      }
    }
  } catch (error) {
    // Parent context extraction failed, that's okay
  }
  
  // Get position information
  const position = getNodePosition(node, sourceFile)
  
  return {
    nodeKind,
    nodeName,
    nodeFlags,
    modifierFlags,
    typeInfo,
    typeFlags,
    symbolFlags,
    nodeText,
    fullText,
    position
  }
}

const formatLog = format.combine(
  format.printf((logInformation) => {
    if ("node" in logInformation || "node" in logInformation.message) {
      const { 
        node, 
        depth = 0, 
        typeChecker, 
        sourceFile, 
        filePath,
        tsMorphType,
        tsMorphApparentType,
        tsMorphSymbol,
        tsMorphNode,
        tsMorphTypeChecker
      } = logInformation.node ? logInformation : logInformation.message
      
      if (!node) return "No node provided"
      
      const info = extractNodeInfo(node, typeChecker, sourceFile)
      const message = typeof logInformation.message !== "string" ? "" : logInformation.message
      const lines: string[] = []

      // Main node header
      const nodeHeader = `${info.nodeKind}${info.nodeName ? `: ${info.nodeName}` : ""}`
      const locationInfo = info.position && (filePath || sourceFile?.fileName) 
        ? ` (${filePath || sourceFile?.fileName}:${info.position.line}:${info.position.column})` 
        : ""
      lines.push(chalk.cyan(createTreePrefix(depth) + nodeHeader + chalk.dim(locationInfo)))

      // Metadata with aligned labels
      const indent = createTreePrefix(depth + 1, false)
      const lastIndent = createTreePrefix(depth + 1, true)

      // Show type information
      if (info.typeInfo !== "Unknown") {
        lines.push(chalk.green(indent + "Type       : ") + info.typeInfo)
      }
      
      if (info.nodeFlags !== "None") {
        lines.push(chalk.green(indent + "NodeFlags  : ") + info.nodeFlags)
      }
      
      if (info.modifierFlags !== "None") {
        lines.push(chalk.green(indent + "Modifiers  : ") + info.modifierFlags)
      }
      
      if (info.typeFlags !== "None") {
        lines.push(chalk.green(indent + "TypeFlags  : ") + info.typeFlags)
      }
      
      if (info.symbolFlags !== "None") {
        lines.push(chalk.green(indent + "SymbolFlags: ") + info.symbolFlags)
      }

      // Add ts-morph type analysis if available (flattened, no "TypeAnalysis:" header)
      let typeAnalysisLines: string[] = []
      
      if (tsMorphType) {
        const typeAnalysis = extractTypeAnalysis(
          tsMorphType, 
          tsMorphApparentType, 
          tsMorphSymbol, 
          tsMorphNode, 
          tsMorphTypeChecker
        )
        
        if (typeAnalysis.typeText) {
          typeAnalysisLines.push(chalk.blue(indent + "TypeText     : ") + typeAnalysis.typeText)
        }
        
        if (typeAnalysis.apparentTypeText) {
          typeAnalysisLines.push(chalk.blue(indent + "ApparentType : ") + typeAnalysis.apparentTypeText)
        }
        
        if (Object.keys(typeAnalysis.typeFlags).length > 0) {
          typeAnalysisLines.push(chalk.blue(indent + "TypeFlags    : ") + Object.keys(typeAnalysis.typeFlags).join(", "))
        }
        
        if (typeAnalysis.apparentTypeFlags && Object.keys(typeAnalysis.apparentTypeFlags).length > 0) {
          typeAnalysisLines.push(chalk.blue(indent + "ApparentFlags: ") + Object.keys(typeAnalysis.apparentTypeFlags).join(", "))
        }
        
        if (typeAnalysis.aliasSymbol) {
          typeAnalysisLines.push(chalk.blue(indent + "AliasSymbol  : ") + typeAnalysis.aliasSymbol)
        }
        
        if (typeAnalysis.isTypeReference) {
          typeAnalysisLines.push(chalk.blue(indent + "IsReference  : ") + "true")
        }

        if (typeAnalysis.valueDeclaration) {
          typeAnalysisLines.push(chalk.blue(indent + "ValueDeclaration: ") + typeAnalysis.valueDeclaration)
        }

        if (typeAnalysis.objectFlags) {
          typeAnalysisLines.push(chalk.blue(indent + "ObjectFlags  : ") + typeAnalysis.objectFlags)
        }
        
        // Add all type analysis lines to the main lines array
        lines.push(...typeAnalysisLines)
      }

      // Source code with highlighting (always last, so use └─)
      if (info.fullText) {
        const highlightedSource = info.nodeText && info.fullText !== info.nodeText
          ? highlightInSource(info.fullText, info.nodeText)
          : chalk.bold(chalk.yellow(info.fullText))
        
        // Format source as inline markdown code block - trim and indent properly
        const trimmedSource = highlightedSource.trim()
        const indentedSource = trimmedSource.split('\n').map(line => `      ${line}`).join('\n')
        
        lines.push(chalk.green(lastIndent.replace('└─', '├─') + "Source: ") + chalk.cyan("```ts") + "\n" + indentedSource + "\n      " + chalk.cyan("```"))
      }

      // Add any custom message
      if (message) {
        lines.unshift(chalk.magenta(createTreePrefix(depth) + message))
      }

      return lines.join('\n')
    }
    
    return logInformation.message || "undefined"
  }),
)

const logger = createLogger({
  format: format.combine(format.timestamp(), formatLog),
  transports: [new transports.Console()],
})

/**
 * Universal logging function for TypeScript nodes that intelligently handles:
 * - Basic TypeScript compiler nodes
 * - TypeScript nodes with type checker context
 * - ts-morph nodes with enhanced type analysis
 * 
 * The function auto-detects ts-morph types and extracts comprehensive type information.
 */
export function logNode(
  node: ts.Node | any, // Can be either ts.Node or ts-morph Node
  options: {
    depth?: number
    typeChecker?: ts.TypeChecker
    sourceFile?: ts.SourceFile
    filePath?: string
    message?: string
    // ts-morph specific options
    tsMorphType?: Type
    includeApparentType?: boolean
  } = {}
) {
  const { 
    depth = 0, 
    typeChecker, 
    sourceFile, 
    filePath, 
    message,
    tsMorphType,
    includeApparentType = true
  } = options

  // Auto-detect if this is a ts-morph node and extract information
  let enhancedOptions: any = {
    node: node.compilerNode || node, // Use compiler node if available
    depth,
    typeChecker,
    sourceFile,
    filePath,
    message
  }

  // If we have a ts-morph type, extract comprehensive analysis
  if (tsMorphType) {
    enhancedOptions.tsMorphType = tsMorphType
    enhancedOptions.tsMorphSymbol = tsMorphType.getSymbol()
    
    if (includeApparentType) {
      enhancedOptions.tsMorphApparentType = tsMorphType.getApparentType()
    }

    // Auto-extract ts-morph node information if available
    if (node && typeof node === 'object' && 'getSourceFile' in node) {
      enhancedOptions.tsMorphNode = node
      enhancedOptions.sourceFile = node.getSourceFile()?.compilerNode
      
      const program = node.getProgram?.()
      if (program) {
        enhancedOptions.tsMorphTypeChecker = program.getTypeChecker()?.compilerObject
      }
    }
  }
  // Auto-detect ts-morph node without explicit type
  else if (node && typeof node === 'object' && 'getType' in node && typeof node.getType === 'function') {
    try {
      const detectedType = node.getType()
      enhancedOptions.tsMorphType = detectedType
      enhancedOptions.tsMorphSymbol = detectedType.getSymbol()
      enhancedOptions.tsMorphNode = node
      
      if (includeApparentType) {
        enhancedOptions.tsMorphApparentType = detectedType.getApparentType()
      }
      
      enhancedOptions.sourceFile = node.getSourceFile()?.compilerNode
      
      const program = node.getProgram?.()
      if (program) {
        enhancedOptions.tsMorphTypeChecker = program.getTypeChecker()?.compilerObject
      }
    } catch (error) {
      // Not a ts-morph node with type information, continue with basic logging
    }
  }
  
  logger.info(enhancedOptions)
}

export default logger
