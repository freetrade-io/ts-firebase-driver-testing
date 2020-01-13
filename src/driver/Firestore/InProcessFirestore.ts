import _ from "lodash"
import objectPath = require("object-path")
import {
    CloudFunction,
    IFirebaseChange,
    IFirebaseDataSnapshot,
    IFirebaseEventContext,
} from "../.."
import { stripMeta } from "../../util/stripMeta"
import { IAsyncJobs } from "../AsyncJobs"
import {
    ChangeType,
    IDatabaseChangeObserver,
} from "../ChangeObserver/DatabaseChangeObserver"
import { IFirestoreBuilder, IFirestoreDocumentBuilder } from "../FirebaseDriver"
import { fireStoreLikeId } from "../identifiers"
import {
    FIELD_PATH_DOCUMENT_ID,
    IFieldPath,
    isFieldPathDocumentId,
} from "./FieldPath"
import { makeFirestoreChangeObserver } from "./FirestoreChangeObserver"
import {
    FirestoreWhereFilterOp,
    IFirestore,
    IFirestoreCollectionRef,
    IFirestoreDocRef,
    IFirestoreDocumentData,
    IFirestoreDocumentSnapshot,
    IFirestoreQuery,
    IFirestoreQuerySnapshot,
    IFirestoreTimestamp,
    IFirestoreTransaction,
    IFirestoreWriteBatch,
    IFirestoreWriteResult,
    IPrecondition,
} from "./IFirestore"

export class InProcessFirestore implements IFirestore {
    private changeObservers: IDatabaseChangeObserver[] = []

    constructor(
        private readonly jobs?: IAsyncJobs,
        public makeId: () => string = fireStoreLikeId,
        private storage = {},
    ) {}

