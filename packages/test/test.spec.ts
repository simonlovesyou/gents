import { Project } from "ts-morph";
import dedent from "ts-dedent";
import { codegen } from "@gents/codegen";
import { parse } from "@gents/parser";
import { generators } from "@gents/codegen/src/generators";
import { it, expect, describe } from "vitest";
import prettier from "prettier";

describe("lol", () => {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      exactOptionalPropertyTypes: true,
    },
    skipAddingFilesFromTsConfig: true,
  });

  project.createSourceFile(
    "test.ts",
    dedent`
    type SubscriptionTier = 'free' | 'basic' | 'business' | undefined;

    interface User {
      id: string;
      avatar: {
        url: string
      };
      birthday?: Date;
      email: string;
      firstName: string;
      lastName: string;
      subscriptionTier: SubscriptionTier;
      card: {
        currencyCode: string
      }
      friends: Array<{id: string}>
    }
`
  );

  const result = codegen(parse(project), generators, {
    project,
    outputFolder: "generated",
  });

  const sourceFile = result.getSourceFileOrThrow("gen-test.ts");

  it("should work", async () => {
    expect(
      await prettier.format(sourceFile.getFullText(), { parser: "typescript" })
    ).toMatchInlineSnapshot(`
      "import type { SubscriptionTier, User } from "./generated/gen-test";
      import { faker } from "@faker-js/faker";
      import type { PartialDeep, ReadonlyDeep, SimplifyDeep } from "type-fest";
      import merge from "deepmerge";
      import omit from "lodash.omit";
      function generateSubscriptionTier<const T extends SubscriptionTier>(
        subscriptionTier?: T,
        options?: {
          seed: number | number[];
        },
      ) {
        if (options?.seed !== undefined) {
          faker.seed(options.seed);
        }
        return (subscriptionTier ??
          faker.helpers.arrayElement([
            "free",
            "basic",
            "business",
          ] as const)) as SubscriptionTier & T;
      }
      function generateUser<const T extends PartialDeep<User>>(
        user?: T,
        options?: {
          seed: number | number[];
        },
      ) {
        if (options?.seed !== undefined) {
          faker.seed(options.seed);
        }
        return merge(
          omit(faker.helpers.arrayElements(["birthday"], { min: 0, max: 1 }), {
            id: faker.string.uuid(),
            avatar: {
              url: faker.image.avatar(),
            },
            birthday: faker.date.anytime(),
            email: faker.string.alpha(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            subscriptionTier: generateSubscriptionTier(),
            card: {
              currencyCode: faker.finance.currencyCode(),
            },
            friends: faker.helpers.multiple(
              () => ({
                id: faker.string.uuid(),
              }),
              {
                count: user?.friends?.length ?? { max: faker.number.int(42), min: 0 },
              },
            ),
          }) as const satisfies ReadonlyDeep<User>,
          user ?? {},
        ) as SimplifyDeep<User & T>;
      }
      "
    `);
  });
});
