import objectPath = require("object-path")
import {
    CloudFunction,
    IFirebaseDriver,
    IFirebaseFunctionBuilder,
    IFirebasePubSub,
    IFirebasePubSubCl,
    IFirebaseRealtimeDatabase,
    IFirebaseRealtimeDatabaseRef,
    IFirebaseRealtimeDatabaseSnapshot,
    IFirebaseScheduleBuilder,
    IFirebaseTopicBuilder,
    IPubSubPublisher,
    IPubSubTopic,
    MemoryOption,
} from "./firebase_driver"

class InProcessFirebaseRealtimeDatabaseSnapshot implements IFirebaseRealtimeDatabaseSnapshot {
    constructor(readonly key: string, private readonly value: any) {}

    exists(): boolean {
        return this.value !== undefined && this.value !== null
    }

    val(): any {
        return this.value
    }

    forEach(action: (snapshot: InProcessFirebaseRealtimeDatabaseSnapshot) => boolean | void): void {
        if (typeof this.value !== "object") {
            return
        }
        for (const key of this.value) {
            action(new InProcessFirebaseRealtimeDatabaseSnapshot(key, this.value[key]))
        }
    }
}

enum TransactionResult {
    // @ts-ignore: this matches the Firebase API
    RETRY = null,
    // @ts-ignore: this matches the Firebase API
    ABORT = undefined,
}

class InProcessRealtimeDatabaseRef implements IFirebaseRealtimeDatabaseRef {
    private readonly orderings: Array<(a: any, b: any) => number> = []
    private readonly filters: Array<(value: any) => boolean> = []

    constructor(
        private readonly db: InProcessRealtimeDatabase,
        private readonly path: string,
        private childOrderingPath?: string,
    ) {}

    orderByChild(childPath: string): InProcessRealtimeDatabaseRef {
        this.childOrderingPath = childPath
        this.orderings.push(
            (a: any, b: any): number => {
                const childA = typeof a === "object" ? a[childPath] : undefined
                const childB = typeof b === "object" ? b[childPath] : undefined
                return this.compare(childA, childB)
            },
        )
        return this
    }

    orderByValue(): InProcessRealtimeDatabaseRef {
        this.orderings.push(this.compare)
        return this
    }

    startAt(value: number | string | boolean | null): InProcessRealtimeDatabaseRef {
        this.filters.push(
            (item: any): boolean => {
                if (typeof item === "object" && this.childOrderingPath) {
                    item = item[this.childOrderingPath]
                }
                return this.compare(item, value) >= 0
            },
        )
        return this
    }

    endAt(value: number | string | boolean | null): InProcessRealtimeDatabaseRef {
        this.filters.push(
            (item: any): boolean => {
                if (typeof item === "object" && this.childOrderingPath) {
                    item = item[this.childOrderingPath]
                }
                return this.compare(item, value) <= 0
            },
        )
        return this
    }

    equalTo(value: number | string | boolean | null): InProcessRealtimeDatabaseRef {
        this.filters.push(
            (item: any): boolean => {
                if (typeof item === "object" && this.childOrderingPath) {
                    item = item[this.childOrderingPath]
                }
                return item === value
            },
        )
        return this
    }

    child(path: string): InProcessRealtimeDatabaseRef {
        return this.db.ref(`${this.path}/${path}`)
    }

    async set(value: any): Promise<void> {
        if (value === undefined) {
            throw new Error(
                `Cannot set Firebase Realtime Database path to undefined (${this.path})`,
            )
        }
        this.db._setPath(this.path, value)
    }

    async update(value: object): Promise<void> {
        if (value === undefined) {
            throw new Error(
                `Cannot update Firebase Realtime Database path to undefined (${this.path})`,
            )
        }
        this.db._updatePath(this.path, value)
    }

    async once(eventType: string = "value"): Promise<InProcessFirebaseRealtimeDatabaseSnapshot> {
        let value = this.db._getPath(this.path)
        if (typeof value === "object") {
            for (const ordering of this.orderings) {
                value = Object.keys(value)
                    .sort((a, b) => ordering(value[a], value[b]))
                    .reduce((whole, key) => {
                        // @ts-ignore
                        whole[key] = value[key]
                        return whole
                    }, {})
            }
            for (const filter of this.filters) {
                value = Object.keys(value)
                    .filter((k) => filter(value[k]))
                    .reduce((whole, key) => {
                        // @ts-ignore
                        whole[key] = value[key]
                        return whole
                    }, {})
            }
        }
        return new InProcessFirebaseRealtimeDatabaseSnapshot(this.path.split("/").pop() || "", value)
    }

    async remove(): Promise<void> {
        this.db._removePath(this.path)
    }

    async transaction(
        transactionUpdate: (currentValue: any) => any,
    ): Promise<{
        committed: boolean
        snapshot: IFirebaseRealtimeDatabaseSnapshot | null,
    }> {
        const initialValue = (await this.once()).val()
        let attempts = 0
        let result = transactionUpdate((await this.once()).val())
        while (
            result !== TransactionResult.ABORT &&
            ((await this.once()).val() !== initialValue || result === TransactionResult.RETRY)
        ) {
            attempts++
            if (attempts > 10) {
                return {
                    committed: false,
                    snapshot: await this.once(),
                }
            }
            result = transactionUpdate((await this.once()).val())
        }
        if (result === TransactionResult.ABORT) {
            return {
                committed: false,
                snapshot: await this.once(),
            }
        }
        await this.set(result)
        return {
            committed: true,
            snapshot: await this.once(),
        }
    }

    private compare = (a: any, b: any): number => String(a).localeCompare(String(b))
}

