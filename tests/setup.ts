// tslint:disable-next-line:no-var-requires
const values = require("object.values")

if (!Object.values) {
    values.shim()
}
