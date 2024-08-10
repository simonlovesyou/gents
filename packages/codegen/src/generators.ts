import type { Generators, Context } from "./index"
import type {
  DeclarationEntity,
  Entity,
  ObjectPropertyEntity,
} from "@gents/parser"
import { NodeFlags, SyntaxKind } from "ts-morph"
import {
  factory,
  Expression,
  Node,
  Identifier,
  CallExpression,
  ArrayLiteralExpression,
  Statement,
} from "typescript"
import camelcase from "camelcase"
import { EndOfFileToken } from "typescript"

const createIdentifierImport = (
  identifier: string,
  specifier: string,
  options: {
    named?: boolean
    typeOnly?: boolean
  },
  context: Context<Entity>,
) => {
  context.addImportDeclaration({
    specifier,
    named: options.named
      ? [{ name: identifier, typeOnly: Boolean(options?.typeOnly) }]
      : [],
    typeOnly: Boolean(options?.typeOnly),
    clause: options.named ? undefined : identifier,
  })
  return factory.createIdentifier(identifier)
}

const boolean = {
  create: (_, context) =>
    factory.createCallExpression(
      factory.createPropertyAccessExpression(
        factory.createPropertyAccessExpression(
          createIdentifierImport(
            "faker",
            "@faker-js/faker",
            { named: true },
            context,
          ),
          factory.createIdentifier("datatype"),
        ),
        factory.createIdentifier("boolean"),
      ),
      undefined,
      [],
    ),
} satisfies Generators["boolean"]

const isOneOfKindOrThrow = <TKind extends SyntaxKind>(
  node: Node,
  kind: Array<TKind>,
): TKind extends SyntaxKind.ExpressionStatement
  ? Expression
  : TKind extends SyntaxKind.Identifier
    ? Identifier
    : TKind extends SyntaxKind.CallExpression
      ? CallExpression
      : TKind extends SyntaxKind.ArrayLiteralExpression
        ? ArrayLiteralExpression
        : never => {
  if (!(kind as unknown[]).includes(node.kind)) {
    throw new TypeError(
      `Expected to handle node of syntax kind "${kind}", got "${node.kind}"`,
    )
  }
  return node as TKind extends SyntaxKind.ExpressionStatement
    ? Expression
    : never
}

const generateDeclarationName = (name: string) =>
  `generate${name.charAt(0).toUpperCase()}${name.slice(1)}`

const isOneOfCaseInsensitive = <const T extends string[]>(
  list: T,
  value: string,
): value is T[number] => {
  const result = list
    .map((item) => item.toLowerCase())
    .some((item) => value.toLowerCase().includes(item.toLowerCase()))
  return result
}

