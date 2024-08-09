import type { Generators, Context } from "./index"
import type { Entity } from "@gents/parser"
import { SyntaxKind } from "ts-morph"
import {
  factory,
  Expression,
  Node,
  Identifier,
  CallExpression,
  ArrayLiteralExpression,
} from "typescript"
import camelcase from "camelcase"

const createIdentifierImport = (
  identifier: string,
  specifier: string,
  options: {
    named?: boolean
    typeOnly?: boolean
  },
  context: Context<Entity>
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
            context
          ),
          factory.createIdentifier("datatype")
        ),
        factory.createIdentifier("boolean")
      ),
      undefined,
      []
    ),
} satisfies Generators["boolean"]

const isOneOfKindOrThrow = <TKind extends SyntaxKind>(
  node: Node,
  kind: Array<TKind>
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
      `Expected to handle node of syntax kind "${kind}", got "${node.kind}"`
    )
  }
  return node as TKind extends SyntaxKind.ExpressionStatement
    ? Expression
    : never
}

const generateDeclarationName = (name: string) =>
  `generate${name.charAt(0).toUpperCase()}${name.slice(1)}`

export const generators: Generators = {
  anonymous: { create: () => factory.createStringLiteral("anonymous") },
  any: { create: () => factory.createStringLiteral("any") },
  objectProperty: {
    create: () => factory.createStringLiteral("objectProperty"),
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
          camelcase(generateDeclarationName(entity.alias))
        ),
        undefined,
        []
      )
    },
  },
  reference: {
    create: (entity, context) => {
      return factory.createCallExpression(
        factory.createIdentifier(
          camelcase(generateDeclarationName(entity.reference))
        ),
        undefined,
        []
      )
    },
  },
  intersection: {
    create: () => {
      return factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier("intersection"),
            factory.createTrue()
          ),
        ],
        true
      )
    },
  },
  utility: {
    create: () => {
      return factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            factory.createIdentifier("utility"),
            factory.createTrue()
          ),
        ],
        true
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
          camelcase(generateDeclarationName(entity.name))
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
                    context
                  ),
                  [
                    factory.createTypeReferenceNode(
                      factory.createIdentifier(entity.name),
                      undefined
                    ),
                  ]
                )
              : factory.createTypeReferenceNode(
                  factory.createIdentifier(entity.name),
                  undefined
                ),
            undefined
          ),
        ],
        [
          factory.createParameterDeclaration(
            undefined,
            undefined,
            factory.createIdentifier(camelcase(entity.name)),
            factory.createToken(SyntaxKind.QuestionToken),
            factory.createTypeReferenceNode(factory.createIdentifier("T")),
            undefined
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
                    factory.createKeywordTypeNode(SyntaxKind.NumberKeyword)
                  ),
                ])
              ),
            ]),
            undefined
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
                factory.createIdentifier("seed")
              ),
              factory.createToken(SyntaxKind.ExclamationEqualsEqualsToken),
              factory.createIdentifier("undefined")
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
                        context
                      ),
                      factory.createIdentifier("seed")
                    ),
                    undefined,
                    [
                      factory.createPropertyAccessExpression(
                        factory.createIdentifier("options"),
                        factory.createIdentifier("seed")
                      ),
                    ]
                  )
                ),
              ],
              true
            ),
            undefined
          ),
          factory.createReturnStatement(
            factory.createAsExpression(
              factory.createCallExpression(
                factory.createCallExpression(
                  createIdentifierImport(
                    "merge",
                    "@fastify/deepmerge",
                    {},
                    context
                  ),
                  undefined,
                  []
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
                              entity.declaration
                            ),
                            [
                              SyntaxKind.ExpressionStatement,
                              SyntaxKind.ObjectLiteralExpression,
                            ]
                          ),
                          factory.createTypeReferenceNode(
                            factory.createIdentifier("const"),
                            undefined
                          )
                        ),
                        factory.createTypeReferenceNode(
                          createIdentifierImport(
                            "ReadonlyDeep",
                            "type-fest",
                            { named: true, typeOnly: true },
                            context
                          ),
                          [
                            factory.createTypeReferenceNode(
                              factory.createIdentifier(entity.name),
                              undefined
                            ),
                          ]
                        )
                      )
                    : isOneOfKindOrThrow(
                        context.next(
                          {
                            ...context,
                            parentEntity: entity,
                          },
                          entity.declaration
                        ),
                        [
                          SyntaxKind.ExpressionStatement,
                          SyntaxKind.CallExpression,
                          SyntaxKind.ObjectLiteralExpression,
                        ]
                      ),
                ]
              ),
              factory.createTypeReferenceNode(
                createIdentifierImport(
                  "SimplifyDeep",
                  "type-fest",
                  {
                    typeOnly: true,
                    named: true,
                  },
                  context
                ),
                [
                  factory.createIntersectionTypeNode([
                    factory.createTypeReferenceNode(
                      factory.createIdentifier(entity.name),
                      undefined
                    ),
                    factory.createTypeReferenceNode(
                      factory.createIdentifier("T"),
                      undefined
                    ),
                  ]),
                ]
              )
            )
          ),
        ])
      )
    },
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
              context
            ),
            factory.createIdentifier("number")
          ),
          factory.createIdentifier("int")
        ),
        undefined,
        []
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
          return factory.createPropertyAssignment(
            factory.createIdentifier(property.name),
            isOneOfKindOrThrow(
              context.next(
                {
                  ...context,
                  parentEntity: entity,
                },
                property.property
              ),
              [
                SyntaxKind.ExpressionStatement,
                SyntaxKind.Identifier,
                SyntaxKind.CallExpression,
                SyntaxKind.ArrayLiteralExpression,
              ]
            )
          )
        }),
        true
      )
    },
  },
  string: {
    create: (entity, context) => {
      if ("name" in context.parentEntity) {
        const name = context.parentEntity.name
        if (name.toLowerCase().includes("id")) {
          return factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createPropertyAccessExpression(
                createIdentifierImport(
                  "faker",
                  "@faker-js/faker",
                  { named: true },
                  context
                ),
                factory.createIdentifier("string")
              ),
              factory.createIdentifier("uuid")
            ),
            undefined,
            []
          )
        }
        if (name.toLowerCase().includes("company")) {
          return factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createPropertyAccessExpression(
                createIdentifierImport(
                  "faker",
                  "@faker-js/faker",
                  { named: true },
                  context
                ),
                factory.createIdentifier("company")
              ),
              factory.createIdentifier("name")
            ),
            undefined,
            []
          )
        }
      }
      return factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createPropertyAccessExpression(
            createIdentifierImport(
              "faker",
              "@faker-js/faker",
              { named: true },
              context
            ),
            factory.createIdentifier("string")
          ),
          factory.createIdentifier("alpha")
        ),
        undefined,
        []
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
              context
            ),
            factory.createIdentifier("helpers")
          ),
          factory.createIdentifier("arrayElement")
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
                    ]
                  ) as Expression
              ),
              false
            ),
            factory.createTypeReferenceNode(
              factory.createIdentifier("const"),
              undefined
            )
          ),
        ]
      )
    },
  },
}