    collection(collectionPath: string): InProcessFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(this, collectionPath)
    }

    doc(documentPath: string): InProcessFirestoreDocRef {
        return this.collection("").doc(documentPath)
    }

    async runTransaction<T>(
        updateFunction: (transaction: IFirestoreTransaction) => Promise<T>,
        transactionOptions?: { maxAttempts?: number },
    ): Promise<T> {
        const initialState = _.cloneDeep(this.storage)
        const transaction = new InProcessFirestoreTransaction()

        let result
        try {
            result = await updateFunction(transaction)
            await transaction.commit()
        } catch (err) {
            this.storage = initialState
        }

        return result as T
    }

    batch(): InProcessFirestoreWriteBatch {
        return new InProcessFirestoreWriteBatch()
    }

    settings(settings: object): void {
        throw new Error("Not implemented")
    }

    collectionGroup(collectionId: string): IFirestoreQuery {
        throw new Error("Not implemented")
    }

    getAll(
        ...documentRefsOrReadOptions: Array<
            IFirestoreDocRef | { fieldMask?: string }
        >
    ): Promise<IFirebaseDataSnapshot> {
        throw new Error("Not implemented")
    }

    listCollections(): Promise<IFirestoreCollectionRef[]> {
        throw new Error("Not implemented")
    }

    reset(dataset: object = {}): void {
        this.storage = dataset
        this.changeObservers = []
        this.makeId = fireStoreLikeId
    }

    _getPath(dotPath: string): any {
        return _.cloneDeep(objectPath.get(this.storage, dotPath))
    }

    _setPath(dotPath: string, value: any): void {
        this.triggerChangeEvents(() => {
            objectPath.set(this.storage, dotPath, value)
        })
    }

    _deletePath(dotPath: string): void {
        this.triggerChangeEvents(() => {
            objectPath.del(this.storage, dotPath)
        })
    }

    _addObserver(
        changeType: ChangeType,
        observedPath: string,
        handler: CloudFunction<any>,
    ): void {
        this.changeObservers.push(
            makeFirestoreChangeObserver(changeType, observedPath, handler),
        )
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

interface IItem {
    [key: string]: any
}

interface ICollection {
    [id: string]: IItem
}

interface IIdItem {
    id: string
    item: IItem
}

interface IQueryBuilder {
    maps: Array<(item: IItem) => IItem>
    filters: Array<(item: IItem) => boolean>
    orderings: { [fieldPath: string]: (a: IIdItem, b: IIdItem) => number }
    transforms: Array<(collection: ICollection) => ICollection>
    rangeFilterField: string
}

export class InProcessFirestoreQuery implements IFirestoreQuery {
    constructor(
        readonly firestore: InProcessFirestore,
        readonly path: string,
        protected query: IQueryBuilder = {
            filters: [],
            transforms: [],
            maps: [],
            orderings: {},
            rangeFilterField: "",
        },
    ) {
        this.path = _.trim(this.path.replace(/[\/.]+/g, "/"), "/.")
    }

    orderBy(
        fieldPath: string | IFieldPath,
        directionStr: "desc" | "asc" = "asc",
    ): InProcessFirestoreQuery {
        if (typeof fieldPath === "object") {
            if (!isFieldPathDocumentId(fieldPath)) {
                throw new Error(
                    "Ordering by FieldPath other than documentId is not implemented",
                )
            }
            fieldPath = FIELD_PATH_DOCUMENT_ID
        }

        const newQuery: IQueryBuilder = _.cloneDeep<IQueryBuilder>(this.query)

        if (fieldPath !== FIELD_PATH_DOCUMENT_ID) {
            // An orderBy() clause also filters for existence of the given field.
            newQuery.filters.push((item) => fieldPath in item)
        }

        if (directionStr === "asc") {
            newQuery.orderings[fieldPath] = (a, b) => {
                const compareOfA =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? a.id
                        : a.item[String(fieldPath)]
                const compareOfB =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? b.id
                        : b.item[String(fieldPath)]
                return this.compare(compareOfA, compareOfB)
            }
        } else {
            newQuery.orderings[fieldPath] = (a, b) => {
                const compareOfA =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? a.id
                        : a.item[String(fieldPath)]
                const compareOfB =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? b.id
                        : b.item[String(fieldPath)]
                return this.compare(compareOfB, compareOfA)
            }
        }

        return new InProcessFirestoreQuery(this.firestore, this.path, newQuery)
    }

    offset(offset: number): InProcessFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.offset not implemented")
    }

    limit(limit: number): InProcessFirestoreQuery {
        const newQuery: IQueryBuilder = _.cloneDeep<IQueryBuilder>(this.query)

        newQuery.transforms.push((collection) => {
            if (_.isObject(collection)) {
                collection = Object.keys(collection)
                    .slice(0, limit)
                    .reduce((obj: { [key: string]: any }, key: string) => {
                        obj[key] = collection[key]
                        return obj
                    }, {})
            }
            return collection
        })

        return new InProcessFirestoreQuery(this.firestore, this.path, newQuery)
    }

    startAfter(...fieldValues: any[]): IFirestoreQuery {
        const newQuery: IQueryBuilder = _.cloneDeep<IQueryBuilder>(this.query)

        fieldValues.forEach((fieldValue: any, i: number) => {
            const fieldPath = Object.keys(this.query.orderings)[i]
            newQuery.filters.push((item: IItem): boolean => {
                return this.compare(item[fieldPath], fieldValue) > 0
            })
        })

        return new InProcessFirestoreQuery(this.firestore, this.path, newQuery)
    }

    where(
        fieldPath: string,
        opStr: FirestoreWhereFilterOp,
        value: any,
    ): InProcessFirestoreQuery {
        const newQuery: IQueryBuilder = _.cloneDeep<IQueryBuilder>(this.query)
        let filter: (item: { [key: string]: any }) => boolean
        switch (opStr) {
            case "<":
                this.enforceSingleFieldRangeFilter(newQuery, fieldPath)
                filter = (item) => item[fieldPath] < value
                break
            case "<=":
                this.enforceSingleFieldRangeFilter(newQuery, fieldPath)
                filter = (item) => item[fieldPath] <= value
                break
            case "==":
                filter = (item) => String(item[fieldPath]) === String(value)
                break
            case ">=":
                this.enforceSingleFieldRangeFilter(newQuery, fieldPath)
                filter = (item) => item[fieldPath] >= value
                break
            case ">":
                this.enforceSingleFieldRangeFilter(newQuery, fieldPath)
                filter = (item) => item[fieldPath] > value
                break
            case "array-contains":
                filter = (item) => {
                    if (_.isArray(item[fieldPath])) {
                        return item[fieldPath].includes(value)
                    }
                    return false
                }
                break
            case "in":
                if (!_.isArray(value)) {
                    throw new Error("Value must be an array for in operator.")
                }
                filter = (item) => value.includes(item[fieldPath])
                break
            case "array-contains-any":
                if (!_.isArray(value)) {
                    throw new Error(
                        "Value must be an array for array-contains-any operator.",
                    )
                }
                filter = (item) => {
                    if (_.isArray(item[fieldPath])) {
                        return item[fieldPath].some((el: any) =>
                            value.includes(el),
                        )
                    }
                    return false
                }
                break
            default:
                throw new Error(`Unknown Firestore where operator ${opStr}`)
        }
        newQuery.filters.push(filter)

        return new InProcessFirestoreQuery(this.firestore, this.path, newQuery)
    }

    select(...field: string[]): IFirestoreQuery {
        const newQuery: IQueryBuilder = _.cloneDeep<IQueryBuilder>(this.query)
        newQuery.maps.push((item) => {
            return Object.keys(item)
                .filter((key) => field.includes(key))
                .reduce((whole: IItem, key: string) => {
                    whole[key] = item[key]
                    return whole
                }, {})
        })
        return new InProcessFirestoreQuery(this.firestore, this.path, newQuery)
    }

    startAt(...fieldValues: any[]): InProcessFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.startAt not implemented")
    }

    endBefore(...fieldValues: any[]): InProcessFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.endBefore not implemented")
    }

    endAt(...fieldValues: any[]): InProcessFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.endAt not implemented")
    }

    async get(): Promise<InProcessFirestoreQuerySnapshot> {
        let collection = this.firestore._getPath(this._dotPath()) || {}
        for (const filter of this.query.filters) {
            collection = Object.keys(collection)
                .filter((key) => filter(collection[key]))
                .reduce((whole: IItem, key: string) => {
                    whole[key] = collection[key]
                    return whole
                }, {})
        }
        for (const fieldPath of Object.keys(this.query.orderings)) {
            const ordering = this.query.orderings[fieldPath]
            collection = Object.keys(collection)
                .sort((keyA, keyB) => {
                    return ordering(
                        {
                            id: keyA,
                            item: collection[keyA],
                        },
                        {
                            id: keyB,
                            item: collection[keyB],
                        },
                    )
                })
                .reduce((whole: IItem, key: string) => {
                    whole[key] = collection[key]
                    return whole
                }, {})
        }
        for (const transform of this.query.transforms) {
            collection = transform(collection)
        }
        for (const map of this.query.maps) {
            collection = Object.keys(collection).reduce(
                (whole: IItem, key: string) => {
                    whole[key] = map(collection[key])
                    return whole
                },
                {},
            )
        }
        collection = Object.keys(collection).map(
            (key: string): InProcessFirestoreDocumentSnapshot => {
                return new InProcessFirestoreDocumentSnapshot(
                    key,
                    true,
                    new InProcessFirestoreDocRef(
                        `${this._dotPath()}.${key}`,
                        this.firestore,
                    ),
                    collection[key],
                )
            },
        )
        this.query = {
            maps: [],
            filters: [],
            transforms: [],
            orderings: {},
            rangeFilterField: "",
        }
        return new InProcessFirestoreQuerySnapshot(collection)
    }

    stream(): NodeJS.ReadableStream {
        throw new Error("InProcessFirestoreQuery.stream not implemented")
    }

    onSnapshot(
        onNext: (snapshot: IFirestoreQuerySnapshot) => void,
        onError?: (error: Error) => void,
    ): () => void {
        throw new Error("InProcessFirestoreQuery.onSnapshot not implemented")
    }

    _dotPath(): string {
        return _.trim(this.path.replace(/[\/.]+/g, "."), ".")
    }

    private enforceSingleFieldRangeFilter(
        query: IQueryBuilder,
        fieldPath: string,
    ): void {
        if (query.rangeFilterField && fieldPath !== query.rangeFilterField) {
            throw new Error(
                "Firestore cannot have range filters on different fields, " +
                    `tried to add range filter on '${fieldPath}' with ` +
                    `existing range filter on '${query.rangeFilterField}', ` +
                    "see https://firebase.google.com/docs/firestore/query-data/queries",
            )
        }
        query.rangeFilterField = fieldPath
    }

    private compare(a: any, b: any): number {
        return this.normalise(a).localeCompare(this.normalise(b))
    }

    private normalise(val: any): string {
        if (typeof val.toISOString === "function") {
            val = val.toISOString()
        }
        if (typeof val.toString === "function") {
            val = val.toString()
        }
        return String(val)
    }
}

