import type {
	ArraySchema,
	LiteralSchema,
	ObjectSchema,
	PrimitiveSchema,
	PropertyInfo,
	ReferenceSchema,
	RuntimeSchema,
	UnionMember,
	UnionSchema,
} from "@gents/gents";
import { selectFromUnion } from "@gents/gents";
import type {
	DeclarationEntity,
	Entity,
	ObjectPropertyEntity,
} from "@gents/parser";
import camelcase from "camelcase";
import { NodeFlags, SyntaxKind } from "ts-morph";
import {
	type ArrayLiteralExpression,
	type Block,
	type CallExpression,
	type Expression,
	factory,
	type Identifier,
	type Node,
	type ObjectLiteralExpression,
	type Statement,
} from "typescript";
import type { Context, Generators } from "./index";

type PropertyAccessElementLike =
	| {
			name: string;
			optional?: boolean;
	  }
	| Identifier
	| string;

const createPropertyAccessChain = (
	properties: [PropertyAccessElementLike, ...PropertyAccessElementLike[]],
) => {
	const [head, ...tail] = properties;

	const accumulator =
		typeof head === "string"
			? factory.createIdentifier(head)
			: "name" in head
				? factory.createIdentifier(head.name)
				: head;

	return tail.reduce<Expression>((acc, property) => {
		if (typeof property === "string") {
			return factory.createPropertyAccessExpression(acc, property);
		}
		if ("name" in property) {
			if (!property.optional) {
				return factory.createPropertyAccessExpression(acc, property.name);
			}
			return factory.createPropertyAccessChain(
				acc,
				factory.createToken(SyntaxKind.QuestionDotToken),
				property.name,
			);
		}
		return factory.createPropertyAccessExpression(acc, property);
	}, accumulator);
};

const createNullishCoalescingExpression = (
	left: Expression,
	right: Expression,
) =>
	factory.createBinaryExpression(
		left,
		factory.createToken(SyntaxKind.QuestionQuestionToken),
		right,
	);

const createIdentifierImport = (
	identifier: string,
	specifier: string,
	options: {
		named?: boolean;
		typeOnly?: boolean;
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
	});
	return factory.createIdentifier(identifier);
};

const boolean = {
	create: (_, context) =>
		factory.createCallExpression(
			createPropertyAccessChain([
				createIdentifierImport(
					"faker",
					"@faker-js/faker",
					{ named: true },
					context,
				),
				"datatype",
				"boolean",
			]),
			undefined,
			[],
		),
} satisfies Generators["boolean"];

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
				: TKind extends SyntaxKind.ObjectLiteralExpression
					? ObjectLiteralExpression
					: never => {
	if (!(kind as unknown[]).includes(node.kind)) {
		throw new TypeError(
			`Expected to handle node of syntax kind "${kind}", got "${node.kind}"`,
		);
	}
	return node as TKind extends SyntaxKind.ExpressionStatement
		? Expression
		: never;
};

const generateDeclarationName = (name: string) =>
	`generate${name.charAt(0).toUpperCase()}${name.slice(1)}`;

