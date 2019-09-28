import _ from "lodash"
import objectPath = require("object-path")
import {
    CloudFunction,
    IFirebaseBuilderDatabase,
    IFirebaseBuilderPubSub,
    IFirebaseChange,
    IFirebaseDataSnapshot,
    IFirebaseDriver,
    IFirebaseEventContext,
    IFirebaseFunctionBuilder,
    IFirebasePubSubCl,
    IFirebaseRealtimeDatabase,
    IFirebaseRealtimeDatabaseRef,
    IFirebaseRefBuilder,
    IFirebaseScheduleBuilder,
    IFirebaseTopicBuilder,
    IPubSubPublisher,
    IPubSubTopic,
    MemoryOption,
} from "./FirebaseDriver"

class InProcessFirebaseRealtimeDatabaseSnapshot
    implements IFirebaseDataSnapshot {
    constructor(readonly key: string, private readonly value: any) {}

    exists(): boolean {
        if (this.value && typeof this.value === "object") {
            return Object.entries(this.value).length !== 0
        }
        return this.value !== undefined && this.value !== null
    }

    val(): any {
        return this.value
    }

    forEach(
        action: (
            snapshot: InProcessFirebaseRealtimeDatabaseSnapshot,
        ) => boolean | void,
    ): void {
        if (typeof this.value !== "object") {
            return
        }
        for (const key of this.value) {
            action(
                new InProcessFirebaseRealtimeDatabaseSnapshot(
                    key,
                    this.value[key],
                ),
            )
        }
    }

    child(path: string): InProcessFirebaseRealtimeDatabaseSnapshot {
        if (typeof this.value !== "object") {
            return new InProcessFirebaseRealtimeDatabaseSnapshot(path, null)
        }
        return new InProcessFirebaseRealtimeDatabaseSnapshot(
            path.split("/").pop() || "",
            objectPath.get(this.value, makeDotPath(path), null),
        )
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
        this.orderings.push((a: any, b: any): number => {
            const childA = typeof a === "object" ? a[childPath] : undefined
            const childB = typeof b === "object" ? b[childPath] : undefined
            return this.compare(childA, childB)
        })
        return this
    }

    orderByValue(): InProcessRealtimeDatabaseRef {
        this.orderings.push(this.compare)
        return this
    }

    startAt(
        value: number | string | boolean | null,
    ): InProcessRealtimeDatabaseRef {
        this.filters.push((item: any): boolean => {
            if (typeof item === "object" && this.childOrderingPath) {
                item = item[this.childOrderingPath]
            }
            return this.compare(item, value) >= 0
        })
        return this
    }

    endAt(
        value: number | string | boolean | null,
    ): InProcessRealtimeDatabaseRef {
        this.filters.push((item: any): boolean => {
            if (typeof item === "object" && this.childOrderingPath) {
                item = item[this.childOrderingPath]
            }
            return this.compare(item, value) <= 0
        })
        return this
    }

    equalTo(
        value: number | string | boolean | null,
    ): InProcessRealtimeDatabaseRef {
        this.filters.push((item: any): boolean => {
            if (typeof item === "object" && this.childOrderingPath) {
                item = item[this.childOrderingPath]
            }
            return item === value
        })
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

    async once(
        eventType: string = "value",
    ): Promise<InProcessFirebaseRealtimeDatabaseSnapshot> {
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
        return new InProcessFirebaseRealtimeDatabaseSnapshot(
            this.path.split("/").pop() || "",
            value,
        )
    }

    async remove(): Promise<void> {
        this.db._removePath(this.path)
    }

    async transaction(
        transactionUpdate: (currentValue: any) => any,
    ): Promise<{
        committed: boolean
        snapshot: IFirebaseDataSnapshot | null
    }> {
        const initialValue = (await this.once()).val()
        let attempts = 0
        let result = transactionUpdate((await this.once()).val())
        while (
            result !== TransactionResult.ABORT &&
            ((await this.once()).val() !== initialValue ||
                result === TransactionResult.RETRY)
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

    private compare = (a: any, b: any): number =>
        String(a).localeCompare(String(b))
}

export class InProcessRealtimeDatabase implements IFirebaseRealtimeDatabase {
    private storage = {}

    private triggers: {
        onWrite: {
            [key: string]: Array<CloudFunction<any>>
        }
    } = {
        onWrite: {},
    }

    ref(path: string): InProcessRealtimeDatabaseRef {
        return new InProcessRealtimeDatabaseRef(this, path.replace(".", "/"))
    }

    _getPath(path: string): any {
        return objectPath.get(this.storage, makeDotPath(path))
    }

    _setPath(path: string, value: any): void {
        const dotPath = makeDotPath(path)
        const originalValue = objectPath.get(this.storage, dotPath, undefined)
        objectPath.set(this.storage, dotPath, value)

        if (_.isEqual(value, originalValue)) {
            // No change -> no triggers
            return
        }
        // Changed -> always onWrite
        if (originalValue === undefined) {
            // New -> onCreate
        } else if (value === null) {
            // Existing removed -> onDelete
        } else {
            // Existing -> onUpdate
        }

        // TODO: this won't handle overwriting child fields from a higher level.
        // E.g. { foo: { bar: "hello" } }
        // Event trigger on "foo/bar/{value}"
        // Writing to "/foo" will overwrite but not trigger the relevant events.
        // Needs some sort of recursive trigger...
        // Or maybe an actual event/subscriber somehow... Objects and they all
        // receive every update, decide whether to react?
        // This seems more manageable.
    }

    _updatePath(path: string, value: any): void {
        const dotPath = makeDotPath(path)
        // TODO: How to trigger events?
        const existing = objectPath.get(this.storage, dotPath, undefined)
        if (
            existing === undefined ||
            typeof existing !== "object" ||
            typeof value !== "object"
        ) {
            objectPath.set(this.storage, dotPath, value)
            return
        }
        objectPath.set(this.storage, dotPath, {
            ...(existing as object),
            ...value,
        })
    }

    _removePath(path: string): void {
        const dotPath = makeDotPath(path)
        // TODO: How to trigger events?
        objectPath.del(this.storage, dotPath)
    }

    _addTrigger(
        path: string,
        type: "onWrite",
        handler: CloudFunction<any>,
    ): void {
        this.triggers[type][path].push(handler)
    }

    reset(dataset: object = {}): void {
        this.storage = dataset
        this.triggers = { onWrite: {} }
    }
}

class InProcessFirebaseRefBuilder implements IFirebaseRefBuilder {
    constructor(
        readonly path: string,
        private readonly database: InProcessRealtimeDatabase,
    ) {}

    onWrite(
        handler: (
            change: IFirebaseChange<IFirebaseDataSnapshot>,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any> {
        const cloudFunction = async (change: any, context: any) => {
            return handler(change, context)
        }
        cloudFunction.run = cloudFunction
        this.database._addTrigger(this.path, "onWrite", cloudFunction)
        return cloudFunction
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
    constructor(
        readonly name: string,
        private readonly pubSub: InProcessFirebaseBuilderPubSub,
    ) {}
    onPublish(
        handler: (message: object, context: object) => any,
    ): CloudFunction<any> {
        const topicFunction = async (
            message: { json?: object },
            context: object,
        ): Promise<any> => {
            return handler(message, context)
        }
        topicFunction.run = topicFunction
        this.pubSub._addSubscription(this.name, topicFunction)
        return topicFunction
    }
}

class InProcessFirebaseBuilderDatabase implements IFirebaseBuilderDatabase {
    constructor(private readonly database: InProcessRealtimeDatabase) {}

    ref(path: string): InProcessFirebaseRefBuilder {
        return new InProcessFirebaseRefBuilder(path, this.database)
    }
}

class InProcessFirebaseBuilderPubSub implements IFirebaseBuilderPubSub {
    private readonly subscriptions: {
        [key: string]: Array<CloudFunction<any>>
    } = {}

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
    constructor(
        readonly name: string,
        private readonly pubSub: InProcessFirebaseBuilderPubSub,
    ) {}

    publisher(): IPubSubPublisher {
        return new InProcessPubSubPublisher(this)
    }

    _publish(data: Buffer) {
        this.pubSub._publish(this.name, data)
    }
}

class InProcessFirebasePubSubCl implements IFirebasePubSubCl {
    private readonly topics: {
        [key: string]: InProcessFirebasePubSubTopic
    } = {}

    constructor(private readonly pubSub: InProcessFirebaseBuilderPubSub) {}

    topic(name: string): InProcessFirebasePubSubTopic {
        if (!this.topics[name]) {
            this.topics[name] = new InProcessFirebasePubSubTopic(
                name,
                this.pubSub,
            )
        }
        return this.topics[name]
    }
}

class InProcessFirebaseFunctionBuilder implements IFirebaseFunctionBuilder {
    constructor(
        readonly pubsub: InProcessFirebaseBuilderPubSub,
        readonly database: InProcessFirebaseBuilderDatabase,
    ) {}
}

export class InProcessFirebaseDriver implements IFirebaseDriver {
    private db: InProcessRealtimeDatabase | undefined
    private jobs: Array<Promise<any>> = []

    private builderDatabase: InProcessFirebaseBuilderDatabase | undefined
    private builderPubSub: InProcessFirebaseBuilderPubSub | undefined
    private functionBuilder: InProcessFirebaseFunctionBuilder | undefined

    realTimeDatabase(): InProcessRealtimeDatabase {
        if (!this.db) {
            this.db = new InProcessRealtimeDatabase()
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

function makeDotPath(path: string): string {
    path = path.replace(/^(\/|\/$)+/g, "")
    return path.trim().replace(/\/+/g, ".")
}