export class InProcessFirestoreCollectionRef extends InProcessFirestoreQuery
    implements IFirestoreCollectionRef {
    readonly id: string
    readonly parent: InProcessFirestoreDocRef | null = null

    constructor(
        readonly firestore: InProcessFirestore,
        readonly path: string,
        protected query: IQueryBuilder = {
            filters: [],
            transforms: [],
            maps: [],
            orderings: {},
            rangeFilterField: "",
        },
    ) {
        super(firestore, path, query)
        const pathSplit = this.path.split("/")
        if (pathSplit.length > 1) {
            this.parent = new InProcessFirestoreDocRef(
                pathSplit.slice(0, -1).join("/"),
                this.firestore,
            )
        }
        this.id = pathSplit.pop() || ""
    }

    doc(documentPath?: string): InProcessFirestoreDocRef {
        if (!documentPath) {
            documentPath = this.firestore.makeId()
        }
        return new InProcessFirestoreDocRef(
            `${this.path}/${documentPath}`,
            this.firestore,
        )
    }

    async listDocuments(): Promise<InProcessFirestoreDocRef[]> {
        const collection = this.firestore._getPath(this._dotPath()) || {}
        return Object.keys(collection).map(
            (key: string): InProcessFirestoreDocRef => {
                return new InProcessFirestoreDocRef(
                    `${this.path}/${key}`,
                    this.firestore,
                )
            },
        )
    }

    async add(data: IFirestoreDocumentData): Promise<InProcessFirestoreDocRef> {
        const doc: InProcessFirestoreDocRef = this.doc()
        await doc.set(data)
        return doc
    }

    isEqual(other: IFirestoreCollectionRef): boolean {
        return other.path === this.path
    }
}

