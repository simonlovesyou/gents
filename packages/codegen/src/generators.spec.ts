import { FileEntity } from "@gents/parser"
import { generators } from "./generators"
import { printNode } from "ts-morph"
import { describe, it, expect } from "vitest"

describe("generators", () => {
  const defaultContext = {
    next: (() => {}) as any,
    parentEntity: {
      type: "file" as const,
      name: "foo",
      path: "./foo.ts",
      typeDeclarations: [],
    },
    generators: {} as unknown as typeof generators,
    fileEntity: undefined as unknown as FileEntity,
    hints: [],
    addImportDeclaration: () => {},
  }
  describe("string", () => {
    it("should by default create `faker.string.alpha()` call expression", () => {
      const result = generators.string.create(
        { type: "string" },
        defaultContext
      )

      expect(printNode(result)).toMatchInlineSnapshot(`"faker.string.alpha()"`)
    })

    describe("hints", () => {
      describe("objectProperty", () => {
        it('should generate the correct hints for object property "merchantName"', () => {
          expect(
            generators.objectProperty.hints?.map((hint) =>
              hint.create(
                {
                  type: "objectProperty" as const,
                  name: "merchantName",
                  property: { type: "string" },
                  optional: true,
                },
                defaultContext
              )
            )
          ).toMatchInlineSnapshot(`
            [
              "company",
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
            ]
          `)
        })
        it('should generate the correct hints for object property "currencyCode"', () => {
          expect(
            generators.objectProperty.hints?.map((hint) =>
              hint.create(
                {
                  type: "objectProperty" as const,
                  name: "currencyCode",
                  property: { type: "string" },
                  optional: true,
                },
                defaultContext
              )
            )
          ).toMatchInlineSnapshot(`
            [
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "currencyCode",
              undefined,
            ]
          `)
        })
        it('should generate the correct hints for object property "code" & there is a parent "currency" hint', () => {
          expect(
            generators.objectProperty.hints?.map((hint) =>
              hint.create(
                {
                  type: "objectProperty" as const,
                  name: "code",
                  property: { type: "string" },
                  optional: true,
                },
                {
                  ...defaultContext,
                  hints: [{ name: "currency", level: 1, value: "currency" }],
                }
              )
            )
          ).toMatchInlineSnapshot(`
            [
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "currencyCode",
              undefined,
            ]
          `)
        })
        it('should generate the correct hints for object property "merchantName" & there is a parent "company" hint', () => {
          expect(
            generators.objectProperty.hints?.map((hint) =>
              hint.create(
                {
                  type: "objectProperty" as const,
                  name: "merchantName",
                  property: { type: "string" },
                  optional: true,
                },
                {
                  ...defaultContext,
                  hints: [{ name: "company", level: 1, value: "company" }],
                }
              )
            )
          ).toMatchInlineSnapshot(`
            [
              "company",
              undefined,
              "name",
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
            ]
          `)
        })
        it('should generate the correct hints for object property "url"', () => {
          expect(
            generators.objectProperty.hints?.map((hint) =>
              hint.create(
                {
                  type: "objectProperty" as const,
                  name: "url",
                  property: { type: "string" },
                  optional: true,
                },
                defaultContext
              )
            )
          ).toMatchInlineSnapshot(`
            [
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              "url",
              undefined,
              undefined,
            ]
          `)
        })
      })
      describe("name", () => {
        const hintValues = ["firstName", "fullName", "middleName", "name"]
        describe.each(hintValues)("hint value: %s", (hintValue) => {
          it("should use the correct faker module & method to generate a name", () => {
            const result = generators.string.create(
              { type: "string" },
              {
                next: (() => {}) as any,
                parentEntity: {
                  type: "file",
                  name: "foo",
                  path: "./foo.ts",
                  typeDeclarations: [],
                },
                generators: {} as unknown as typeof generators,
                fileEntity: undefined as unknown as FileEntity,
                hints: [{ name: "name", value: hintValue, level: 1 }],
                addImportDeclaration: () => {},
              }
            )

            expect(printNode(result)).toBe(`faker.person.${hintValue}()`)
          })
        })
      })
      describe("company & name", () => {
        it("should use the correct company faker module & method to generate a name", () => {
          const result = generators.string.create(
            { type: "string" },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: "file",
                name: "foo",
                path: "./foo.ts",
                typeDeclarations: [],
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [
                { name: "name", value: "name", level: 1 },
                { name: "company", value: "company", level: 1 },
              ],
              addImportDeclaration: () => {},
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(
            `"faker.company.name()"`
          )
        })
      })
      describe("currencyCode", () => {
        it("should use the correct finance faker module & method to generate a currency code", () => {
          const result = generators.string.create(
            { type: "string" },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: "file",
                name: "foo",
                path: "./foo.ts",
                typeDeclarations: [],
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [
                { name: "currencyCode", value: "currencyCode", level: 1 },
              ],
              addImportDeclaration: () => {},
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(
            `"faker.finance.currencyCode()"`
          )
        })
      })
      describe("id", () => {
        it("should use the correct string faker module & method to generate an id", () => {
          const result = generators.string.create(
            { type: "string" },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: "file",
                name: "foo",
                path: "./foo.ts",
                typeDeclarations: [],
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: "id", value: "name", level: 1 }],
              addImportDeclaration: () => {},
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(
            `"faker.string.uuid()"`
          )
        })
      })
      describe("url", () => {
        it("should use the correct internet faker module & method to generate an url", () => {
          const result = generators.string.create(
            { type: "string" },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: "file",
                name: "foo",
                path: "./foo.ts",
                typeDeclarations: [],
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: "url", value: "url", level: 1 }],
              addImportDeclaration: () => {},
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(
            `"faker.internet.url()"`
          )
        })
      })
      describe("url & avatar", () => {
        it("should use the correct image faker module & method to generate an avatar", () => {
          const result = generators.string.create(
            { type: "string" },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: "file",
                name: "foo",
                path: "./foo.ts",
                typeDeclarations: [],
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [
                { name: "url", value: "url", level: 1 },
                { name: "avatar", value: "avatar", level: 2 },
              ],
              addImportDeclaration: () => {},
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(
            `"faker.image.avatar()"`
          )
        })
      })
      describe("avatar", () => {
        it("should use the correct image faker module & method to generate an avatar", () => {
          const result = generators.string.create(
            { type: "string" },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: "file",
                name: "foo",
                path: "./foo.ts",
                typeDeclarations: [],
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: "avatar", value: "avatar", level: 1 }],
              addImportDeclaration: () => {},
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(
            `"faker.image.avatar()"`
          )
        })
      })
    })
  })
})