export class InProcessRealtimeDatabase implements IFirebaseRealtimeDatabase {

    private static dotPath(path: string): string {
        path = path.replace(/^(\/|\/$)+/g, "")
        return path.trim().replace(/\/+/g, ".")
    }

    private storage = {}

    ref(path: string): InProcessRealtimeDatabaseRef {
        const dotPath = InProcessRealtimeDatabase.dotPath(path)
        objectPath.ensureExists(this.storage, dotPath, undefined)
        return new InProcessRealtimeDatabaseRef(this, path.replace(".", "/"))
    }

    _getPath(path: string): any {
        return objectPath.get(this.storage, InProcessRealtimeDatabase.dotPath(path))
    }

    _setPath(path: string, value: any): void {
        const dotPath = InProcessRealtimeDatabase.dotPath(path)
        objectPath.set(this.storage, dotPath, value)
    }

    _updatePath(path: string, value: any): void {
        const dotPath = InProcessRealtimeDatabase.dotPath(path)
        const existing = objectPath.get(this.storage, dotPath, undefined)
        if (existing === undefined || typeof existing !== "object" || typeof value !== "object") {
            objectPath.set(this.storage, dotPath, value)
            return
        }
        objectPath.set(this.storage, dotPath, { ...existing as object, ...value })
    }

    _removePath(path: string): void {
        const dotPath = InProcessRealtimeDatabase.dotPath(path)
        objectPath.del(this.storage, dotPath)
    }

    reset(): void {
        this.storage = {}
    }
}

class InProcessFirebaseScheduleBuilder implements IFirebaseScheduleBuilder {
    onRun(handler: (context: object) => PromiseLike<any>): CloudFunction<{}> {
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

class InProcessFirebaseTopicBuilder implements IFirebaseTopicBuilder {
    constructor(readonly name: string, private readonly pubSub: InProcessFirebasePubSub) {}
    onPublish(handler: (message: object, context: object) => any): CloudFunction<any> {
        const topicFunction = async (message: {json?: object}, context: object): Promise<any> => {
            return handler(message, context)
        }
        topicFunction.run = topicFunction
        this.pubSub._addSubscription(this.name, topicFunction)
        return topicFunction
    }
}

class InProcessFirebasePubSub implements IFirebasePubSub {
    private readonly subscriptions: { [key: string]: Array<CloudFunction<any>> } = {}

    constructor(private readonly driver: InProcessFirebaseDriver) {}

    schedule(schedule: string): InProcessFirebaseScheduleBuilder {
        return new InProcessFirebaseScheduleBuilder()
    }
    topic(topic: string): InProcessFirebaseTopicBuilder {
        return new InProcessFirebaseTopicBuilder(topic, this)
    }

    _addSubscription(topicName: string, handler: CloudFunction<any>): void {
        if (!this.subscriptions[topicName]) {
            this.subscriptions[topicName] = []
        }
        this.subscriptions[topicName].push(handler)
    }

    _publish(topicName: string, data: Buffer): void {
        if (!this.subscriptions[topicName]) {
            return
        }
        for (const handler of this.subscriptions[topicName]) {
            const job = new Promise((resolve) =>
                setTimeout(async () => {
                    resolve(handler(JSON.parse(data.toString())))
                }, 1),
            )
            this.driver.pushJob(job)
        }
    }
}

class InProcessPubSubPublisher implements IPubSubPublisher {
    constructor(private readonly topic: InProcessFirebasePubSubTopic) {}

    // @ts-ignore
    publish(data: Buffer): Promise<void> {
        this.topic._publish(data)
    }
}

class InProcessFirebasePubSubTopic implements IPubSubTopic {
    constructor(readonly name: string, private readonly pubSub: InProcessFirebasePubSub) {}

    publisher(): IPubSubPublisher {
        return new InProcessPubSubPublisher(this)
    }

    _publish(data: Buffer) {
        this.pubSub._publish(this.name, data)
    }
}

class InProcessFirebasePubSubCl implements IFirebasePubSubCl {
    private readonly topics: { [key: string]: InProcessFirebasePubSubTopic } = {}

    constructor(private readonly pubSub: InProcessFirebasePubSub) {}

    topic(name: string): InProcessFirebasePubSubTopic {
        if (!this.topics[name]) {
            this.topics[name] = new InProcessFirebasePubSubTopic(name, this.pubSub)
        }
        return this.topics[name]
    }
}

class InProcessFirebaseFunctionBuilder implements IFirebaseFunctionBuilder {
    constructor(readonly pubsub: InProcessFirebasePubSub) {}
}

export class InProcessFirebaseDriver implements IFirebaseDriver {
    private db: InProcessRealtimeDatabase | undefined
    private jobs: Array<Promise<any>> = []

    private pubSub: InProcessFirebasePubSub | undefined
    private functionBuilder: InProcessFirebaseFunctionBuilder | undefined

    realTimeDatabase(): InProcessRealtimeDatabase {
        if (!this.db) {
            this.db = new InProcessRealtimeDatabase()
        }
        return this.db
    }

    runWith(runtimeOptions?: { memory: MemoryOption; timeoutSeconds: number }): InProcessFirebaseFunctionBuilder {
        if (!this.functionBuilder) {
            this.functionBuilder = new InProcessFirebaseFunctionBuilder(this.inProcessPubSub())
        }
        return this.functionBuilder
    }

    pubSubCl(): IFirebasePubSubCl {
        return new InProcessFirebasePubSubCl(this.inProcessPubSub())
    }

    inProcessPubSub(): InProcessFirebasePubSub {
        if (!this.pubSub) {
            this.pubSub = new InProcessFirebasePubSub(this)
        }
        return this.pubSub
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