export class InProcessFirestoreQuerySnapshot
    implements IFirestoreQuerySnapshot {
    readonly empty: boolean
    readonly size: number

    constructor(readonly docs: InProcessFirestoreDocumentSnapshot[] = []) {
        this.empty = docs.length === 0
        this.size = docs.length
    }

    forEach(
        callback: (result: InProcessFirestoreDocumentSnapshot) => void,
    ): void {
        this.docs.forEach((doc) => callback(doc))
    }
}

function makeUpdateTime(): IFirestoreTimestamp {
    const seconds = new Date().getTime() / 1000
    return {
        seconds,
        isEqual(other: IFirestoreTimestamp): boolean {
            return other.seconds === seconds
        },
    }
}

function makeWriteResult(): IFirestoreWriteResult {
    const updateTime = makeUpdateTime()
    return {
        writeTime: updateTime,
        isEqual: (other) => other.writeTime === updateTime,
    }
}

export class InProcessFirestoreDocRef implements IFirestoreDocRef {
    readonly id: string
    readonly parent: InProcessFirestoreCollectionRef

    constructor(readonly path: string, readonly firestore: InProcessFirestore) {
        this.path = _.trim(this.path.replace(/[\/.]+/g, "/"), "/.")
        const pathSplit = this.path.split("/")
        this.id = pathSplit.pop() || ""
        this.parent = new InProcessFirestoreCollectionRef(
            this.firestore,
            pathSplit.join("/"),
        )
    }

