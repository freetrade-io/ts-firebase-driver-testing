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
export { IFirebaseEventContext } from "./driver/RealtimeDatabase/IFirebaseRealtimeDatabase"
export { IFirebaseChange } from "./driver/RealtimeDatabase/IFirebaseRealtimeDatabase"
export { IFirebaseRealtimeDatabaseRef } from "./driver/RealtimeDatabase/IFirebaseRealtimeDatabase"
export { IFirebaseRealtimeDatabaseQuery } from "./driver/RealtimeDatabase/IFirebaseRealtimeDatabase"
export { IFirebaseDataSnapshot } from "./driver/RealtimeDatabase/IFirebaseRealtimeDatabase"
export { IFirebaseRealtimeDatabase } from "./driver/RealtimeDatabase/IFirebaseRealtimeDatabase"
export { IFirebaseFunctionBuilder } from "./driver/FirebaseFunctionBuilder"
