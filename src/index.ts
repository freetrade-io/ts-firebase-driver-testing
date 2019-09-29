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

export * from "./driver/FirebaseDriver"
export * from "./driver/InProcessFirebaseDriver"
export * from "./driver/RealFirebaseDriver"

export * from "./driver/PubSub/InProcessFirebasePubSub"

export * from "./driver/RealtimeDatabase/InProcessRealtimeDatabase"
export * from "./driver/RealtimeDatabase/RealtimeDatabaseChangeFilter"
export * from "./driver/RealtimeDatabase/RealtimeDatabaseChangeObserver"
