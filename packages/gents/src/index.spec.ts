import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  _,
  calculateCompatibility,
  isCompatible,
  merge,
  type ObjectSchema,
  type PrimitiveSchema,
  selectFromUnion,
  type UnionMember
} from './index'

describe('selectFromUnion', () => {
  // Mock generators for testing
  const mockGenerators = {
    guestUser: vi.fn(() => ({ email: 'guest@example.com' })),
    loggedInUser: vi.fn(() => ({
      id: 'user123',
      email: 'user@example.com',
      name: 'John Doe'
    })),
    adminUser: vi.fn(() => ({
      id: 'admin123',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    }))
  }

  // Define schemas for testing
  const guestUserSchema: ObjectSchema = {
    type: 'object',
    properties: {
      email: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      }
    },
    requiredProperties: ['email'],
    optionalProperties: []
  }

  const loggedInUserSchema: ObjectSchema = {
    type: 'object',
    properties: {
      id: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      },
      email: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      },
      name: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      }
    },
    requiredProperties: ['id', 'email', 'name'],
    optionalProperties: []
  }

  const adminUserSchema: ObjectSchema = {
    type: 'object',
    properties: {
      id: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      },
      email: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      },
      name: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      },
      role: {
        schema: { type: 'primitive', primitiveType: 'string' },
        optional: false
      }
    },
    requiredProperties: ['id', 'email', 'name', 'role'],
    optionalProperties: []
  }

  const unionMembers: UnionMember[] = [
    {
      schema: guestUserSchema,
      generator: mockGenerators.guestUser,
      name: 'GuestUser'
    },
    {
      schema: loggedInUserSchema,
      generator: mockGenerators.loggedInUser,
      name: 'LoggedInUser'
    },
    {
      schema: adminUserSchema,
      generator: mockGenerators.adminUser,
      name: 'AdminUser'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock Math.random for predictable testing
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when no data is provided', () => {
    it('should select randomly from all members', () => {
      const result = selectFromUnion(unionMembers)

      // Should call one of the generators
      const totalCalls =
        mockGenerators.guestUser.mock.calls.length +
        mockGenerators.loggedInUser.mock.calls.length +
        mockGenerators.adminUser.mock.calls.length
      expect(totalCalls).toBe(1)
      expect(result).toBeDefined()
    })

    it('should throw error when no members provided', () => {
      expect(() => selectFromUnion([])).toThrow('No union members provided')
    })

    it('should generate deterministic results with seed', () => {
      // Test with seed - should be deterministic
      const result1 = selectFromUnion(unionMembers, undefined, { seed: 42 })
      const result2 = selectFromUnion(unionMembers, undefined, { seed: 42 })

      expect(result1).toEqual(result2)

      // Test with different seed - should be different
      const result3 = selectFromUnion(unionMembers, undefined, { seed: 123 })
      expect(result3).toBeDefined()

      // Multiple calls with same seed should be deterministic
      const results: any[] = []
      for (let i = 0; i < 5; i++) {
        results.push(selectFromUnion(unionMembers, undefined, { seed: 999 }))
      }

      // All results should be the same when using the same seed
      expect(results.every((result) => JSON.stringify(result) === JSON.stringify(results[0]))).toBe(
        true
      )
    })

    it('should generate different results without seed', () => {
      // Without seed, results should potentially vary (though not guaranteed due to mocked Math.random)
      const result1 = selectFromUnion(unionMembers)
      const result2 = selectFromUnion(unionMembers)

      // Both should be defined
      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })
  })

  describe('when data matches specific union member', () => {
    it('should select GuestUser when only email provided', () => {
      const providedData = { email: 'test@example.com' }

      // Clear mocks once before the test
      vi.clearAllMocks()

      // Run multiple times to ensure consistency due to weighted selection
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(selectFromUnion(unionMembers, providedData))
      }

      // Count calls after all iterations
      const guestUserCalls = mockGenerators.guestUser.mock.calls.length
      const loggedInUserCalls = mockGenerators.loggedInUser.mock.calls.length
      const adminUserCalls = mockGenerators.adminUser.mock.calls.length

      // All should be compatible, but GuestUser should be favored due to higher score
      expect(guestUserCalls + loggedInUserCalls + adminUserCalls).toBe(10)
      expect(adminUserCalls).toBe(0) // AdminUser should still be compatible but score lower
    })

    it('should only select LoggedInUser when name is provided', () => {
      const providedData = { name: 'John Doe' }

      // Clear mocks once before the test
      vi.clearAllMocks()

      // Run multiple times
      for (let i = 0; i < 5; i++) {
        selectFromUnion(unionMembers, providedData)
      }

      const guestUserCalls = mockGenerators.guestUser.mock.calls.length
      const loggedInUserCalls = mockGenerators.loggedInUser.mock.calls.length
      const adminUserCalls = mockGenerators.adminUser.mock.calls.length

      // Only LoggedInUser and AdminUser should be selected (both have name property)
      expect(guestUserCalls).toBe(0) // GuestUser doesn't have name property
      expect(loggedInUserCalls + adminUserCalls).toBe(5)
    })

    it('should only select AdminUser when role is provided', () => {
      const providedData = { role: 'admin' }

      const result = selectFromUnion(unionMembers, providedData)

      expect(mockGenerators.adminUser).toHaveBeenCalledOnce()
      expect(mockGenerators.guestUser).not.toHaveBeenCalled()
      expect(mockGenerators.loggedInUser).not.toHaveBeenCalled()
      expect(result).toEqual({
        id: 'admin123',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      })
    })

    it('should generate deterministic results with seed when data is provided', () => {
      const providedData = { email: 'test@example.com' }

      // Test with seed - should be deterministic even with weighted selection
      const result1 = selectFromUnion(unionMembers, providedData, { seed: 42 })
      const result2 = selectFromUnion(unionMembers, providedData, { seed: 42 })

      expect(result1).toEqual(result2)

      // Test with different seed - should potentially be different
      const result3 = selectFromUnion(unionMembers, providedData, { seed: 123 })
      expect(result3).toBeDefined()

      // Multiple calls with same seed should be deterministic even with weighted selection
      const results: any[] = []
      for (let i = 0; i < 3; i++) {
        results.push(selectFromUnion(unionMembers, providedData, { seed: 999 }))
      }

      // All results should be the same when using the same seed
      expect(results.every((result) => JSON.stringify(result) === JSON.stringify(results[0]))).toBe(
        true
      )
    })
  })

  describe('when data is incompatible with all members', () => {
    it('should fall back to random selection', () => {
      const providedData = {
        incompatibleProperty: 'value',
        anotherBadProp: 123
      }

      const result = selectFromUnion(unionMembers, providedData)

      // Should call one of the generators as fallback
      const totalCalls =
        mockGenerators.guestUser.mock.calls.length +
        mockGenerators.loggedInUser.mock.calls.length +
        mockGenerators.adminUser.mock.calls.length
      expect(totalCalls).toBe(1)
      expect(result).toBeDefined()
    })

    it('should throw error when fallbackToRandom is false', () => {
      const providedData = { incompatibleProperty: 'value' }

      expect(() =>
        selectFromUnion(unionMembers, providedData, {
          fallbackToRandom: false
        })
      ).toThrow('No compatible union members found')
    })
  })

  describe('compatibility scoring', () => {
    it('should prefer members with higher compatibility scores', () => {
      const providedData = {
        email: 'test@example.com',
        name: 'Test User'
      }

      // This data is compatible with both LoggedInUser and AdminUser
      // but LoggedInUser should score higher because it's a perfect match
      // (no missing required properties like 'id' and 'role')

      // Run multiple times to see the distribution
      const selections = { guestUser: 0, loggedInUser: 0, adminUser: 0 }

      for (let i = 0; i < 20; i++) {
        vi.clearAllMocks()
        selectFromUnion(unionMembers, providedData)

        if (mockGenerators.guestUser.mock.calls.length > 0) selections.guestUser++
        if (mockGenerators.loggedInUser.mock.calls.length > 0) selections.loggedInUser++
        if (mockGenerators.adminUser.mock.calls.length > 0) selections.adminUser++
      }

      // GuestUser should never be selected (incompatible - has name property)
      expect(selections.guestUser).toBe(0)

      // LoggedInUser and AdminUser should be selected
      expect(selections.loggedInUser + selections.adminUser).toBe(20)
    })
  })
})