    collection(collectionPath: string): InProcessFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(
            this.firestore,
            `${this.path}/${collectionPath}`,
        )
    }

    async get(): Promise<InProcessFirestoreDocumentSnapshot> {
        const value = this.firestore._getPath(this._dotPath())
        return new InProcessFirestoreDocumentSnapshot(
            this.id,
            value !== null && value !== undefined,
            this,
            value,
        )
    }

    async create(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult> {
        const existing = await this.get()
        if (existing.exists) {
            throw new Error(`Cannot create existing document at ${this.path}`)
        }
        return this.set(data)
    }

    async set(
        data: IFirestoreDocumentData,
        options: { merge: boolean } = { merge: false },
    ): Promise<IFirestoreWriteResult> {
        if (options && options.merge) {
            return this.update(data)
        }
        const updateTime = makeUpdateTime()
        this.firestore._setPath(
            this._dotPath(),
            _.merge(data, { _meta: { updateTime } }),
        )
        return makeWriteResult()
    }

    async update(
        data: IFirestoreDocumentData,
        precondition?: IPrecondition,
    ): Promise<IFirestoreWriteResult> {
        const current = this.firestore._getPath(this._dotPath())
        const newUpdateTime = makeUpdateTime()
        if (precondition && precondition.lastUpdateTime) {
            if (
                current._meta.updateTime &&
                !current._meta.updateTime.isEqual(precondition.lastUpdateTime)
            ) {
                return makeWriteResult()
            }
        }
        this.firestore._setPath(
            this._dotPath(),
            _.merge(current, data, { _meta: { updateTime: newUpdateTime } }),
        )
        return makeWriteResult()
    }

    async delete(): Promise<IFirestoreWriteResult> {
        this.firestore._deletePath(this._dotPath())
        return makeWriteResult()
    }

    listCollections(): Promise<InProcessFirestoreCollectionRef[]> {
        throw new Error(
            "InProcessFirestoreDocRef.listCollections not implemented",
        )
    }

    onSnapshot(
        onNext: (snapshot: InProcessFirestoreDocumentSnapshot) => void,
        onError?: (error: Error) => void,
    ): () => void {
        throw new Error("InProcessFirestoreDocRef.onSnapshot not implemented")
    }

    isEqual(other: InProcessFirestoreDocRef): boolean {
        throw new Error("InProcessFirestoreDocRef.onSnapshot not implemented")
    }

    _dotPath(): string {
        return _.trim(this.path.replace(/[\/.]+/g, "."), ".")
    }
}

class InProcessFirestoreDocumentSnapshot implements IFirestoreDocumentSnapshot {
    readonly updateTime?: IFirestoreTimestamp

    constructor(
        readonly id: string,
        readonly exists: boolean,
        readonly ref: InProcessFirestoreDocRef,
        private readonly value: IFirestoreDocumentData | undefined,
    ) {
        if (value && value._meta && value._meta.updateTime) {
            this.updateTime = value._meta.updateTime
        }
    }

    data(): IFirestoreDocumentData | undefined {
        if (this.value) {
            return stripMeta(this.value)
        }
        return undefined
    }
}

export class InProcessFirestoreBuilder implements IFirestoreBuilder {
    constructor(private readonly firestore: InProcessFirestore) {}

    document(path: string): InProcessFirestoreDocumentBuilder {
        return new InProcessFirestoreDocumentBuilder(path, this.firestore)
    }
}