const isOneOfCaseInsensitive = <const T extends string[]>(
	list: T,
	value: string,
): value is T[number] => {
	const result = list
		.map((item) => item.toLowerCase())
		.some((item) => value.toLowerCase().includes(item.toLowerCase()));
	return result;
};

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
	{
		name: "currency",
		create: (entity: DeclarationEntity | ObjectPropertyEntity) =>
			["currency", "money"].includes(entity.name.toLowerCase())
				? "currency"
				: undefined,
	},
	{
		name: "id",
		create: (entity: DeclarationEntity | ObjectPropertyEntity) =>
			isOneOfCaseInsensitive(["id", "uuid"], entity.name) ? "id" : undefined,
	},
	{
		name: "url",
		create: (entity: DeclarationEntity | ObjectPropertyEntity) =>
			isOneOfCaseInsensitive(["url"], entity.name) ? "url" : undefined,
	},
	{
		name: "currencyCode",
		create: (
			entity: DeclarationEntity | ObjectPropertyEntity,
			context: Context<DeclarationEntity | ObjectPropertyEntity>,
		) =>
			isOneOfCaseInsensitive(["currencyCode", "currencyUnit"], entity.name) ||
			(context.hints.some(
				(hint) => hint.name === "currency" && hint.level <= 1,
			) &&
				isOneOfCaseInsensitive(["code"], entity.name))
				? "currencyCode"
				: undefined,
	},
	{
		name: "avatar",
		create: (entity: DeclarationEntity | ObjectPropertyEntity) =>
			isOneOfCaseInsensitive(["avatar"], entity.name) ? "avatar" : undefined,
	},
];
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
							closestIdentifer: entity,
						},
						entity.property,
					),
					[
						SyntaxKind.ExpressionStatement,
						SyntaxKind.Identifier,
						SyntaxKind.CallExpression,
						SyntaxKind.ArrayLiteralExpression,
						SyntaxKind.ObjectLiteralExpression,
						SyntaxKind.StringLiteral,
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
		create: (entity, context) => {
			if (!Array.isArray(entity.elements)) {
				return factory.createCallExpression(
					createPropertyAccessChain([
						{ name: "faker" },
						{ name: "helpers" },
						{ name: "multiple" },
					]),
					undefined,
					[
						factory.createArrowFunction(
							undefined,
							undefined,
							[],
							undefined,
							factory.createToken(SyntaxKind.EqualsGreaterThanToken),
							context.next(
								{ ...context, parentEntity: entity },
								entity.elements,
							) as Expression,
						),
						factory.createObjectLiteralExpression(
							[
								factory.createPropertyAssignment(
									factory.createIdentifier("count"),
									factory.createBinaryExpression(
										createPropertyAccessChain([
											{
												name: camelcase(context.parentDeclarationEntity!.name),
												optional: true,
											},
											...[
												context.closestIdentifer
													? {
															name: context.closestIdentifer.name,
															optional: true,
														}
													: undefined,
												{ name: "length", optional: true },
											].filter(
												(property): property is NonNullable<typeof property> =>
													property !== undefined,
											),
										] as const),
										factory.createToken(SyntaxKind.QuestionQuestionToken),
										factory.createObjectLiteralExpression(
											[
												factory.createPropertyAssignment(
													factory.createIdentifier("max"),
													factory.createCallExpression(
														createPropertyAccessChain([
															"faker",
															"number",
															"int",
														]),
														undefined,
														[factory.createNumericLiteral("42")],
													),
												),
												factory.createPropertyAssignment(
													factory.createIdentifier("min"),
													factory.createNumericLiteral("0"),
												),
											],
											false,
										),
									),
								),
							],
							true,
						),
					],
				);
			}

			return factory.createArrayLiteralExpression(
				Array.isArray(entity.elements)
					? (entity.elements.map((element) =>
							context.next({ ...context, parentEntity: entity }, element),
						) as unknown as Expression[])
					: (factory.createArrayLiteralExpression(
							[],
						) as unknown as Expression[]),
			);
		},
	},
	alias: {
		create: (entity) => {
			return factory.createCallExpression(
				factory.createIdentifier(
					camelcase(generateDeclarationName(entity.alias)),
				),
				undefined,
				[],
			);
		},
	},
	reference: {
		create: (entity, context) => {
			if (entity.reference === "Date") {
				return factory.createCallExpression(
					createPropertyAccessChain([
						{ name: "faker" },
						{ name: "date" },
						{ name: "anytime" },
					]),
					undefined,
					[],
				);
			}
			return factory.createCallExpression(
				factory.createIdentifier(
					camelcase(generateDeclarationName(entity.reference)),
				),
				undefined,
				[],
			);
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
			);
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
			);
		},
	},
	file: {
		create: (entity, context) => {
			const statements = entity.typeDeclarations.flatMap((declaration) => {
				const result = context.next(
					{
						...context,
						parentEntity: entity,
						fileEntity: entity,
					},
					declaration,
				);
				if (result.kind === SyntaxKind.Block) {
					return (result as Block).statements;
				}
			});

			return factory.createSourceFile(
				statements as Statement[],
				factory.createToken(SyntaxKind.EndOfFileToken),
				NodeFlags.None,
			);
		},
	},
	declaration: {
		create: (entity, context) => {
			context.addImportDeclaration({
				named: [{ name: entity.name, typeOnly: true }],
				specifier: context.fileEntity.path,
				typeOnly: false,
			});

			const optionsParameter = factory.createParameterDeclaration(
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
			);

			const exactOptionalPropertyTypes =
				context.project.getCompilerOptions().exactOptionalPropertyTypes;

			const hasOptionalProperties =
				entity.declaration.type === "object" &&
				entity.declaration.properties.length > 0 &&
				entity.declaration.properties.some((property) => property.optional);

			const canBeUndefined =
				entity.declaration.type === "union" &&
				entity.declaration.values.length > 0 &&
				entity.declaration.values.some(
					(entity) => entity.type === "literal" && entity.value === undefined,
				);

			return factory.createBlock([
				factory.createFunctionDeclaration(
					[factory.createToken(SyntaxKind.ExportKeyword)],
					undefined,
					factory.createIdentifier(
						camelcase(generateDeclarationName(entity.name)),
					),
					[
						factory.createTypeParameterDeclaration(
							[factory.createToken(SyntaxKind.ConstKeyword)],
							factory.createIdentifier("T"),
							entity.declaration.type === "object" ||
								entity.declaration.type === "union"
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
						optionsParameter,
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
											createPropertyAccessChain([
												createIdentifierImport(
													"faker",
													"@faker-js/faker",
													{ named: true },
													context,
												),
												"seed",
											]),
											undefined,
											[createPropertyAccessChain(["options", "seed"])],
										),
									),
								],
								true,
							),
							undefined,
						),
						canBeUndefined
							? factory.createReturnStatement(
									factory.createConditionalExpression(
										factory.createBinaryExpression(
											factory.createBinaryExpression(
												factory.createStringLiteral("0"),
												factory.createToken(SyntaxKind.InKeyword),
												factory.createIdentifier("arguments"),
											),
											factory.createToken(SyntaxKind.AmpersandAmpersandToken),
											factory.createBinaryExpression(
												factory.createIdentifier(camelcase(entity.name)),
												factory.createToken(
													SyntaxKind.ExclamationEqualsEqualsToken,
												),
												factory.createIdentifier("_"),
											),
										),
										factory.createToken(SyntaxKind.QuestionToken),
										factory.createIdentifier(camelcase(entity.name)),
										factory.createToken(SyntaxKind.ColonToken),
										isOneOfKindOrThrow(
											context.next(
												{
													...context,
													parentEntity: entity,
													parentDeclarationEntity: entity,
													closestIdentifer: entity,
												},
												entity.declaration,
											),
											[
												SyntaxKind.ExpressionStatement,
												SyntaxKind.CallExpression,
												SyntaxKind.ObjectLiteralExpression,
												SyntaxKind.StringLiteral,
											],
										),
									),
								)
							: entity.declaration.type === "union"
								? factory.createReturnStatement(
										factory.createAsExpression(
											factory.createParenthesizedExpression(
												factory.createBinaryExpression(
													factory.createIdentifier(camelcase(entity.name)),
													factory.createToken(SyntaxKind.QuestionQuestionToken),
													isOneOfKindOrThrow(
														context.next(
															{
																...context,
																parentEntity: entity,
																parentDeclarationEntity: entity,
																closestIdentifer: context.closestIdentifer,
															},
															entity.declaration,
														),
														[
															SyntaxKind.ExpressionStatement,
															SyntaxKind.CallExpression,
														],
													),
												),
											),
											factory.createTypeReferenceNode(
												createIdentifierImport(
													"MergeDeep",
													"type-fest",
													{ named: true, typeOnly: true },
													context,
												),
												[
													factory.createTypeReferenceNode(
														createIdentifierImport(
															"NarrowUnionMember",
															"@gents/gents",
															{ named: true, typeOnly: true },
															context,
														),
														[
															factory.createTypeReferenceNode(
																factory.createIdentifier(entity.name),
																undefined,
															),
															factory.createTypeReferenceNode(
																factory.createIdentifier("T"),
																undefined,
															),
														],
													),
													factory.createTypeReferenceNode(
														factory.createIdentifier("T"),
														undefined,
													),
													factory.createTypeLiteralNode([
														factory.createPropertySignature(
															undefined,
															factory.createIdentifier("recurseIntoArrays"),
															undefined,
															factory.createLiteralTypeNode(
																factory.createTrue(),
															),
														),
													]),
												],
											),
										),
									)
								: factory.createReturnStatement(
										factory.createAsExpression(
											factory.createCallExpression(
												createIdentifierImport(
													"merge",
													"deepmerge",
													{},
													context,
												),
												undefined,
												[
													entity.declaration.type === "object"
														? factory.createSatisfiesExpression(
																factory.createAsExpression(
																	exactOptionalPropertyTypes &&
																		hasOptionalProperties
																		? factory.createCallExpression(
																				createIdentifierImport(
																					"omit",
																					"lodash.omit",
																					{},
																					context,
																				),
																				[],
																				[
																					factory.createCallExpression(
																						createPropertyAccessChain([
																							"faker",
																							"helpers",
																							"arrayElements",
																						]),
																						[],
																						[
																							factory.createArrayLiteralExpression(
																								entity.declaration.properties
																									.filter(
																										(property) =>
																											property.optional,
																									)
																									.map((property) =>
																										factory.createStringLiteral(
																											property.name,
																										),
																									),
																							),
																							factory.createObjectLiteralExpression(
																								[
																									factory.createPropertyAssignment(
																										"min",
																										factory.createNumericLiteral(
																											0,
																										),
																									),
																									factory.createPropertyAssignment(
																										"max",
																										factory.createNumericLiteral(
																											entity.declaration.properties.filter(
																												(property) =>
																													property.optional,
																											).length,
																										),
																									),
																								],
																							),
																						],
																					),
																					isOneOfKindOrThrow(
																						context.next(
																							{
																								...context,
																								parentEntity: entity,
																								parentDeclarationEntity: entity,
																								closestIdentifer: entity,
																							},
																							entity.declaration,
																						),
																						[
																							SyntaxKind.ExpressionStatement,
																							SyntaxKind.ObjectLiteralExpression,
																						],
																					),
																				],
																			)
																		: isOneOfKindOrThrow(
																				context.next(
																					{
																						...context,
																						parentEntity: entity,
																						parentDeclarationEntity: entity,
																						closestIdentifer: entity,
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
																		parentDeclarationEntity: entity,
																		closestIdentifer: entity,
																	},
																	entity.declaration,
																),
																[
																	SyntaxKind.ExpressionStatement,
																	SyntaxKind.CallExpression,
																	SyntaxKind.ObjectLiteralExpression,
																	SyntaxKind.StringLiteral,
																],
															),
													createNullishCoalescingExpression(
														factory.createIdentifier(camelcase(entity.name)),
														factory.createObjectLiteralExpression(),
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
				),
			]);
		},
		hints: identifierHints,
	},
	number: {
		create: (_, context) => {
			return factory.createCallExpression(
				createPropertyAccessChain([
					createIdentifierImport(
						"faker",
						"@faker-js/faker",
						{ named: true },
						context,
					),
					"number",
					"int",
				]),
				undefined,
				[],
			);
		},
	},
	literal: {
		create: (entity, context) => {
			if (typeof entity.value === "number") {
				return factory.createNumericLiteral(entity.value);
			}
			if (typeof entity.value === "string") {
				return factory.createStringLiteral(entity.value);
			}
			if (entity.value === undefined) {
				return factory.createIdentifier("undefined");
			}
			if (entity.value === null) {
				return factory.createNull();
			}

			throw new Error("Lol ", { cause: entity });
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
						SyntaxKind.StringLiteral,
					]);
				}),
				true,
			);
		},
	},
	string: {
		create: (entity, context) => {
			const nameHint = context.hints.find(
				(hint) => hint.name === "name" && hint.level <= 1,
			);

			const fakerImport = createIdentifierImport(
				"faker",
				"@faker-js/faker",
				{ named: true },
				context,
			);

			if (nameHint) {
				const company = context.hints.find(
					(hint) => hint.name === "company" && hint.level >= nameHint.level,
				);
				return factory.createCallExpression(
					createPropertyAccessChain([
						fakerImport,
						company ? "company" : "person",
						nameHint.value,
					]),
					undefined,
					[],
				);
			}
			const currencyCodeHint = context.hints.find(
				(hint) => hint.name === "currencyCode" && hint.level <= 1,
			);
			if (currencyCodeHint) {
				return factory.createCallExpression(
					createPropertyAccessChain([fakerImport, "finance", "currencyCode"]),
					undefined,
					[],
				);
			}
			const idHint = context.hints.find(
				(hint) => hint.name === "id" && hint.level === 1,
			);
			if (idHint) {
				return factory.createCallExpression(
					createPropertyAccessChain([fakerImport, "string", "uuid"]),
					undefined,
					[],
				);
			}

			const urlHint = context.hints.find(
				(hint) => hint.name === "url" && hint.level <= 1,
			);
			if (urlHint) {
				const avatarHint = context.hints.find(
					(hint) => hint.name === "avatar" && hint.level <= urlHint.level + 2,
				);
				if (avatarHint) {
					return factory.createCallExpression(
						createPropertyAccessChain([fakerImport, "image", "avatar"]),
						undefined,
						[],
					);
				}

				return factory.createCallExpression(
					createPropertyAccessChain([fakerImport, "internet", "url"]),
					undefined,
					[],
				);
			}
			const avatarHint = context.hints.find(
				(hint) => hint.name === "avatar" && hint.level <= 3,
			);

			if (avatarHint) {
				return factory.createCallExpression(
					createPropertyAccessChain([fakerImport, "image", "avatar"]),
					undefined,
					[],
				);
			}
			return factory.createCallExpression(
				createPropertyAccessChain([fakerImport, "string", "alpha"]),
				undefined,
				[],
			);
		},
	},
	union: {
		create: (entity, context) => {
			// Import selectFromUnion from @gents/gents
			const selectFromUnionImport = createIdentifierImport(
				"selectFromUnion",
				"@gents/gents",
				{ named: true },
				context,
			);

			// Create union members array with schema and generator for each value
			const unionMembersArray = factory.createArrayLiteralExpression(
				entity.values.map((value) => {
					// Generate the runtime schema for this union member
					const runtimeSchema = entityToSchema(value);

					// Create the generator function for this member
					const generatorFunction = factory.createArrowFunction(
						undefined,
						undefined,
						[],
						undefined,
						factory.createToken(SyntaxKind.EqualsGreaterThanToken),
						isOneOfKindOrThrow(
							context.next({ ...context, parentEntity: entity }, value),
							[
								SyntaxKind.CallExpression,
								SyntaxKind.Identifier,
								SyntaxKind.ArrayLiteralExpression,
								SyntaxKind.StringLiteral,
								SyntaxKind.ObjectLiteralExpression,
								SyntaxKind.NumericLiteral,
								SyntaxKind.NullKeyword,
							],
						) as Expression,
					);

					// Create union member object { schema, generator }
					// For now, use JSON.parse to create the schema at runtime (simpler than complex AST generation)
					return factory.createObjectLiteralExpression(
						[
							factory.createPropertyAssignment(
								factory.createIdentifier("schema"),
								factory.createCallExpression(
									factory.createPropertyAccessExpression(
										factory.createIdentifier("JSON"),
										factory.createIdentifier("parse"),
									),
									undefined,
									[factory.createStringLiteral(JSON.stringify(runtimeSchema))],
								),
							),
							factory.createPropertyAssignment(
								factory.createIdentifier("generator"),
								generatorFunction,
							),
						],
						true,
					);
				}),
				false,
			);

			// Get the provided data parameter name
			const providedDataParam = factory.createIdentifier(
				camelcase(context.parentDeclarationEntity?.name || "data"),
			);

			// Return selectFromUnion call
			return factory.createCallExpression(selectFromUnionImport, undefined, [
				unionMembersArray,
				providedDataParam,
			]);
		},
	},
};

