import { merge, selectFromUnion } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateStatus(status, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge(selectFromUnion([{
            schema: JSON.parse("{\"type\":\"literal\",\"value\":\"active\"}"),
            generator: () => "active"
        }, {
            schema: JSON.parse("{\"type\":\"literal\",\"value\":\"inactive\"}"),
            generator: () => "inactive"
        }, {
            schema: JSON.parse("{\"type\":\"literal\",\"value\":\"pending\"}"),
            generator: () => "pending"
        }], status), status, { preferUndefinedSource: false });
}
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        status: generateStatus()
    }, user, { preferUndefinedSource: false });
}
