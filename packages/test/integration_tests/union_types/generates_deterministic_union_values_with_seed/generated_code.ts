import type { User } from "./types";
import { _, merge, selectFromUnion } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateUser<const T extends undefined>(user: T, options?: {
    seed: number | number[];
}): undefined;
export function generateUser(user?: never, options?: {
    seed: number | number[];
}): User;
export function generateUser<const T extends typeof _>(user: T, options?: {
    seed: number | number[];
}): User;
export function generateUser<const T extends User>(user: T, options?: {
    seed: number | number[];
}): T;
export function generateUser<const T extends User | undefined | typeof _>(user?: T, options?: {
    seed: number | number[];
}) { if (options?.seed !== undefined) {
    faker.seed(options.seed);
} return merge(selectFromUnion([{
        schema: JSON.parse("{\"type\":\"literal\"}"),
        generator: () => undefined
    }, {
        schema: JSON.parse("{\"type\":\"object\",\"properties\":{\"id\":{\"schema\":{\"type\":\"primitive\",\"primitiveType\":\"string\"},\"optional\":false},\"status\":{\"schema\":{\"type\":\"union\",\"members\":[{\"type\":\"literal\",\"value\":\"active\"},{\"type\":\"literal\",\"value\":\"inactive\"},{\"type\":\"literal\",\"value\":\"pending\"}]},\"optional\":false}},\"requiredProperties\":[\"id\",\"status\"],\"optionalProperties\":[]}"),
        generator: () => ({
            id: faker.string.uuid(),
            status: selectFromUnion([{
                    schema: JSON.parse("{\"type\":\"literal\",\"value\":\"active\"}"),
                    generator: () => "active"
                }, {
                    schema: JSON.parse("{\"type\":\"literal\",\"value\":\"inactive\"}"),
                    generator: () => "inactive"
                }, {
                    schema: JSON.parse("{\"type\":\"literal\",\"value\":\"pending\"}"),
                    generator: () => "pending"
                }], user)
        })
    }], user), user, { preferUndefinedSource: true }); }

