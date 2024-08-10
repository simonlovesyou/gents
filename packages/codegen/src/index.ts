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
  FileEntity,
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
  parentDeclarationEntity?: DeclarationEntity
  closestIdentifer?: DeclarationEntity | ObjectPropertyEntity
  fileEntity: {
    name: string
    path: string
    typeDeclarations: DeclarationEntity[]
  }
  next: (context: Context<TEntity>, entity: Entity) => ts.Node
  hints: Array<{ name: string; level: number; value: string }>
  generators: Generators
  addImportDeclaration: (importSpecifier: ImportSpecifier) => void
}

interface Hint<T extends Entity> {
  name: string
  create: (entity: T, context: Context<T>) => string | undefined
}

type CreateEntity<T extends Entity> = (
  entity: T,
  context: Context<T>,
) => ts.Node

interface Generator<T extends Entity> {
  create: CreateEntity<T>
  hints?: Array<Hint<T>>
}

export type Generators = {
  declaration: Generator<DeclarationEntity>
  alias: Generator<AliasEntity>
  file: Generator<FileEntity>
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
  project?: Project
}

const declarationNameGenerator = (name: string) =>
  `${name.charAt(0).toLowerCase()}${name.slice(1)}`

export const next = (context: Context<Entity>, entity: Entity) => {
  const incrementedHints = context.hints.map((hint) => ({
    ...hint,
    level:
      hint.level + (entity.type === "array" || entity.type === "union" ? 0 : 1),
  }))

  const createdHints =
    generators[entity.type].hints?.reduce(
      (accumulatingHints: typeof incrementedHints, hint) => {
        const result = hint.create(entity as any, {
          ...context,
          hints: [...incrementedHints, ...accumulatingHints],
        })

        if (result !== undefined) {
          return [
            ...accumulatingHints,
            {
              name: hint.name,
              level: 0,
              value: result,
            },
          ]
        }
        return accumulatingHints
      },
      [],
    ) ?? []

  return generators[entity.type].create(entity as any, {
    ...context,
    hints: [...createdHints, ...incrementedHints],
  })
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

    const generatedSourceFile = generators.file.create(entity, {
      parentEntity: entity,
      generators,
      next,
      addImportDeclaration: (importSpecifier) => {
        if (
          !imports.some((import_) => {
            return JSON.stringify(import_) === JSON.stringify(importSpecifier)
          })
        ) {
          imports.push(importSpecifier)
        }
      },
      fileEntity: entity,
      hints: [],
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

      const allNamedImportsAreTypeOnly =
        namedFlatImports.length > 0 &&
        namedFlatImports.every((namedImport) => namedImport.typeOnly)

      const rootImportIsTypeOnly =
        allNamedImportsAreTypeOnly && consolidateTypeImports

      sourceFile.addImportDeclaration({
        moduleSpecifier: maybeResolveImportPath(
          sourceFile.getFilePath(),
          specifier,
        ),
        defaultImport: importGroup.find(
          (importSpecifier) => importSpecifier.clause,
        )?.clause,
        isTypeOnly: rootImportIsTypeOnly,
        namedImports: namedFlatImports.map((import_) => ({
          ...import_,
          isTypeOnly: !rootImportIsTypeOnly && import_.typeOnly,
        })),
      })
    })
    imports = []

    sourceFile.addStatements(printNode(generatedSourceFile))
  })
  project.save()
  return project
}
