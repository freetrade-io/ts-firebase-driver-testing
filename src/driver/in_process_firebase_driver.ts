import {
    IFirebaseDriver,
    IFirebaseFunctionBuilder,
    IFirebasePubSub,
    IFirebaseRealtimeDatabase,
    IFirebaseRealtimeDatabaseRef,
    IFirebaseRealtimeDatabaseSnapshot,
    IFirebaseRunnable,
    IFirebaseScheduleBuilder, IRunTimeOptions,
    MemoryOption,
} from "./firebase_driver"

import objectPath = require("object-path")

class InProcessFirebaseRealtimeDatabaseSnapshot implements IFirebaseRealtimeDatabaseSnapshot {
    constructor(private readonly value: any) {}

    exists(): boolean {
        return this.value !== undefined && this.value !== null
    }

    val(): any {
        return this.value
    }
}

class InProcessRealtimeDatabaseRef implements IFirebaseRealtimeDatabaseRef {
    value: any

    constructor(private readonly db: InProcessRealtimeDatabase, private readonly path?: string) {}

    child(path: string): InProcessRealtimeDatabaseRef {
        return this.db.ref(`${this.path}/${path}`)
    }

    async set(value: any): Promise<void> {
        this.value = value
    }

    async update(value: object): Promise<void> {
        if (!this.value) {
            this.value = value
            return
        }
        this.value = { ...this.value, ...value }
    }

    async once(eventType: string = "value"): Promise<InProcessFirebaseRealtimeDatabaseSnapshot> {
        return new InProcessFirebaseRealtimeDatabaseSnapshot(this.value)
    }
}

export class InProcessRealtimeDatabase implements IFirebaseRealtimeDatabase {
    private storage = {}

    ref(path: string): InProcessRealtimeDatabaseRef {
        const dotPath = path.replace(/\/+/, ".")
        if (!objectPath.get(this.storage, dotPath)) {
            objectPath.set(
                this.storage,
                dotPath,
                new InProcessRealtimeDatabaseRef(this, dotPath.replace(".", "/")),
            )
        }
        return objectPath.get(this.storage, dotPath)
    }

    reset(): void {
        this.storage = {}
    }
}

class InProcessFirebaseScheduleBuilder implements IFirebaseScheduleBuilder {
    onRun(
        handler: (context: object) => PromiseLike<any>,
    ): IFirebaseRunnable<{}> & ((input: any, context?: any) => PromiseLike<any>) {
        const scheduledFunction = async (context: object): Promise<any> => {
            return handler(context)
        }
        scheduledFunction.run = scheduledFunction
        return scheduledFunction
    }

    timeZone(timeZone: string): IFirebaseScheduleBuilder {
        return this
    }
}

class InProcessFirebasePubSub implements IFirebasePubSub {
    schedule(schedule: string): InProcessFirebaseScheduleBuilder {
        return new InProcessFirebaseScheduleBuilder()
    }
}

class InProcessFirebaseFunctionBuilder implements IFirebaseFunctionBuilder {
    pubsub: InProcessFirebasePubSub = new InProcessFirebasePubSub()
}

export class InProcessFirebaseDriver implements IFirebaseDriver {
    private db: InProcessRealtimeDatabase | undefined

    realTimeDatabase(): IFirebaseRealtimeDatabase {
        if (!this.db) {
            this.db = new InProcessRealtimeDatabase()
        }
        return this.db
    }

    runWith(runtimeOptions: IRunTimeOptions): IFirebaseFunctionBuilder {
        return new InProcessFirebaseFunctionBuilder()
    }

    runOptions(
        memory?: MemoryOption,
        timeoutSeconds?: number,
    ): IRunTimeOptions {
        return {
            memory: memory || "256MB",
            timeoutSeconds: timeoutSeconds || 540,
        }
    }
}
