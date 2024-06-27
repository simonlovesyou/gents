import {
  InterfaceDeclaration,
  Node,
  ObjectFlags,
  Program,
  Project,
  SourceFile,
  Symbol,
  SymbolFlags,
  SyntaxKind,
  Type,
  TypeAliasDeclaration,
  TypeFlags,
  TypeFormatFlags,
} from "ts-morph";

const getNameFromNode = (node: Node) => {
  return node.isKind(SyntaxKind.InterfaceDeclaration)
    ? node.getName()
    : node.isKind(SyntaxKind.TypeReference)
    ? node.getTypeName()
    : node.isKind(SyntaxKind.TypeAliasDeclaration)
    ? node.getName()
    : "unknown";
};

const findType = (type: Type) => {
  const keys = [
    "isAnonymous",
    "isAny",
    "isNever",
    "isArray",
    "isReadonlyArray",
    "isTemplateLiteral",
    "isBoolean",
    "isString",
    "isNumber",
    "isLiteral",
    "isBooleanLiteral",
    "isEnumLiteral",
    "isNumberLiteral",
    "isStringLiteral",
    "isClass",
    "isClassOrInterface",
    "isEnum",
    "isInterface",
    "isObject",
    "isTypeParameter",
    "isTuple",
    "isUnion",
    "isIntersection",
    "isUnionOrIntersection",
    "isUnknown",
    "isNull",
    "isUndefined",
    "isVoid",
  ] as const;
  return keys
    .filter((key) => type[key]())
    .reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<(typeof keys)[number], boolean>>
    );
};

const isTypeReference = (type: Type) =>
  (type.getObjectFlags() & ObjectFlags.Reference) !== 0;

const parsePropertySymbol = (property: Symbol): any => {
  const escapedName = property.getEscapedName();
  console.log(`Parsing property "${escapedName}"`);

  const propertyType = property.getValueDeclarationOrThrow().getType();

  return {
    name: escapedName,
    type: parseType(propertyType),
    optional: (property.getFlags() & SymbolFlags.Optional) !== 0,
  };
};

const formatFlags =
  TypeFormatFlags.UseTypeOfFunction |
  TypeFormatFlags.NoTruncation |
  TypeFormatFlags.UseFullyQualifiedType |
  TypeFormatFlags.WriteTypeArgumentsOfSignature;

