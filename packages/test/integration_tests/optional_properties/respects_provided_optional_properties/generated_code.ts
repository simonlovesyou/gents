import type { User } from "./types";
import { _, type MergeResult, merge, selectFromUnion } from "@gents/gents";
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
    name: selectFromUnion([{
            schema: JSON.parse("{\"type\":\"literal\"}"),
            generator: () => undefined
        }, {
            schema: JSON.parse("{\"type\":\"primitive\",\"primitiveType\":\"string\"}"),
            generator: () => faker.person.fullName()
        }], user)
}, user, { preferUndefinedSource: false }); }

