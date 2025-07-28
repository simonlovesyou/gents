import { merge, selectFromUnion } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateGuestUser(guestUser, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        email: faker.string.alpha()
    }, guestUser, { preferUndefinedSource: false });
}
export function generateLoggedInUser(loggedInUser, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        email: faker.string.alpha(),
        name: faker.person.fullName()
    }, loggedInUser, { preferUndefinedSource: false });
}
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge(selectFromUnion([{
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
        }], user), user, { preferUndefinedSource: false });
}
