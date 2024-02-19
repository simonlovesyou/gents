import {
  InterfaceDeclaration,
  Node,
  Program,
  Project,
  SourceFile,
  Symbol,
  SyntaxKind,
  Type,
  TypeAliasDeclaration,
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

const parsePropertySymbol = (property: Symbol): any => {
  const escapedName = property.getEscapedName();
  try {
    const value = property
      .getValueDeclarationOrThrow()
      .getType()
      .getApparentType();

    const [declaration] =
      property
        .getValueDeclarationOrThrow()
        .getType()
        .getSymbol()
        ?.getDeclarations() ?? [];

    if (declaration) {
      return {
        name: escapedName,
        type: {
          type: "reference" as const,
          reference: getNameFromNode(declaration),
        },
      };
    }

    return {
      name: escapedName,
      type: parseType(property.getValueDeclarationOrThrow().getType()),
    };
  } catch (error) {
    // @ts-expect-error asdökfjnalsdkjnf a
    return { error, text: property?.getText?.() };
  }
};

const formatFlags =
  TypeFormatFlags.UseTypeOfFunction |
  TypeFormatFlags.NoTruncation |
  TypeFormatFlags.UseFullyQualifiedType |
  TypeFormatFlags.WriteTypeArgumentsOfSignature;

const parseType = (type: Type, node?: Node, program?: Program): any => {
  const typeChecker = program?.getTypeChecker();
  const aliasSymbol = type.getAliasSymbol();
  const typeSymbol = node?.getSymbol();
  const typeAtLocation =
    node && typeSymbol && typeSymbol.getTypeAtLocation(node);
  const apparentType = type.getApparentType();
  const apparentAliasSymbol = type.getApparentType().getAliasSymbol();
  const signature = typeSymbol && typeChecker?.getAliasedSymbol(typeSymbol);
  const symbolLocation =
    (typeChecker &&
      typeSymbol &&
      node &&
      typeChecker.getTypeOfSymbolAtLocation(typeSymbol, node)) ??
    null;
  console.log("=====================================================");
  console.log(`Parsing type with text: "${type.getText()}"`);
  console.log(`Parsing with apparenty type: "${apparentType.getText()}"`);
  node && console.log(`Parsing node: "${node.getFullText()}"`);

  console.log({
    apparent: {
      literal: apparentType.isLiteral(),
      object: apparentType.isObject(),
      anon: apparentType.isAnonymous(),
      string: apparentType.isString(),
    },
    type: {
      literal: type.isLiteral(),
      object: type.isObject(),
      anon: type.isAnonymous(),
      string: type.isString(),
    },
  });

  const typeString =
    typeSymbol && node && typeChecker?.getTypeText(type, node, formatFlags);

  if (aliasSymbol) {
    const [aliasDeclaration] = aliasSymbol.getDeclarations();
    const [typeDeclaration] = typeSymbol?.getDeclarations() ?? [];

    if (typeDeclaration && aliasDeclaration !== typeDeclaration) {
      return {
        type: "alias",
        alias: getNameFromNode(aliasDeclaration!),
      };
    }
  }

  if (typeString && getNameFromNode(node) !== typeString) {
    return {
      type: "alias",
      alias: typeString,
    };
  }

  if (type.isObject()) {
    return {
      type: "object" as const,
      properties: type.getProperties().map(parsePropertySymbol),
      // apparentProperties: type.getApparentProperties().map(parsePropertySymbol),
    };
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

  if (type.isArray()) {
    return {
      type: "array" as const,
      readonly: false,
      elements: type.getArrayElementTypeOrThrow(),
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

  // console.log(sourceFiles.map((sourceFile) => sourceFile.getFullText()));

  return sourceFiles.map((sourceFile) => parseSourceFile(sourceFile, program));
}
