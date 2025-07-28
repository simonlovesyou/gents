import { merge, selectFromUnion } from "@gents/gents";
import { faker } from "@faker-js/faker";
export function generateSubscriptionTier(subscriptionTier, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge(selectFromUnion([{
            schema: JSON.parse("{\"type\":\"literal\"}"),
            generator: () => undefined
        }, {
            schema: JSON.parse("{\"type\":\"literal\",\"value\":\"free\"}"),
            generator: () => "free"
        }, {
            schema: JSON.parse("{\"type\":\"literal\",\"value\":\"basic\"}"),
            generator: () => "basic"
        }, {
            schema: JSON.parse("{\"type\":\"literal\",\"value\":\"business\"}"),
            generator: () => "business"
        }], subscriptionTier), subscriptionTier, { preferUndefinedSource: true });
}
export function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker.seed(options.seed);
    }
    return merge({
        id: faker.string.uuid(),
        firstName: faker.person.firstName(),
        subscriptionTier: generateSubscriptionTier(),
        friends: faker.helpers.multiple(() => ({
            id: faker.string.uuid()
        }), {
            count: user?.friends?.length ?? { max: faker.number.int(42), min: 0 }
        })
    }, user, { preferUndefinedSource: false });
}