describe('calculateCompatibility', () => {
  describe('object compatibility', () => {
    const userSchema: ObjectSchema = {
      type: 'object',
      properties: {
        id: {
          schema: { type: 'primitive', primitiveType: 'string' },
          optional: false
        },
        name: {
          schema: { type: 'primitive', primitiveType: 'string' },
          optional: true
        },
        email: {
          schema: { type: 'primitive', primitiveType: 'string' },
          optional: false
        }
      },
      requiredProperties: ['id', 'email'],
      optionalProperties: ['name']
    }

    it('should return perfect score for exact match', () => {
      const data = { id: '123', email: 'test@example.com', name: 'Test User' }
      const result = calculateCompatibility(userSchema, data)

      expect(result.compatible).toBe(true)
      expect(result.score).toBeGreaterThan(100) // Base score + optional property bonus
    })

    it('should be compatible without optional properties', () => {
      const data = { id: '123', email: 'test@example.com' }
      const result = calculateCompatibility(userSchema, data)

      expect(result.compatible).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(100) // Base score + nested compatibility bonuses
      expect(result.score).toBeLessThan(200) // But not too high
    })

    it('should be incompatible with missing required properties', () => {
      const data = { name: 'Test User' }
      const result = calculateCompatibility(userSchema, data)

      expect(result.compatible).toBe(false)
      expect(result.score).toBe(0)
      expect(result.missingRequiredProperties).toEqual(['id', 'email'])
    })

    it('should be incompatible with extra properties', () => {
      const data = {
        id: '123',
        email: 'test@example.com',
        extraProp: 'invalid'
      }
      const result = calculateCompatibility(userSchema, data)

      expect(result.compatible).toBe(false)
      expect(result.score).toBeLessThan(0) // Incompatible penalty
      expect(result.incompatibleProperties).toEqual(['extraProp'])
    })
  })

  describe('primitive compatibility', () => {
    const stringSchema: PrimitiveSchema = {
      type: 'primitive',
      primitiveType: 'string'
    }

    it('should match correct primitive types', () => {
      expect(calculateCompatibility(stringSchema, 'hello').compatible).toBe(true)
      expect(calculateCompatibility(stringSchema, 123).compatible).toBe(false)
      expect(calculateCompatibility(stringSchema, true).compatible).toBe(false)
    })
  })

  describe('literal compatibility', () => {
    const literalSchema = {
      type: 'literal' as const,
      value: 'exact-value'
    }

    it('should match exact literal values', () => {
      expect(calculateCompatibility(literalSchema, 'exact-value').compatible).toBe(true)
      expect(calculateCompatibility(literalSchema, 'different-value').compatible).toBe(false)
    })
  })
})

