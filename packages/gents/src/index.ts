export const _ = Symbol("_");

// Runtime schema representation using discriminated unions
export type ObjectSchema = {
  type: 'object'
  properties: Record<string, PropertyInfo>
  requiredProperties: string[]
  optionalProperties: string[]
}

export type ArraySchema = {
  type: 'array'
  tuple: boolean
  elements: RuntimeSchema | RuntimeSchema[] // single element for arrays, array of elements for tuples
  readonly?: boolean
}

export type UnionSchema = {
  type: 'union'
  members: RuntimeSchema[]
}

export type LiteralSchema = {
  type: 'literal'
  value: unknown
}

export type PrimitiveSchema = {
  type: 'primitive'
  primitiveType: 'string' | 'number' | 'boolean' | 'any' | 'unknown'
}

export type ReferenceSchema = {
  type: 'reference'
  reference: string
}

export type RuntimeSchema = 
  | ObjectSchema 
  | ArraySchema 
  | UnionSchema 
  | LiteralSchema 
  | PrimitiveSchema
  | ReferenceSchema

export type PropertyInfo = {
  schema: RuntimeSchema
  optional: boolean
}

export type UnionMember<T = unknown> = {
  schema: RuntimeSchema
  generator: () => T
  name?: string
}

export type CompatibilityResult = {
  compatible: boolean
  score: number
  incompatibleProperties?: string[]
  missingRequiredProperties?: string[]
  details?: string
}

export type CompatibilityOptions = {
  optionalPropertyBonus?: number // Extra points for matching optional properties (default: 5)
  nestedDepthPenalty?: number    // Penalty reduction per nesting level (default: 0.9)
  incompatiblePenalty?: number   // Penalty for incompatible properties (default: -1000)
}

// Check if data is compatible with schema (boolean result)
export function isCompatible(schema: RuntimeSchema, data: unknown): boolean {
  return calculateCompatibility(schema, data).compatible
}

// Calculate detailed compatibility score
export function calculateCompatibility(
  schema: RuntimeSchema, 
  data: unknown,
  options: CompatibilityOptions = {}
): CompatibilityResult {
  const opts = {
    optionalPropertyBonus: 5,
    nestedDepthPenalty: 0.9,
    incompatiblePenalty: -1000,
    ...options
  }

  // Handle null/undefined data
  if (data === null || data === undefined) {
    if (schema.type === 'literal' && (schema.value === null || schema.value === undefined)) {
      return { compatible: true, score: 100 }
    }
    return { compatible: false, score: 0, details: 'Data is null/undefined' }
  }

  switch (schema.type) {
    case 'object':
      return calculateObjectCompatibility(schema, data, opts)
    
    case 'array':
      return calculateArrayCompatibility(schema, data, opts)
    
    case 'union':
      return calculateUnionCompatibility(schema, data, opts)
    
    case 'literal':
      const isLiteralMatch = schema.value === data
      return {
        compatible: isLiteralMatch,
        score: isLiteralMatch ? 100 : 0,
        details: isLiteralMatch ? 'Literal match' : `Expected ${schema.value}, got ${data}`
      }
    
    case 'primitive':
      return calculatePrimitiveCompatibility(schema, data)
    
    case 'reference':
      // For references, we can't check compatibility without the actual type
      // So we assume compatibility and give a neutral score
      return { compatible: true, score: 50, details: 'Reference type - assumed compatible' }
    
    default:
      return { compatible: false, score: 0, details: 'Unknown schema type' }
  }
}

