import { ts } from "ts-morph"
import { codegen, Generators } from "./index.js"
import { describe, it, expect } from "vitest"
import { generators } from "./generators.js"

const factory = ts.factory

describe("codegen", () => {
  it("should generate a source file matching the input source name", () => {
    const project = codegen(
      [
        {
          type: "file",
          name: "foo.ts",
          path: "/absolute/path/foo.ts",
          typeDeclarations: [],
        },
      ],
      generators,
      { outputFolder: "foo" }
    )
    console.log(project.getSourceFiles().map((f) => f.getFilePath()))
    expect(project.getSourceFileOrThrow("./foo/gen-foo.ts")).not.toBe(undefined)
  })

  describe("imports", () => {
    const rootEntities = [
      {
        type: "file",
        name: "foo.ts",
        path: "/absolute/path/foo.ts",
        typeDeclarations: [
          {
            type: "declaration",
            name: "Progress",
            declaration: {
              type: "object",
              properties: [],
            },
            exported: true,
          },
        ],
      },
    ] satisfies Parameters<typeof codegen>[0]

    const defaultOptions = {
      consolidateTypeImports: undefined,
      outputFolder: "foo" as const,
    }

    const importSpecifier = "foo-bar"

    const functionDeclaration = factory.createFunctionDeclaration(
      undefined,
      undefined,
      factory.createIdentifier("mockFunction"),
      undefined,
      [],
      undefined,
      factory.createBlock([], false)
    )

    describe("single `context.addImportDeclaration` call", () => {
      describe("single non-type named import", () => {
        const generators = {
          declaration: {
            create: (_, context) => {
              context.addImportDeclaration({
                named: [{ name: "foo", typeOnly: false }],
                specifier: importSpecifier,
                typeOnly: false,
              })
              return functionDeclaration
            },
          },
        } as Partial<Generators>
        it("should add a single import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclarations()
          ).toHaveLength(1)
        })
        it("should be the correct import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclaration(
                (importDeclaration) =>
                  importDeclaration.getModuleSpecifierValue() ===
                  importSpecifier
              )
              ?.getText()
          ).toMatchInlineSnapshot(`"import { foo } from "foo-bar";"`)
        })
      })
      describe("single type named import", () => {
        const generators = {
          declaration: {
            create: (_, context) => {
              context.addImportDeclaration({
                named: [{ name: "foo", typeOnly: true }],
                specifier: importSpecifier,
                typeOnly: false,
              })
              return functionDeclaration
            },
          },
        } as Partial<Generators>
        it("should add a single import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclarations()
          ).toHaveLength(1)
        })
        it("should be the correct import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclaration(
                (importDeclaration) =>
                  importDeclaration.getModuleSpecifierValue() ===
                  importSpecifier
              )
              ?.getText()
          ).toMatchInlineSnapshot(`"import type { foo } from "foo-bar";"`)
        })
      })
      describe("multiple non-type named imports", () => {
        const generators = {
          declaration: {
            create: (_, context) => {
              context.addImportDeclaration({
                named: [
                  { name: "foo", typeOnly: false },
                  { name: "bar", typeOnly: false },
                  { name: "quz", typeOnly: false },
                ],
                specifier: importSpecifier,
                typeOnly: false,
              })
              return functionDeclaration
            },
          },
        } as Partial<Generators>
        it("should add a single import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclarations()
          ).toHaveLength(1)
        })
        it("should be the correct import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclaration(
                (importDeclaration) =>
                  importDeclaration.getModuleSpecifierValue() ===
                  importSpecifier
              )
              ?.getText()
          ).toMatchInlineSnapshot(`"import { foo, bar, quz } from "foo-bar";"`)
        })
      })
      describe("multiple type named imports", () => {
        describe("options.consolidateTypeImports: true", () => {
          const options = {
            ...defaultOptions,
            consolidateTypeImports: true,
          }
          const generators = {
            declaration: {
              create: (_, context) => {
                context.addImportDeclaration({
                  named: [
                    { name: "foo", typeOnly: true },
                    { name: "bar", typeOnly: true },
                    { name: "quz", typeOnly: true },
                  ],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                return functionDeclaration
              },
            },
          } as Partial<Generators>
          it("should add a single import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclarations()
            ).toHaveLength(1)
          })
          it("should be the correct import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclaration(
                  (importDeclaration) =>
                    importDeclaration.getModuleSpecifierValue() ===
                    importSpecifier
                )
                ?.getText()
            ).toMatchInlineSnapshot(
              `"import type { foo, bar, quz } from "foo-bar";"`
            )
          })
        })
        describe("options.consolidateTypeImports: false", () => {
          const options = {
            ...defaultOptions,
            consolidateTypeImports: false,
          }
          const generators = {
            declaration: {
              create: (_, context) => {
                context.addImportDeclaration({
                  named: [
                    { name: "foo", typeOnly: true },
                    { name: "bar", typeOnly: true },
                    { name: "quz", typeOnly: true },
                  ],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                return functionDeclaration
              },
            },
          } as Partial<Generators>
          it("should add a single import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclarations()
            ).toHaveLength(1)
          })
          it("should be the correct import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclaration(
                  (importDeclaration) =>
                    importDeclaration.getModuleSpecifierValue() ===
                    importSpecifier
                )
                ?.getText()
            ).toMatchInlineSnapshot(
              `"import { type foo, type bar, type quz } from "foo-bar";"`
            )
          })
        })
      })
    })
    describe("multiple `context.addImportDeclaration` call", () => {
      describe("named non-type imports from same specifier", () => {
        const generators = {
          declaration: {
            create: (_, context) => {
              context.addImportDeclaration({
                named: [{ name: "foo", typeOnly: false }],
                specifier: importSpecifier,
                typeOnly: false,
              })
              context.addImportDeclaration({
                named: [{ name: "bar", typeOnly: false }],
                specifier: importSpecifier,
                typeOnly: false,
              })
              context.addImportDeclaration({
                named: [{ name: "quz", typeOnly: false }],
                specifier: importSpecifier,
                typeOnly: false,
              })
              return functionDeclaration
            },
          },
        } as Partial<Generators>
        it("should add a single import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclarations()
          ).toHaveLength(1)
        })
        it("should add the correct import statement", () => {
          const project = codegen(
            rootEntities,
            generators as Generators,
            defaultOptions
          )

          expect(
            project
              .getSourceFileOrThrow("./foo/gen-foo.ts")
              .getImportDeclaration(
                (importDeclaration) =>
                  importDeclaration.getModuleSpecifierValue() ===
                  importSpecifier
              )
              ?.getText()
          ).toMatchInlineSnapshot(`"import { foo, bar, quz } from "foo-bar";"`)
        })
      })
      describe("named type imports from same specifier", () => {
        describe("options.consolidateTypeImports: true", () => {
          const options = {
            ...defaultOptions,
            consolidateTypeImports: true,
          }

          const generators = {
            declaration: {
              create: (_, context) => {
                context.addImportDeclaration({
                  named: [{ name: "foo", typeOnly: true }],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                context.addImportDeclaration({
                  named: [{ name: "bar", typeOnly: true }],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                context.addImportDeclaration({
                  named: [{ name: "quz", typeOnly: true }],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                return functionDeclaration
              },
            },
          } as Partial<Generators>
          it("should add a single import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclarations()
            ).toHaveLength(1)
          })
          it("should add the correct import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclaration(
                  (importDeclaration) =>
                    importDeclaration.getModuleSpecifierValue() ===
                    importSpecifier
                )
                ?.getText()
            ).toMatchInlineSnapshot(
              `"import type { foo, bar, quz } from "foo-bar";"`
            )
          })
        })
        describe("options.consolidateTypeImports: false", () => {
          const options = {
            ...defaultOptions,
            consolidateTypeImports: false,
          }

          const generators = {
            declaration: {
              create: (_, context) => {
                context.addImportDeclaration({
                  named: [{ name: "foo", typeOnly: true }],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                context.addImportDeclaration({
                  named: [{ name: "bar", typeOnly: true }],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                context.addImportDeclaration({
                  named: [{ name: "quz", typeOnly: true }],
                  specifier: importSpecifier,
                  typeOnly: false,
                })
                return functionDeclaration
              },
            },
          } as Partial<Generators>
          it("should add a single import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclarations()
            ).toHaveLength(1)
          })
          it("should add the correct import statement", () => {
            const project = codegen(
              rootEntities,
              generators as Generators,
              options
            )

            expect(
              project
                .getSourceFileOrThrow("./foo/gen-foo.ts")
                .getImportDeclaration(
                  (importDeclaration) =>
                    importDeclaration.getModuleSpecifierValue() ===
                    importSpecifier
                )
                ?.getText()
            ).toMatchInlineSnapshot(
              `"import { type foo, type bar, type quz } from "foo-bar";"`
            )
          })
        })
      })
    })
  })
})