describe('isCompatible', () => {
  it('should return boolean compatibility result', () => {
    const schema: ObjectSchema = {
      type: 'object',
      properties: {
        test: {
          schema: { type: 'primitive', primitiveType: 'string' },
          optional: false
        }
      },
      requiredProperties: ['test'],
      optionalProperties: []
    }

    expect(isCompatible(schema, { test: 'value' })).toBe(true)
    expect(isCompatible(schema, { wrong: 'value' })).toBe(false)
  })
})

describe('merge', () => {
  describe('when source is not an object', () => {
    it('should return source when source is a string', () => {
      const target = { a: 1, b: 2 }
      const source = 'hello'
      const result = merge(target, source)

      expect(result).toBe('hello')
    })

    it('should return source when source is a number', () => {
      const target = { a: 1, b: 2 }
      const source = 42
      const result = merge(target, source)

      expect(result).toBe(42)
    })

    it('should return source when source is a boolean', () => {
      const target = { a: 1, b: 2 }
      const source = true
      const result = merge(target, source)

      expect(result).toBe(true)
    })

    it('should return source when source is null', () => {
      const target = { a: 1, b: 2 }
      const source = null
      const result = merge(target, source)

      expect(result).toBe(null)
    })

    it('should return source when source is undefined', () => {
      const target = { a: 1, b: 2 }
      const source = undefined
      const result = merge(target, source)

      expect(result).toBe(undefined)
    })

    it('should return source when source is a symbol', () => {
      const target = { a: 1, b: 2 }
      const source = Symbol('test')
      const result = merge(target, source)

      expect(result).toBe(source)
    })

    it('should return source when source is a function', () => {
      const target = { a: 1, b: 2 }
      const source = () => 'hello'
      const result = merge(target, source)

      expect(result).toBe(source)
    })
  })

  describe('when target is not an object', () => {
    it('should return source when target is a string', () => {
      const target = 'target'
      const source = { a: 1, b: 2 }
      const result = merge(target, source)

      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should return source when target is a number', () => {
      const target = 42
      const source = { a: 1, b: 2 }
      const result = merge(target, source)

      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should return source when target is null', () => {
      const target = null
      const source = { a: 1, b: 2 }
      const result = merge(target, source)

      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should return source when target is undefined', () => {
      const target = undefined
      const source = { a: 1, b: 2 }
      const result = merge(target, source)

      expect(result).toEqual({ a: 1, b: 2 })
    })
  })

  describe('when both target and source are not objects', () => {
    it('should return source', () => {
      const target = 'target'
      const source = 'source'
      const result = merge(target, source)

      expect(result).toBe('source')
    })

    it('should return source when mixing types', () => {
      const target = 42
      const source = true
      const result = merge(target, source)

      expect(result).toBe(true)
    })
  })

  describe('when both target and source are objects', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 }
      const source = { b: 3, c: 4 }
      const result = merge(target, source)

      expect(result).toEqual({ a: 1, b: 3, c: 4 })
    })

    it('should merge nested objects', () => {
      const target = {
        a: 1,
        nested: { x: 10, y: 20 }
      }
      const source = {
        b: 2,
        nested: { y: 30, z: 40 }
      }
      const result = merge(target, source)

      expect(result).toEqual({
        a: 1,
        b: 2,
        nested: { x: 10, y: 30, z: 40 }
      })
    })

    it('should merge arrays with spread mode by default', () => {
      const target = {
        items: [{ a: 1 }, { a: 2 }, { a: 3 }]
      }
      const source = {
        items: [{ b: 10 }, { b: 20 }]
      }
      const result = merge(target, source)

      expect(result).toEqual({
        items: [{ a: 1, b: 10 }, { a: 2, b: 20 }, { a: 3 }]
      })
    })

    it('should merge arrays with spread mode explicitly', () => {
      const target = {
        items: [{ a: 1 }, { a: 2 }, { a: 3 }]
      }
      const source = {
        items: [{ b: 10 }, { b: 20 }]
      }
      const result = merge(target, source, { arrayMergeMode: 'spread' })

      expect(result).toEqual({
        items: [{ a: 1, b: 10 }, { a: 2, b: 20 }, { a: 3 }]
      })
    })

    it('should replace arrays with replace mode', () => {
      const target = {
        items: [{ a: 1 }, { a: 2 }, { a: 3 }]
      }
      const source = {
        items: [{ b: 10 }, { b: 20 }]
      }
      const result = merge(target, source, { arrayMergeMode: 'replace' })

      expect(result).toEqual({
        items: [{ b: 10 }, { b: 20 }]
      })
    })

    it('should replace arrays with empty array in replace mode', () => {
      const target = {
        items: [{ a: 1 }, { a: 2 }]
      }
      const source = {
        items: []
      }
      const result = merge(target, source, { arrayMergeMode: 'replace' })

      expect(result).toEqual({
        items: []
      })
    })

    it('should handle complex nested structures', () => {
      const target = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
              notifications: true
            }
          },
          tags: ['admin', 'user']
        }
      }

      const source = {
        user: {
          profile: {
            email: 'john@example.com',
            settings: {
              language: 'en',
              notifications: false
            }
          },
          tags: ['moderator'],
          lastLogin: '2023-01-01'
        }
      }

      const result = merge(target, source)

      expect(result).toEqual({
        user: {
          id: 1,
          profile: {
            name: 'John',
            email: 'john@example.com',
            settings: {
              theme: 'dark',
              language: 'en',
              notifications: false
            }
          },
          tags: ['moderator', 'user'], // spread mode: source[0] replaces target[0], target[1] remains
          lastLogin: '2023-01-01'
        }
      })
    })

    it('should handle arrays containing objects', () => {
      const target = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      }
      const source = {
        users: [
          { email: 'alice@example.com' },
          { email: 'bob@example.com' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com' }
        ]
      }
      const result = merge(target, source)

      expect(result).toEqual({
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com' }
        ]
      })
    })

    it('should handle primitive values in arrays', () => {
      const target = { numbers: [1, 2, 3] }
      const source = { numbers: [10, 20] }
      const result = merge(target, source)

      // For primitives, source values replace target values at each index
      expect(result).toEqual({ numbers: [10, 20, 3] })
    })
  })

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const target = {}
      const source = { a: 1 }
      const result = merge(target, source)

      expect(result).toEqual({ a: 1 })
    })

    it('should handle source being empty object', () => {
      const target = { a: 1 }
      const source = {}
      const result = merge(target, source)

      expect(result).toEqual({ a: 1 })
    })

    it('should handle arrays as top-level values', () => {
      const target = [1, 2, 3]
      const source = [10, 20]
      const result = merge(target, source, { arrayMergeMode: 'spread' })

      expect(result).toEqual([10, 20, 3])
    })

    it('should handle dates', () => {
      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-12-31')
      const target = { created: date1 }
      const source = { updated: date2 }
      const result = merge(target, source)

      expect(result).toEqual({
        created: date1,
        updated: date2
      })
    })

    it('should handle Date replacement', () => {
      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-12-31')
      const target = { timestamp: date1 }
      const source = { timestamp: date2 }
      const result = merge(target, source)

      expect(result).toEqual({
        timestamp: date2
      })
    })
  })
})

