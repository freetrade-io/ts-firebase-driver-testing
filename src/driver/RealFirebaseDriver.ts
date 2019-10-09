// tslint:disable-next-line:no-var-requires
const { PubSub } = require("@google-cloud/pubsub")
import { database } from "firebase-admin"
import { runWith } from "firebase-functions"
import {
    IFirebaseDriver,
    IFirebaseFunctionBuilder,
    IFirebaseRealtimeDatabase,
    IPubSub,
    MemoryOption,
} from "./FirebaseDriver"

export class RealFirebaseDriver implements IFirebaseDriver {
    constructor(
        private readonly db: database.Database | IFirebaseRealtimeDatabase,
    ) {}

    realTimeDatabase(): IFirebaseRealtimeDatabase {
        return this.db
    }

    runWith(runtimeOptions: {
        memory: MemoryOption
        timeoutSeconds: number
    }): IFirebaseFunctionBuilder {
        return runWith(runtimeOptions)
    }

    pubSubCl(): IPubSub {
        return new PubSub()
    }
}
