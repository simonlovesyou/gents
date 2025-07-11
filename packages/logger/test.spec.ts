import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Project } from "ts-morph"
import dedent from "ts-dedent"
import * as ts from "typescript"
import { Writable } from "stream"

// Capture winston output using custom stream transport
let capturedOutput = ''
let stream: Writable

// Import winston and our logger
import winston from "winston"
import { logNode } from "./src/index.js"
import logger from "./src/index.js"

// Test helper to create a TypeScript program and get nodes
function createTestProgram(sourceCode: string) {
  const project = new Project({ useInMemoryFileSystem: true })
  const sourceFile = project.createSourceFile("test.ts", sourceCode)
  const typeChecker = project.getTypeChecker().compilerObject
  
  return {
    sourceFile,
    typeChecker,
    compilerSourceFile: sourceFile.compilerNode,
    project
  }
}

// Helper to clean output for snapshots
function cleanOutput(output: string): string {
  return output
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+info:\s*/, '')
    .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
    .trim()
}

describe("TypeScript Node Logger", () => {
  // Setup custom stream transport to capture winston output
  beforeEach(() => {
    capturedOutput = ''
    
    // Create custom writable stream to capture output
    stream = new Writable()
    stream._write = (chunk, encoding, next) => {
      capturedOutput += chunk.toString()
      next()
    }

    // Replace the logger's transports with our stream transport
    logger.clear() // Remove existing transports
    logger.add(new winston.transports.Stream({ stream }))
  })

  afterEach(() => {
    capturedOutput = ''
    // Restore original console transport
    logger.clear()
    logger.add(new winston.transports.Console())
  })

  describe("Basic TypeScript Node Logging", () => {
    it("should log basic TypeScript node without additional context", () => {
      const { sourceFile } = createTestProgram(dedent`
        const x = 42
      `)

      const variableDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.VariableDeclaration)!
      
      logNode(variableDecl.compilerNode, {
        depth: 0,
        message: "Basic variable declaration"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Basic variable declaration")
      expect(cleanedOutput).toContain("VariableDeclaration: x")
    })

    it("should log TypeScript node with type checker context", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        interface User {
          id: number
          name: string
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      
      logNode(interfaceDecl.compilerNode, {
        depth: 0,
        typeChecker,
        sourceFile: compilerSourceFile,
        filePath: "test.ts"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("InterfaceDeclaration: User")
      expect(cleanedOutput).toContain("test.ts:1:1")
      expect(cleanedOutput).toContain("Type       : User")
      expect(cleanedOutput).toContain("TypeFlags  : Object")
      expect(cleanedOutput).toContain("SymbolFlags: Interface")
    })
  })

  describe("ts-morph Auto-Detection", () => {
    it("should auto-detect ts-morph node and extract type information", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface Product {
          id: number
          name: string
          price?: number
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      
      // Pass the ts-morph node directly - should auto-detect
      logNode(interfaceDecl, {
        depth: 0,
        message: "Auto-detected ts-morph interface"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Auto-detected ts-morph interface")
      expect(cleanedOutput).toContain("InterfaceDeclaration: Product")
      expect(cleanedOutput).toContain("TypeAnalysis:")
      expect(cleanedOutput).toContain("TypeText")
      expect(cleanedOutput).toContain("ApparentType")
      expect(cleanedOutput).toContain("TypeFlags")
    })

    it("should auto-detect ts-morph type alias with union", () => {
      const { sourceFile } = createTestProgram(dedent`
        type Status = "pending" | "completed" | "failed"
      `)

      const typeAlias = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.TypeAliasDeclaration)!
      
      logNode(typeAlias, {
        depth: 0,
        message: "Union type alias"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Union type alias")
      expect(cleanedOutput).toContain("TypeAliasDeclaration: Status")
      expect(cleanedOutput).toContain("TypeAnalysis:")
      expect(cleanedOutput).toContain("isUnion")
    })

    it("should handle nested object properties", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface Config {
          database: {
            host: string
            port: number
            credentials: {
              username: string
              password: string
            }
          }
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      const properties = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertySignature)
      
      logNode(interfaceDecl, { depth: 0, message: "Config interface" })
      
      properties.forEach((prop, index) => {
        logNode(prop, { 
          depth: 1, 
          message: `Property ${index + 1}: ${prop.getName()}` 
        })
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Config interface")
      expect(cleanedOutput).toContain("Property 1: database")
      expect(cleanedOutput).toContain("Property 2: host")
      expect(cleanedOutput).toContain("Property 3: port")
      expect(cleanedOutput).toContain("Property 4: credentials")
      expect(cleanedOutput).toContain("Property 5: username")
      expect(cleanedOutput).toContain("Property 6: password")
    })
  })

  describe("Explicit ts-morph Type Analysis", () => {
    it("should handle explicit ts-morph type with comprehensive analysis", () => {
      const { sourceFile } = createTestProgram(dedent`
        type UserRole = "admin" | "user" | "guest"
        
        interface User {
          id: number
          role: UserRole
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      const interfaceType = interfaceDecl.getType()
      
      logNode(interfaceDecl.compilerNode, {
        tsMorphType: interfaceType,
        depth: 0,
        message: "Explicit type analysis"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Explicit type analysis")
      expect(cleanedOutput).toContain("TypeAnalysis:")
      expect(cleanedOutput).toContain("TypeText   : User")
      expect(cleanedOutput).toContain("ApparentType:")
      expect(cleanedOutput).toContain("isInterface")
    })

    it("should handle array types correctly", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface Todo {
          id: number
          title: string
          tags: string[]
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      const tagsProperty = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertySignature)
        .find(prop => prop.getName() === "tags")!
      
      logNode(tagsProperty, {
        depth: 1,
        message: "Array property analysis"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Array property analysis")
      expect(cleanedOutput).toContain("PropertySignature: tags")
      expect(cleanedOutput).toContain("TypeAnalysis:")
    })

    it("should disable apparent type analysis when requested", () => {
      const { sourceFile } = createTestProgram(dedent`
        type SimpleType = string
      `)

      const typeAlias = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.TypeAliasDeclaration)!
      const aliasType = typeAlias.getType()
      
      logNode(typeAlias.compilerNode, {
        tsMorphType: aliasType,
        includeApparentType: false,
        depth: 0,
        message: "No apparent type"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("No apparent type")
      expect(cleanedOutput).toContain("TypeAnalysis:")
      expect(cleanedOutput).toContain("TypeText")
      // Should not contain apparent type information
      expect(cleanedOutput).not.toContain("ApparentType:")
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle nodes without type information gracefully", () => {
      const { sourceFile } = createTestProgram(dedent`
        // Just a comment
        const x = "hello"
      `)

      const stringLiteral = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.StringLiteral)!
      
      logNode(stringLiteral, {
        depth: 0,
        message: "String literal node"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("String literal node")
      expect(cleanedOutput).toContain("StringLiteral")
    })

    it("should handle invalid or missing nodes gracefully", () => {
      // Test with undefined/null scenarios would go here
      // For now, testing with a basic object that doesn't have type methods
      const fakeNode = { kind: ts.SyntaxKind.Unknown } as any
      
      logNode(fakeNode, {
        depth: 0,
        message: "Invalid node test"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Invalid node test")
    })

    it("should handle complex generic types", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface Repository<T> {
          findById(id: string): Promise<T | null>
          save(entity: T): Promise<T>
        }
        
        type UserRepository = Repository<User>
        
        interface User {
          id: string
          name: string
        }
      `)

      const repositoryInterface = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      const typeAlias = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.TypeAliasDeclaration)!
      
      logNode(repositoryInterface, {
        depth: 0,
        message: "Generic interface"
      })
      
      logNode(typeAlias, {
        depth: 0,
        message: "Generic type alias"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toContain("Generic interface")
      expect(cleanedOutput).toContain("Repository")
      expect(cleanedOutput).toContain("Generic type alias")
      expect(cleanedOutput).toContain("UserRepository")
    })
  })

  describe("Output format snapshots", () => {
    it("should format interface declaration correctly", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        interface User {
          id: number
          name: string
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      
      logNode(interfaceDecl.compilerNode, {
        depth: 0,
        filePath: "test.ts",
        typeChecker,
        sourceFile: compilerSourceFile
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      expect(cleanedOutput).toMatchInlineSnapshot(`
        "• InterfaceDeclaration: User (test.ts:1:1)
        ├─ Type       : User
        ├─ TypeFlags  : Object
        ├─ SymbolFlags: Interface
        └─ Source      :
              interface User {
                id: number
                name: string
              }"
      `)
    })

    it("should format ts-morph node with type analysis", () => {
      const { sourceFile } = createTestProgram(dedent`
        type Status = "active" | "inactive"
      `)

      const typeAlias = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.TypeAliasDeclaration)!
      
      logNode(typeAlias, {
        depth: 0,
        message: "Union type with analysis"
      })

      const cleanedOutput = cleanOutput(capturedOutput)
      // This should include TypeAnalysis section due to auto-detection
      expect(cleanedOutput).toContain("Union type with analysis")
      expect(cleanedOutput).toContain("TypeAliasDeclaration: Status")
      expect(cleanedOutput).toContain("TypeAnalysis:")
    })
  })

  describe("basic node extraction", () => {
    it("should extract node information for interface declarations", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface MyInterface {
          foo: string
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      const tsNode = interfaceDecl.compilerNode

      // Test that we can call logNode without errors
      expect(() => {
        logNode(tsNode, { depth: 0, filePath: "test.ts" })
      }).not.toThrow()
    })

    it("should extract node information for class declarations", () => {
      const { sourceFile } = createTestProgram(dedent`
        export class MyClass {
          private readonly value: number = 42
        }
      `)

      const classDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.ClassDeclaration)!
      
      expect(() => {
        logNode(classDecl.compilerNode, { depth: 0 })
      }).not.toThrow()
    })

    it("should extract node information for method declarations", () => {
      const { sourceFile } = createTestProgram(dedent`
        class MyClass {
          public async getValue(): Promise<number> {
            return 42
          }
        }
      `)

      const method = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.MethodDeclaration)!
      
      expect(() => {
        logNode(method.compilerNode, { depth: 1 })
      }).not.toThrow()
    })
  })

  describe("type-aware logging", () => {
    it("should work with type checker for interfaces", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        interface MyInterface {
          foo: string
          bar?: number
        }
      `)

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      
      expect(() => {
        logNode(interfaceDecl.compilerNode, {
          depth: 0,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
      }).not.toThrow()
    })

    it("should work with property signatures", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        interface MyInterface {
          foo: string
          bar?: number
        }
      `)

      const properties = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertySignature)

      properties.forEach(prop => {
        expect(() => {
          logNode(prop.compilerNode, {
            depth: 1,
            filePath: "test.ts",
            typeChecker,
            sourceFile: compilerSourceFile
          })
        }).not.toThrow()
      })
    })

    it("should work with complex type expressions", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        interface User {
          id: number
          name: string
        }

        type UserList = User[]
        type UserMap = Record<string, User>
      `)

      const typeAliases = sourceFile.getDescendantsOfKind(ts.SyntaxKind.TypeAliasDeclaration)

      typeAliases.forEach(alias => {
        expect(() => {
          logNode(alias.compilerNode, {
            depth: 0,
            filePath: "test.ts",
            typeChecker,
            sourceFile: compilerSourceFile
          })
        }).not.toThrow()
      })
    })

    it("should work with union types", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        type Status = "pending" | "completed" | "failed"
        
        interface Task {
          id: number
          status: Status
        }
      `)

      const typeAlias = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.TypeAliasDeclaration)!

      expect(() => {
        logNode(typeAlias.compilerNode, {
          depth: 0,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
      }).not.toThrow()
    })
  })

  describe("edge cases", () => {
    it("should handle nodes without names", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface MyInterface {
          foo: string
        }
      `)

      const stringKeyword = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.StringKeyword)!
      
      expect(() => {
        logNode(stringKeyword.compilerNode, { depth: 2 })
      }).not.toThrow()
    })

    it("should handle nodes with missing type information gracefully", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        const x = 42
      `)

      const variableDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.VariableDeclaration)!
      
      expect(() => {
        logNode(variableDecl.compilerNode, {
          depth: 0,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
      }).not.toThrow()
    })

    it("should handle custom messages", () => {
      const { sourceFile } = createTestProgram("interface Test {}")

      const interfaceDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)!
      
      expect(() => {
        logNode(interfaceDecl.compilerNode, {
          depth: 0,
          message: "Custom debug message"
        })
      }).not.toThrow()
    })
  })

  describe("advanced scenarios", () => {
    it("should handle nested class members", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        export class MyClass {
          private value: number = 42
          
          public getValue(): number {
            return this.value
          }
        }
      `)

      const classDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.ClassDeclaration)!
      const property = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.PropertyDeclaration)!
      const method = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.MethodDeclaration)!

      expect(() => {
        logNode(classDecl.compilerNode, {
          depth: 0,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
        logNode(property.compilerNode, {
          depth: 1,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
        logNode(method.compilerNode, {
          depth: 1,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
      }).not.toThrow()
    })

    it("should handle deep nesting", () => {
      const { sourceFile } = createTestProgram(dedent`
        interface Deep {
          level1: {
            level2: {
              level3: string
            }
          }
        }
      `)

      const deepestProperty = sourceFile.getDescendantsOfKind(ts.SyntaxKind.PropertySignature)
        .find(p => p.getName() === "level3")!
      
      expect(() => {
        logNode(deepestProperty.compilerNode, { depth: 3 })
      }).not.toThrow()
    })

    it("should work with various TypeScript constructs", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        // Enum
        enum Color {
          Red = "red",
          Blue = "blue"
        }

        // Generic interface
        interface Container<T> {
          value: T
          getValue(): T
        }

        // Function type
        type Handler = (event: string) => void

        // Conditional type
        type NonNullable<T> = T extends null | undefined ? never : T
      `)

      // Test that we can log various kinds of TypeScript constructs
      const enumDecl = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.EnumDeclaration)
      const genericInterface = sourceFile.getFirstDescendantByKind(ts.SyntaxKind.InterfaceDeclaration)
      const typeAliases = sourceFile.getDescendantsOfKind(ts.SyntaxKind.TypeAliasDeclaration)

      expect(() => {
        if (enumDecl) logNode(enumDecl.compilerNode, {
          depth: 0,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
        if (genericInterface) logNode(genericInterface.compilerNode, {
          depth: 0,
          filePath: "test.ts",
          typeChecker,
          sourceFile: compilerSourceFile
        })
        typeAliases.forEach(alias => {
          logNode(alias.compilerNode, {
            depth: 0,
            filePath: "test.ts",
            typeChecker,
            sourceFile: compilerSourceFile
          })
        })
      }).not.toThrow()
    })
  })

  describe("integration", () => {
    it("should work with a realistic TypeScript module", () => {
      const { sourceFile, typeChecker, compilerSourceFile } = createTestProgram(dedent`
        export interface User {
          id: number
          name: string
          email?: string
          preferences: {
            theme: "light" | "dark"
            notifications: boolean
          }
        }

        export class UserService {
          private users: User[] = []

          async findById(id: number): Promise<User | null> {
            return this.users.find(user => user.id === id) ?? null
          }

          async create(userData: Omit<User, 'id'>): Promise<User> {
            const id = Math.max(...this.users.map(u => u.id), 0) + 1
            const user: User = { id, ...userData }
            this.users.push(user)
            return user
          }
        }
      `)

      // Test logging the entire module structure
      expect(() => {
        sourceFile.forEachChild(node => {
          const tsNode = node.compilerNode
          logNode(tsNode, { 
            depth: 0,
            filePath: "realistic-module.ts",
            typeChecker,
            sourceFile: compilerSourceFile
          })

          // Log members if it's a class or interface
          if (ts.isInterfaceDeclaration(tsNode) || ts.isClassDeclaration(tsNode)) {
            tsNode.members?.forEach(member => {
              logNode(member, {
                depth: 1,
                filePath: "realistic-module.ts",
                typeChecker,
                sourceFile: compilerSourceFile
              })
            })
          }
        })
      }).not.toThrow()
    })
  })
}) 