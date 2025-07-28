import { merge } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateAddress(address, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        street: faker.string.alpha(),
        city: faker.string.alpha()
    }, address, { preferUndefinedSource: false });
}
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        address: generateAddress()
    }, user, { preferUndefinedSource: false });
}
