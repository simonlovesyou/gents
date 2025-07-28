import { logNode } from '@gents/logger'
import {
  type InterfaceDeclaration,
  type Node,
  ObjectFlags,
  type Program,
  type Project,
  type SourceFile,
  SymbolFlags,
  type Symbol as SymbolType,
  SyntaxKind,
  type Type,
  type TypeAliasDeclaration,
  TypeFlags,
  TypeFormatFlags
} from 'ts-morph'
import type { PseudoBigInt } from 'typescript'

const getNameFromNode = (node: Node) => {
  return node.isKind(SyntaxKind.InterfaceDeclaration)
    ? node.getName()
    : node.isKind(SyntaxKind.TypeReference)
      ? node.getTypeName().getText()
      : node.isKind(SyntaxKind.TypeAliasDeclaration)
        ? node.getName()
        : 'unknown'
}

// findType and isTypeReference functions are now part of the logger package

const parsePropertySymbol = (property: SymbolType, program?: Program) => {
  const escapedName = property.getEscapedName()
  const valueDeclaration = property.getValueDeclarationOrThrow()

  if (process.env.NODE_ENV === 'test') {
    logNode(valueDeclaration, {
      message: `Parsing property "${escapedName}"`,
      depth: 3
    })
  }

  const propertyType = valueDeclaration.getType()

  return {
    type: 'objectProperty' as const,
    name: escapedName,
    // Don't pass the property node to parseType - this would incorrectly trigger alias logic
    // The property node is for the declaration "companies: Company[]", not the type "Company[]"
    // But pass it as loggingNode to get enhanced logging without affecting parsing logic
    property: parseType(propertyType, {
      program,
      loggingNode: valueDeclaration
    }),
    optional: (property.getFlags() & SymbolFlags.Optional) !== 0
  }
}

const formatFlags =
  TypeFormatFlags.UseTypeOfFunction |
  TypeFormatFlags.NoTruncation |
  TypeFormatFlags.UseFullyQualifiedType |
  TypeFormatFlags.WriteTypeArgumentsOfSignature

export type AliasEntity = {
  type: 'alias'
  alias: string
}
export type ReferenceEntity = {
  type: 'reference'
  reference: string
}

export type EmptyObjectEntity = {
  type: 'object'
  properties: []
}

export type ObjectPropertyEntity = {
  type: 'objectProperty'
  name: string
  property: Exclude<Entity, DeclarationEntity>
  optional: boolean
}

export type ObjectEntity = {
  type: 'object'
  properties: Array<ObjectPropertyEntity>
}

export type TupleElementEntity = Exclude<Entity, DeclarationEntity> & {
  optional?: boolean
}

export type ArrayEntity =
  | {
      type: 'array'
      readonly: boolean
      tuple: true
      elements: Array<TupleElementEntity>
    }
  | {
      type: 'array'
      readonly: boolean
      tuple: false
      elements: Entity
    }

export type AnonymousEntity = {
  type: 'anonymous'
}
export type AnyEntity = {
  type: 'any'
}
export type BooleanEntity = {
  type: 'boolean'
}
export type BooleanLiteralEntity = {
  type: 'booleanLiteral'
  value: boolean
}
export type NumberEntity = {
  type: 'number'
}
export type DeclarationEntity = {
  type: 'declaration'
  declaration: Exclude<Entity, DeclarationEntity>
  name: string
  exported: boolean
}
export type StringEntity = {
  type: 'string'
}
export type EnumLiteralEntity = {
  type: 'enumLiteral'
}
export type NeverEntity = {
  type: 'never'
}
export type LiteralEntity = {
  type: 'literal'
  value: null | number | string | PseudoBigInt | undefined
}
export type UnionEntity = {
  type: 'union'
  values: Array<Entity>
}
export type EnumEntity = {
  type: 'enum'
  properties: Array<{
    name: string
    property: Entity
    optional: boolean
  }>
}
export type FileEntity = {
  type: 'file'
  name: string
  path: string
  typeDeclarations: DeclarationEntity[]
}
export type UnknownEntity = {
  type: 'unknown'
}
export type UtilityEntity = {
  type: 'utility'
}
export type IntersectionEntity = {
  type: 'intersection'
}

export type Entity =
  | AliasEntity
  | AnonymousEntity
  | AnyEntity
  | ArrayEntity
  | BooleanEntity
  | BooleanLiteralEntity
  | DeclarationEntity
  | EmptyObjectEntity
  | EnumEntity
  | EnumLiteralEntity
  | FileEntity
  | IntersectionEntity
  | LiteralEntity
  | NeverEntity
  | NumberEntity
  | ObjectEntity
  | ReferenceEntity
  | StringEntity
  | UnionEntity
  | UnknownEntity
  | UtilityEntity
  | ObjectPropertyEntity

