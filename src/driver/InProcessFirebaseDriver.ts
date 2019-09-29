import { IAsyncJobs } from "./AsyncJobs"
import {
    IFirebaseDriver,
    IFirebaseFunctionBuilder,
    IFirebasePubSubCl,
    MemoryOption,
} from "./FirebaseDriver"
import {
    InProcessFirebaseBuilderPubSub,
    InProcessFirebasePubSubCl,
} from "./PubSub/InProcessFirebasePubSub"
import {
    InProcessFirebaseBuilderDatabase,
    InProcessRealtimeDatabase,
} from "./RealtimeDatabase/InProcessRealtimeDatabase"

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

    realTimeDatabase(): InProcessRealtimeDatabase {
        if (!this.db) {
            this.db = new InProcessRealtimeDatabase(this)
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

    pubSubCl(): IFirebasePubSubCl {
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
