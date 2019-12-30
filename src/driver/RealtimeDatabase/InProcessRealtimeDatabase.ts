import _ from "lodash"
import objectPath = require("object-path")
import { IAsyncJobs } from "../AsyncJobs"
import {
    ChangeType,
    IDatabaseChangeObserver,
} from "../ChangeObserver/DatabaseChangeObserver"
import {
    CloudFunction,
    IFirebaseBuilderDatabase,
    IFirebaseRefBuilder,
} from "../FirebaseDriver"
import { firebaseLikeId } from "../identifiers"
import {
    IFirebaseChange,
    IFirebaseDataSnapshot,
    IFirebaseEventContext,
    IFirebaseRealtimeDatabase,
    IFirebaseRealtimeDatabaseRef,
} from "./IFirebaseRealtimeDatabase"
import { makeRealtimeDatabaseChangeObserver } from "./RealtimeDatabaseChangeObserver"

export type IdGenerator = () => string

export class InProcessFirebaseRealtimeDatabaseSnapshot
    implements IFirebaseDataSnapshot {
    constructor(readonly key: string, private readonly value: any) {}

    exists(): boolean {
        if (this.value && typeof this.value === "object") {
            return Object.entries(this.value).length !== 0
        }
        return this.value !== undefined && this.value !== null
    }

    val(): any {
        if (this.value === undefined) {
            return null
        }
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
        for (const key of Object.keys(this.value)) {
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
            objectPath.get(this.value, dotPathFromSlashed(path), null),
        )
    }
}

export enum TransactionResult {
    // @ts-ignore: this matches the Firebase API
    RETRY = null,
    // @ts-ignore: this matches the Firebase API
    ABORT = undefined,
}

interface IKeyVal {
    key: string
    val: any
}

interface IInProcessRealtimeDatabaseRefQuery {
    readonly orderings: Array<(a: IKeyVal, b: IKeyVal) => number>
    readonly filters: Array<(item: IKeyVal) => boolean>
    readonly transforms: Array<(value: any) => any>
    readonly keyOrdering: boolean
    readonly childOrderingPath?: string
}

class InProcessRealtimeDatabaseRef implements IFirebaseRealtimeDatabaseRef {
    constructor(
        private readonly db: InProcessRealtimeDatabase,
        private readonly path: string,
        private readonly idGenerator: IdGenerator = firebaseLikeId,
        private readonly query: IInProcessRealtimeDatabaseRefQuery = {
            orderings: [],
            filters: [],
            transforms: [],
            keyOrdering: false,
            childOrderingPath: undefined,
        },
    ) {}

