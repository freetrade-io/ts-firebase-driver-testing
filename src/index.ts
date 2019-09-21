// tslint:disable-next-line:no-var-requires
const values = require("object.values")

if (!Object.values) {
    values.shim()
}

// tslint:disable-next-line:no-var-requires
const entries = require("object.entries")

if (!Object.entries) {
    entries.shim()
}

export * from "./driver/firebase_driver"
export * from "./driver/in_process_firebase_driver"
export * from "./driver/real_firebase_driver"
