import { Project } from "ts-morph"
import { codegen } from "./index.js"
import { describe, it, expect } from "@jest/globals"
import dedent from "ts-dedent"

describe("codegen", () => {
  describe("primitives", () => {
    it("should correctly parse type `number`", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            type Number = number
          `
      )

      const result = codegen(project)

      expect(result?.[0]?.typeDeclarations?.[0]?.declarationType).toStrictEqual(
        {
          type: "number",
        }
      )
    })
    it("should correctly parse type `string`", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            type String = string
          `
      )

      const result = codegen(project)

      expect(result?.[0]?.typeDeclarations?.[0]?.declarationType).toStrictEqual(
        {
          type: "string",
        }
      )
    })
    it("should correctly parse type `boolean`", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            type Boolean = boolean
          `
      )

      const result = codegen(project)

      expect(result?.[0]?.typeDeclarations?.[0]?.declarationType).toStrictEqual(
        {
          type: "boolean",
        }
      )
    })
  })
  describe("tuples", () => {
    it("should correctly parse a tuple as tuple", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            type Tuple = [number]
          `
      )

      const result = codegen(project)

      const targetType = result[0]?.typeDeclarations[0]?.declarationType
      expect(targetType!.type === "array" && targetType?.tuple).toBe(true)
    })
    it.only("should correctly parse the tuple members", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            type Tuple = [number, string]
          `
      )

      const result = codegen(project)

      const targetType = result[0]?.typeDeclarations[0]?.declarationType
      expect(targetType!.type === "array" && targetType?.elements)
        .toMatchInlineSnapshot(`
[
  {
    "type": "number",
  },
  {
    "type": "string",
  },
]
`)
    })
  })
  describe("interfaces", () => {
    it("should correctly parse interfaces as objects", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            interface MyInterface {
            }
          `
      )

      const result = codegen(project)

      expect(result).toMatchInlineSnapshot(`
  [
    {
      "name": "test.ts",
      "typeDeclarations": [
        {
          "name": "MyInterface",
          "type": {
            "properties": [],
            "type": "object",
          },
        },
      ],
    },
  ]
  `)
    })
    it("should correctly parse properties as optional", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
      interface MyInterface {
        foo?: number
      }
    `
      )

      const [testFile] = codegen(project)

      expect(testFile?.typeDeclarations[0]).toMatchInlineSnapshot(`
{
  "name": "MyInterface",
  "type": {
    "properties": [
      {
        "name": "foo",
        "optional": true,
        "property": {
          "type": "number",
        },
      },
    ],
    "type": "object",
  },
}
`)
    })
  })

  describe("references", () => {
    it("should resolve direct type references to another interface", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
          interface Company {
              id: number
              name?: number
          }

          type AnotherCompany = Company
        `
      )

      const result = codegen(project)

      expect(
        result[0]?.typeDeclarations.find(
          (item) => item.name === "AnotherCompany"
        )
      ).toMatchInlineSnapshot(`
{
  "exported": false,
  "name": "AnotherCompany",
  "type": {
    "alias": "Company",
    "type": "alias",
  },
}
`)
    })
    it("should resolve direct type references to another type", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
          type Company = {
              id: number
              name?: number
          }

          type AnotherCompany = Company
        `
      )

      const result = codegen(project)

      expect(
        result[0]?.typeDeclarations.find(
          (item) => item.name === "AnotherCompany"
        )
      ).toMatchInlineSnapshot(`
{
  "exported": false,
  "name": "AnotherCompany",
  "type": {
    "alias": "Company",
    "type": "alias",
  },
}
`)
    })
    it("should correctly parse interface references as property type declaration to another interface", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
            interface Cool {}
  
            interface MyInterface {
                myProperty: Cool;
            }
          `
      )

      const result = codegen(project)

      expect(
        result[0]?.typeDeclarations.find((item) => item.name === "MyInterface")
      ).toMatchInlineSnapshot(`
{
  "name": "MyInterface",
  "type": {
    "properties": [
      {
        "name": "myProperty",
        "optional": false,
        "property": {
          "reference": "Cool",
          "type": "reference",
        },
      },
    ],
    "type": "object",
  },
}
`)
    })
  })

  describe("aliases", () => {
    it("should correctly parse computed type aliases", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
          type FullUser = {
            id: number
            name: string
          }
      
          declare const getUser: () => Promise<FullUser> | undefined
      
          type User = Awaited<ReturnType<typeof getUser>>
        `
      )

      const result = codegen(project)

      expect(result[0]?.typeDeclarations.find((item) => item.name === "User"))
        .toMatchInlineSnapshot(`
{
  "exported": false,
  "name": "User",
  "type": {
    "alias": "FullUser",
    "type": "alias",
  },
}
`)
    })
    it("should correctly parse computed type aliases with interfaces", () => {
      const project = new Project({ useInMemoryFileSystem: true })

      project.createSourceFile(
        "test.ts",
        dedent`
          type FullUser = {
            id: number
            name: string
          }
      
          declare const getUser: () => Promise<FullUser> | undefined
      
          type User = Awaited<ReturnType<typeof getUser>>
        `
      )

      const result = codegen(project)

      expect(result[0]?.typeDeclarations.find((item) => item.name === "User"))
        .toMatchInlineSnapshot(`
{
  "exported": false,
  "name": "User",
  "type": {
    "alias": "FullUser",
    "type": "alias",
  },
}
`)
    })
  })

  it("should correctly parse nested array apparent type alias symbols", () => {
    const project = new Project({ useInMemoryFileSystem: true })

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
      `
    )

    const result = codegen(project)

    expect(result).toMatchInlineSnapshot(`
[
  {
    "name": "test.ts",
    "typeDeclarations": [
      {
        "name": "Company",
        "type": {
          "properties": [
            {
              "name": "id",
              "optional": false,
              "property": {
                "type": "number",
              },
            },
            {
              "name": "name",
              "optional": false,
              "property": {
                "type": "number",
              },
            },
          ],
          "type": "object",
        },
      },
      {
        "name": "AuthenticatedUser",
        "type": {
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
                "type": "array",
              },
            },
          ],
          "type": "object",
        },
      },
    ],
  },
]
`)
  })
  it("should correctly parse NonNullable utility type with unknown", () => {
    const project = new Project({ useInMemoryFileSystem: true })

    project.createSourceFile(
      "test.ts",
      dedent`
        type Bar = NonNullable<unknown>;
      `
    )

    const result = codegen(project)

    expect(result).toMatchInlineSnapshot(`
[
  {
    "name": "test.ts",
    "typeDeclarations": [
      {
        "exported": false,
        "name": "Bar",
        "type": {
          "properties": [],
          "type": "object",
        },
      },
    ],
  },
]
`)
  })
})
