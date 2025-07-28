import { merge } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        tags: faker.helpers.multiple(() => faker.string.alpha(), {
            count: user?.tags?.length ?? { max: faker.number.int(42), min: 0 }
        })
    }, user, { preferUndefinedSource: false });
}
