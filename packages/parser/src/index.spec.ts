import { Project } from "ts-morph";
import { codegen } from "./index.js";
import { describe, it, expect } from "@jest/globals";
import dedent from "ts-dedent";

describe("codegen", () => {
  it("should correctly resolve interface references", () => {
    const project = new Project({ useInMemoryFileSystem: true });

    project.createSourceFile(
      "test.ts",
      dedent`
          interface Cool {}

          interface MyInterface {
              myProperty: Cool;
          }
        `
    );

    const result = codegen(project);

    const expectedOutput = {
      name: "myProperty",
      type: "string",
    };

    expect(result).toMatchInlineSnapshot(`
[
  {
    "name": "test.ts",
    "typeDeclarations": [
      {
        "name": "Cool",
        "type": {
          "properties": [],
          "type": "object",
        },
      },
      {
        "name": "MyInterface",
        "type": {
          "properties": [
            {
              "name": "myProperty",
              "type": {
                "reference": "Cool",
                "type": "reference",
              },
            },
          ],
          "type": "object",
        },
      },
    ],
  },
]
`);
  });

  it("should correctly resolve type alias declarations", () => {
    const project = new Project({ useInMemoryFileSystem: true });

    project.createSourceFile(
      "test.ts",
      dedent`
        type FullUser = {
          id: number
          name: string
        }
      `
    );

    const result = codegen(project);

    expect(result).toMatchInlineSnapshot(`
[
  {
    "name": "test.ts",
    "typeDeclarations": [
      {
        "exported": false,
        "name": "FullUser",
        "type": {
          "properties": [
            {
              "name": "id",
              "type": {
                "type": "number",
              },
            },
            {
              "name": "name",
              "type": {
                "type": "string",
              },
            },
          ],
          "type": "object",
        },
      },
    ],
  },
]
`);
  });
  it("should correctly resolve resolved references", () => {
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
      `
    );

    const result = codegen(project);

    expect(result).toMatchInlineSnapshot(`
[
  {
    "name": "test.ts",
    "typeDeclarations": [
      {
        "exported": false,
        "name": "FullUser",
        "type": {
          "properties": [
            {
              "name": "id",
              "type": {
                "type": "number",
              },
            },
            {
              "name": "name",
              "type": {
                "type": "string",
              },
            },
          ],
          "type": "object",
        },
      },
      {
        "exported": false,
        "name": "User",
        "type": {
          "alias": "FullUser",
          "type": "alias",
        },
      },
    ],
  },
]
`);
  });
  it("should correctly resolve nested resolved references", () => {
    const project = new Project({ useInMemoryFileSystem: true });

    project.createSourceFile(
      "test.ts",
      dedent`

        interface Company {
          id: number
          name: number
        }

        interface FullUser {
          company: Company
        }
    
        declare const getUser: () => Promise<FullUser> | undefined
    
        type User = NonNullable<Awaited<ReturnType<typeof getUser>>>
      `
    );

    const result = codegen(project);

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
              "type": {
                "type": "number",
              },
            },
            {
              "name": "name",
              "type": {
                "type": "number",
              },
            },
          ],
          "type": "object",
        },
      },
      {
        "name": "FullUser",
        "type": {
          "properties": [
            {
              "name": "company",
              "type": {
                "reference": "Company",
                "type": "reference",
              },
            },
          ],
          "type": "object",
        },
      },
      {
        "exported": false,
        "name": "User",
        "type": {
          "alias": "FullUser",
          "type": "alias",
        },
      },
    ],
  },
]
`);
  });
});
