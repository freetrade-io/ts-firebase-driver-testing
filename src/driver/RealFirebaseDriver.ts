// tslint:disable-next-line:no-var-requires
const { PubSub } = require("@google-cloud/pubsub")
import { database } from "firebase-admin"
import { runWith } from "firebase-functions"
import { IFirebaseDriver, IPubSub, MemoryOption } from "./FirebaseDriver"
import { IFirestore } from "./Firestore/IFirestore"
import {
    IFirebaseFunctionBuilder,
    IFirebaseRealtimeDatabase,
} from "./RealtimeDatabase/IFirebaseRealtimeDatabase"

export class RealFirebaseDriver implements IFirebaseDriver {
    constructor(
        private readonly realTimeDb: database.Database,
        private readonly firestoreDb: FirebaseFirestore.Firestore,
    ) {}

    realTimeDatabase(): IFirebaseRealtimeDatabase {
        return this.realTimeDb
    }

    fireStore(): IFirestore {
        return this.firestoreDb
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
