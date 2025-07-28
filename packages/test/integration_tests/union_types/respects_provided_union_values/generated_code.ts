import type { Status, User } from "./types";
import { _, merge, selectFromUnion, type MergeResult } from "@gents/gents";
import { faker } from "@faker-js/faker";
import type { PartialDeep } from "type-fest";
export function generateStatus(status?: never, options?: {
    seed: number | number[];
}): Status;
export function generateStatus<const T extends undefined>(status?: T, options?: {
    seed: number | number[];
}): Status;
export function generateStatus<const T extends Status>(status: T, options?: {
    seed: number | number[];
}): T;
export function generateStatus<const T extends Status | typeof _>(status: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge(selectFromUnion([{
        schema: JSON.parse("{\"type\":\"literal\",\"value\":\"active\"}"),
        generator: () => "active"
    }, {
        schema: JSON.parse("{\"type\":\"literal\",\"value\":\"inactive\"}"),
        generator: () => "inactive"
    }, {
        schema: JSON.parse("{\"type\":\"literal\",\"value\":\"pending\"}"),
        generator: () => "pending"
    }], status), status, { preferUndefinedSource: false }); }
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
    status: generateStatus()
}, user, { preferUndefinedSource: false }); }

