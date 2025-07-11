import {
  InterfaceDeclaration,
  Node,
  ObjectFlags,
  Program,
  Project,
  SourceFile,
  Symbol,
  SymbolFlags,
  SyntaxKind,
  ts,
  Type,
  TypeAliasDeclaration,
  TypeFlags,
  TypeFormatFlags,
} from "ts-morph"
import { PseudoBigInt } from "typescript"
import { logNode } from "@gents/logger"

const getNameFromNode = (node: Node) => {
  return node.isKind(SyntaxKind.InterfaceDeclaration)
    ? node.getName()
    : node.isKind(SyntaxKind.TypeReference)
      ? node.getTypeName().getText()
      : node.isKind(SyntaxKind.TypeAliasDeclaration)
        ? node.getName()
        : "unknown"
}

// findType and isTypeReference functions are now part of the logger package

const parsePropertySymbol = (property: Symbol) => {
  const escapedName = property.getEscapedName()
  
  if (process.env.NODE_ENV === "test") {
    const valueDeclaration = property.getValueDeclarationOrThrow()
    logNode(valueDeclaration, {
      message: `Parsing property "${escapedName}"`,
      depth: 2
    })
  }

  const propertyType = property.getValueDeclarationOrThrow().getType()

  return {
    type: "objectProperty" as const,
    name: escapedName,
    property: parseType(propertyType),
    optional: (property.getFlags() & SymbolFlags.Optional) !== 0,
  }
}

const formatFlags =
  TypeFormatFlags.UseTypeOfFunction |
  TypeFormatFlags.NoTruncation |
  TypeFormatFlags.UseFullyQualifiedType |
  TypeFormatFlags.WriteTypeArgumentsOfSignature

export type AliasEntity = {
  type: "alias"
  alias: string
}
export type ReferenceEntity = {
  type: "reference"
  reference: string
}

export type EmptyObjectEntity = {
  type: "object"
  properties: []
}

export type ObjectPropertyEntity = {
  type: "objectProperty"
  name: string
  property: Exclude<Entity, DeclarationEntity>
  optional: boolean
}

export type ObjectEntity = {
  type: "object"
  properties: Array<ObjectPropertyEntity>
}

export type ArrayEntity =
  | {
      type: "array"
      readonly: boolean
      tuple: true
      elements: Array<Entity>
    }
  | {
      type: "array"
      readonly: boolean
      tuple: false
      elements: Entity
    }

export type AnonymousEntity = {
  type: "anonymous"
}
export type AnyEntity = {
  type: "any"
}
export type BooleanEntity = {
  type: "boolean"
}
export type BooleanLiteralEntity = {
  type: "booleanLiteral"
  value: boolean
}
export type NumberEntity = {
  type: "number"
}
export type DeclarationEntity = {
  type: "declaration"
  declaration: Exclude<Entity, DeclarationEntity>
  name: string
  exported: boolean
}
export type StringEntity = {
  type: "string"
}
export type EnumLiteralEntity = {
  type: "enumLiteral"
}
export type NeverEntity = {
  type: "never"
}
export type LiteralEntity = {
  type: "literal"
  value: null | number | string | PseudoBigInt | undefined
}
export type UnionEntity = {
  type: "union"
  values: Array<Entity>
}
export type EnumEntity = {
  type: "enum"
  properties: Array<{
    name: string
    property: Entity
    optional: boolean
  }>
}
export type FileEntity = {
  type: "file"
  name: string
  path: string
  typeDeclarations: DeclarationEntity[]
}
export type UnknownEntity = {
  type: "unknown"
}
export type UtilityEntity = {
  type: "utility"
}
export type IntersectionEntity = {
  type: "intersection"
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
  node?: Node,
  program?: Program,
): Exclude<Entity, DeclarationEntity> => {
  const typeChecker = program?.getTypeChecker()
  const aliasSymbol = type.getAliasSymbol()
  const symbol = type?.getSymbol()

  if (process.env.NODE_ENV === "test" && node) {
    // The logger now includes all type analysis: isTypeReference, flags, symbols, etc.
    logNode(node, {
      depth: 1,
      tsMorphType: type
    })
  }

  const typeString =
    symbol && node && typeChecker?.getTypeText(type, node, formatFlags)

  if (aliasSymbol && node === undefined) {
    const aliasDeclarations = aliasSymbol.getDeclarations()
    const declarations = symbol?.getDeclarations() ?? []

    // console.log({ aliasDeclarations, typeDeclaration, rest })

    const matchingDeclaration = declarations.find((declaration) =>
      aliasDeclarations.some(
        (aliasDeclaration) => aliasDeclaration !== declaration,
      ),
    )

    if (!matchingDeclaration) {
      return {
        type: "alias" as const,
        alias: aliasSymbol.getEscapedName(),
      }
    }
  }

  if (typeString && getNameFromNode(node) !== typeString) {
    if (typeString === "{}") {
      return {
        type: "object" as const,
        properties: [],
      }
    }
    return {
      type: "alias" as const,
      alias: typeString,
    }
  }

  if (type.isTuple()) {
    if (process.env.NODE_ENV === "test") {
      // Log tuple with type analysis - the logger will show isTuple in TypeFlags
      logNode(node, {
        message: `Processing tuple type with ${type.getTupleElements().length} elements`,
        depth: 2,
        tsMorphType: type
      })
    }

    return {
      type: "array",
      tuple: true,
      readonly: false,
      elements: type
        .getTupleElements()
        .map((tupleElement) => parseType(tupleElement)),
    }
  }
  if (type.isArray()) {
    return {
      type: "array" as const,
      readonly: false,
      tuple: false,
      elements: parseType(type.getArrayElementTypeOrThrow()),
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
      if (process.env.NODE_ENV === "test") {
        logNode(declaration, {
          message: "Found type reference declaration",
          depth: 2
        })
      }
      return {
        type: "reference" as const,
        reference: getNameFromNode(declaration),
      }
    }
  }
  if (type.isObject()) {
    return {
      type: "object" as const,
      properties: type.getProperties().map(parsePropertySymbol),
      // apparentProperties: type.getApparentProperties().map(parsePropertySymbol),
    }
  }

  if (symbol) {
    const [declaration, ...rest] = symbol.getDeclarations()

    if (node === undefined && declaration) {
      return {
        type: "reference",
        reference: getNameFromNode(declaration),
      }
    }
  }

  if (type.isAnonymous()) {
    return {
      type: "anonymous" as const,
    }
  }
  if (type.isAny()) {
    return {
      type: "any" as const,
    }
  }

  if (type.isBoolean()) {
    return {
      type: "boolean" as const,
    }
  }
  if (type.isBooleanLiteral()) {
    const value = type.getText()

    return {
      type: "booleanLiteral" as const,
      value: value === "true",
    }
  }

  if (type.isEnum()) {
    return {
      type: "enum" as const,
      properties: type.getApparentProperties().map(parsePropertySymbol),
    }
  }

  if (type.isEnumLiteral()) {
    return {
      type: "enumLiteral" as const,
    }
  }

  if (type.isInterface()) {
    const properties = type.getProperties()

    return {
      type: "object" as const,
      properties: properties.map(parsePropertySymbol),
    }
  }

  if (type.isLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValueOrThrow(),
    }
  }

  if (type.isNever()) {
    return {
      type: "never" as const,
    }
  }

  if (type.isNull()) {
    return {
      type: "literal" as const,
      value: null,
    }
  }

  if (type.isNumber()) {
    return {
      type: "number" as const,
    }
  }

  if (type.isNumberLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValueOrThrow(),
    }
  }

  if (type.isReadonlyArray()) {
    // @ts-expect-error asdöfn asökdfjn a
    return {
      type: "array" as const,
      readonly: true,
      tuple: type.isTuple(),
      elements: [],
    }
  }

  if (type.isString()) {
    return {
      type: "string" as const,
    }
  }

  if (type.isStringLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValueOrThrow(),
    }
  }

  if (type.isTemplateLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValue(),
    }
  }

  if ((type.getFlags() & TypeFlags.Instantiable) !== 0) {
    return {
      type: "utility" as const,
    }
  }

  // if (type.isTypeParameter()) {
  //   return type.getText();
  // }

  if (type.isUndefined()) {
    return {
      type: "literal" as const,
      value: undefined,
    }
  }

  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes()
    return {
      type: "union" as const,
      values: unionTypes.map((type) => parseType(type)),
    }
  }

  if (type.isIntersection()) {
    return {
      type: "intersection" as const,
    }
  }

  throw new TypeError("Not implemented this yet.")
}