const parseType = (type: Type, node?: Node, program?: Program): any => {
  const typeChecker = program?.getTypeChecker();
  const aliasSymbol = type.getAliasSymbol();
  const symbol = type?.getSymbol();
  const typeAtLocation = node && symbol && symbol.getTypeAtLocation(node);
  const apparentType = type.getApparentType();
  const apparentTypeAliasSymbol = type.getApparentType().getAliasSymbol();
  const apparentTypeSymbol = type.getApparentType().getSymbol();
  const aliasedSymbol = symbol && typeChecker?.getAliasedSymbol(symbol);
  const symbolLocation =
    (typeChecker &&
      symbol &&
      node &&
      typeChecker.getTypeOfSymbolAtLocation(symbol, node)) ??
    null;
  console.log("=====================================================");
  console.log(`Parsing type with text: "${type.getText()}"`);
  console.log(`Parsing with apparenty type: "${apparentType.getText()}"`);
  node && console.log(`Parsing node: "${node.getFullText()}"`);

  console.log({
    apparent: findType(apparentType),
    type: findType(type),
    kindName: node?.getKindName(),
    aliasSymbol,
    typeAtLocation: typeAtLocation?.getText(),
    aliasedSymbol,
    apparentTypeAliasSymbol,
    apparentTypeSymbol,
    referenceFlag:
      type.getTargetType()?.getObjectFlags() &&
      type.getTargetType()!.getObjectFlags() & ObjectFlags.Reference,
    apparentReferenceFlag:
      apparentType.getObjectFlags() & ObjectFlags.Reference,
    symbol,
    node,
  });

  const typeString =
    symbol && node && typeChecker?.getTypeText(type, node, formatFlags);

  if (aliasSymbol && node === undefined) {
    const [aliasDeclaration] = aliasSymbol.getDeclarations();
    const [typeDeclaration] = symbol?.getDeclarations() ?? [];

    if (typeDeclaration && aliasDeclaration !== typeDeclaration) {
      return {
        type: "alias",
        alias: getNameFromNode(aliasDeclaration!),
      };
    }
  }

  if (typeString && getNameFromNode(node) !== typeString) {
    if (typeString === "{}") {
      return {
        type: "object",
        properties: [],
      };
    }
    return {
      type: "alias",
      alias: typeString,
    };
  }

  if (type.isArray()) {
    console.log("array ", type.getArrayElementTypeOrThrow().getText());
    return {
      type: "array" as const,
      readonly: false,
      elements: parseType(type.getArrayElementTypeOrThrow()),
    };
  }
  console.log(
    "Is type reference ",
    isTypeReference(type),
    symbol,
    symbol && symbol.getFlags() & SymbolFlags.TypeAliasExcludes
  );
  if ((isTypeReference(type) || symbol) && node === undefined) {
    const [declaration] = type.getSymbolOrThrow().getDeclarations() ?? [];
    if (declaration) {
      return {
        type: "reference" as const,
        reference: getNameFromNode(declaration),
      };
    }
  }
  if (type.isObject()) {
    return {
      type: "object" as const,
      properties: type.getProperties().map(parsePropertySymbol),
      // apparentProperties: type.getApparentProperties().map(parsePropertySymbol),
    };
  }

  if (symbol) {
    const [declaration, ...rest] = symbol.getDeclarations();
    console.log({ rest, declaration, node });

    if (node === undefined && declaration) {
      console.log("First reference parse");
      return {
        type: "reference",
        reference: getNameFromNode(declaration),
      };
    }
  }

  if (type.isAnonymous()) {
    const apparentType = type.getApparentType();

    return {
      type: "anonymous" as const,
    };
  }
  if (type.isAny()) {
    return {
      type: "any" as const,
    };
  }

  if (type.isBoolean()) {
    return {
      type: "boolean" as const,
    };
  }
  if (type.isBooleanLiteral()) {
    return {
      type: "booleanLiteral" as const,
      value: type.getLiteralValueOrThrow(),
    };
  }
  if (type.isEnum()) {
    return {
      type: "enum" as const,
      value: type.getApparentProperties(),
    };
  }

  if (type.isEnumLiteral()) {
    return {
      type: "enumLiteral" as const,
    };
  }

  if (type.isInterface()) {
    const properties = type.getProperties();

    return {
      type: "object" as const,
      properties: properties.map(parsePropertySymbol),
    };
  }

  if (type.isIntersection()) {
    return {
      type: "intersection" as const,
    };
  }

  if (type.isLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValueOrThrow(),
    };
  }

  if (type.isNever()) {
    return {
      type: "never" as const,
    };
  }

  if (type.isNull()) {
    return {
      type: "literal" as const,
      value: null,
    };
  }

  if (type.isNullable()) {
    return {
      type: "nullable" as const,
    };
  }

  if (type.isNumber()) {
    return {
      type: "number" as const,
    };
  }

  if (type.isNumberLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValueOrThrow(),
    };
  }

  if (type.isReadonlyArray()) {
    return {
      type: "array" as const,
      readonly: true,
      members: [],
    };
  }

  if (type.isString()) {
    return {
      type: "string" as const,
    };
  }

  if (type.isStringLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValueOrThrow(),
    };
  }

  if (type.isTemplateLiteral()) {
    return {
      type: "literal" as const,
      value: type.getLiteralValue(),
      template: true,
    };
  }

  if (type.isTuple()) {
    return {
      type: "tuple" as const,
      members: [],
    };
  }

  if (type.isTypeParameter()) {
    return type.getText();
  }

  if (type.isUnknown()) {
    return {
      type: "unknown" as const,
    };
  }

  if (type.isUndefined()) {
    return {
      type: "literal" as const,
      value: undefined,
    };
  }

  if (type.isEnum()) {
    const unionTypes = type.getUnionTypes();
    return {
      type: "enum",
      values: unionTypes.map((type) => parseType(type)),
    };
  }

  if (type.isUnion()) {
    const unionTypes = type.getUnionTypes();
    return {
      type: "union" as const,
      values: unionTypes.map((type) => parseType(type)),
    };
  }

  return type;

  return {
    type: type.isAnonymous()
      ? "anonymous"
      : type.isAny()
      ? "any"
      : type.isArray()
      ? "array"
      : type.isBoolean()
      ? "boolean"
      : type.isBooleanLiteral()
      ? "booleanLiteral"
      : type.isClass()
      ? "class"
      : type.isEnum()
      ? "enum"
      : "unknown",
  };
};

const parseTypeDeclaration = (
  typeDeclaration: TypeAliasDeclaration | InterfaceDeclaration,
  program: Program
) => {
  const type = typeDeclaration.getType();

  if (typeDeclaration.isKind(SyntaxKind.InterfaceDeclaration)) {
    return {
      name: typeDeclaration.getName(),
      type: parseType(type, typeDeclaration, program),
    };
  }

  return {
    name: typeDeclaration.getName(),
    type: parseType(type, typeDeclaration, program),
    exported: typeDeclaration.getExportKeyword() !== undefined,
  };
};

const parseSourceFile = (sourceFile: SourceFile, program: Program) => {
  const typeDeclarations = sourceFile
    .getStatements()
    .filter(
      (statement): statement is TypeAliasDeclaration | InterfaceDeclaration =>
        Boolean(
          statement.asKind(SyntaxKind.TypeAliasDeclaration) ||
            statement.asKind(SyntaxKind.InterfaceDeclaration)
        )
    );

  return {
    name: sourceFile.getBaseName(),
    typeDeclarations: typeDeclarations.map((declaration) =>
      parseTypeDeclaration(declaration, program)
    ),
  };
};

export function codegen(project: Project) {
  const sourceFiles = project.getSourceFiles();
  const program = project.getProgram();

  return sourceFiles.map((sourceFile) => parseSourceFile(sourceFile, program));
}
