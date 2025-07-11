import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  selectFromUnion, 
  calculateCompatibility, 
  isCompatible,
  type UnionMember,
  type ObjectSchema,
  type PrimitiveSchema,
  type RuntimeSchema 
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
      const totalCalls = mockGenerators.guestUser.mock.calls.length + 
                        mockGenerators.loggedInUser.mock.calls.length + 
                        mockGenerators.adminUser.mock.calls.length
      expect(totalCalls).toBe(1)
      expect(result).toBeDefined()
    })

    it('should throw error when no members provided', () => {
      expect(() => selectFromUnion([])).toThrow('No union members provided')
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
  })

  describe('when data is incompatible with all members', () => {
    it('should fall back to random selection', () => {
      const providedData = { 
        incompatibleProperty: 'value',
        anotherBadProp: 123
      }
      
      const result = selectFromUnion(unionMembers, providedData)
      
      // Should call one of the generators as fallback
      const totalCalls = mockGenerators.guestUser.mock.calls.length + 
                        mockGenerators.loggedInUser.mock.calls.length + 
                        mockGenerators.adminUser.mock.calls.length
      expect(totalCalls).toBe(1)
      expect(result).toBeDefined()
    })

    it('should throw error when fallbackToRandom is false', () => {
      const providedData = { incompatibleProperty: 'value' }
      
      expect(() => 
        selectFromUnion(unionMembers, providedData, { fallbackToRandom: false })
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