describe('merge with preferUndefinedSource option', () => {
  it('should preserve undefined when preferUndefinedSource is true', () => {
    const target = 'default-value'
    const source = undefined

    const result = merge(target, source, { preferUndefinedSource: true })

    expect(result).toBe(undefined)
  })

  it('should prefer target when preferUndefinedSource is false and source is undefined', () => {
    const target = 'default-value'
    const source = undefined

    const result = merge(target, source, { preferUndefinedSource: false })

    expect(result).toBe('default-value')
  })

  it('should still handle the _ symbol correctly with preferUndefinedSource', () => {
    const target = 'default-value'
    const source = _

    const result = merge(target, source, { preferUndefinedSource: false })

    expect(result).toBe('default-value')
  })

  it('should handle non-undefined values normally with preferUndefinedSource', () => {
    const target = 'default-value'
    const source = 'provided-value'

    const result = merge(target, source, { preferUndefinedSource: false })

    expect(result).toBe('provided-value')
  })

  it('should only affect root-level undefined, not nested properties', () => {
    const target = { name: 'default', age: 25 } as const
    const source = { name: undefined } as const

    // preferUndefinedSource only affects root-level, so nested undefined should still merge normally
    const resultPreserve = merge(target, source, {
      preferUndefinedSource: true
    })
    const resultTarget = merge(target, source, {
      preferUndefinedSource: false
    })

    // Both should preserve the undefined in the nested property since preferUndefinedSource is root-level only
    expect(resultPreserve.name).toBe(undefined)
    expect(resultTarget.name).toBe(undefined)
  })
})
