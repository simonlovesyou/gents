import type {
  parse,
  NumberEntity,
  StringEntity,
  Entity,
  BooleanEntity,
  ObjectEntity,
  AnonymousEntity,
  AnyEntity,
  BooleanLiteralEntity,
  EnumLiteralEntity,
  NeverEntity,
  LiteralEntity,
  UnionEntity,
  EnumEntity,
  UnknownEntity,
  UtilityEntity,
  IntersectionEntity,
  ObjectPropertyEntity,
  DeclarationEntity,
  AliasEntity,
  ArrayEntity,
  ReferenceEntity,
} from "@gents/parser"
import { printNode, Project, ts } from "ts-morph"
import { generators } from "./generators.ts"
import path from "node:path"
import groupBy from "object.groupby"

type Entities = ReturnType<typeof parse>

function isPath(importClause: string) {
  return (
    importClause.startsWith("./") ||
    importClause.startsWith("../") ||
    importClause.startsWith("/")
  )
}

function maybeResolveImportPath(
  fileA: string,
  fileB: string,
  options?: { allowImportingTs?: boolean },
) {
  if (isPath(fileB)) {
    // Determine the relative path from file B to file A
    let relativePath = path.relative(path.dirname(fileB), fileA)

    // Normalize the path to ensure it is correct
    relativePath = relativePath.replace(/\\/g, "/") // Normalize Windows paths to Unix-style
    if (!relativePath.startsWith(".")) {
      relativePath = "./" + relativePath // Ensure it starts with './' for relative paths
    }

    if (options?.allowImportingTs) {
      return relativePath
    }

    return relativePath.replace(/\.ts$/, "")
  }
  return fileB
}

type ImportSpecifier = {
  specifier: string
  named?: Array<{
    name: string
    typeOnly: boolean
  }>
  clause?: string
  typeOnly: boolean
}

export type Context<TEntity extends Entity> = {
  parentEntity: Entity
  fileEntity: {
    name: string
    path: string
    typeDeclarations: DeclarationEntity[]
  }
  next: (context: Context<TEntity>, entity: Entity) => ts.Node
  generators: Generators
  addImportDeclaration: (importSpecifier: ImportSpecifier) => void
}

interface Profile<T extends Entity> {
  name: string
  create: (entity: T) => boolean
}

type CreateEntity<T extends Entity> = (
  entity: T,
  context: Context<T>,
) => ts.Node

interface Generator<T extends Entity> {
  create: CreateEntity<T>
  profiles?: Array<Profile<T>>
}

export type Generators = {
  declaration: Generator<DeclarationEntity>
  alias: Generator<AliasEntity>
  reference: Generator<ReferenceEntity>
  anonymous: Generator<AnonymousEntity>
  any: Generator<AnyEntity>
  array: Generator<ArrayEntity>
  boolean: Generator<BooleanEntity>
  booleanLiteral: Generator<BooleanLiteralEntity>
  number: Generator<NumberEntity>
  objectProperty: Generator<ObjectPropertyEntity>
  object: Generator<ObjectEntity>
  string: Generator<StringEntity>
  enumLiteral: Generator<EnumLiteralEntity>
  never: Generator<NeverEntity>
  literal: Generator<LiteralEntity>
  union: Generator<UnionEntity>
  enum: Generator<EnumEntity>
  unknown: Generator<UnknownEntity>
  utility: Generator<UtilityEntity>
  intersection: Generator<IntersectionEntity>
}

type Options = {
  outputFolder: string
  declarationNameGenerator?: (name: string) => string
  fileNameGenerator?: (fileName: string) => string
  consolidateTypeImports?: boolean
}

const declarationNameGenerator = (name: string) =>
  `${name.charAt(0).toLowerCase()}${name.slice(1)}`

const next = (context: Context<Entity>, entity: Entity) => {
  if (entity.type === "declaration") {
    return generators.declaration.create(entity, context)
  }
  if (entity.type === "reference") {
    return generators.reference.create(entity, context)
  }
  if (entity.type === "anonymous") {
    return generators.anonymous.create(entity, context)
  }
  if (entity.type === "any") {
    return generators.any.create(entity, context)
  }
  if (entity.type === "array") {
    return generators.array.create(entity, context)
  }
  if (entity.type === "alias") {
    return generators.alias.create(entity, context)
  }
  if (entity.type === "boolean") {
    return generators.boolean.create(entity, context)
  }
  if (entity.type === "booleanLiteral") {
    return generators.booleanLiteral.create(entity, context)
  }
  if (entity.type === "number") {
    return generators.number.create(entity, context)
  }
  if (entity.type === "objectProperty") {
    return generators.objectProperty.create(entity, context)
  }
  if (entity.type === "object") {
    return generators.object.create(entity, context)
  }
  if (entity.type === "string") {
    return generators.string.create(entity, context)
  }
  if (entity.type === "enumLiteral") {
    return generators.enumLiteral.create(entity, context)
  }
  if (entity.type === "never") {
    return generators.never.create(entity, context)
  }
  if (entity.type === "literal") {
    return generators.literal.create(entity, context)
  }
  if (entity.type === "union") {
    return generators.union.create(entity, context)
  }
  if (entity.type === "enum") {
    return generators.enum.create(entity, context)
  }
  if (entity.type === "unknown") {
    return generators.unknown.create(entity, context)
  }
  if (entity.type === "utility") {
    return generators.utility.create(entity, context)
  }
  if (entity.type === "intersection") {
    return generators.intersection.create(entity, context)
  }
  throw new TypeError(
    // @ts-ignore
    `Could not find generator for entity type "${entity.type}"`,
  )
}

export const codegen = (
  entities: Entities,
  generators: Generators,
  options: Options,
) => {
  const fileNameGenerator =
    options.fileNameGenerator ?? ((name: string) => "gen-" + name)

  const project = new Project()
  entities.forEach((entity) => {
    let imports: ImportSpecifier[] = []
    const sourceFile = project.createSourceFile(
      path.join(options.outputFolder, fileNameGenerator(entity.name)),
      "",
      { overwrite: true },
    )

    const statements = entity.typeDeclarations.map((declaration) => {
      return generators.declaration.create(declaration, {
        parentEntity: entity,
        generators,
        next,
        addImportDeclaration: (importSpecifier) => {
          imports.push(importSpecifier)
        },
        fileEntity: entity,
      })
    })

    Object.entries(
      groupBy(imports, (importSpecifier) => importSpecifier.specifier),
    ).forEach(([specifier, importGroup]) => {
      const namedFlatImports = importGroup
        .map((import_) => import_.named)
        .flat(1)
        .filter((namedImport): namedImport is NonNullable<typeof namedImport> =>
          Boolean(namedImport),
        )

      const consolidateTypeImports = options?.consolidateTypeImports ?? true

      const allNamedImportsAreTypeOnly = namedFlatImports.every(
        (namedImport) => namedImport.typeOnly,
      )

      const rootImportIsTypeOnly =
        allNamedImportsAreTypeOnly && consolidateTypeImports

      sourceFile.addImportDeclaration({
        moduleSpecifier: specifier,
        isTypeOnly: rootImportIsTypeOnly,
        namedImports: namedFlatImports.map((import_) => ({
          ...import_,
          isTypeOnly: !rootImportIsTypeOnly && import_.typeOnly,
        })),
      })
    })
    imports = []

    sourceFile.addStatements((writer) =>
      statements
        .map((statement) => writer.write(printNode(statement)))
        .join("\n"),
    )
  })
  return project
}