const parseTypeDeclaration = (
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
  program: Program,
): DeclarationEntity => {
  const type = typeDeclaration.getType()
  const exportKeyword = typeDeclaration.getExportKeyword()

  if (process.env.NODE_ENV === "test") {
    // The new logNode auto-detects ts-morph nodes and includes comprehensive analysis
    logNode(typeDeclaration, {
      depth: 0,
      tsMorphType: type
    })
  }

  if (typeDeclaration.isKind(SyntaxKind.InterfaceDeclaration)) {
    return {
      type: "declaration",
      name: typeDeclaration.getName(),
      declaration: parseType(type, typeDeclaration, program),
      exported: Boolean(exportKeyword),
    }
  }

  return {
    type: "declaration",
    name: typeDeclaration.getName(),
    declaration: parseType(type, typeDeclaration, program),
    exported: Boolean(exportKeyword),
  }
}

const parseSourceFile = (sourceFile: SourceFile, program: Program) => {
  const typeDeclarations = sourceFile
    .getStatements()
    .filter(
      (statement): statement is TypeAliasDeclaration | InterfaceDeclaration =>
        Boolean(
          statement.asKind(SyntaxKind.TypeAliasDeclaration) ||
            statement.asKind(SyntaxKind.InterfaceDeclaration),
        ),
    )

  if (process.env.NODE_ENV === "test") {
    // Log file processing as a structured message
    logNode(sourceFile, {
      message: `📄 Processing source file with ${typeDeclarations.length} type declarations`,
      depth: 0
    })
  }

  return {
    type: "file" as const,
    name: sourceFile.getBaseName(),
    path: sourceFile.getFilePath() as string,
    typeDeclarations: typeDeclarations.map((declaration) =>
      parseTypeDeclaration(declaration, program),
    ),
  }
}

export function parse(project: Project) {
  const sourceFiles = project.getSourceFiles()
  const program = project.getProgram()

  const filteredSourceFiles = sourceFiles.filter((sourceFile) =>
    process.env.NODE_ENV !== "test"
      ? sourceFile.getFilePath().includes("generated/review-management.ts")
      : true,
  )

  if (process.env.NODE_ENV === "test") {
    // Log parsing overview as a structured message
    // Note: We can't use logNode here since there's no specific node, but we could enhance 
    // the logger to support general structured logging if needed
    console.log(`🚀 Starting TypeScript AST parsing: ${filteredSourceFiles.length}/${sourceFiles.length} files`)
  }

  return filteredSourceFiles.map((sourceFile) => parseSourceFile(sourceFile, program))
}

if (process.env.NODE_ENV !== "test") {
  const project = new Project({
    tsConfigFilePath: "/Users/simon.johansson/repos/product-web/tsconfig.json",
  })

  console.log(JSON.stringify(parse(project), null, 2))
  // // codegen(project);
}