function calculateObjectCompatibility(
  schema: ObjectSchema, 
  data: unknown, 
  options: Required<CompatibilityOptions>
): CompatibilityResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { 
      compatible: false, 
      score: 0, 
      details: 'Data is not an object' 
    }
  }

  const dataObj = data as Record<string, unknown>
  const dataProps = Object.keys(dataObj)
  const { requiredProperties, optionalProperties, properties } = schema

  // Check for incompatible properties (properties in data but not in schema)
  const incompatibleProperties = dataProps.filter(prop => 
    !requiredProperties.includes(prop) && !optionalProperties.includes(prop)
  )

  if (incompatibleProperties.length > 0) {
    return {
      compatible: false,
      score: options.incompatiblePenalty,
      incompatibleProperties,
      details: `Incompatible properties: ${incompatibleProperties.join(', ')}`
    }
  }

  // Check for missing required properties
  const missingRequiredProperties = requiredProperties.filter(prop => 
    !(prop in dataObj)
  )

  if (missingRequiredProperties.length > 0) {
    return {
      compatible: false,
      score: 0,
      missingRequiredProperties,
      details: `Missing required properties: ${missingRequiredProperties.join(', ')}`
    }
  }

  // Calculate score based on property matches
  let score = 100 // Base score for compatibility

  // Bonus for matching optional properties
  const matchingOptionalProperties = optionalProperties.filter(prop => prop in dataObj)
  score += matchingOptionalProperties.length * options.optionalPropertyBonus

  // Recursively check nested property compatibility
  let nestedCompatible = true
  for (const prop of dataProps) {
    const propInfo = properties[prop]
    if (propInfo && propInfo.schema) {
      const nestedResult = calculateCompatibility(
        propInfo.schema, 
        dataObj[prop], 
        {
          ...options,
          optionalPropertyBonus: options.optionalPropertyBonus * options.nestedDepthPenalty,
        }
      )
      
      if (!nestedResult.compatible) {
        nestedCompatible = false
      }
      
      // Reduce score for nested mismatches
      score += nestedResult.score * options.nestedDepthPenalty * 0.1
    }
  }

  return {
    compatible: nestedCompatible,
    score: nestedCompatible ? score : 0,
    details: nestedCompatible ? 'Object compatible' : 'Nested property incompatibility'
  }
}

function calculateArrayCompatibility(
  schema: ArraySchema, 
  data: unknown, 
  options: Required<CompatibilityOptions>
): CompatibilityResult {
  if (!Array.isArray(data)) {
    return { 
      compatible: false, 
      score: 0, 
      details: 'Data is not an array' 
    }
  }

  if (schema.tuple) {
    // Tuple: check each element against corresponding schema
    const elementSchemas = Array.isArray(schema.elements) ? schema.elements : []
    
    if (data.length > elementSchemas.length) {
      return {
        compatible: false,
        score: 0,
        details: `Tuple too long: expected max ${elementSchemas.length}, got ${data.length}`
      }
    }

    let score = 100
    let allCompatible = true

    for (let i = 0; i < data.length; i++) {
      const elementSchema = elementSchemas[i]
      if (!elementSchema) {
        allCompatible = false
        break
      }
      
      const elementResult = calculateCompatibility(
        elementSchema, 
        data[i], 
        options
      )
      
      if (!elementResult.compatible) {
        allCompatible = false
      }
      
      score += elementResult.score * options.nestedDepthPenalty * 0.1
    }

    return {
      compatible: allCompatible,
      score: allCompatible ? score : 0,
      details: allCompatible ? 'Tuple compatible' : 'Tuple element incompatibility'
    }
  } else {
    // Array: all elements should match the same schema
    const elementSchema = schema.elements as RuntimeSchema
    let score = 100
    let allCompatible = true

    for (const element of data) {
      const elementResult = calculateCompatibility(elementSchema, element, options)
      if (!elementResult.compatible) {
        allCompatible = false
        break
      }
      score += elementResult.score * options.nestedDepthPenalty * 0.01 // Small bonus per element
    }

    return {
      compatible: allCompatible,
      score: allCompatible ? score : 0,
      details: allCompatible ? 'Array compatible' : 'Array element incompatibility'
    }
  }
}

function calculateUnionCompatibility(
  schema: UnionSchema, 
  data: unknown, 
  options: Required<CompatibilityOptions>
): CompatibilityResult {
  let bestResult: CompatibilityResult = { compatible: false, score: 0, details: 'No union member matched' }
  
  for (const memberSchema of schema.members) {
    const result = calculateCompatibility(memberSchema, data, options)
    if (result.score > bestResult.score) {
      bestResult = result
    }
    
    // Short-circuit if we find a perfect match
    if (result.compatible && result.score >= 100) {
      break
    }
  }
  
  return bestResult
}