const parseType = (
  type: Type,
  context: {
    node?: Node
    program?: Program
    loggingNode?: Node // Separate node for logging that doesn't affect parsing logic
  } = {}
): Exclude<Entity, DeclarationEntity> => {
  const { node, program, loggingNode } = context
  const typeChecker = program?.getTypeChecker()
  const aliasSymbol = type.getAliasSymbol()
  const symbol = type?.getSymbol()

  if (process.env.NODE_ENV === 'test' && (node || loggingNode)) {
    // The logger now includes all type analysis: isTypeReference, flags, symbols, etc.
    const nodeToLog = loggingNode || node
    logNode(nodeToLog, {
      message: `Parsing type: ${type.getText()} (apparent: ${type.getApparentType().getText()})`,
      depth: 2,
      tsMorphType: type
    })
  }

  const typeString = symbol && node && typeChecker?.getTypeText(type, node, formatFlags)

  if (aliasSymbol && node === undefined) {
    const aliasDeclarations = aliasSymbol.getDeclarations()
    const declarations = symbol?.getDeclarations() ?? []

    const matchingDeclaration = declarations.find((declaration) =>
      aliasDeclarations.some((aliasDeclaration) => aliasDeclaration !== declaration)
    )

    if (!matchingDeclaration) {
      return {
        type: 'alias' as const,
        alias: aliasSymbol.getEscapedName()
      }
    }
  }

  if (typeString && getNameFromNode(node) !== typeString) {
    if (typeString === '{}') {
      return {
        type: 'object' as const,
        properties: []
      }
    }
    return {
      type: 'alias' as const,
      alias: typeString
    }
  }

  if (type.isTuple()) {
    if (process.env.NODE_ENV === 'test') {
      // Log tuple with type analysis - the logger will show isTuple in TypeFlags
      logNode(node, {
        message: `Processing tuple type with ${type.getTupleElements().length} elements`,
        depth: 3,
        tsMorphType: type
      })
    }

    const tupleElements = type.getTupleElements()

    // Access the TypeScript compiler type to get optional element information
    const compilerType = type.compilerType as any
    const elementFlags = compilerType.target?.elementFlags || compilerType.elementFlags

    return {
      type: 'array',
      tuple: true,
      readonly: false,
      elements: tupleElements.map((tupleElement, index) => {
        const elementEntity = parseType(tupleElement, { program })

        // Check if this element is optional
        // ElementFlags.Optional = 2 in TypeScript compiler
        const isOptional = elementFlags && elementFlags[index] === 2

        if (isOptional) {
          const { type: entityType, ...rest } = elementEntity
          return {
            type: entityType,
            optional: true,
            ...rest
          } as TupleElementEntity
        }

        return elementEntity
      })
    }
  }
  if (type.isArray()) {
    const elementType = type.getArrayElementTypeOrThrow()

    if (process.env.NODE_ENV === 'test' && (node ?? loggingNode)) {
      // Log array element details with enhanced information
      const nodeToLog = loggingNode ?? node
      logNode(nodeToLog, {
        message: `ArrayElement: ${elementType.getText()}`,
        depth: 4,
        tsMorphType: elementType
      })
    }

    return {
      type: 'array' as const,
      readonly: false,
      tuple: false,
      elements: parseType(elementType, { program })
    }
  }
  // Type reference information is automatically captured in the logger's TypeAnalysis
  if (
    ((type.getObjectFlags() & ObjectFlags.Reference) !== 0 || symbol) &&
    node === undefined &&
    symbol &&
    (symbol.getFlags() & SymbolFlags.TypeLiteral) === 0
  ) {
    const [declaration] = type.getSymbolOrThrow().getDeclarations() ?? []

    if (declaration) {
      if (process.env.NODE_ENV === 'test') {
        logNode(declaration, {
          message: 'Found type reference declaration',
          depth: 3
        })
      }
      return {
        type: 'reference' as const,
        reference: getNameFromNode(declaration)
      }
    }
  }
  if (type.isObject()) {
    return {
      type: 'object' as const,
      properties: type.getProperties().map((property) => parsePropertySymbol(property, program))
      // apparentProperties: type.getApparentProperties().map(parsePropertySymbol),
    }
  }

  if (symbol) {
    const [declaration] = symbol.getDeclarations()

    if (node === undefined && declaration) {
      return {
        type: 'reference',
        reference: getNameFromNode(declaration)
      }
    }
  }

  if (type.isAnonymous()) {
    return {
      type: 'anonymous' as const
    }
  }
  if (type.isAny()) {
    return {
      type: 'any' as const
    }
  }

  if (type.isBoolean()) {
    return {
      type: 'boolean' as const
    }
  }
  if (type.isBooleanLiteral()) {
    const value = type.getText()

    return {
      type: 'booleanLiteral' as const,
      value: value === 'true'
    }
  }

  if (type.isEnum()) {
    return {
      type: 'enum' as const,
      properties: type
        .getApparentProperties()
        .map((property) => parsePropertySymbol(property, program))
    }
  }

  if (type.isEnumLiteral()) {
    return {
      type: 'enumLiteral' as const
    }
  }

  if (type.isInterface()) {
    const properties = type.getProperties()

    return {
      type: 'object' as const,
      properties: properties.map((property) => parsePropertySymbol(property, program))
    }
  }

  if (type.isLiteral()) {
    return {
      type: 'literal' as const,
      value: type.getLiteralValueOrThrow()
    }
  }

  if (type.isNever()) {
    return {
      type: 'never' as const
    }
  }

  if (type.isNull()) {
    return {
      type: 'literal' as const,
      value: null
    }
  }

  if (type.isNumber()) {
    return {
      type: 'number' as const
    }
  }

  if (type.isNumberLiteral()) {
    return {
      type: 'literal' as const,
      value: type.getLiteralValueOrThrow()
    }
  }

  if (type.isReadonlyArray()) {
    // @ts-expect-error asdöfn asökdfjn a
    return {
      type: 'array' as const,
      readonly: true,
      tuple: type.isTuple(),
      elements: []
    }
  }

  if (type.isString()) {
    return {
      type: 'string' as const
    }
  }

  if (type.isStringLiteral()) {
    return {
      type: 'literal' as const,
      value: type.getLiteralValueOrThrow()
    }
  }

  if (type.isTemplateLiteral()) {
    return {
      type: 'literal' as const,
      value: type.getLiteralValue()
    }
  }

  if ((type.getFlags() & TypeFlags.Instantiable) !== 0) {
    return {
      type: 'utility' as const
    }
  }

  if (type.isUndefined()) {
    return {
      type: 'literal' as const,
      value: undefined
    }
  }

  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes()
    return {
      type: 'union' as const,
      values: unionTypes.map((unionType) => parseType(unionType, { program }))
    }
  }

  if (type.isIntersection()) {
    return {
      type: 'intersection' as const
    }
  }

  throw new TypeError('Not implemented this yet.')
}

