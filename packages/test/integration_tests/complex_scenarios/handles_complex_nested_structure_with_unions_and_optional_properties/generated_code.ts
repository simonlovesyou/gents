import type { SubscriptionTier, User } from "./types";
import { _, merge, selectFromUnion, type MergeResult } from "@gents/gents";
import { faker } from "@faker-js/faker";
import type { PartialDeep } from "type-fest";
export function generateSubscriptionTier<const T extends undefined>(subscriptionTier: T, options?: {
    seed: number | number[];
}): undefined;
export function generateSubscriptionTier(subscriptionTier?: never, options?: {
    seed: number | number[];
}): SubscriptionTier;
export function generateSubscriptionTier<const T extends typeof _>(subscriptionTier: T, options?: {
    seed: number | number[];
}): SubscriptionTier;
export function generateSubscriptionTier<const T extends SubscriptionTier>(subscriptionTier: T, options?: {
    seed: number | number[];
}): T;
export function generateSubscriptionTier<const T extends SubscriptionTier | undefined | typeof _>(subscriptionTier?: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge(selectFromUnion([{
        schema: JSON.parse("{\"type\":\"literal\"}"),
        generator: () => undefined
    }, {
        schema: JSON.parse("{\"type\":\"literal\",\"value\":\"free\"}"),
        generator: () => "free"
    }, {
        schema: JSON.parse("{\"type\":\"literal\",\"value\":\"basic\"}"),
        generator: () => "basic"
    }, {
        schema: JSON.parse("{\"type\":\"literal\",\"value\":\"business\"}"),
        generator: () => "business"
    }], subscriptionTier), subscriptionTier, { preferUndefinedSource: true }); }
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
    id: faker.string.uuid(),
    avatar: {
        url: faker.image.avatar()
    },
    birthday: selectFromUnion([{
            schema: JSON.parse("{\"type\":\"literal\"}"),
            generator: () => undefined
        }, {
            schema: JSON.parse("{\"type\":\"reference\",\"reference\":\"Date\"}"),
            generator: () => faker.date.anytime()
        }], user),
    email: faker.string.alpha(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    subscriptionTier: generateSubscriptionTier(),
    card: {
        currencyCode: faker.finance.currencyCode()
    },
    friends: faker.helpers.multiple(() => ({
        id: faker.string.uuid()
    }), {
        count: user?.friends?.length ?? { max: faker.number.int(42), min: 0 }
    })
}, user, { preferUndefinedSource: false }); }