function calculatePrimitiveCompatibility(
  schema: PrimitiveSchema, 
  data: unknown
): CompatibilityResult {
  const dataType = typeof data
  
  switch (schema.primitiveType) {
    case 'string':
      const isString = dataType === 'string'
      return {
        compatible: isString,
        score: isString ? 100 : 0,
        details: isString ? 'String match' : `Expected string, got ${dataType}`
      }
    
    case 'number':
      const isNumber = dataType === 'number' && !isNaN(data as number)
      return {
        compatible: isNumber,
        score: isNumber ? 100 : 0,
        details: isNumber ? 'Number match' : `Expected number, got ${dataType}`
      }
    
    case 'boolean':
      const isBoolean = dataType === 'boolean'
      return {
        compatible: isBoolean,
        score: isBoolean ? 100 : 0,
        details: isBoolean ? 'Boolean match' : `Expected boolean, got ${dataType}`
      }
    
    case 'any':
    case 'unknown':
      return { compatible: true, score: 100, details: 'Any/unknown type - always compatible' }
    
    default:
      return { compatible: false, score: 0, details: 'Unknown primitive type' }
  }
}

// High-level weighted selection for unions
export function selectFromUnion<T>(
  members: UnionMember<T>[],
  providedData?: unknown,
  options: {
    fallbackToRandom?: boolean
    minCompatibilityScore?: number
  } = {}
): T {
  const opts = {
    fallbackToRandom: true,
    minCompatibilityScore: 0,
    ...options
  }

  if (!providedData) {
    // No data provided, select randomly with equal weights
    if (members.length === 0) {
      throw new Error('No union members provided')
    }
    const randomIndex = Math.floor(Math.random() * members.length)
    const selectedMember = members[randomIndex]
    if (!selectedMember) {
      throw new Error('Failed to select union member')
    }
    return selectedMember.generator()
  }

  // Calculate compatibility for each member using union-specific logic
  const memberScores = members.map(member => ({
    member,
    result: calculateUnionMemberCompatibility(member.schema, providedData)
  }))

  // Filter to only compatible members above minimum score
  const compatibleMembers = memberScores.filter(({ result }) => 
    result.compatible && result.score >= opts.minCompatibilityScore
  )

  if (compatibleMembers.length === 0) {
    if (opts.fallbackToRandom) {
      // No compatible members, fall back to random selection
      if (members.length === 0) {
        throw new Error('No union members provided')
      }
      const randomIndex = Math.floor(Math.random() * members.length)
      const selectedMember = members[randomIndex]
      if (!selectedMember) {
        throw new Error('Failed to select union member')
      }
      return selectedMember.generator()
    } else {
      throw new Error('No compatible union members found')
    }
  }

  // Select based on weighted probability using scores
  const totalScore = compatibleMembers.reduce((sum, { result }) => sum + result.score, 0)
  
  if (totalScore === 0) {
    // All scores are 0, select randomly from compatible members
    if (compatibleMembers.length === 0) {
      throw new Error('No compatible members available')
    }
    const randomIndex = Math.floor(Math.random() * compatibleMembers.length)
    const selectedMember = compatibleMembers[randomIndex]
    if (!selectedMember) {
      throw new Error('Failed to select compatible member')
    }
    return selectedMember.member.generator()
  }

  // Weighted random selection
  const randomValue = Math.random() * totalScore
  let currentSum = 0

  for (const { member, result } of compatibleMembers) {
    currentSum += result.score
    if (randomValue <= currentSum) {
      return member.generator()
    }
  }

  // Fallback (shouldn't reach here)
  const fallbackMember = compatibleMembers[0]
  if (!fallbackMember) {
    throw new Error('No fallback member available')
  }
  return fallbackMember.member.generator()
}

