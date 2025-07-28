import { codegen } from '@gents/codegen'
import { generators } from '@gents/codegen/src/generators'
import { parse } from '@gents/parser'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import dedent from 'ts-dedent'
import { type CompilerOptions, Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'

describe('Integration Tests - Runtime Validation', () => {
  // Base directory for integration test files
  const integrationTestsDir = join(process.cwd(), 'integration_tests')

  // Helper function to create filesystem-safe names
  function sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
  }

  // Default compiler options for parsing (can be overridden per test)
  const defaultParseCompilerOptions = {
    strict: true,
    strictNullChecks: true,
    exactOptionalPropertyTypes: true
  }

  // Default compiler options for compilation (can be overridden per test)
  const defaultCompileCompilerOptions = {
    target: 99, // ScriptTarget.ESNext
    module: 99, // ModuleKind.ESNext
    moduleResolution: 2, // ModuleResolutionKind.NodeJs
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    skipLibCheck: true,
    declaration: false,
    sourceMap: false,
    strict: true,
    strictNullChecks: true,
    exactOptionalPropertyTypes: true // Include this in compilation as well
  }

  async function generateAndImport(
    typeDefinition: string,
    testPath: string,
    options: {
      parseCompilerOptions?: CompilerOptions
      compileCompilerOptions?: CompilerOptions
    } = {}
  ) {
    const parseOptions = {
      ...defaultParseCompilerOptions,
      ...options.parseCompilerOptions
    }
    const compilerOptions = {
      ...defaultCompileCompilerOptions,
      ...options.compileCompilerOptions
    }

    // Create the test directory structure
    const testDir = join(integrationTestsDir, testPath)
    mkdirSync(testDir, { recursive: true })

    // Create tsconfig.json for this test with proper string values
    const normalizedCompilerOptions = { ...compilerOptions, strict: true }

    // Convert numeric enum values to string values for tsconfig.json
    const tsconfigCompilerOptions: any = {}
    for (const [key, value] of Object.entries(normalizedCompilerOptions)) {
      if (key === 'target') {
        // Convert ScriptTarget enum to string
        tsconfigCompilerOptions[key] =
          value === 99
            ? 'ESNext'
            : value === 1
              ? 'ES5'
              : value === 2
                ? 'ES2015'
                : value === 3
                  ? 'ES2016'
                  : value === 4
                    ? 'ES2017'
                    : value === 5
                      ? 'ES2018'
                      : value === 6
                        ? 'ES2019'
                        : value === 7
                          ? 'ES2020'
                          : value === 8
                            ? 'ES2021'
                            : value === 9
                              ? 'ES2022'
                              : value === 10
                                ? 'ES2023'
                                : value === 99
                                  ? 'ESNext'
                                  : value
      } else if (key === 'module') {
        // Convert ModuleKind enum to string
        tsconfigCompilerOptions[key] =
          value === 99
            ? 'ESNext'
            : value === 1
              ? 'CommonJS'
              : value === 2
                ? 'AMD'
                : value === 3
                  ? 'UMD'
                  : value === 4
                    ? 'System'
                    : value === 5
                      ? 'ES2015'
                      : value === 6
                        ? 'ES2020'
                        : value === 7
                          ? 'ES2022'
                          : value === 99
                            ? 'ESNext'
                            : value
      } else if (key === 'moduleResolution') {
        // Convert ModuleResolutionKind enum to string
        tsconfigCompilerOptions[key] =
          value === 1
            ? 'classic'
            : value === 2
              ? 'node'
              : value === 3
                ? 'node16'
                : value === 99
                  ? 'bundler'
                  : value
      } else {
        tsconfigCompilerOptions[key] = value
      }
    }

    const tsconfigContent = {
      compilerOptions: tsconfigCompilerOptions,
      include: ['**/*.ts'],
      exclude: ['node_modules', '**/*.spec.ts', '**/*.test.ts']
    }

    const tsconfigPath = join(testDir, 'tsconfig.json')
    writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2))

    // Create project with type definitions (still in memory for parsing)
    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: parseOptions,
      skipAddingFilesFromTsConfig: true
    })

    project.createSourceFile('types.ts', typeDefinition)

    // Parse and generate code
    const result = codegen(parse(project), generators, {
      project,
      outputFolder: '',
      fileNameGenerator: () => 'types.ts'
    })

    const sourceFile = result.getSourceFileOrThrow('types.ts')
    const generatedCode = sourceFile.getFullText()

    // Write the original type definitions to disk
    const typesFilePath = join(testDir, 'types.ts')
    writeFileSync(typesFilePath, typeDefinition)

    // Write the generated TypeScript file to disk
    const tsFilePath = join(testDir, 'generated_code.ts')
    writeFileSync(tsFilePath, generatedCode)

    // Create a separate project for compilation using the original numeric compiler options
    const compileProject = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: normalizedCompilerOptions
    })

    // Add the generated TypeScript code to the compilation project
    const tsFile = compileProject.createSourceFile('generated.ts', generatedCode)

    // Get the emitted JavaScript
    const emitOutput = tsFile.getEmitOutput()
    const jsFile = emitOutput.getOutputFiles().find((f) => f.getFilePath().endsWith('.js'))

    if (!jsFile) {
      throw new Error('Failed to compile TypeScript to JavaScript')
    }

    let compiledCode = jsFile.getText()

    // Replace type-only imports with actual imports - remove the local type imports
    compiledCode = compiledCode.replace(/import.*from.*["']\.\/generated\/gen-test["'];?\s*/g, '')

    // Write the compiled JavaScript file to disk
    const jsFilePath = join(testDir, 'compiled_code.js')
    writeFileSync(jsFilePath, compiledCode)

    // Dynamic import from the compiled JavaScript file
    const module = await import(`file://${jsFilePath}`)
    return module
  }

  describe('Basic Type Generation', () => {
    it('generates deterministic data for simple interface with seed', async () => {
      const typeDefinition = dedent`
        interface User {
          id: string;
          name: string;
          age: number;
        }
      `

      const testPath = join(
        sanitizeName('Basic Type Generation'),
        sanitizeName('generates deterministic data for simple interface with seed')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      // Test deterministic output with same seed
      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
      expect(typeof user1.id).toBe('string')
      expect(typeof user1.name).toBe('string')
      expect(typeof user1.age).toBe('number')
    })

    it('generates different data with different seeds', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          name: string;
        }
      `

      const testPath = join(
        sanitizeName('Basic Type Generation'),
        sanitizeName('generates different data with different seeds')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 123 })

      // Should be different data with different seeds
      expect(user1).not.toEqual(user2)
    })
  })

  describe('Optional Properties', () => {
    it('handles optional properties correctly', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          name?: string;
          email?: string;
        }
      `

      const testPath = join(
        sanitizeName('Optional Properties'),
        sanitizeName('handles optional properties correctly')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user = generateUser(undefined, { seed: 42 })

      expect(typeof user.id).toBe('string')
      // Optional properties might be present or undefined
      if (user.name !== undefined) {
        expect(typeof user.name).toBe('string')
      }
      if (user.email !== undefined) {
        expect(typeof user.email).toBe('string')
      }
    })

    it('respects provided optional properties', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          name?: string;
        }
      `

      const testPath = join(
        sanitizeName('Optional Properties'),
        sanitizeName('respects provided optional properties')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      // const userWithName = generateUser({ name: "John Doe" }, { seed: 41 });

      // expect(userWithName.name).toBe("John Doe");
      // expect(userWithName.id).toBeUndefined();
      const userWithNameWithoutId = generateUser({ name: 'John Doe' }, { seed: 48 })
      console.log(userWithNameWithoutId)
      expect(userWithNameWithoutId.name).toBe('John Doe')
      expect(typeof userWithNameWithoutId.id).toBe('string')
    })

    it('handles optional properties with exactOptionalPropertyTypes disabled', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          name?: string;
          email?: string;
        }
      `

      const testPath = join(
        sanitizeName('Optional Properties'),
        sanitizeName('handles optional properties with exactOptionalPropertyTypes disabled')
      )

      // Test with exactOptionalPropertyTypes disabled
      const { generateUser } = await generateAndImport(typeDefinition, testPath, {
        parseCompilerOptions: { exactOptionalPropertyTypes: false },
        compileCompilerOptions: { exactOptionalPropertyTypes: false }
      })

      const user = generateUser(undefined, { seed: 42 })

      expect(typeof user.id).toBe('string')
      // Optional properties might be present or undefined
      if (user.name !== undefined) {
        expect(typeof user.name).toBe('string')
      }
      if (user.email !== undefined) {
        expect(typeof user.email).toBe('string')
      }
    })
  })

  describe('Union Types', () => {
    it('generates deterministic union values with seed', async () => {
      const typeDefinition = dedent`
        export type User = {
          id: string;
          status: 'active' | 'inactive' | 'pending';
        } | undefined
      `

      const testPath = join(
        sanitizeName('Union Types'),
        sanitizeName('generates deterministic union values with seed')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
    })

    it('respects provided union values', async () => {
      const typeDefinition = dedent`
        export type Status = 'active' | 'inactive' | 'pending';
        
        export interface User {
          id: string;
          status: Status;
        }
      `

      const testPath = join(
        sanitizeName('Union Types'),
        sanitizeName('respects provided union values')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const activeUser = generateUser({ status: 'active' }, { seed: 42 })

      expect(activeUser.status).toBe('active')
    })

    it('handles complex union types', async () => {
      const typeDefinition = dedent`
        export type GuestUser = { email: string };
        export type LoggedInUser = { id: string; email: string; name: string };
        export type User = GuestUser | LoggedInUser;
      `

      const testPath = join(
        sanitizeName('Union Types'),
        sanitizeName('handles complex union types')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
      expect(typeof user1.email).toBe('string')

      // Check if it's a LoggedInUser or GuestUser
      if ('id' in user1) {
        expect(typeof user1.id).toBe('string')
        expect(typeof user1.name).toBe('string')
      }
    })
  })

  describe('Nested Objects', () => {
    it('handles nested objects with deterministic seeds', async () => {
      const typeDefinition = dedent`
        export interface Address {
          street: string;
          city: string;
        }
        
        export interface User {
          id: string;
          address: Address;
        }
      `

      const testPath = join(
        sanitizeName('Nested Objects'),
        sanitizeName('handles nested objects with deterministic seeds')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
      expect(typeof user1.id).toBe('string')
      expect(typeof user1.address.street).toBe('string')
      expect(typeof user1.address.city).toBe('string')
    })

    it('respects provided nested object data', async () => {
      const typeDefinition = dedent`
        export interface Address {
          street: string;
          city: string;
        }
        
        export interface User {
          id: string;
          address: Address;
        }
      `

      const testPath = join(
        sanitizeName('Nested Objects'),
        sanitizeName('respects provided nested object data')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const customUser = generateUser(
        {
          address: {
            city: 'New York'
          }
        },
        { seed: 42 }
      )

      expect(customUser.address.city).toBe('New York')
      expect(typeof customUser.address.street).toBe('string')
      expect(typeof customUser.id).toBe('string')
    })
  })

  describe('Arrays', () => {
    it('generates deterministic arrays with seed', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          tags: string[];
        }
      `

      const testPath = join(
        sanitizeName('Arrays'),
        sanitizeName('generates deterministic arrays with seed')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
      expect(Array.isArray(user1.tags)).toBe(true)
      user1.tags.forEach((tag: string) => {
        expect(typeof tag).toBe('string')
      })
    })

    it('respects provided array length', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          tags: string[];
        }
      `

      const testPath = join(sanitizeName('Arrays'), sanitizeName('respects provided array length'))
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const userWithTags = generateUser(
        {
          tags: new Array(3).fill('test')
        },
        { seed: 42 }
      )

      expect(userWithTags.tags).toHaveLength(3)
    })

    it('handles arrays of objects', async () => {
      const typeDefinition = dedent`
        export interface Friend {
          id: string;
          name: string;
        }
        
        export interface User {
          id: string;
          friends: Friend[];
        }
      `

      const testPath = join(sanitizeName('Arrays'), sanitizeName('handles arrays of objects'))
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
      expect(Array.isArray(user1.friends)).toBe(true)
      user1.friends.forEach((friend: { id: string; name: string }) => {
        expect(typeof friend.id).toBe('string')
        expect(typeof friend.name).toBe('string')
      })
    })
  })

  describe('Complex Scenarios', () => {
    it('handles complex nested structure with unions and optional properties', async () => {
      const typeDefinition = dedent`
        export type SubscriptionTier = 'free' | 'basic' | 'business' | undefined;

        export interface User {
          id: string;
          avatar: {
            url: string;
          };
          birthday?: Date;
          email: string;
          firstName: string;
          lastName: string;
          subscriptionTier: SubscriptionTier;
          card: {
            currencyCode: string;
          };
          friends: Array<{id: string}>;
        }
      `

      const testPath = join(
        sanitizeName('Complex Scenarios'),
        sanitizeName('handles complex nested structure with unions and optional properties')
      )
      const { generateUser, generateSubscriptionTier } = await generateAndImport(
        typeDefinition,
        testPath
      )

      // Test User generation
      const user1 = generateUser(undefined, { seed: 42 })
      const user2 = generateUser(undefined, { seed: 42 })

      expect(user1).toEqual(user2)
      expect(typeof user1.id).toBe('string')
      expect(typeof user1.avatar.url).toBe('string')
      expect(typeof user1.email).toBe('string')
      expect(typeof user1.firstName).toBe('string')
      expect(typeof user1.lastName).toBe('string')
      expect(['free', 'basic', 'business', undefined]).toContain(user1.subscriptionTier)
      expect(typeof user1.card.currencyCode).toBe('string')
      expect(Array.isArray(user1.friends)).toBe(true)

      // Test SubscriptionTier generation
      const tier1 = generateSubscriptionTier(undefined, { seed: 42 })
      const tier2 = generateSubscriptionTier(undefined, { seed: 42 })

      expect(tier1).toEqual(tier2)
      expect(['free', 'basic', 'business', undefined]).toContain(tier1)
    })

    it('respects complex input data combinations', async () => {
      const typeDefinition = dedent`
        export type SubscriptionTier = 'free' | 'basic' | 'business' | undefined;

        export interface User {
          id: string;
          firstName: string;
          subscriptionTier: SubscriptionTier;
          friends: Array<{id: string}>;
        }
      `

      const testPath = join(
        sanitizeName('Complex Scenarios'),
        sanitizeName('respects complex input data combinations')
      )
      const { generateUser } = await generateAndImport(typeDefinition, testPath)

      const customUser = generateUser(
        {
          firstName: 'John',
          subscriptionTier: 'business',
          friends: [{ id: 'friend1' }, { id: 'friend2' }]
        },
        { seed: 42 }
      )

      expect(customUser.firstName).toBe('John')
      expect(customUser.subscriptionTier).toBe('business')
      expect(customUser.friends).toHaveLength(2)
      expect(customUser.friends[0].id).toBe('friend1')
      expect(customUser.friends[1].id).toBe('friend2')
      expect(typeof customUser.id).toBe('string')
    })
  })

  describe('TypeScript Configuration Tests', () => {
    it('behaves differently with strict mode enabled', async () => {
      const typeDefinition = dedent`
        export interface User {
          id: string;
          name?: string;
        }
      `

      const testPath = join(
        sanitizeName('TypeScript Configuration Tests'),
        sanitizeName('behaves differently with strict mode enabled')
      )

      const { generateUser } = await generateAndImport(typeDefinition, testPath, {
        parseCompilerOptions: {
          strict: true,
          exactOptionalPropertyTypes: true,
          strictNullChecks: true
        },
        compileCompilerOptions: {
          strict: true,
          exactOptionalPropertyTypes: true,
          strictNullChecks: true
        }
      })

      const user = generateUser(undefined, { seed: 42 })
      expect(typeof user.id).toBe('string')
    })
  })
})