const parseTypeDeclaration = (
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
  program: Program
): DeclarationEntity => {
  const type = typeDeclaration.getType()
  const exportKeyword = typeDeclaration.getExportKeyword()

  if (process.env.NODE_ENV === 'test') {
    // The new logNode auto-detects ts-morph nodes and includes comprehensive analysis
    logNode(typeDeclaration, {
      depth: 1,
      tsMorphType: type
    })
  }

  if (typeDeclaration.isKind(SyntaxKind.InterfaceDeclaration)) {
    return {
      type: 'declaration',
      name: typeDeclaration.getName(),
      declaration: parseType(type, { node: typeDeclaration, program }),
      exported: Boolean(exportKeyword)
    }
  }

  return {
    type: 'declaration',
    name: typeDeclaration.getName(),
    declaration: parseType(type, { node: typeDeclaration, program }),
    exported: Boolean(exportKeyword)
  }
}

const parseSourceFile = (sourceFile: SourceFile, program: Program) => {
  const typeDeclarations = sourceFile
    .getStatements()
    .filter((statement): statement is TypeAliasDeclaration | InterfaceDeclaration =>
      Boolean(
        statement.asKind(SyntaxKind.TypeAliasDeclaration) ||
          statement.asKind(SyntaxKind.InterfaceDeclaration)
      )
    )

  if (process.env.NODE_ENV === 'test') {
    // Log file processing as a structured message
    logNode(sourceFile, {
      message: `📄 Processing source file with ${typeDeclarations.length} type declarations`,
      depth: 1
    })
  }

  return {
    type: 'file' as const,
    name: sourceFile.getBaseName(),
    path: sourceFile.getFilePath() as string,
    typeDeclarations: typeDeclarations.map((declaration) =>
      parseTypeDeclaration(declaration, program)
    )
  }
}

export function parse(project: Project) {
  const sourceFiles = project.getSourceFiles()
  const program = project.getProgram()

  if (process.env.NODE_ENV === 'test') {
    // Debug log: Print the TypeScript compiler program options
    const compilerProgram = program.compilerObject
    logNode(compilerProgram, {
      depth: 0,
      message: '🔧 TypeScript Compiler Program Options'
    })
  }

  const filteredSourceFiles = sourceFiles

  if (process.env.NODE_ENV === 'test') {
    // Log parsing overview as a structured message
    // Note: We can't use logNode here since there's no specific node, but we could enhance
    // the logger to support general structured logging if needed
    console.log(
      `🚀 Starting TypeScript AST parsing: ${filteredSourceFiles.length}/${sourceFiles.length} files`
    )
  }

  const result = filteredSourceFiles.map((sourceFile) => parseSourceFile(sourceFile, program))

  if (process.env.NODE_ENV === 'test') {
    console.log(JSON.stringify({ result }, null, 2))
  }

  return result
}
