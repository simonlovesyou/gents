import dedent from "ts-dedent";
import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { parse } from "./index.js";

describe("codegen", () => {
	describe("primitives", () => {
		it("should correctly parse type `number`", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            type Number = number
          `,
			);

			const result = parse(project);

			expect(result?.[0]?.typeDeclarations?.[0]?.declaration).toStrictEqual({
				type: "number",
			});
		});
		it("should correctly parse type `string`", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            type String = string
          `,
			);

			const result = parse(project);

			expect(result?.[0]?.typeDeclarations?.[0]?.declaration).toStrictEqual({
				type: "string",
			});
		});
		it("should correctly parse type `boolean`", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            type Boolean = boolean
          `,
			);

			const result = parse(project);

			expect(result?.[0]?.typeDeclarations?.[0]?.declaration).toStrictEqual({
				type: "boolean",
			});
		});
	});
	describe("tuples", () => {
		it("should correctly parse a tuple as tuple", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            type Tuple = [number]
          `,
			);

			const result = parse(project);

			const targetType = result[0]?.typeDeclarations[0]?.declaration;
			expect(targetType!.type === "array" && targetType?.tuple).toBe(true);
		});
		it("should correctly parse the tuple members", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            type Tuple = [number, string]
          `,
			);

			const result = parse(project);

			const targetType = result[0]?.typeDeclarations[0]?.declaration;
			expect(
				targetType!.type === "array" && targetType?.elements,
			).toMatchInlineSnapshot(`
[
  {
    "type": "number",
  },
  {
    "type": "string",
  },
]
`);
		});
		it("should correctly parse optional tuple members", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            type Tuple = [number?]
          `,
			);

			const result = parse(project);

			const targetType = result[0]?.typeDeclarations[0]?.declaration;
			expect(
				targetType!.type === "array" && targetType?.elements,
			).toMatchInlineSnapshot(`
[
  {
    "optional": true,
    "type": "number",
  },
]
`);
		});
	});
	describe("interfaces", () => {
		it("should correctly parse interfaces as objects", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            interface MyInterface {
            }
          `,
			);

			const result = parse(project);

			expect(result).toMatchInlineSnapshot(`
        [
          {
            "name": "test.ts",
            "path": "/test.ts",
            "type": "file",
            "typeDeclarations": [
              {
                "declaration": {
                  "properties": [],
                  "type": "object",
                },
                "exported": false,
                "name": "MyInterface",
                "type": "declaration",
              },
            ],
          },
        ]
      `);
		});
		it("should correctly parse properties as optional", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
      interface MyInterface {
        foo?: number
      }
    `,
			);

			const [testFile] = parse(project);

			expect(testFile?.typeDeclarations[0]).toMatchInlineSnapshot(`
{
  "declaration": {
    "properties": [
      {
        "name": "foo",
        "optional": true,
        "property": {
          "type": "number",
        },
        "type": "objectProperty",
      },
    ],
    "type": "object",
  },
  "exported": false,
  "name": "MyInterface",
  "type": "declaration",
}
`);
		});
		describe("with compiler option `exactOptionalPropertyTypes`", () => {
			it("should parse optional properties correctly", () => {
				const project = new Project({
					useInMemoryFileSystem: true,
					compilerOptions: { noUncheckedIndexedAccess: true },
				});

				project.createSourceFile(
					"test.ts",
					dedent`
        interface MyInterface {
          foo?: number
        }
      `,
				);

				const [testFile] = parse(project);

				expect(testFile?.typeDeclarations[0]).toMatchInlineSnapshot(`
          {
            "declaration": {
              "properties": [
                {
                  "name": "foo",
                  "optional": true,
                  "property": {
                    "type": "number",
                  },
                  "type": "objectProperty",
                },
              ],
              "type": "object",
            },
            "exported": false,
            "name": "MyInterface",
            "type": "declaration",
          }
        `);
			});
		});
	});

	describe("references", () => {
		it("should resolve direct type references to another interface", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
          interface Company {
              id: number
              name?: number
          }

          type AnotherCompany = Company
        `,
			);

			const result = parse(project);

			expect(
				result[0]?.typeDeclarations.find(
					(item) => item.name === "AnotherCompany",
				),
			).toMatchInlineSnapshot(`
{
  "declaration": {
    "alias": "Company",
    "type": "alias",
  },
  "exported": false,
  "name": "AnotherCompany",
  "type": "declaration",
}
`);
		});
		it("should resolve direct type references to another type", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
          type Company = {
              id: number
              name?: number
          }

          type AnotherCompany = Company
        `,
			);

			const result = parse(project);

			expect(
				result[0]?.typeDeclarations.find(
					(item) => item.name === "AnotherCompany",
				),
			).toMatchInlineSnapshot(`
{
  "declaration": {
    "alias": "Company",
    "type": "alias",
  },
  "exported": false,
  "name": "AnotherCompany",
  "type": "declaration",
}
`);
		});
		it("should correctly parse interface references as property type declaration to another interface", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
            interface Cool {}
  
            interface MyInterface {
                myProperty: Cool;
            }
          `,
			);

			const result = parse(project);

			expect(
				result[0]?.typeDeclarations.find((item) => item.name === "MyInterface"),
			).toMatchInlineSnapshot(`
{
  "declaration": {
    "properties": [
      {
        "name": "myProperty",
        "optional": false,
        "property": {
          "reference": "Cool",
          "type": "reference",
        },
        "type": "objectProperty",
      },
    ],
    "type": "object",
  },
  "exported": false,
  "name": "MyInterface",
  "type": "declaration",
}
`);
		});
	});
	it("should correctly parse interface references as property type declaration to another type", () => {
		const project = new Project({ useInMemoryFileSystem: true });

		project.createSourceFile(
			"test.ts",
			dedent`
            const AvailableProperty = {
              foo: 'foo',
              bar: 'bar',
            } as const

            type AvailableProperty = (typeof AvailableProperty)[keyof typeof AvailableProperty]
  
            interface MyInterface {
                myProperty: AvailableProperty;
            }
          `,
		);

		const result = parse(project);

		expect(
			result[0]?.typeDeclarations.find((item) => item.name === "MyInterface"),
		).toMatchInlineSnapshot(`
{
  "declaration": {
    "properties": [
      {
        "name": "myProperty",
        "optional": false,
        "property": {
          "alias": "AvailableProperty",
          "type": "alias",
        },
        "type": "objectProperty",
      },
    ],
    "type": "object",
  },
  "exported": false,
  "name": "MyInterface",
  "type": "declaration",
}
`);
	});

	describe("aliases", () => {
		it("should correctly parse computed type aliases", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
          type FullUser = {
            id: number
            name: string
          }

          declare const getUser: () => Promise<FullUser> | undefined
      
          type User = Awaited<ReturnType<typeof getUser>>
        `,
			);

			const result = parse(project);

			expect(
				result[0]?.typeDeclarations.find((item) => item.name === "User"),
			).toMatchInlineSnapshot(`
{
  "declaration": {
    "alias": "FullUser",
    "type": "alias",
  },
  "exported": false,
  "name": "User",
  "type": "declaration",
}
`);
		});
		it("should correctly parse computed type aliases with interfaces", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
          type FullUser = {
            id: number
            name: string
          }
      
          declare const getUser: () => Promise<FullUser> | undefined
      
          type User = Awaited<ReturnType<typeof getUser>>
        `,
			);

			const result = parse(project);

			expect(
				result[0]?.typeDeclarations.find((item) => item.name === "User"),
			).toMatchInlineSnapshot(`
{
  "declaration": {
    "alias": "FullUser",
    "type": "alias",
  },
  "exported": false,
  "name": "User",
  "type": "declaration",
}
`);
		});
	});

	describe("objects", () => {
		it("should correctly parse object literals", () => {
			const project = new Project({ useInMemoryFileSystem: true });

			project.createSourceFile(
				"test.ts",
				dedent`
          type FullUser = {
            info: {
              id: number
              name: string
            }
          }
        `,
			);

			const result = parse(project);

			expect(
				result[0]?.typeDeclarations.find((item) => item.name === "FullUser"),
			).toMatchInlineSnapshot(`
        {
          "declaration": {
            "properties": [
              {
                "name": "info",
                "optional": false,
                "property": {
                  "properties": [
                    {
                      "name": "id",
                      "optional": false,
                      "property": {
                        "type": "number",
                      },
                      "type": "objectProperty",
                    },
                    {
                      "name": "name",
                      "optional": false,
                      "property": {
                        "type": "string",
                      },
                      "type": "objectProperty",
                    },
                  ],
                  "type": "object",
                },
                "type": "objectProperty",
              },
            ],
            "type": "object",
          },
          "exported": false,
          "name": "FullUser",
          "type": "declaration",
        }
      `);
		});
	});

	it("should correctly parse nested array apparent type alias symbols", () => {
		const project = new Project({ useInMemoryFileSystem: true });

		project.createSourceFile(
			"test.ts",
			dedent`
        interface Company {
          id: number
          name: number
        }

        interface AuthenticatedUser {
          companies: Company[]
        }
      `,
		);

		const result = parse(project);

		expect(result).toMatchInlineSnapshot(`
      [
        {
          "name": "test.ts",
          "path": "/test.ts",
          "type": "file",
          "typeDeclarations": [
            {
              "declaration": {
                "properties": [
                  {
                    "name": "id",
                    "optional": false,
                    "property": {
                      "type": "number",
                    },
                    "type": "objectProperty",
                  },
                  {
                    "name": "name",
                    "optional": false,
                    "property": {
                      "type": "number",
                    },
                    "type": "objectProperty",
                  },
                ],
                "type": "object",
              },
              "exported": false,
              "name": "Company",
              "type": "declaration",
            },
            {
              "declaration": {
                "properties": [
                  {
                    "name": "companies",
                    "optional": false,
                    "property": {
                      "elements": {
                        "reference": "Company",
                        "type": "reference",
                      },
                      "readonly": false,
                      "tuple": false,
                      "type": "array",
                    },
                    "type": "objectProperty",
                  },
                ],
                "type": "object",
              },
              "exported": false,
              "name": "AuthenticatedUser",
              "type": "declaration",
            },
          ],
        },
      ]
    `);
	});
	it("should correctly parse NonNullable utility type with unknown", () => {
		const project = new Project({ useInMemoryFileSystem: true });

		project.createSourceFile(
			"test.ts",
			dedent`
        type Bar = NonNullable<unknown>;
      `,
		);

		const result = parse(project);

		expect(result).toMatchInlineSnapshot(`
      [
        {
          "name": "test.ts",
          "path": "/test.ts",
          "type": "file",
          "typeDeclarations": [
            {
              "declaration": {
                "properties": [],
                "type": "object",
              },
              "exported": false,
              "name": "Bar",
              "type": "declaration",
            },
          ],
        },
      ]
    `);
	});
	describe("unions", () => {
		it("should correctly parse unions with an undefined element", () => {
			const project = new Project({
				useInMemoryFileSystem: true,
				compilerOptions: {
					strictNullChecks: true,
				},
			});

			project.createSourceFile(
				"test.ts",
				dedent`
          type Bar = "foo" | undefined
        `,
			);

			const result = parse(project);

			expect(result).toMatchInlineSnapshot(`
        [
          {
            "name": "test.ts",
            "path": "/test.ts",
            "type": "file",
            "typeDeclarations": [
              {
                "declaration": {
                  "type": "union",
                  "values": [
                    {
                      "type": "literal",
                      "value": undefined,
                    },
                    {
                      "type": "literal",
                      "value": "foo",
                    },
                  ],
                },
                "exported": false,
                "name": "Bar",
                "type": "declaration",
              },
            ],
          },
        ]
      `);
		});
		it("should correctly parse objects with an undefined element", () => {
			const project = new Project({
				useInMemoryFileSystem: true,
				compilerOptions: {
					strictNullChecks: true,
				},
			});

			project.createSourceFile(
				"test.ts",
				dedent`
          export type User = {
            id: string;
            status: 'active' | 'inactive' | 'pending';
          } | undefined
        `,
			);

			const result = parse(project);

			expect(result).toMatchInlineSnapshot(`
				[
				  {
				    "name": "test.ts",
				    "path": "/test.ts",
				    "type": "file",
				    "typeDeclarations": [
				      {
				        "declaration": {
				          "type": "union",
				          "values": [
				            {
				              "type": "literal",
				              "value": undefined,
				            },
				            {
				              "properties": [
				                {
				                  "name": "id",
				                  "optional": false,
				                  "property": {
				                    "type": "string",
				                  },
				                  "type": "objectProperty",
				                },
				                {
				                  "name": "status",
				                  "optional": false,
				                  "property": {
				                    "type": "union",
				                    "values": [
				                      {
				                        "type": "literal",
				                        "value": "active",
				                      },
				                      {
				                        "type": "literal",
				                        "value": "inactive",
				                      },
				                      {
				                        "type": "literal",
				                        "value": "pending",
				                      },
				                    ],
				                  },
				                  "type": "objectProperty",
				                },
				              ],
				              "type": "object",
				            },
				          ],
				        },
				        "exported": true,
				        "name": "User",
				        "type": "declaration",
				      },
				    ],
				  },
				]
			`);
		});
	});
});