const identifierHints = [
  {
    name: "company",
    create: (entity: ObjectPropertyEntity | DeclarationEntity) =>
      isOneOfCaseInsensitive(
        ["company", "organzation", "merchant"],
        entity.name,
      )
        ? "company"
        : undefined,
  },
  {
    name: "human",
    create: (entity: DeclarationEntity | ObjectPropertyEntity) =>
      isOneOfCaseInsensitive(
        [
          "reviewer",
          "human",
          "person",
          "user",
          "profile",
          "reviewers",
          "employee",
        ],
        entity.name,
      )
        ? "human"
        : undefined,
  },
  {
    name: "name",
    create: (
      entity: DeclarationEntity | ObjectPropertyEntity,
      context: Context<DeclarationEntity | ObjectPropertyEntity>,
    ) =>
      isOneOfCaseInsensitive(["firstName", "givenName"], entity.name)
        ? "firstName"
        : isOneOfCaseInsensitive(["lastName", "familyName"], entity.name)
          ? "lastName"
          : isOneOfCaseInsensitive(["middleName"], entity.name)
            ? "middleName"
            : entity.name === "name" || entity.name === "fullName"
              ? "fullName"
              : context.hints.some(
                    (hint) => hint.name === "company" && hint.level <= 1,
                  )
                ? entity.name.toLowerCase().includes("name")
                  ? "name"
                  : undefined
                : undefined,
  },
]
export const generators: Generators = {
  anonymous: { create: () => factory.createStringLiteral("anonymous") },
  any: { create: () => factory.createStringLiteral("any") },
  objectProperty: {
    create: (entity, context) =>
      factory.createPropertyAssignment(
        factory.createIdentifier(entity.name),
        isOneOfKindOrThrow(
          context.next(
            {
              ...context,
              parentEntity: entity,
            },
            entity.property,
          ),
          [
            SyntaxKind.ExpressionStatement,
            SyntaxKind.Identifier,
            SyntaxKind.CallExpression,
            SyntaxKind.ArrayLiteralExpression,
          ],
        ),
      ),
    hints: identifierHints,
  },
  enumLiteral: { create: () => factory.createStringLiteral("enumLiteral") },
  never: { create: () => factory.createStringLiteral("any") },
  enum: { create: () => factory.createStringLiteral("objectProperty") },
  unknown: { create: () => factory.createStringLiteral("enumLiteral") },
  array: {
    create: () => {
      return factory.createArrayLiteralExpression([])
    },
  },
  alias: {
    create: (entity, context) => {
      return factory.createCallExpression(
        factory.createIdentifier(
          camelcase(generateDeclarationName(entity.alias)),
        ),
        undefined,
        [],
      )
    },
  },
  reference: {
    create: (entity, context) => {
      return factory.createCallExpression(
        factory.createIdentifier(
          camelcase(generateDeclarationName(entity.reference)),
        ),
        undefined,
        [],
      )
    },
  },
  intersection: {
    create: () => {
      return factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier("intersection"),
            factory.createTrue(),
          ),
        ],
        true,
      )
    },
  },
  utility: {
    create: () => {
      return factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier("utility"),
            factory.createTrue(),
          ),
        ],
        true,
      )
    },
  },
  file: {
    create: (entity, context) => {
      const statements = entity.typeDeclarations.map((declaration) => {
        return context.next(
          {
            ...context,
            parentEntity: entity,
            fileEntity: entity,
          },
          declaration,
        )
      })

      return factory.createSourceFile(
        statements as Statement[],
        factory.createToken(SyntaxKind.EndOfFileToken),
        NodeFlags.None,
      )
    },
  },
  declaration: {
    create: (entity, context) => {
      context.addImportDeclaration({
        named: [{ name: entity.name, typeOnly: true }],
        specifier: context.fileEntity.path,
        typeOnly: false,
      })

      return factory.createFunctionDeclaration(
        undefined,
        undefined,
        factory.createIdentifier(
          camelcase(generateDeclarationName(entity.name)),
        ),
        [
          factory.createTypeParameterDeclaration(
            [factory.createToken(SyntaxKind.ConstKeyword)],
            factory.createIdentifier("T"),
            entity.declaration.type === "object"
              ? factory.createTypeReferenceNode(
                  createIdentifierImport(
                    "PartialDeep",
                    "type-fest",
                    { named: true, typeOnly: true },
                    context,
                  ),
                  [
                    factory.createTypeReferenceNode(
                      factory.createIdentifier(entity.name),
                      undefined,
                    ),
                  ],
                )
              : factory.createTypeReferenceNode(
                  factory.createIdentifier(entity.name),
                  undefined,
                ),
            undefined,
          ),
        ],
        [
          factory.createParameterDeclaration(
            undefined,
            undefined,
            factory.createIdentifier(camelcase(entity.name)),
            factory.createToken(SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(factory.createIdentifier("T")),
            undefined,
          ),
          factory.createParameterDeclaration(
            undefined,
            undefined,
            factory.createIdentifier("options"),
            factory.createToken(SyntaxKind.QuestionToken),
            factory.createTypeLiteralNode([
              factory.createPropertySignature(
                undefined,
                factory.createIdentifier("seed"),
                undefined,
                factory.createUnionTypeNode([
                  factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                  factory.createArrayTypeNode(
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword),
                  ),
                ]),
              ),
            ]),
            undefined,
          ),
        ],
        undefined,
        factory.createBlock([
          /*
            if(options?.seed !== undefined) {
              faker.seed(options.seed)
            }
          */
          factory.createIfStatement(
            factory.createBinaryExpression(
              factory.createPropertyAccessChain(
                factory.createIdentifier("options"),
                factory.createToken(SyntaxKind.QuestionDotToken),
                factory.createIdentifier("seed"),
              ),
              factory.createToken(SyntaxKind.ExclamationEqualsEqualsToken),
              factory.createIdentifier("undefined"),
            ),
            factory.createBlock(
              [
                factory.createExpressionStatement(
                  factory.createCallExpression(
                    factory.createPropertyAccessExpression(
                      createIdentifierImport(
                        "faker",
                        "@faker-js/faker",
                        { named: true },
                        context,
                      ),
                      factory.createIdentifier("seed"),
                    ),
                    undefined,
                    [
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier("options"),
                        factory.createIdentifier("seed"),
                      ),
                    ],
                  ),
                ),
              ],
              true,
            ),
            undefined,
          ),
          factory.createReturnStatement(
            factory.createAsExpression(
              factory.createCallExpression(
                factory.createCallExpression(
                  createIdentifierImport(
                    "merge",
                    "@fastify/deepmerge",
                    {},
                    context,
                  ),
                  undefined,
                  [],
                ),
                undefined,
                [
                  factory.createIdentifier(camelcase(entity.name)),
                  entity.declaration.type === "object"
                    ? factory.createSatisfiesExpression(
                        factory.createAsExpression(
                          isOneOfKindOrThrow(
                            context.next(
                              {
                                ...context,
                                parentEntity: entity,
                              },
                              entity.declaration,
                            ),
                            [
                              SyntaxKind.ExpressionStatement,
                              SyntaxKind.ObjectLiteralExpression,
                            ],
                          ),
                          factory.createTypeReferenceNode(
                            factory.createIdentifier("const"),
                            undefined,
                          ),
                        ),
                        factory.createTypeReferenceNode(
                          createIdentifierImport(
                            "ReadonlyDeep",
                            "type-fest",
                            { named: true, typeOnly: true },
                            context,
                          ),
                          [
                            factory.createTypeReferenceNode(
                              factory.createIdentifier(entity.name),
                              undefined,
                            ),
                          ],
                        ),
                      )
                    : isOneOfKindOrThrow(
                        context.next(
                          {
                            ...context,
                            parentEntity: entity,
                          },
                          entity.declaration,
                        ),
                        [
                          SyntaxKind.ExpressionStatement,
                          SyntaxKind.CallExpression,
                          SyntaxKind.ObjectLiteralExpression,
                        ],
                      ),
                ],
              ),
              factory.createTypeReferenceNode(
                createIdentifierImport(
                  "SimplifyDeep",
                  "type-fest",
                  {
                    typeOnly: true,
                    named: true,
                  },
                  context,
                ),
                [
                  factory.createIntersectionTypeNode([
                    factory.createTypeReferenceNode(
                      factory.createIdentifier(entity.name),
                      undefined,
                    ),
                    factory.createTypeReferenceNode(
                      factory.createIdentifier("T"),
                      undefined,
                    ),
                  ]),
                ],
              ),
            ),
          ),
        ]),
      )
    },
    hints: identifierHints,
  },
  number: {
    create: (_, context) => {
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createPropertyAccessExpression(
            createIdentifierImport(
              "faker",
              "@faker-js/faker",
              { named: true },
              context,
            ),
            factory.createIdentifier("number"),
          ),
          factory.createIdentifier("int"),
        ),
        undefined,
        [],
      )
    },
  },
  literal: {
    create: (entity, context) => {
      if (typeof entity.value === "number") {
        return factory.createNumericLiteral(entity.value)
      }
      if (typeof entity.value === "string") {
        return factory.createStringLiteral(entity.value)
      }
      if (entity.value === undefined) {
        return factory.createIdentifier("undefined")
      }

      throw new Error("Lol ", { cause: entity })
    },
  },
  boolean,
  booleanLiteral: boolean as unknown as Generators["booleanLiteral"],
  object: {
    create: (entity, context) => {
      return factory.createObjectLiteralExpression(
        entity.properties.map((property) => {
          return isOneOfKindOrThrow(context.next(context, property), [
            SyntaxKind.PropertyAssignment,
          ])
        }),
        true,
      )
    },
  },
  string: {
    create: (entity, context) => {
      const nameHint = context.hints.find(
        (hint) => hint.name === "name" && hint.level <= 1,
      )

      if (nameHint) {
        const company = context.hints.find(
          (hint) => hint.name === "company" && hint.level >= nameHint.level,
        )
        return factory.createCallExpression(
          factory.createPropertyAccessExpression(
            factory.createPropertyAccessExpression(
              createIdentifierImport(
                "faker",
                "@faker-js/faker",
                { named: true },
                context,
              ),
              factory.createIdentifier(company ? "company" : "person"),
            ),
            factory.createIdentifier(nameHint.value),
          ),
          undefined,
          [],
        )
      }
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createPropertyAccessExpression(
            createIdentifierImport(
              "faker",
              "@faker-js/faker",
              { named: true },
              context,
            ),
            factory.createIdentifier("string"),
          ),
          factory.createIdentifier("alpha"),
        ),
        undefined,
        [],
      )
    },
  },
  union: {
    create: (entity, context) => {
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createPropertyAccessExpression(
            createIdentifierImport(
              "faker",
              "@faker-js/faker",
              { named: true },
              context,
            ),
            factory.createIdentifier("helpers"),
          ),
          factory.createIdentifier("arrayElement"),
        ),
        undefined,
        [
          factory.createAsExpression(
            factory.createArrayLiteralExpression(
              entity.values.map(
                (value) =>
                  isOneOfKindOrThrow(
                    context.next({ ...context, parentEntity: entity }, value),
                    [
                      SyntaxKind.CallExpression,
                      SyntaxKind.Identifier,
                      SyntaxKind.ArrayLiteralExpression,
                      SyntaxKind.StringLiteral,
                    ],
                  ) as Expression,
              ),
              false,
            ),
            factory.createTypeReferenceNode(
              factory.createIdentifier("const"),
              undefined,
            ),
          ),
        ],
      )
    },
  },
}
