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

type Alias = {
  type: "alias"
  alias: string
}
type Reference = {
  type: "reference"
  reference: string
}

type EmptyObject = {
  type: "object"
  properties: []
}

type Object = {
  type: "object"
  properties: Array<{
    name: string
    property: Entity
    optional: boolean
  }>
}

type ArrayEntity =
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

type Anonymous = {
  type: "anonymous"
}
type Any = {
  type: "any"
}
type Boolean = {
  type: "boolean"
}
type BooleanLiteral = {
  type: "booleanLiteral"
  value: boolean
}
type Number = {
  type: "number"
}
type String = {
  type: "string"
}
type EnumLiteral = {
  type: "enumLiteral"
}
type Never = {
  type: "never"
}
type Literal = {
  type: "literal"
  value: null | number | string | PseudoBigInt | undefined
}
type Union = {
  type: "union"
  values: Array<Entity>
}
type Enum = {
  type: "enum"
  properties: Array<{
    name: string
    property: Entity
    optional: boolean
  }>
}
type Unknown = {
  type: "unknown"
}
type Utility = {
  type: "utility"
}
type Intersection = {
  type: "intersection"
}

type Entity =
  | Alias
  | Anonymous
  | Any
  | ArrayEntity
  | Boolean
  | BooleanLiteral
  | EmptyObject
  | Enum
  | EnumLiteral
  | Intersection
  | Literal
  | Never
  | Number
  | Object
  | Reference
  | String
  | Union
  | Unknown
  | Utility

const parseType = (type: Type, node?: Node, program?: Program): Entity => {
  const typeChecker = program?.getTypeChecker()
  const aliasSymbol = type.getAliasSymbol()
  const symbol = type?.getSymbol()
  const typeAtLocation = node && symbol && symbol.getTypeAtLocation(node)
  const apparentType = type.getApparentType()
  const apparentTypeAliasSymbol = type.getApparentType().getAliasSymbol()
  const apparentTypeSymbol = type.getApparentType().getSymbol()
  const aliasedSymbol = symbol && typeChecker?.getAliasedSymbol(symbol)

  console.log("=====================================================")
  console.log(`Parsing type with text: "${type.getText()}"`)
  console.log(`Parsing with apparenty type: "${apparentType.getText()}"`)
  node && console.log(`Parsing node: "${node.getFullText()}"`)

  console.log({
    apparent: findType(apparentType),
    type: findType(type),
    kindName: node?.getKindName(),
    aliasSymbol,
    typeAtLocation: typeAtLocation?.getText(),
    aliasedSymbol,
    apparentTypeAliasSymbol,
    apparentTypeSymbol,
    referenceFlag:
      type.getTargetType()?.getObjectFlags() &&
      type.getTargetType()!.getObjectFlags() & ObjectFlags.Reference,
    apparentReferenceFlag:
      apparentType.getObjectFlags() & ObjectFlags.Reference,
    symbol,
    node,
  })

  const typeString =
    symbol && node && typeChecker?.getTypeText(type, node, formatFlags)

  if (aliasSymbol && node === undefined) {
    const [aliasDeclaration] = aliasSymbol.getDeclarations()
    const [typeDeclaration] = symbol?.getDeclarations() ?? []

    if (typeDeclaration && aliasDeclaration !== typeDeclaration) {
      return {
        type: "alias" as const,
        alias: getNameFromNode(aliasDeclaration!),
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
    console.log(type.getTargetTypeOrThrow().getTargetTypeOrThrow())
    const elements = type.getTupleElements()
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
      console.log("First reference parse")
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
) => {
  const type = typeDeclaration.getType()

  if (typeDeclaration.isKind(SyntaxKind.InterfaceDeclaration)) {
    return {
      name: typeDeclaration.getName(),
      declarationType: parseType(type, typeDeclaration, program),
    }
  }

  return {
    name: typeDeclaration.getName(),
    declarationType: parseType(type, typeDeclaration, program),
    exported: typeDeclaration.getExportKeyword() !== undefined,
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
    name: sourceFile.getBaseName(),
    typeDeclarations: typeDeclarations.map((declaration) =>
      parseTypeDeclaration(declaration, program)
    ),
  }
}

export function codegen(project: Project) {
  const sourceFiles = project.getSourceFiles()
  const program = project.getProgram()

  return sourceFiles.map((sourceFile) => parseSourceFile(sourceFile, program))
}