export class InProcessFirestoreDocumentBuilder
    implements IFirestoreDocumentBuilder {
    constructor(
        private readonly path: string,
        private readonly firestore: InProcessFirestore,
    ) {}

    onCreate(
        handler: (
            snapshot: IFirestoreDocumentSnapshot,
            context: IFirebaseEventContext,
        ) => Promise<any>,
    ): CloudFunction<any> {
        const cloudFunction = async (
            snapshot: IFirestoreDocumentSnapshot,
            context: IFirebaseEventContext,
        ) => {
            return handler(snapshot, context)
        }
        cloudFunction.run = cloudFunction
        this.firestore._addObserver("created", this.path, cloudFunction)
        return cloudFunction
    }

    onDelete(
        handler: (
            snapshot: IFirestoreDocumentSnapshot,
            context: IFirebaseEventContext,
        ) => Promise<any>,
    ): CloudFunction<any> {
        const cloudFunction = async (
            snapshot: IFirestoreDocumentSnapshot,
            context: IFirebaseEventContext,
        ) => {
            return handler(snapshot, context)
        }
        cloudFunction.run = cloudFunction
        this.firestore._addObserver("deleted", this.path, cloudFunction)
        return cloudFunction
    }

    onUpdate(
        handler: (
            change: IFirebaseChange<IFirestoreDocumentSnapshot>,
            context: IFirebaseEventContext,
        ) => Promise<any>,
    ): CloudFunction<any> {
        const cloudFunction = async (
            change: IFirebaseChange<IFirestoreDocumentSnapshot>,
            context: IFirebaseEventContext,
        ) => {
            return handler(change, context)
        }
        cloudFunction.run = cloudFunction
        this.firestore._addObserver("updated", this.path, cloudFunction)
        return cloudFunction
    }

    onWrite(
        handler: (
            change: IFirebaseChange<IFirestoreDocumentSnapshot>,
            context: IFirebaseEventContext,
        ) => Promise<any>,
    ): CloudFunction<any> {
        const cloudFunction = async (
            change: IFirebaseChange<IFirestoreDocumentSnapshot>,
            context: IFirebaseEventContext,
        ) => {
            return handler(change, context)
        }
        cloudFunction.run = cloudFunction
        this.firestore._addObserver("written", this.path, cloudFunction)
        return cloudFunction
    }
}

/**
 * Basic in-process "transaction" with no concurrency control or retries.
 */
class InProcessFirestoreTransaction implements IFirestoreTransaction {
    private readonly writeOperations: Array<() => Promise<any>> = []

    create(
        documentRef: InProcessFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction {
        this.writeOperations.push(async () => {
            if ((await documentRef.get()).exists) {
                throw new Error(
                    "Cannot create document in transaction: already exists",
                )
            }
            await documentRef.set(data)
        })
        return this
    }

    delete(documentRef: InProcessFirestoreDocRef): IFirestoreTransaction {
        this.writeOperations.push(async () => await documentRef.delete())
        return this
    }

    get(ref: InProcessFirestoreDocRef): Promise<IFirestoreDocumentSnapshot>
    get(ref: InProcessFirestoreQuery): Promise<InProcessFirestoreQuerySnapshot>
    get(
        ref: InProcessFirestoreDocRef | InProcessFirestoreQuery,
    ):
        | Promise<IFirestoreDocumentSnapshot>
        | Promise<InProcessFirestoreQuerySnapshot> {
        if (this.writeOperations.length > 0) {
            throw new Error("Cannot read after write in Firestore transaction")
        }
        return ref.get()
    }

    set(
        documentRef: InProcessFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction {
        this.writeOperations.push(async () => await documentRef.set(data))
        return this
    }

    update(
        documentRef: InProcessFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction {
        this.writeOperations.push(async () => await documentRef.update(data))
        return this
    }

    async commit(): Promise<void> {
        while (this.writeOperations.length > 0) {
            const write = this.writeOperations.pop() || (async () => undefined)
            await write()
        }
    }
}

class InProcessFirestoreWriteBatch implements IFirestoreWriteBatch {
    private readonly writeOperations: Array<
        () => Promise<IFirestoreWriteResult>
    > = []

    create(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch {
        this.writeOperations.push(async () => {
            if ((await documentRef.get()).exists) {
                throw new Error(
                    "Cannot create document in batch write: already exists",
                )
            }
            return documentRef.set(data)
        })
        return this
    }

    delete(documentRef: IFirestoreDocRef): IFirestoreWriteBatch {
        this.writeOperations.push(async () => documentRef.delete())
        return this
    }

    set(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
        options: { merge?: boolean } = { merge: false },
    ): IFirestoreWriteBatch {
        this.writeOperations.push(async () => documentRef.set(data, options))
        return this
    }

    update(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
        precondition?: IPrecondition,
    ): IFirestoreWriteBatch {
        this.writeOperations.push(async () =>
            documentRef.update(data, precondition),
        )
        return this
    }

    async commit(): Promise<IFirestoreWriteResult[]> {
        const results: IFirestoreWriteResult[] = []
        while (this.writeOperations.length > 0) {
            const write = this.writeOperations.pop() || (async () => undefined)
            results.push((await write()) as IFirestoreWriteResult)
        }
        return results
    }
}
