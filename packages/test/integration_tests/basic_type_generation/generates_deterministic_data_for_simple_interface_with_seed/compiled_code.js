import { merge } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        age: faker.number.int()
    }, user, { preferUndefinedSource: false });
}