    orderByKey(): InProcessRealtimeDatabaseRef {
        const ordering = (a: IKeyVal, b: IKeyVal): number => {
            return this.compare(a.key, b.key)
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings, ordering],
                filters: [...this.query.filters],
                transforms: [...this.query.transforms],
                keyOrdering: true,
                childOrderingPath: undefined,
            },
        )
    }

    orderByChild(childPath: string): InProcessRealtimeDatabaseRef {
        childPath = dotPathFromSlashed(childPath)
        const ordering = (a: IKeyVal, b: IKeyVal): number => {
            const childA = objectPath.get(a.val, childPath)
            const childB = objectPath.get(b.val, childPath)
            return this.compare(childA, childB)
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings, ordering],
                filters: [...this.query.filters],
                transforms: [...this.query.transforms],
                keyOrdering: false,
                childOrderingPath: childPath,
            },
        )
    }

    orderByValue(): InProcessRealtimeDatabaseRef {
        const ordering = (a: IKeyVal, b: IKeyVal): number => {
            return this.compare(a.val, b.val)
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings, ordering, this.compare],
                filters: [...this.query.filters],
                transforms: [...this.query.transforms],
                keyOrdering: false,
                childOrderingPath: undefined,
            },
        )
    }

    limitToFirst(limit: number): InProcessRealtimeDatabaseRef {
        const transform = (value: any) => {
            if (typeof value === "object") {
                value = Object.keys(value)
                    .slice(0, limit)
                    .reduce((obj: { [key: string]: any }, key: string) => {
                        obj[key] = value[key]
                        return obj
                    }, {})
            }
            return value
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings],
                filters: [...this.query.filters],
                transforms: [...this.query.transforms, transform],
                keyOrdering: this.query.keyOrdering,
                childOrderingPath: this.query.childOrderingPath,
            },
        )
    }

    limitToLast(limit: number): InProcessRealtimeDatabaseRef {
        const transform = (value: any) => {
            if (typeof value === "object") {
                value = Object.keys(value)
                    .slice(Math.max(Object.keys(value).length - limit, 0))
                    .reduce((obj: { [key: string]: any }, key: string) => {
                        obj[key] = value[key]
                        return obj
                    }, {})
            }
            return value
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings],
                filters: [...this.query.filters],
                transforms: [...this.query.transforms, transform],
                keyOrdering: this.query.keyOrdering,
                childOrderingPath: this.query.childOrderingPath,
            },
        )
    }

    startAt(
        value: number | string | boolean | null,
    ): InProcessRealtimeDatabaseRef {
        const filter = (item: IKeyVal): boolean => {
            let compareVal = item.val
            if (this.query.keyOrdering) {
                compareVal = item.key
            }
            if (this.query.childOrderingPath && typeof item.val === "object") {
                compareVal = objectPath.get(
                    item.val,
                    this.query.childOrderingPath,
                )
            }
            return this.compare(compareVal, value) >= 0
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings],
                filters: [...this.query.filters, filter],
                transforms: [...this.query.transforms],
                keyOrdering: this.query.keyOrdering,
                childOrderingPath: this.query.childOrderingPath,
            },
        )
    }

    endAt(
        value: number | string | boolean | null,
    ): InProcessRealtimeDatabaseRef {
        const filter = (item: IKeyVal): boolean => {
            let compareVal = item.val
            if (this.query.keyOrdering) {
                compareVal = item.key
            }
            if (this.query.childOrderingPath && typeof item.val === "object") {
                compareVal = objectPath.get(
                    item.val,
                    this.query.childOrderingPath,
                )
            }
            return this.compare(compareVal, value) <= 0
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings],
                filters: [...this.query.filters, filter],
                transforms: [...this.query.transforms],
                keyOrdering: this.query.keyOrdering,
                childOrderingPath: this.query.childOrderingPath,
            },
        )
    }

    equalTo(
        value: number | string | boolean | null,
    ): InProcessRealtimeDatabaseRef {
        if (this.query.filters.length > 0) {
            throw new Error("Cannot combine equalTo with other filters")
        }
        const filter = (item: IKeyVal): boolean => {
            let compareVal = item.val
            if (this.query.keyOrdering) {
                compareVal = item.key
            }
            if (this.query.childOrderingPath && typeof item.val === "object") {
                compareVal = objectPath.get(
                    item.val,
                    this.query.childOrderingPath,
                )
            }
            return compareVal === value
        }
        return new InProcessRealtimeDatabaseRef(
            this.db,
            this.path,
            this.idGenerator,
            {
                orderings: [...this.query.orderings],
                filters: [...this.query.filters, filter],
                transforms: [...this.query.transforms],
                keyOrdering: this.query.keyOrdering,
                childOrderingPath: this.query.childOrderingPath,
            },
        )
    }

    child(path: string): InProcessRealtimeDatabaseRef {
        return this.db.ref(`${this.path}/${path}`)
    }

    push(value?: any): InProcessRealtimeDatabaseRef {
        const newPath = `${this.path}/${this.idGenerator()}`

        if (value !== undefined) {
            this.db._setPath(newPath, value)
        }

        return this.db.ref(newPath)
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
        eventType: "value",
    ): Promise<InProcessFirebaseRealtimeDatabaseSnapshot> {
        if (eventType !== "value") {
            throw new Error('Only the "value" event type is supported.')
        }
        let value = this.db._getPath(this.path)
        if (typeof value === "object") {
            for (const ordering of this.query.orderings) {
                value = Object.keys(value)
                    .sort((a, b) =>
                        ordering(
                            { key: a, val: value[a] },
                            { key: b, val: value[b] },
                        ),
                    )
                    .reduce((whole, key) => {
                        // @ts-ignore
                        whole[key] = value[key]
                        return whole
                    }, {})
            }
            for (const filter of this.query.filters) {
                value = Object.keys(value)
                    .filter((k) => filter({ key: k, val: value[k] }))
                    .reduce((whole, key) => {
                        // @ts-ignore
                        whole[key] = value[key]
                        return whole
                    }, {})
            }
            for (const transform of this.query.transforms) {
                value = transform(value)
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
        snapshot: InProcessFirebaseRealtimeDatabaseSnapshot
    }> {
        for (let attempts = 0; attempts < 10; attempts++) {
            const result = await new Promise((resolve) =>
                setTimeout(async () => {
                    resolve(transactionUpdate((await this.once("value")).val()))
                }, Math.random() * 10),
            )
            if (result === TransactionResult.ABORT) {
                return {
                    committed: false,
                    snapshot: await this.once("value"),
                }
            }
            if (result === TransactionResult.RETRY) {
                continue
            }
            await this.set(result)
            await new Promise((resolve) =>
                setTimeout(async () => {
                    resolve()
                }, Math.random() * 10),
            )
            if ((await this.once("value")).val() === result) {
                return {
                    committed: true,
                    snapshot: await this.once("value"),
                }
            }
        }
        return {
            committed: false,
            snapshot: await this.once("value"),
        }
    }

    private compare = (a: any, b: any): number =>
        String(a).localeCompare(String(b))
}

export class InProcessRealtimeDatabase implements IFirebaseRealtimeDatabase {
    private storage = {}
    private changeObservers: IDatabaseChangeObserver[] = []

    constructor(
        private readonly jobs?: IAsyncJobs,
        private readonly idGenerator: IdGenerator = firebaseLikeId,
    ) {}

    ref(path: string): InProcessRealtimeDatabaseRef {
        return new InProcessRealtimeDatabaseRef(
            this,
            path.replace(".", "/"),
            this.idGenerator,
        )
    }

    _getPath(path: string): any {
        return objectPath.get(this.storage, dotPathFromSlashed(path))
    }

    _setPath(path: string, value: any): void {
        this.triggerChangeEvents(() => {
            path = _.trim(path, "/")
            const dotPath = dotPathFromSlashed(path)
            objectPath.set(this.storage, dotPath, value)
        })
    }

    _updatePath(path: string, value: any): void {
        this.triggerChangeEvents(() => {
            path = _.trim(path, "/")
            const dotPath = dotPathFromSlashed(path)
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
            const dotPath = dotPathFromSlashed(path)
            objectPath.del(this.storage, dotPath)
        })
    }

    _addObserver(
        changeType: ChangeType,
        observedPath: string,
        handler: CloudFunction<any>,
    ): void {
        this.changeObservers.push(
            makeRealtimeDatabaseChangeObserver(
                changeType,
                observedPath,
                handler,
            ),
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

function dotPathFromSlashed(path: string): string {
    path = path.replace(/^(\/|\/$)+/g, "")
    return path.trim().replace(/\/+/g, ".")
}
