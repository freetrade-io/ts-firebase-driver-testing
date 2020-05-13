import { AsyncJobs, IAsyncJobs } from "./AsyncJobs"
import { IFirebaseDriver, IPubSub, MemoryOption } from "./FirebaseDriver"
import {
    IFirebaseFunctionBuilder,
    SUPPORTED_REGIONS,
} from "./FirebaseFunctionBuilder"
import {
    InProcessFirestore,
    InProcessFirestoreBuilder,
} from "./Firestore/InProcessFirestore"
import { firebaseLikeId, fireStoreLikeId } from "./identifiers"
import {
    InProcessFirebaseBuilderPubSub,
    InProcessFirebasePubSubCl,
} from "./PubSub/InProcessFirebasePubSub"
import {
    IdGenerator,
    InProcessFirebaseBuilderDatabase,
    InProcessRealtimeDatabase,
} from "./RealtimeDatabase/InProcessRealtimeDatabase"

class InProcessFirebaseFunctionBuilder implements IFirebaseFunctionBuilder {
    constructor(
        readonly pubsub: InProcessFirebaseBuilderPubSub,
        readonly database: InProcessFirebaseBuilderDatabase,
        readonly firestore: InProcessFirestoreBuilder,
    ) {}

    region(
        ...regions: Array<typeof SUPPORTED_REGIONS[number]>
    ): IFirebaseFunctionBuilder {
        return this
    }
}

export class InProcessFirebaseDriver implements IFirebaseDriver, IAsyncJobs {
    private rtDb: InProcessRealtimeDatabase | undefined
    private firestoreDb: InProcessFirestore | undefined
    private asyncJobs: IAsyncJobs

    private builderDatabase: InProcessFirebaseBuilderDatabase | undefined
    private builderFirestore: InProcessFirestoreBuilder | undefined
    private builderPubSub: InProcessFirebaseBuilderPubSub | undefined
    private functionBuilder: InProcessFirebaseFunctionBuilder | undefined

    constructor() {
        this.asyncJobs = new AsyncJobs()
    }

    realTimeDatabase(
        idGenerator: IdGenerator = firebaseLikeId,
    ): InProcessRealtimeDatabase {
        if (!this.rtDb) {
            this.rtDb = new InProcessRealtimeDatabase(this, idGenerator)
        }
        return this.rtDb
    }

    firestore(makeId: IdGenerator = fireStoreLikeId): InProcessFirestore {
        if (!this.firestoreDb) {
            this.firestoreDb = new InProcessFirestore(this, makeId)
        }
        return this.firestoreDb
    }

    runWith(runtimeOptions?: {
        memory: MemoryOption
        timeoutSeconds: number
    }): InProcessFirebaseFunctionBuilder {
        if (!this.functionBuilder) {
            this.functionBuilder = new InProcessFirebaseFunctionBuilder(
                this.inProcessBuilderPubSub(),
                this.inProcessBuilderDatabase(),
                this.inProcessBuilderFirestore(),
            )
        }
        return this.functionBuilder
    }

    initializeApp() {
        // This is no-op in in-process Firebase driver.
    }

    pubSubCl(): IPubSub {
        return new InProcessFirebasePubSubCl(this.inProcessBuilderPubSub())
    }

    inProcessBuilderDatabase(): InProcessFirebaseBuilderDatabase {
        if (!this.builderDatabase) {
            this.builderDatabase = new InProcessFirebaseBuilderDatabase(
                this.realTimeDatabase(),
            )
        }
        return this.builderDatabase
    }

    inProcessBuilderFirestore(): InProcessFirestoreBuilder {
        if (!this.builderFirestore) {
            this.builderFirestore = new InProcessFirestoreBuilder(
                this.firestore(),
            )
        }
        return this.builderFirestore
    }

    inProcessBuilderPubSub(): InProcessFirebaseBuilderPubSub {
        if (!this.builderPubSub) {
            this.builderPubSub = new InProcessFirebaseBuilderPubSub(this)
        }
        return this.builderPubSub
    }

    pushJobs(jobs: Array<Promise<any>>): void {
        this.asyncJobs.pushJobs(jobs)
    }

    pushJob(job: Promise<any>): void {
        this.asyncJobs.pushJob(job)
    }

    async jobsComplete(): Promise<void> {
        await this.asyncJobs.jobsComplete()
    }
}
