import _ from "lodash"
import objectPath = require("object-path")
import { IAsyncJobs } from "../AsyncJobs"
import {
    CloudFunction,
    IFirebaseBuilderDatabase,
    IFirebaseChange,
    IFirebaseDataSnapshot,
    IFirebaseEventContext,
    IFirebaseRealtimeDatabase,
    IFirebaseRealtimeDatabaseRef,
    IFirebaseRefBuilder,
} from "../FirebaseDriver"
import {
    ChangeType,
    IRealtimeDatabaseChangeObserver,
    makeChangeObserver,
} from "./RealtimeDatabaseChangeObserver"

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
    private changeObservers: IRealtimeDatabaseChangeObserver[] = []

    constructor(private readonly jobs?: IAsyncJobs) {}

    ref(path: string): InProcessRealtimeDatabaseRef {
        return new InProcessRealtimeDatabaseRef(this, path.replace(".", "/"))
    }

    _getPath(path: string): any {
        return objectPath.get(this.storage, makeDotPath(path))
    }

    _setPath(path: string, value: any): void {
        this.triggerChangeEvents(() => {
            path = _.trim(path, "/")
            const dotPath = makeDotPath(path)
            objectPath.set(this.storage, dotPath, value)
        })
    }

    _updatePath(path: string, value: any): void {
        this.triggerChangeEvents(() => {
            path = _.trim(path, "/")
            const dotPath = makeDotPath(path)
            const existing = objectPath.get(this.storage, dotPath)
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
        })
    }

    _removePath(path: string): void {
        this.triggerChangeEvents(() => {
            path = _.trim(path, "/")
            const dotPath = makeDotPath(path)
            objectPath.del(this.storage, dotPath)
        })
    }

    _addObserver(
        changeType: ChangeType,
        observedPath: string,
        handler: CloudFunction<any>,
    ): void {
        this.changeObservers.push(
            makeChangeObserver(changeType, observedPath, handler),
        )
    }

    reset(dataset: object = {}): void {
        this.storage = dataset
        this.changeObservers = []
    }

    private triggerChangeEvents(makeChange: () => any): void {
        if (!this.jobs) {
            makeChange()
            return
        }

        const before = _.cloneDeep(this.storage)
        makeChange()
        const after = _.cloneDeep(this.storage)

        for (const observer of this.changeObservers) {
            const job = new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(observer.onChange({ before, after }))
                }, 1)
            })
            this.jobs.pushJob(job)
        }
    }
}

class InProcessFirebaseRefBuilder implements IFirebaseRefBuilder {
    constructor(
        readonly path: string,
        private readonly database: InProcessRealtimeDatabase,
    ) {}

    onCreate(
        handler: (
            snapshot: IFirebaseDataSnapshot,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any> {
        const cloudFunction = async (snap: any, context: any) => {
            return handler(snap, context)
        }
        cloudFunction.run = cloudFunction
        this.database._addObserver("created", this.path, cloudFunction)
        return cloudFunction
    }

    onUpdate(
        handler: (
            change: IFirebaseChange<IFirebaseDataSnapshot>,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any> {
        const cloudFunction = async (change: any, context: any) => {
            return handler(change, context)
        }
        cloudFunction.run = cloudFunction
        this.database._addObserver("updated", this.path, cloudFunction)
        return cloudFunction
    }

    onDelete(
        handler: (
            snapshot: IFirebaseDataSnapshot,
            context: IFirebaseEventContext,
        ) => Promise<any> | any,
    ): CloudFunction<any> {
        const cloudFunction = async (snap: any, context: any) => {
            return handler(snap, context)
        }
        cloudFunction.run = cloudFunction
        this.database._addObserver("deleted", this.path, cloudFunction)
        return cloudFunction
    }

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
        this.database._addObserver("written", this.path, cloudFunction)
        return cloudFunction
    }
}

export class InProcessFirebaseBuilderDatabase
    implements IFirebaseBuilderDatabase {
    constructor(private readonly database: InProcessRealtimeDatabase) {}

    ref(path: string): InProcessFirebaseRefBuilder {
        return new InProcessFirebaseRefBuilder(path, this.database)
    }
}

function makeDotPath(path: string): string {
    path = path.replace(/^(\/|\/$)+/g, "")
    return path.trim().replace(/\/+/g, ".")
}
