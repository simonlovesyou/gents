import { merge, selectFromUnion } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        name: selectFromUnion([{
                schema: JSON.parse("{\"type\":\"literal\"}"),
                generator: () => undefined
            }, {
                schema: JSON.parse("{\"type\":\"primitive\",\"primitiveType\":\"string\"}"),
                generator: () => faker.person.fullName()
            }], user),
        email: selectFromUnion([{
                schema: JSON.parse("{\"type\":\"literal\"}"),
                generator: () => undefined
            }, {
                schema: JSON.parse("{\"type\":\"primitive\",\"primitiveType\":\"string\"}"),
                generator: () => faker.string.alpha()
            }], user)
    }, user, { preferUndefinedSource: false });
}
