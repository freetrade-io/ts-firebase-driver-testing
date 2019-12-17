// tslint:disable-next-line:no-var-requires
const { PubSub } = require("@google-cloud/pubsub")
import * as admin from "firebase-admin"
import { runWith } from "firebase-functions"
import { IFirebaseDriver, IPubSub, MemoryOption } from "./FirebaseDriver"
import { IFirebaseFunctionBuilder } from "./FirebaseFunctionBuilder"
import { IFirestore } from "./Firestore/IFirestore"
import { IFirebaseRealtimeDatabase } from "./RealtimeDatabase/IFirebaseRealtimeDatabase"

export class RealFirebaseDriver implements IFirebaseDriver {
    constructor(
        private readonly realTimeDb?: admin.database.Database,
        private readonly firestoreDb?: FirebaseFirestore.Firestore,
    ) {}

    realTimeDatabase(): IFirebaseRealtimeDatabase {
        return this.realTimeDb || admin.database()
    }

    fireStore(): IFirestore {
        return this.firestoreDb || admin.firestore()
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
