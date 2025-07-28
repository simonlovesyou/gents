import { type DeclarationEntity, type FileEntity, ObjectPropertyEntity } from '@gents/parser'
import { Project, printNode } from 'ts-morph'
import { describe, expect, it, vi } from 'vitest'
import { next } from '.'
import { entityToSchema, generators } from './generators'

describe('generators', () => {
  const defaultContext = {
    next: next,
    parentEntity: {
      type: 'file' as const,
      name: 'foo',
      path: './foo.ts',
      typeDeclarations: []
    },
    parentDeclarationEntity: {
      type: 'declaration',
      name: 'Test',
      exported: false,
      declaration: {
        type: 'string'
      }
    } satisfies DeclarationEntity,
    generators: {} as unknown as typeof generators,
    fileEntity: undefined as unknown as FileEntity,
    hints: [],
    addImportDeclaration: () => {},
    project: new Project()
  }
  describe('string', () => {
    it('should by default create `faker.string.alpha()` call expression', () => {
      const result = generators.string.create({ type: 'string' }, defaultContext)

      expect(printNode(result)).toMatchInlineSnapshot(`"faker.string.alpha()"`)
    })

    describe('hints', () => {
      describe('objectProperty', () => {
        it('should generate the correct hints for object property "merchantName"', () => {
          expect(
            generators.objectProperty.hints?.map((hint) =>
              hint.create(
                {
                  type: 'objectProperty' as const,
                  name: 'merchantName',
                  property: { type: 'string' },
                  optional: true
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
                  type: 'objectProperty' as const,
                  name: 'currencyCode',
                  property: { type: 'string' },
                  optional: true
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
                  type: 'objectProperty' as const,
                  name: 'code',
                  property: { type: 'string' },
                  optional: true
                },
                {
                  ...defaultContext,
                  hints: [{ name: 'currency', level: 1, value: 'currency' }]
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
                  type: 'objectProperty' as const,
                  name: 'merchantName',
                  property: { type: 'string' },
                  optional: true
                },
                {
                  ...defaultContext,
                  hints: [{ name: 'company', level: 1, value: 'company' }]
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
                  type: 'objectProperty' as const,
                  name: 'url',
                  property: { type: 'string' },
                  optional: true
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
      describe('name', () => {
        const hintValues = ['firstName', 'fullName', 'middleName', 'name']
        describe.each(hintValues)('hint value: %s', (hintValue) => {
          it('should use the correct faker module & method to generate a name', () => {
            const result = generators.string.create(
              { type: 'string' },
              {
                next: (() => {}) as any,
                parentEntity: {
                  type: 'file',
                  name: 'foo',
                  path: './foo.ts',
                  typeDeclarations: []
                },
                generators: {} as unknown as typeof generators,
                fileEntity: undefined as unknown as FileEntity,
                hints: [{ name: 'name', value: hintValue, level: 1 }],
                addImportDeclaration: () => {},
                project: new Project()
              }
            )

            expect(printNode(result)).toBe(`faker.person.${hintValue}()`)
          })
        })
      })
      describe('company & name', () => {
        it('should use the correct company faker module & method to generate a name', () => {
          const result = generators.string.create(
            { type: 'string' },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: 'file',
                name: 'foo',
                path: './foo.ts',
                typeDeclarations: []
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [
                { name: 'name', value: 'name', level: 1 },
                { name: 'company', value: 'company', level: 1 }
              ],
              addImportDeclaration: () => {},
              project: new Project()
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(`"faker.company.name()"`)
        })
      })
      describe('currencyCode', () => {
        it('should use the correct finance faker module & method to generate a currency code', () => {
          const result = generators.string.create(
            { type: 'string' },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: 'file',
                name: 'foo',
                path: './foo.ts',
                typeDeclarations: []
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: 'currencyCode', value: 'currencyCode', level: 1 }],
              addImportDeclaration: () => {},
              project: new Project()
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(`"faker.finance.currencyCode()"`)
        })
      })
      describe('id', () => {
        it('should use the correct string faker module & method to generate an id', () => {
          const result = generators.string.create(
            { type: 'string' },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: 'file',
                name: 'foo',
                path: './foo.ts',
                typeDeclarations: []
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: 'id', value: 'name', level: 1 }],
              addImportDeclaration: () => {},
              project: new Project()
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(`"faker.string.uuid()"`)
        })
      })
      describe('url', () => {
        it('should use the correct internet faker module & method to generate an url', () => {
          const result = generators.string.create(
            { type: 'string' },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: 'file',
                name: 'foo',
                path: './foo.ts',
                typeDeclarations: []
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: 'url', value: 'url', level: 1 }],
              addImportDeclaration: () => {},
              project: new Project()
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(`"faker.internet.url()"`)
        })
      })
      describe('url & avatar', () => {
        it('should use the correct image faker module & method to generate an avatar', () => {
          const result = generators.string.create(
            { type: 'string' },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: 'file',
                name: 'foo',
                path: './foo.ts',
                typeDeclarations: []
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [
                { name: 'url', value: 'url', level: 1 },
                { name: 'avatar', value: 'avatar', level: 2 }
              ],
              addImportDeclaration: () => {},
              project: new Project()
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(`"faker.image.avatar()"`)
        })
      })
      describe('avatar', () => {
        it('should use the correct image faker module & method to generate an avatar', () => {
          const result = generators.string.create(
            { type: 'string' },
            {
              next: (() => {}) as any,
              parentEntity: {
                type: 'file',
                name: 'foo',
                path: './foo.ts',
                typeDeclarations: []
              },
              generators: {} as unknown as typeof generators,
              fileEntity: undefined as unknown as FileEntity,
              hints: [{ name: 'avatar', value: 'avatar', level: 1 }],
              addImportDeclaration: () => {},
              project: new Project()
            }
          )

          expect(printNode(result)).toMatchInlineSnapshot(`"faker.image.avatar()"`)
        })
      })
    })
  })
  describe('array', () => {
    describe('element = alias', () => {
      const result = generators.array.create(
        {
          type: 'array',
          elements: {
            type: 'alias',
            alias: 'Foo'
          },
          readonly: true,
          tuple: false
        },
        {
          ...defaultContext
        }
      )
      it('should generate the correct output', () => {
        expect(printNode(result)).toMatchInlineSnapshot(`
          "faker.helpers.multiple(() => generateFoo(), {
              count: test?.length ?? { max: faker.number.int(42), min: 0 }
          })"
        `)
      })
    })

    describe('element = string', () => {
      it('should generate faker.helpers.multiple with string generator', () => {
        const result = generators.array.create(
          {
            type: 'array',
            elements: { type: 'string' },
            readonly: false,
            tuple: false
          },
          {
            ...defaultContext,
            next: (context, entity) => {
              if (entity.type === 'string') {
                return generators.string.create(entity as any, context)
              }
              throw new Error('Unhandled entity type')
            }
          }
        )
        expect(printNode(result)).toMatchInlineSnapshot(`
          "faker.helpers.multiple(() => faker.string.alpha(), {
              count: test?.length ?? { max: faker.number.int(42), min: 0 }
          })"
        `)
      })
    })

    describe('tuple array', () => {
      it('should generate array literal for tuple with specific elements', () => {
        const result = generators.array.create(
          {
            type: 'array',
            elements: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
            readonly: false,
            tuple: true
          },
          {
            ...defaultContext,
            next: (context, entity) => {
              if (entity.type === 'string') {
                return generators.string.create(entity as any, context)
              }
              if (entity.type === 'number') {
                return generators.number.create(entity as any, context)
              }
              if (entity.type === 'boolean') {
                return generators.boolean.create(entity as any, context)
              }
              throw new Error('Unhandled entity type')
            }
          }
        )
        expect(printNode(result)).toMatchInlineSnapshot(
          `"[faker.string.alpha(), faker.number.int(), faker.datatype.boolean()]"`
        )
      })

      it('should generate array literal for tuple with optional elements', () => {
        const result = generators.array.create(
          {
            type: 'array',
            elements: [{ type: 'string' }, { type: 'number', optional: true }],
            readonly: false,
            tuple: true
          },
          {
            ...defaultContext,
            next: (context, entity) => {
              if (entity.type === 'string') {
                return generators.string.create(entity as any, context)
              }
              if (entity.type === 'number') {
                return generators.number.create(entity as any, context)
              }
              throw new Error('Unhandled entity type')
            }
          }
        )
        expect(printNode(result)).toMatchInlineSnapshot(
          `"[faker.string.alpha(), faker.number.int()]"`
        )
      })
    })
  })

  describe('reference', () => {
    describe('Date', () => {
      const result = generators.reference.create(
        {
          type: 'reference',
          reference: 'Date'
        },
        {
          ...defaultContext
        }
      )
      it('should generate the correct output', () => {
        expect(printNode(result)).toMatchInlineSnapshot(`"faker.date.anytime()"`)
      })
    })

    describe('custom type reference', () => {
      it('should generate call to generated function for User type', () => {
        const result = generators.reference.create(
          {
            type: 'reference',
            reference: 'User'
          },
          defaultContext
        )
        expect(printNode(result)).toMatchInlineSnapshot(`"generateUser()"`)
      })

      it('should generate call to generated function for ProductInfo type', () => {
        const result = generators.reference.create(
          {
            type: 'reference',
            reference: 'ProductInfo'
          },
          defaultContext
        )
        expect(printNode(result)).toMatchInlineSnapshot(`"generateProductInfo()"`)
      })
    })
  })

  describe('anonymous', () => {
    it('should generate anonymous string literal', () => {
      const result = generators.anonymous.create({ type: 'anonymous' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`""anonymous""`)
    })
  })

  describe('any', () => {
    it('should generate any string literal', () => {
      const result = generators.any.create({ type: 'any' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`""any""`)
    })
  })

  describe('boolean', () => {
    it('should generate faker.datatype.boolean() call', () => {
      const result = generators.boolean.create({ type: 'boolean' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`"faker.datatype.boolean()"`)
    })
  })

  describe('booleanLiteral', () => {
    it('should generate faker.datatype.boolean() call for true literal', () => {
      const result = generators.booleanLiteral.create(
        { type: 'booleanLiteral', value: true },
        defaultContext
      )
      expect(printNode(result)).toMatchInlineSnapshot(`"faker.datatype.boolean()"`)
    })

    it('should generate faker.datatype.boolean() call for false literal', () => {
      const result = generators.booleanLiteral.create(
        { type: 'booleanLiteral', value: false },
        defaultContext
      )
      expect(printNode(result)).toMatchInlineSnapshot(`"faker.datatype.boolean()"`)
    })
  })

  describe('number', () => {
    it('should generate faker.number.int() call', () => {
      const result = generators.number.create({ type: 'number' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`"faker.number.int()"`)
    })
  })

  describe('literal', () => {
    it('should generate numeric literal for number values', () => {
      const result = generators.literal.create({ type: 'literal', value: 42 }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`"42"`)
    })

    it('should generate string literal for string values', () => {
      const result = generators.literal.create({ type: 'literal', value: 'hello' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`""hello""`)
    })

    it('should generate undefined identifier for undefined values', () => {
      const result = generators.literal.create(
        { type: 'literal', value: undefined },
        defaultContext
      )
      expect(printNode(result)).toMatchInlineSnapshot(`"undefined"`)
    })

    it('should generate null literal for null values', () => {
      const result = generators.literal.create({ type: 'literal', value: null }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`"null"`)
    })
  })

  describe('enumLiteral', () => {
    it('should generate enumLiteral string literal', () => {
      const result = generators.enumLiteral.create({ type: 'enumLiteral' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`""enumLiteral""`)
    })
  })

  describe('never', () => {
    it('should generate any string literal', () => {
      const result = generators.never.create({ type: 'never' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`""any""`)
    })
  })

  describe('enum', () => {
    it('should generate objectProperty string literal', () => {
      const result = generators.enum.create(
        {
          type: 'enum',
          properties: [
            {
              name: 'VALUE_ONE',
              property: { type: 'literal', value: 'one' },
              optional: false
            }
          ]
        },
        defaultContext
      )
      expect(printNode(result)).toMatchInlineSnapshot(`""objectProperty""`)
    })
  })

  describe('unknown', () => {
    it('should generate enumLiteral string literal', () => {
      const result = generators.unknown.create({ type: 'unknown' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`""enumLiteral""`)
    })
  })

  describe('object', () => {
    it('should generate object literal with string property', () => {
      const result = generators.object.create(
        {
          type: 'object',
          properties: [
            {
              type: 'objectProperty',
              name: 'name',
              property: { type: 'string' },
              optional: false
            }
          ]
        },
        {
          ...defaultContext,
          next: (context, entity) => {
            if (entity.type === 'objectProperty') {
              return generators.objectProperty.create(entity as any, context)
            }
            if (entity.type === 'string') {
              return generators.string.create(entity as any, context)
            }
            throw new Error('Unhandled entity type')
          }
        }
      )
      expect(printNode(result)).toMatchInlineSnapshot(`
        "{
            name: faker.string.alpha()
        }"
      `)
    })

    it('should generate object literal with multiple properties', () => {
      const result = generators.object.create(
        {
          type: 'object',
          properties: [
            {
              type: 'objectProperty',
              name: 'id',
              property: { type: 'number' },
              optional: false
            },
            {
              type: 'objectProperty',
              name: 'email',
              property: { type: 'string' },
              optional: true
            }
          ]
        },
        {
          ...defaultContext,
          next: (context, entity) => {
            if (entity.type === 'objectProperty') {
              return generators.objectProperty.create(entity as any, context)
            }
            if (entity.type === 'string') {
              return generators.string.create(entity as any, context)
            }
            if (entity.type === 'number') {
              return generators.number.create(entity as any, context)
            }
            throw new Error('Unhandled entity type')
          }
        }
      )
      expect(printNode(result)).toMatchInlineSnapshot(`
        "{
            id: faker.number.int(),
            email: faker.string.alpha()
        }"
      `)
    })

    it('should generate empty object literal for no properties', () => {
      const result = generators.object.create(
        {
          type: 'object',
          properties: []
        },
        defaultContext
      )
      expect(printNode(result)).toMatchInlineSnapshot(`"{}"`)
    })
  })

  describe('union', () => {
    it('should generate selectFromUnion call with string literals', () => {
      const result = generators.union.create(
        {
          type: 'union',
          values: [
            { type: 'literal', value: 'red' },
            { type: 'literal', value: 'green' },
            { type: 'literal', value: 'blue' }
          ]
        },
        {
          ...defaultContext,
          next: (context, entity) => {
            if (entity.type === 'literal') {
              return generators.literal.create(entity as any, context)
            }
            throw new Error('Unhandled entity type')
          }
        }
      )
      expect(printNode(result)).toMatchInlineSnapshot(`
        "selectFromUnion([{
                schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":\\"red\\"}"),
                generator: () => "red"
            }, {
                schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":\\"green\\"}"),
                generator: () => "green"
            }, {
                schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":\\"blue\\"}"),
                generator: () => "blue"
            }], test)"
      `)
    })

    it('should generate selectFromUnion call with mixed types', () => {
      const result = generators.union.create(
        {
          type: 'union',
          values: [
            { type: 'literal', value: 'text' },
            { type: 'literal', value: 42 },
            { type: 'boolean' }
          ]
        },
        {
          ...defaultContext,
          next: (context, entity) => {
            if (entity.type === 'literal') {
              return generators.literal.create(entity as any, context)
            }
            if (entity.type === 'boolean') {
              return generators.boolean.create(entity as any, context)
            }
            throw new Error('Unhandled entity type')
          }
        }
      )
      expect(printNode(result)).toMatchInlineSnapshot(`
        "selectFromUnion([{
                schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":\\"text\\"}"),
                generator: () => "text"
            }, {
                schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":42}"),
                generator: () => 42
            }, {
                schema: JSON.parse("{\\"type\\":\\"primitive\\",\\"primitiveType\\":\\"boolean\\"}"),
                generator: () => faker.datatype.boolean()
            }], test)"
      `)
    })
  })

  describe('alias', () => {
    it('should generate call to generated function with camelCase name', () => {
      const result = generators.alias.create(
        { type: 'alias', alias: 'UserProfile' },
        defaultContext
      )
      expect(printNode(result)).toMatchInlineSnapshot(`"generateUserProfile()"`)
    })

    it('should generate call for single word alias', () => {
      const result = generators.alias.create({ type: 'alias', alias: 'User' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`"generateUser()"`)
    })
  })

  describe('intersection', () => {
    it('should generate object literal with intersection property', () => {
      const result = generators.intersection.create({ type: 'intersection' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`
        "{
            intersection: true
        }"
      `)
    })
  })

  describe('utility', () => {
    it('should generate object literal with utility property', () => {
      const result = generators.utility.create({ type: 'utility' }, defaultContext)
      expect(printNode(result)).toMatchInlineSnapshot(`
        "{
            utility: true
        }"
      `)
    })
  })

  describe('declaration', () => {
    const createMockContext = (overrides = {}) => ({
      ...defaultContext,
      fileEntity: {
        type: 'file' as const,
        name: 'test.ts',
        path: './test.ts',
        typeDeclarations: []
      },
      addImportDeclaration: vi.fn(),
      project: {
        getCompilerOptions: () => ({ exactOptionalPropertyTypes: false })
      } as any,
      next: (context, entity) => {
        if (entity.type === 'object') {
          return generators.object.create(entity as any, context)
        }
        if (entity.type === 'objectProperty') {
          return generators.objectProperty.create(entity as any, context)
        }
        if (entity.type === 'string') {
          return generators.string.create(entity as any, context)
        }
        if (entity.type === 'number') {
          return generators.number.create(entity as any, context)
        }
        if (entity.type === 'union') {
          return generators.union.create(entity as any, context)
        }
        if (entity.type === 'literal') {
          return generators.literal.create(entity as any, context)
        }
        throw new Error(`Unhandled entity type: ${entity.type}`)
      },
      ...overrides
    })

    describe('basic object declaration', () => {
      it('should generate function declaration for simple object type', () => {
        const mockContext = createMockContext()
        const result = generators.declaration.create(
          {
            type: 'declaration',
            name: 'User',
            exported: true,
            declaration: {
              type: 'object',
              properties: [
                {
                  type: 'objectProperty',
                  name: 'name',
                  property: { type: 'string' },
                  optional: false
                },
                {
                  type: 'objectProperty',
                  name: 'age',
                  property: { type: 'number' },
                  optional: false
                }
              ]
            }
          },
          mockContext
        )

        expect(printNode(result)).toMatchInlineSnapshot(`
					"{
					    export function generateUser(user?: never, options?: {
					        seed: number | number[];
					    }): User;
					    export function generateUser<const T extends undefined>(user?: T, options?: {
					        seed: number | number[];
					    }): User;
					    export function generateUser<const T extends typeof _>(user: T, options?: {
					        seed: number | number[];
					    }): User;
					    export function generateUser<const T extends PartialDeep<User>>(user: T, options?: {
					        seed: number | number[];
					    }): MergeResult<User, T, {
					        preferUndefinedSource: false;
					    }>;
					    export function generateUser<const T extends PartialDeep<User>>(user?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge({
					        name: faker.string.alpha(),
					        age: faker.number.int()
					    }, user, { preferUndefinedSource: false }); }
					}"
				`)
        expect(mockContext.addImportDeclaration).toHaveBeenCalledWith({
          named: [{ name: 'User', typeOnly: true }],
          specifier: './test.ts',
          typeOnly: false
        })
      })
    })

    describe('union with undefined', () => {
      it('should generate function overloads for union type with undefined', () => {
        const mockContext = createMockContext()
        const result = generators.declaration.create(
          {
            type: 'declaration',
            name: 'OptionalUser',
            exported: true,
            declaration: {
              type: 'union',
              values: [
                {
                  type: 'object',
                  properties: [
                    {
                      type: 'objectProperty',
                      name: 'name',
                      property: { type: 'string' },
                      optional: false
                    }
                  ]
                },
                { type: 'literal', value: undefined }
              ]
            }
          },
          mockContext
        )

        expect(printNode(result)).toMatchInlineSnapshot(`
					"{
					    export function generateOptionalUser<const T extends undefined>(optionalUser: T, options?: {
					        seed: number | number[];
					    }): undefined;
					    export function generateOptionalUser(optionalUser?: never, options?: {
					        seed: number | number[];
					    }): OptionalUser;
					    export function generateOptionalUser<const T extends typeof _>(optionalUser: T, options?: {
					        seed: number | number[];
					    }): OptionalUser;
					    export function generateOptionalUser<const T extends OptionalUser>(optionalUser: T, options?: {
					        seed: number | number[];
					    }): T;
					    export function generateOptionalUser<const T extends OptionalUser | undefined | typeof _>(optionalUser?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge(selectFromUnion([{
					            schema: JSON.parse("{\\"type\\":\\"object\\",\\"properties\\":{\\"name\\":{\\"schema\\":{\\"type\\":\\"primitive\\",\\"primitiveType\\":\\"string\\"},\\"optional\\":false}},\\"requiredProperties\\":[\\"name\\"],\\"optionalProperties\\":[]}"),
					            generator: () => ({
					                name: faker.string.alpha()
					            })
					        }, {
					            schema: JSON.parse("{\\"type\\":\\"literal\\"}"),
					            generator: () => undefined
					        }], optionalUser), optionalUser, { preferUndefinedSource: true }); }
					}"
				`)
      })
    })

    describe('union without undefined', () => {
      it('should generate function with nullish coalescing for regular union', () => {
        const mockContext = createMockContext()
        const result = generators.declaration.create(
          {
            type: 'declaration',
            name: 'Status',
            exported: true,
            declaration: {
              type: 'union',
              values: [
                { type: 'literal', value: 'active' },
                { type: 'literal', value: 'inactive' }
              ]
            }
          },
          mockContext
        )

        expect(printNode(result)).toMatchInlineSnapshot(`
					"{
					    export function generateStatus(status?: never, options?: {
					        seed: number | number[];
					    }): Status;
					    export function generateStatus<const T extends undefined>(status?: T, options?: {
					        seed: number | number[];
					    }): Status;
					    export function generateStatus<const T extends Status>(status: T, options?: {
					        seed: number | number[];
					    }): T;
					    export function generateStatus<const T extends Status | typeof _>(status: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge(selectFromUnion([{
					            schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":\\"active\\"}"),
					            generator: () => "active"
					        }, {
					            schema: JSON.parse("{\\"type\\":\\"literal\\",\\"value\\":\\"inactive\\"}"),
					            generator: () => "inactive"
					        }], status), status, { preferUndefinedSource: false }); }
					}"
				`)
      })
    })

    describe('string declaration', () => {
      it('should generate function for simple string type', () => {
        const mockContext = createMockContext()
        const result = generators.declaration.create(
          {
            type: 'declaration',
            name: 'Email',
            exported: true,
            declaration: { type: 'string' }
          },
          mockContext
        )

        expect(printNode(result)).toMatchInlineSnapshot(`
					"{
					    export function generateEmail<const T extends Email>(email?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge(faker.string.alpha(), email, { preferUndefinedSource: false }); }
					}"
				`)
      })
    })

    describe('object with optional properties', () => {
      it('should handle optional properties without exactOptionalPropertyTypes', () => {
        const mockContext = createMockContext({
          project: {
            getCompilerOptions: () => ({ exactOptionalPropertyTypes: false })
          }
        })

        const result = generators.declaration.create(
          {
            type: 'declaration',
            name: 'Profile',
            exported: true,
            declaration: {
              type: 'object',
              properties: [
                {
                  type: 'objectProperty',
                  name: 'name',
                  property: { type: 'string' },
                  optional: false
                },
                {
                  type: 'objectProperty',
                  name: 'bio',
                  property: { type: 'string' },
                  optional: true
                }
              ]
            }
          },
          mockContext
        )

        expect(printNode(result)).toMatchInlineSnapshot(`
					"{
					    export function generateProfile(profile?: never, options?: {
					        seed: number | number[];
					    }): Profile;
					    export function generateProfile<const T extends undefined>(profile?: T, options?: {
					        seed: number | number[];
					    }): Profile;
					    export function generateProfile<const T extends typeof _>(profile: T, options?: {
					        seed: number | number[];
					    }): Profile;
					    export function generateProfile<const T extends PartialDeep<Profile>>(profile: T, options?: {
					        seed: number | number[];
					    }): MergeResult<Profile, T, {
					        preferUndefinedSource: false;
					    }>;
					    export function generateProfile<const T extends PartialDeep<Profile>>(profile?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge({
					        name: faker.string.alpha(),
					        bio: faker.string.alpha()
					    }, profile, { preferUndefinedSource: false }); }
					}"
				`)
      })

      it('should handle optional properties with exactOptionalPropertyTypes', () => {
        const mockContext = createMockContext({
          project: {
            getCompilerOptions: () => ({ exactOptionalPropertyTypes: true })
          }
        })

        const result = generators.declaration.create(
          {
            type: 'declaration',
            name: 'Profile',
            exported: true,
            declaration: {
              type: 'object',
              properties: [
                {
                  type: 'objectProperty',
                  name: 'name',
                  property: { type: 'string' },
                  optional: false
                },
                {
                  type: 'objectProperty',
                  name: 'bio',
                  property: { type: 'string' },
                  optional: true
                },
                {
                  type: 'objectProperty',
                  name: 'avatar',
                  property: { type: 'string' },
                  optional: true
                }
              ]
            }
          },
          mockContext
        )

        expect(printNode(result)).toMatchInlineSnapshot(`
					"{
					    export function generateProfile(profile?: never, options?: {
					        seed: number | number[];
					    }): Profile;
					    export function generateProfile<const T extends undefined>(profile?: T, options?: {
					        seed: number | number[];
					    }): Profile;
					    export function generateProfile<const T extends typeof _>(profile: T, options?: {
					        seed: number | number[];
					    }): Profile;
					    export function generateProfile<const T extends PartialDeep<Profile>>(profile: T, options?: {
					        seed: number | number[];
					    }): MergeResult<Profile, T, {
					        preferUndefinedSource: false;
					    }>;
					    export function generateProfile<const T extends PartialDeep<Profile>>(profile?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge({
					        name: faker.string.alpha(),
					        bio: faker.string.alpha(),
					        avatar: faker.string.alpha()
					    }, profile, { preferUndefinedSource: false }); }
					}"
				`)
      })
    })

    describe('import declarations', () => {
      it('should add correct import declarations', () => {
        const mockContext = createMockContext()
        generators.declaration.create(
          {
            type: 'declaration',
            name: 'TestType',
            exported: true,
            declaration: { type: 'string' }
          },
          mockContext
        )

        expect(mockContext.addImportDeclaration).toHaveBeenCalledWith({
          named: [{ name: 'TestType', typeOnly: true }],
          specifier: './test.ts',
          typeOnly: false
        })
      })
    })

    describe('function naming', () => {
      it('should generate camelCase function names', () => {
        const mockContext = createMockContext()

        const result1 = generators.declaration.create(
          {
            type: 'declaration',
            name: 'UserProfile',
            exported: true,
            declaration: { type: 'string' }
          },
          mockContext
        )
        expect(printNode(result1)).toMatchInlineSnapshot(`
					"{
					    export function generateUserProfile<const T extends UserProfile>(userProfile?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge(faker.string.alpha(), userProfile, { preferUndefinedSource: false }); }
					}"
				`)

        const result2 = generators.declaration.create(
          {
            type: 'declaration',
            name: 'APIResponse',
            exported: true,
            declaration: { type: 'string' }
          },
          mockContext
        )
        expect(printNode(result2)).toMatchInlineSnapshot(`
					"{
					    export function generateApiResponse<const T extends APIResponse>(apiResponse?: T, options?: {
					        seed: number | number[];
					    }) { if (options?.seed !== undefined) {
					        faker.seed(options.seed);
					    } return merge(faker.string.alpha(), apiResponse, { preferUndefinedSource: false }); }
					}"
				`)
      })
    })
  })

  describe('entityToSchema', () => {
    describe('object entities', () => {
      it('should convert object entity to ObjectSchema', () => {
        const objectEntity = {
          type: 'object' as const,
          properties: [
            {
              type: 'objectProperty' as const,
              name: 'email',
              property: { type: 'string' as const },
              optional: false
            },
            {
              type: 'objectProperty' as const,
              name: 'name',
              property: { type: 'string' as const },
              optional: true
            }
          ]
        }

        const result = entityToSchema(objectEntity)

        expect(result).toEqual({
          type: 'object',
          properties: {
            email: {
              schema: { type: 'primitive', primitiveType: 'string' },
              optional: false
            },
            name: {
              schema: { type: 'primitive', primitiveType: 'string' },
              optional: true
            }
          },
          requiredProperties: ['email'],
          optionalProperties: ['name']
        })
      })
    })

    describe('union entities', () => {
      it('should convert union entity to UnionSchema', () => {
        const unionEntity = {
          type: 'union' as const,
          values: [
            { type: 'string' as const },
            { type: 'number' as const },
            { type: 'literal' as const, value: null }
          ]
        }

        const result = entityToSchema(unionEntity)

        expect(result).toEqual({
          type: 'union',
          members: [
            { type: 'primitive', primitiveType: 'string' },
            { type: 'primitive', primitiveType: 'number' },
            { type: 'literal', value: null }
          ]
        })
      })
    })

    describe('array entities', () => {
      it('should convert tuple array entity to ArraySchema', () => {
        const tupleEntity = {
          type: 'array' as const,
          tuple: true as const,
          readonly: false,
          elements: [{ type: 'string' as const }, { type: 'number' as const }]
        }

        const result = entityToSchema(tupleEntity)

        expect(result).toEqual({
          type: 'array',
          tuple: true,
          elements: [
            { type: 'primitive', primitiveType: 'string' },
            { type: 'primitive', primitiveType: 'number' }
          ],
          readonly: false
        })
      })

      it('should convert regular array entity to ArraySchema', () => {
        const arrayEntity = {
          type: 'array' as const,
          tuple: false as const,
          readonly: false,
          elements: { type: 'string' as const }
        }

        const result = entityToSchema(arrayEntity)

        expect(result).toEqual({
          type: 'array',
          tuple: false,
          elements: { type: 'primitive', primitiveType: 'string' },
          readonly: false
        })
      })
    })

    describe('primitive entities', () => {
      it('should convert string entity to PrimitiveSchema', () => {
        const result = entityToSchema({ type: 'string' as const })
        expect(result).toEqual({ type: 'primitive', primitiveType: 'string' })
      })

      it('should convert number entity to PrimitiveSchema', () => {
        const result = entityToSchema({ type: 'number' as const })
        expect(result).toEqual({ type: 'primitive', primitiveType: 'number' })
      })

      it('should convert boolean entity to PrimitiveSchema', () => {
        const result = entityToSchema({ type: 'boolean' as const })
        expect(result).toEqual({ type: 'primitive', primitiveType: 'boolean' })
      })

      it('should convert any entity to PrimitiveSchema', () => {
        const result = entityToSchema({ type: 'any' as const })
        expect(result).toEqual({ type: 'primitive', primitiveType: 'any' })
      })
    })

    describe('literal entities', () => {
      it('should convert literal entity to LiteralSchema', () => {
        const result = entityToSchema({
          type: 'literal' as const,
          value: 'test'
        })
        expect(result).toEqual({ type: 'literal', value: 'test' })
      })

      it('should convert booleanLiteral entity to LiteralSchema', () => {
        const result = entityToSchema({
          type: 'booleanLiteral' as const,
          value: true
        })
        expect(result).toEqual({ type: 'literal', value: true })
      })
    })

    describe('reference entities', () => {
      it('should convert reference entity to ReferenceSchema', () => {
        const result = entityToSchema({
          type: 'reference' as const,
          reference: 'User'
        })
        expect(result).toEqual({ type: 'reference', reference: 'User' })
      })

      it('should convert alias entity to ReferenceSchema', () => {
        const result = entityToSchema({
          type: 'alias' as const,
          alias: 'UserType'
        })
        expect(result).toEqual({ type: 'reference', reference: 'UserType' })
      })
    })

    describe('unsupported entities', () => {
      it('should fallback to any primitive for unsupported types', () => {
        const result = entityToSchema({ type: 'intersection' as const })
        expect(result).toEqual({ type: 'primitive', primitiveType: 'any' })
      })
    })
  })

  describe('union with intelligent selection', () => {
    it('should generate selectFromUnion call with union members', () => {
      const result = generators.union.create(
        {
          type: 'union',
          values: [
            { type: 'literal', value: 'red' },
            { type: 'literal', value: 'green' },
            { type: 'literal', value: 'blue' }
          ]
        },
        {
          ...defaultContext,
          next: (context, entity) => {
            if (entity.type === 'literal') {
              return generators.literal.create(entity as any, context)
            }
            throw new Error('Unhandled entity type')
          }
        }
      )

      const generated = printNode(result)

      // Should use selectFromUnion instead of arrayElement
      expect(generated).toContain('selectFromUnion')
      expect(generated).not.toContain('arrayElement')

      // Should contain union member objects with schema and generator properties
      expect(generated).toContain('schema')
      expect(generated).toContain('generator')
    })

    it('should generate intelligent union selection for object types', () => {
      const result = generators.union.create(
        {
          type: 'union',
          values: [
            {
              type: 'object',
              properties: [
                {
                  type: 'objectProperty',
                  name: 'email',
                  property: { type: 'string' },
                  optional: false
                }
              ]
            },
            {
              type: 'object',
              properties: [
                {
                  type: 'objectProperty',
                  name: 'id',
                  property: { type: 'string' },
                  optional: false
                },
                {
                  type: 'objectProperty',
                  name: 'name',
                  property: { type: 'string' },
                  optional: false
                }
              ]
            }
          ]
        },
        {
          ...defaultContext,
          next: (context, entity) => {
            if (entity.type === 'object') {
              return generators.object.create(entity as any, context)
            }
            if (entity.type === 'objectProperty') {
              return generators.objectProperty.create(entity as any, context)
            }
            if (entity.type === 'string') {
              return generators.string.create(entity as any, context)
            }
            throw new Error('Unhandled entity type')
          }
        }
      )

      const generated = printNode(result)

      // Should generate selectFromUnion call with object schemas
      expect(generated).toContain('selectFromUnion')
      expect(generated).toContain('schema')
      expect(generated).toContain('generator')
      expect(generated).toContain('object')
    })

    it('should pass the correct parameter to selectFromUnion', () => {
      const mockContext = {
        ...defaultContext,
        parentDeclarationEntity: {
          type: 'declaration' as const,
          name: 'TestType',
          exported: false,
          declaration: { type: 'string' as const }
        },
        next: (context, entity) => {
          if (entity.type === 'literal') {
            return generators.literal.create(entity as any, context)
          }
          throw new Error('Unhandled entity type')
        }
      }

      const result = generators.union.create(
        {
          type: 'union',
          values: [
            { type: 'literal', value: 'option1' },
            { type: 'literal', value: 'option2' }
          ]
        },
        mockContext
      )

      const generated = printNode(result)

      // Should pass the camelCased parameter name
      expect(generated).toContain('testType') // camelCase of "TestType"
    })
  })
})
