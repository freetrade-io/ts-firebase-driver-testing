import * as pubsubcl from "@google-cloud/pubsub"
import { database } from "firebase-admin"
import { runWith } from "firebase-functions"
import {
    IFirebaseDriver,
    IFirebaseFunctionBuilder,
    IFirebasePubSubCl,
    IFirebaseRealtimeDatabase,
    MemoryOption,
} from "./FirebaseDriver"

export class RealFirebaseDriver implements IFirebaseDriver {
    constructor(private readonly db: database.Database) {}

    realTimeDatabase(): IFirebaseRealtimeDatabase {
        return this.db
    }

    runWith(runtimeOptions: {
        memory: MemoryOption
        timeoutSeconds: number
    }): IFirebaseFunctionBuilder {
        return runWith(runtimeOptions)
    }

    pubSubCl(): IFirebasePubSubCl {
        // @ts-ignore
        return pubsubcl()
    }
}
