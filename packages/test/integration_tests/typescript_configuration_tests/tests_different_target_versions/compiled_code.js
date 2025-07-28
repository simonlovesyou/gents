"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUser = void 0;
var gents_1 = require("@gents/gents");
var faker_1 = require("@faker-js/faker");
function generateUser(user, options) {
    if (options?.seed !== undefined) {
        faker_1.faker.seed(options.seed);
    }
    return (0, gents_1.merge)({
        id: faker_1.faker.string.uuid(),
        name: faker_1.faker.person.fullName()
    }, user, { preferUndefinedSource: false });
}
exports.generateUser = generateUser;
