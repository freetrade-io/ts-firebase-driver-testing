import { IAsyncJobs } from "./AsyncJobs"
import { IFirebaseDriver, IPubSub, MemoryOption } from "./FirebaseDriver"
import {
    InProcessFirebaseBuilderPubSub,
    InProcessFirebasePubSubCl,
} from "./PubSub/InProcessFirebasePubSub"
import { IFirebaseFunctionBuilder } from "./RealtimeDatabase/IFirebaseRealtimeDatabase"
import {
    IdGenerator,
    InProcessFirebaseBuilderDatabase,
    InProcessRealtimeDatabase,
} from './RealtimeDatabase/InProcessRealtimeDatabase'
import { firebaseLikeId } from './identifiers'

class InProcessFirebaseFunctionBuilder implements IFirebaseFunctionBuilder {
    constructor(
        readonly pubsub: InProcessFirebaseBuilderPubSub,
        readonly database: InProcessFirebaseBuilderDatabase,
    ) {}
}

export class InProcessFirebaseDriver implements IFirebaseDriver, IAsyncJobs {
    private db: InProcessRealtimeDatabase | undefined
    private jobs: Array<Promise<any>> = []

    private builderDatabase: InProcessFirebaseBuilderDatabase | undefined
    private builderPubSub: InProcessFirebaseBuilderPubSub | undefined
    private functionBuilder: InProcessFirebaseFunctionBuilder | undefined

    realTimeDatabase(
        idGenerator: IdGenerator = firebaseLikeId,
    ): InProcessRealtimeDatabase {
        if (!this.db) {
            this.db = new InProcessRealtimeDatabase(this, idGenerator)
        }
        return this.db
    }

    runWith(runtimeOptions?: {
        memory: MemoryOption
        timeoutSeconds: number
    }): InProcessFirebaseFunctionBuilder {
        if (!this.functionBuilder) {
            this.functionBuilder = new InProcessFirebaseFunctionBuilder(
                this.inProcessBuilderPubSub(),
                this.inProcessBuilderDatabase(),
            )
        }
        return this.functionBuilder
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

    inProcessBuilderPubSub(): InProcessFirebaseBuilderPubSub {
        if (!this.builderPubSub) {
            this.builderPubSub = new InProcessFirebaseBuilderPubSub(this)
        }
        return this.builderPubSub
    }

    pushJob(job: Promise<any>): void {
        this.jobs.push(job)
    }

    async jobsComplete(): Promise<void> {
        // More jobs might be added by each job, so we can't just await Promise.all() here.
        while (this.jobs.length > 0) {
            await this.jobs.pop()
        }
    }
}