// Specialized compatibility for union member selection
// Checks if provided data can be "extended" to match the schema
export function calculateUnionMemberCompatibility(
  schema: RuntimeSchema,
  data: unknown,
  options: CompatibilityOptions = {}
): CompatibilityResult {
  const opts = {
    optionalPropertyBonus: 5,
    nestedDepthPenalty: 0.9,
    incompatiblePenalty: -1000,
    ...options
  }

  // Handle null/undefined data
  if (data === null || data === undefined) {
    if (schema.type === 'literal' && (schema.value === null || schema.value === undefined)) {
      return { compatible: true, score: 100 }
    }
    return { compatible: true, score: 50, details: 'No data provided - can be extended' }
  }

  switch (schema.type) {
    case 'object':
      return calculateObjectUnionCompatibility(schema, data, opts)
    
    case 'array':
      return calculateArrayCompatibility(schema, data, opts)
    
    case 'union':
      return calculateUnionCompatibility(schema, data, opts)
    
    case 'literal':
      const isLiteralMatch = schema.value === data
      return {
        compatible: isLiteralMatch,
        score: isLiteralMatch ? 100 : 0,
        details: isLiteralMatch ? 'Literal match' : `Expected ${schema.value}, got ${data}`
      }
    
    case 'primitive':
      return calculatePrimitiveCompatibility(schema, data)
    
    case 'reference':
      return { compatible: true, score: 50, details: 'Reference type - assumed compatible' }
    
    default:
      return { compatible: false, score: 0, details: 'Unknown schema type' }
  }
}

function calculateObjectUnionCompatibility(
  schema: ObjectSchema,
  data: unknown,
  options: Required<CompatibilityOptions>
): CompatibilityResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { 
      compatible: false, 
      score: 0, 
      details: 'Data is not an object' 
    }
  }

  const dataObj = data as Record<string, unknown>
  const dataProps = Object.keys(dataObj)
  const { requiredProperties, optionalProperties, properties } = schema

  // Check for incompatible properties (properties in data but not in schema)
  const incompatibleProperties = dataProps.filter(prop => 
    !requiredProperties.includes(prop) && !optionalProperties.includes(prop)
  )

  if (incompatibleProperties.length > 0) {
    return {
      compatible: false,
      score: options.incompatiblePenalty,
      incompatibleProperties,
      details: `Incompatible properties: ${incompatibleProperties.join(', ')}`
    }
  }

  // For union selection, we don't require all properties to be present
  // We just check that the provided properties are compatible

  // Calculate score based on property matches
  let score = 100 // Base score for compatibility

  // Bonus for matching required properties
  const matchingRequiredProperties = requiredProperties.filter(prop => prop in dataObj)
  score += matchingRequiredProperties.length * 10 // Higher bonus for required props

  // Bonus for matching optional properties
  const matchingOptionalProperties = optionalProperties.filter(prop => prop in dataObj)
  score += matchingOptionalProperties.length * options.optionalPropertyBonus

  // Big bonus for perfect matches (all required properties provided)
  if (matchingRequiredProperties.length === requiredProperties.length) {
    score += 50 // Perfect match bonus
  }

  // Penalty for missing required properties (they can be filled later, but lower score)
  const missingRequiredProperties = requiredProperties.length - matchingRequiredProperties.length
  score -= missingRequiredProperties * 5 // Small penalty for missing props

  // Check that provided properties have compatible types
  let typesCompatible = true
  for (const prop of dataProps) {
    const propInfo = properties[prop]
    if (propInfo && propInfo.schema) {
      const nestedResult = calculateUnionMemberCompatibility(
        propInfo.schema, 
        dataObj[prop], 
        {
          ...options,
          optionalPropertyBonus: options.optionalPropertyBonus * options.nestedDepthPenalty,
        }
      )
      
      if (!nestedResult.compatible) {
        typesCompatible = false
        break
      }
      
      // Small bonus for nested compatibility (but don't let it dominate the score)
      score += Math.min(nestedResult.score * 0.01, 2)
    }
  }

  return {
    compatible: typesCompatible,
    score: typesCompatible ? score : 0,
    details: typesCompatible ? 'Object union compatible' : 'Property type incompatibility'
  }
}

// Helper to extract property information from schemas
export function extractProperties(schema: RuntimeSchema): {
  all: string[]
  required: string[]
  optional: string[]
  nested: Record<string, RuntimeSchema>
} {
  if (schema.type !== 'object') {
    return { all: [], required: [], optional: [], nested: {} }
  }

  const nested: Record<string, RuntimeSchema> = {}
  Object.entries(schema.properties).forEach(([key, propInfo]) => {
    nested[key] = propInfo.schema
  })

  return {
    all: [...schema.requiredProperties, ...schema.optionalProperties],
    required: schema.requiredProperties,
    optional: schema.optionalProperties,
    nested
  }
}
