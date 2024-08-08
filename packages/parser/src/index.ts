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

const getNameFromNode = (node: Node) => {
  return node.isKind(SyntaxKind.InterfaceDeclaration)
    ? node.getName()
    : node.isKind(SyntaxKind.TypeReference)
    ? node.getTypeName().getText()
    : node.isKind(SyntaxKind.TypeAliasDeclaration)
    ? node.getName()
    : "unknown"
}

const findType = (type: Type) => {
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
      {} as Partial<Record<(typeof keys)[number], boolean>>
    )
}

const isTypeReference = (type: Type) =>
  (type.getObjectFlags() & ObjectFlags.Reference) !== 0

const parsePropertySymbol = (property: Symbol) => {
  const escapedName = property.getEscapedName()
  console.log(`Parsing property "${escapedName}"`)

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
  program?: Program
): Exclude<Entity, DeclarationEntity> => {
  const typeChecker = program?.getTypeChecker()
  const aliasSymbol = type.getAliasSymbol()
  const symbol = type?.getSymbol()
  const typeAtLocation = node && symbol && symbol.getTypeAtLocation(node)
  const apparentType = type.getApparentType()
  const apparentTypeAliasSymbol = type.getApparentType().getAliasSymbol()
  const apparentTypeSymbol = type.getApparentType().getSymbol()
  const aliasedSymbol = symbol && typeChecker?.getAliasedSymbol(symbol)

  process.env.NODE_ENV === "test" &&
    console.log("=====================================================")
  process.env.NODE_ENV === "test" &&
    console.log(`Parsing type with text: "${type.getText()}"`)
  process.env.NODE_ENV === "test" &&
    console.log(`Parsing with apparenty type: "${apparentType.getText()}"`)
  process.env.NODE_ENV === "test" &&
    node &&
    console.log(`Parsing node: "${node.getFullText()}"`)

  process.env.NODE_ENV === "test" &&
    console.log({
      apparent: findType(apparentType),
      type: findType(type),
      kindName: node?.getKindName(),
      aliasSymbol,
      typeAtLocation: typeAtLocation?.getText(),
      aliasedSymbol,
      apparentTypeAliasSymbol,
      apparentTypeSymbol,
      targetTypeObjectFlags: type.getTargetType()?.getObjectFlags(),
      apparentTypeObjectFlags: apparentType.getObjectFlags(),
      symbol,
      node,
      flags: type.getFlags(),
      objectFlags: type.getObjectFlags(),
    })

  const typeString =
    symbol && node && typeChecker?.getTypeText(type, node, formatFlags)

  if (aliasSymbol && node === undefined) {
    const aliasDeclarations = aliasSymbol.getDeclarations()
    const declarations = symbol?.getDeclarations() ?? []

    // console.log({ aliasDeclarations, typeDeclaration, rest })

    const matchingDeclaration = declarations.find((declaration) =>
      aliasDeclarations.some(
        (aliasDeclaration) => aliasDeclaration !== declaration
      )
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
    const tupleIndexes = type.getTupleElements().map((_, index) => `${index}`)

    process.env.NODE_ENV === "test" &&
      console.log(
        type.getTargetTypeOrThrow().getFlags(),
        type.getTargetTypeOrThrow().getObjectFlags(),
        type.compilerType
          .getProperties()
          .filter((property) =>
            tupleIndexes.includes(property.escapedName as string)
          )
          .map(
            (typeSymbol) => (typeSymbol.getFlags() & SymbolFlags.Optional) !== 0
          )
      )

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
  console.log(
    "Is type reference ",
    isTypeReference(type),
    symbol,
    symbol && symbol.getFlags() & SymbolFlags.TypeAliasExcludes
  )
  if ((isTypeReference(type) || symbol) && node === undefined) {
    const [declaration] = type.getSymbolOrThrow().getDeclarations() ?? []

    if (declaration) {
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

  if (type.isUnknown()) {
    return {
      type: "unknown" as const,
    }
  }

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
  program: Program
): DeclarationEntity => {
  const type = typeDeclaration.getType()

  const exportKeyword = typeDeclaration.getExportKeyword()

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
            statement.asKind(SyntaxKind.InterfaceDeclaration)
        )
    )

  return {
    type: "file" as const,
    name: sourceFile.getBaseName(),
    path: sourceFile.getFilePath() as string,
    typeDeclarations: typeDeclarations.map((declaration) =>
      parseTypeDeclaration(declaration, program)
    ),
  }
}

export function parse(project: Project) {
  const sourceFiles = project.getSourceFiles()
  const program = project.getProgram()

  return sourceFiles.map((sourceFile) => parseSourceFile(sourceFile, program))
}
