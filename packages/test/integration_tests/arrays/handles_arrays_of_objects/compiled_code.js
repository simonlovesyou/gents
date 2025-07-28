import { merge } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateFriend(friend, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        name: faker.person.fullName()
    }, friend, { preferUndefinedSource: false });
}
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        friends: faker.helpers.multiple(() => generateFriend(), {
            count: user?.friends?.length ?? { max: faker.number.int(42), min: 0 }
        })
    }, user, { preferUndefinedSource: false });
}
