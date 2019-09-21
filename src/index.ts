// tslint:disable-next-line:no-var-requires
const entries = require("object.entries")

if (!Object.entries) {
    entries.shim()
}

export * from "./driver/firebase_driver"
