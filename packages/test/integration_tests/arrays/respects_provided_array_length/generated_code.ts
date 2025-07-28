import type { User } from "./types";
import { _, type MergeResult, merge } from "@gents/gents";
import type { PartialDeep } from "type-fest";
import { faker } from "@faker-js/faker";
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
    tags: faker.helpers.multiple(() => faker.string.alpha(), {
        count: user?.tags?.length ?? { max: faker.number.int(42), min: 0 }
    })
}, user, { preferUndefinedSource: false }); }

