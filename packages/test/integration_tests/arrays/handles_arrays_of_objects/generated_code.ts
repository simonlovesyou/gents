import type { Friend, User } from "./types";
import { _, type MergeResult, merge } from "@gents/gents";
import type { PartialDeep } from "type-fest";
import { faker } from "@faker-js/faker";
export function generateFriend(friend?: never, options?: {
    seed: number | number[];
}): Friend;
export function generateFriend<const T extends undefined>(friend?: T, options?: {
    seed: number | number[];
}): Friend;
export function generateFriend<const T extends typeof _>(friend: T, options?: {
    seed: number | number[];
}): Friend;
export function generateFriend<const T extends PartialDeep<Friend>>(friend: T, options?: {
    seed: number | number[];
}): MergeResult<Friend, T, {
    preferUndefinedSource: false;
}>;
export function generateFriend<const T extends PartialDeep<Friend>>(friend?: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge({
    id: faker.string.uuid(),
    name: faker.person.fullName()
}, friend, { preferUndefinedSource: false }); }
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
    friends: faker.helpers.multiple(() => generateFriend(), {
        count: user?.friends?.length ?? { max: faker.number.int(42), min: 0 }
    })
}, user, { preferUndefinedSource: false }); }

