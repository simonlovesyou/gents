import { faker } from "@faker-js/faker";
import type { PartialDeep, ReadonlyDeep, SimplifyDeep } from "type-fest";
import merge from "deepmerge";
import omit from "lodash.omit";
type SubscriptionTier = "free" | "basic" | "business" | undefined;

const _ = Symbol("_");

interface User {
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
  friends: Array<{ id: string }>;
}
function generateSubscriptionTier(
  subscriptionTier: typeof _,
  options?: {
    seed: number | number[];
  }
): SubscriptionTier;
function generateSubscriptionTier<const T extends SubscriptionTier | typeof _>(
  generateSubscriptionTier?: T,
  options?: {
    seed: number | number[];
  }
): T extends undefined ? SubscriptionTier : T;
function generateSubscriptionTier<const T extends SubscriptionTier>(
  subscriptionTier?: T | typeof _,
  options?: {
    seed: number | number[];
  }
) {
  if (options?.seed !== undefined) {
    faker.seed(options.seed);
  }
  return "0" in arguments && subscriptionTier !== _
    ? subscriptionTier
    : faker.helpers.arrayElement([
        undefined,
        "free",
        "basic",
        "business",
      ] as const);
}
function generateUser<const T extends PartialDeep<User>>(
  user?: T,
  options?: {
    seed: number | number[];
  }
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
      birthday: faker.helpers.arrayElement([
        undefined,
        faker.date.anytime(),
      ] as const),
      details: faker.helpers.maybe(() =>
        faker.helpers.weightedArrayElement([
          {
            weight: calculateWeight(user?.details),
            value: {
              role: faker.string.alpha(),
            },
          },
          {
            weight: calculateWeight(user?.details),
            value: { numberOfVisit: faker.number.int() },
          },
        ])
      ),
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
        }
      ),
    } as const satisfies ReadonlyDeep<User>),
    user ?? {}
  ) as SimplifyDeep<User & T>;
}
