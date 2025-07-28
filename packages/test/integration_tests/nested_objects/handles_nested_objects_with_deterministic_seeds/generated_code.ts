import type { Address, User } from "./types";
import { _, type MergeResult, merge } from "@gents/gents";
import type { PartialDeep } from "type-fest";
import { faker } from "@faker-js/faker";
export function generateAddress(address?: never, options?: {
    seed: number | number[];
}): Address;
export function generateAddress<const T extends undefined>(address?: T, options?: {
    seed: number | number[];
}): Address;
export function generateAddress<const T extends typeof _>(address: T, options?: {
    seed: number | number[];
}): Address;
export function generateAddress<const T extends PartialDeep<Address>>(address: T, options?: {
    seed: number | number[];
}): MergeResult<Address, T, {
    preferUndefinedSource: false;
}>;
export function generateAddress<const T extends PartialDeep<Address>>(address?: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge({
    street: faker.string.alpha(),
    city: faker.string.alpha()
}, address, { preferUndefinedSource: false }); }
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
    address: generateAddress()
}, user, { preferUndefinedSource: false }); }

