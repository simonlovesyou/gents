import type { GuestUser, LoggedInUser, User } from "./types";
import { _, type MergeResult, merge, selectFromUnion } from "@gents/gents";
import type { PartialDeep } from "type-fest";
import { faker } from "@faker-js/faker";
export function generateGuestUser(guestUser?: never, options?: {
    seed: number | number[];
}): GuestUser;
export function generateGuestUser<const T extends undefined>(guestUser?: T, options?: {
    seed: number | number[];
}): GuestUser;
export function generateGuestUser<const T extends typeof _>(guestUser: T, options?: {
    seed: number | number[];
}): GuestUser;
export function generateGuestUser<const T extends PartialDeep<GuestUser>>(guestUser: T, options?: {
    seed: number | number[];
}): MergeResult<GuestUser, T, {
    preferUndefinedSource: false;
}>;
export function generateGuestUser<const T extends PartialDeep<GuestUser>>(guestUser?: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge({
    email: faker.string.alpha()
}, guestUser, { preferUndefinedSource: false }); }
export function generateLoggedInUser(loggedInUser?: never, options?: {
    seed: number | number[];
}): LoggedInUser;
export function generateLoggedInUser<const T extends undefined>(loggedInUser?: T, options?: {
    seed: number | number[];
}): LoggedInUser;
export function generateLoggedInUser<const T extends typeof _>(loggedInUser: T, options?: {
    seed: number | number[];
}): LoggedInUser;
export function generateLoggedInUser<const T extends PartialDeep<LoggedInUser>>(loggedInUser: T, options?: {
    seed: number | number[];
}): MergeResult<LoggedInUser, T, {
    preferUndefinedSource: false;
}>;
export function generateLoggedInUser<const T extends PartialDeep<LoggedInUser>>(loggedInUser?: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge({
    id: faker.string.uuid(),
    email: faker.string.alpha(),
    name: faker.person.fullName()
}, loggedInUser, { preferUndefinedSource: false }); }
export function generateUser(user?: never, options?: {
    seed: number | number[];
}): User;
export function generateUser<const T extends undefined>(user?: T, options?: {
    seed: number | number[];
}): User;
export function generateUser<const T extends User>(user: T, options?: {
    seed: number | number[];
}): T;
export function generateUser<const T extends User | typeof _>(user: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge(selectFromUnion([{
        schema: JSON.parse("{\"type\":\"object\",\"properties\":{\"email\":{\"schema\":{\"type\":\"primitive\",\"primitiveType\":\"string\"},\"optional\":false}},\"requiredProperties\":[\"email\"],\"optionalProperties\":[]}"),
        generator: () => ({
            email: faker.string.alpha()
        })
    }, {
        schema: JSON.parse("{\"type\":\"object\",\"properties\":{\"id\":{\"schema\":{\"type\":\"primitive\",\"primitiveType\":\"string\"},\"optional\":false},\"email\":{\"schema\":{\"type\":\"primitive\",\"primitiveType\":\"string\"},\"optional\":false},\"name\":{\"schema\":{\"type\":\"primitive\",\"primitiveType\":\"string\"},\"optional\":false}},\"requiredProperties\":[\"id\",\"email\",\"name\"],\"optionalProperties\":[]}"),
        generator: () => ({
            id: faker.string.uuid(),
            email: faker.string.alpha(),
            name: faker.person.fullName()
        })
    }], user), user, { preferUndefinedSource: false }); }