// Convert parser Entity to runtime RuntimeSchema
export function entityToSchema(entity: Entity): RuntimeSchema {
	switch (entity.type) {
		case "object": {
			const properties: Record<string, PropertyInfo> = {};
			const requiredProperties: string[] = [];
			const optionalProperties: string[] = [];

			for (const prop of entity.properties) {
				properties[prop.name] = {
					schema: entityToSchema(prop.property),
					optional: prop.optional,
				};

				if (prop.optional) {
					optionalProperties.push(prop.name);
				} else {
					requiredProperties.push(prop.name);
				}
			}

			return {
				type: "object",
				properties,
				requiredProperties,
				optionalProperties,
			} satisfies ObjectSchema;
		}

		case "array":
			if (entity.tuple) {
				// Tuple - convert each element
				const elements = Array.isArray(entity.elements)
					? entity.elements.map((elem) => entityToSchema(elem))
					: [];
				return {
					type: "array",
					tuple: true,
					elements,
					readonly: entity.readonly,
				} satisfies ArraySchema;
			} else {
				// Regular array - single element type
				const elementSchema = Array.isArray(entity.elements)
					? ({ type: "primitive", primitiveType: "any" } as PrimitiveSchema) // fallback
					: entityToSchema(entity.elements);
				return {
					type: "array",
					tuple: false,
					elements: elementSchema,
					readonly: entity.readonly,
				} satisfies ArraySchema;
			}

		case "union":
			return {
				type: "union",
				members: entity.values.map((value) => entityToSchema(value)),
			} satisfies UnionSchema;

		case "literal":
			return {
				type: "literal",
				value: entity.value,
			} satisfies LiteralSchema;

		case "string":
		case "number":
		case "boolean":
		case "any":
		case "unknown":
			return {
				type: "primitive",
				primitiveType: entity.type,
			} satisfies PrimitiveSchema;

		case "booleanLiteral":
			return {
				type: "literal",
				value: entity.value,
			} satisfies LiteralSchema;

		case "reference":
			return {
				type: "reference",
				reference: entity.reference,
			} satisfies ReferenceSchema;

		case "alias":
			return {
				type: "reference",
				reference: entity.alias,
			} satisfies ReferenceSchema;

		// Fallback cases for unsupported types
		case "anonymous":
		case "never":
		case "enum":
		case "enumLiteral":
		case "utility":
		case "intersection":
			return {
				type: "primitive",
				primitiveType: "any",
			} satisfies PrimitiveSchema;

		default:
			// TypeScript should catch this, but just in case
			return {
				type: "primitive",
				primitiveType: "any",
			} satisfies PrimitiveSchema;
	}
}
