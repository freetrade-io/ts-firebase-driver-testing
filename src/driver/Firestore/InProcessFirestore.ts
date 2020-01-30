import _ from "lodash"
import {
    CloudFunction,
    IFirebaseChange,
    IFirebaseEventContext,
    IFirestoreQueryDocumentSnapshot,
    IReadOptions,
} from "../.."
import { objDel, objGet, objSet } from "../../util/objPath"
import { stripMeta } from "../../util/stripMeta"
import { IAsyncJobs } from "../AsyncJobs"
import {
    ChangeType,
    IDatabaseChangeObserver,
} from "../ChangeObserver/DatabaseChangeObserver"
import { GRPCStatusCode } from "../Common/GRPCStatusCode"
import { IFirestoreBuilder, IFirestoreDocumentBuilder } from "../FirebaseDriver"
import { fireStoreLikeId } from "../identifiers"
import {
    FIELD_PATH_DOCUMENT_ID,
    IFieldPath,
    isFieldPathDocumentId,
} from "./FieldPath"
import { makeFirestoreChangeObserver } from "./FirestoreChangeObserver"
import { FirestoreError } from "./FirestoreError"
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

    collection(collectionPath: string): IFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(
            this,
            collectionPath,
        ) as IFirestoreCollectionRef
    }

    doc(documentPath: string): IFirestoreDocRef {
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

    batch(): IFirestoreWriteBatch {
        return new InProcessFirestoreWriteBatch()
    }

    settings(settings: object): void {
        throw new Error("Not implemented")
    }

    collectionGroup(collectionId: string): IFirestoreQuery {
        throw new Error("Not implemented")
    }

    getAll(
        ...documentRefsOrReadOptions: Array<IFirestoreDocRef | IReadOptions>
    ): Promise<IFirestoreDocumentSnapshot[]> {
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

    terminate(): Promise<void> {
        throw new Error("InProcessFirestore.terminate not implemented")
    }

    _getPath(dotPath: string[]): any {
        return _.cloneDeep(objGet(this.storage, dotPath))
    }

    _setPath(dotPath: string[], value: any): void {
        this.triggerChangeEvents(() => {
            objSet(this.storage, dotPath, value)
        })
    }

    _deletePath(dotPath: string[]): void {
        this.triggerChangeEvents(() => {
            objDel(this.storage, dotPath)
        })
    }

    _addObserver(
        changeType: ChangeType,
        observedPath: string,
        handler: CloudFunction<any>,
    ): void {
        this.changeObservers.push(
            makeFirestoreChangeObserver(
                changeType,
                observedPath,
                handler,
                this,
            ),
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
        readonly firestore: IFirestore & InProcessFirestore,
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
    ): IFirestoreQuery {
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

    offset(offset: number): IFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.offset not implemented")
    }

    limit(limit: number): IFirestoreQuery {
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
    ): IFirestoreQuery {
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

    startAt(...fieldValues: any[]): IFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.startAt not implemented")
    }

    endBefore(...fieldValues: any[]): IFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.endBefore not implemented")
    }

    endAt(...fieldValues: any[]): IFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.endAt not implemented")
    }

    async get(): Promise<IFirestoreQuerySnapshot> {
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
                    ) as IFirestoreDocRef,
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
        return (new InProcessFirestoreQuerySnapshot(
            collection,
            this,
        ) as unknown) as IFirestoreQuerySnapshot
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

    isEqual(other: IFirestoreQuery): boolean {
        throw new Error("InProcessFirestoreQuery.isEqual not implemented")
    }

    withConverter(converter: any): IFirestoreQuery {
        throw new Error("InProcessFirestoreQuery.withConverter not implemented")
    }

    _dotPath(): string[] {
        return _.trim(this.path.replace(/[\/.]+/g, "."), ".").split(".")
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
    readonly parent: IFirestoreDocRef | null = null

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
            ) as IFirestoreDocRef
        }
        this.id = pathSplit.pop() || ""
    }

    doc(documentPath?: string): IFirestoreDocRef {
        if (!documentPath) {
            documentPath = this.firestore.makeId()
        }
        return new InProcessFirestoreDocRef(
            `${this.path}/${documentPath}`,
            this.firestore,
        ) as IFirestoreDocRef
    }

    async listDocuments(): Promise<IFirestoreDocRef[]> {
        const collection = this.firestore._getPath(this._dotPath()) || {}
        return Object.keys(collection).map(
            (key: string): InProcessFirestoreDocRef => {
                return new InProcessFirestoreDocRef(
                    `${this.path}/${key}`,
                    this.firestore,
                )
            },
        ) as IFirestoreDocRef[]
    }

    async add(data: IFirestoreDocumentData): Promise<IFirestoreDocRef> {
        const doc = this.doc()
        await doc.set(data)
        return doc
    }

    isEqual(other: IFirestoreQuery): boolean {
        throw new Error(
            "InProcessFirestoreCollectionRef.isEqual not implemented",
        )
    }

    withConverter<U>(converter: any): IFirestoreCollectionRef<U> {
        throw new Error(
            "InProcessFirestoreCollectionRef.withConverter not implemented",
        )
    }
}

export class InProcessFirestoreQuerySnapshot
    implements IFirestoreQuerySnapshot {
    readonly empty: boolean
    readonly size: number
    readonly readTime: IFirestoreTimestamp
    readonly query: IFirestoreQuery

    constructor(
        readonly docs: IFirestoreQueryDocumentSnapshot[] = [],
        query: InProcessFirestoreQuery,
    ) {
        this.query = query
        this.empty = docs.length === 0
        this.size = docs.length
        this.readTime = makeTimestamp()
    }

    forEach(callback: (result: IFirestoreQueryDocumentSnapshot) => void): void {
        this.docs.forEach((doc) => callback(doc))
    }

    docChanges(): any[] {
        throw new Error(
            "InProcessFirestoreQuerySnapshot.docChanges not implemented",
        )
    }

    isEqual(other: IFirestoreQuerySnapshot): boolean {
        throw new Error(
            "InProcessFirestoreQuerySnapshot.isEqual not implemented",
        )
    }
}

function makeTimestamp(): IFirestoreTimestamp {
    const date = new Date()
    const milliseconds: number = date.getTime()
    const seconds: number = milliseconds / 1000
    return {
        seconds,
        nanoseconds: milliseconds * 1000000,
        toDate: () => date,
        toMillis: (): number => milliseconds,
        isEqual: (other): boolean => other.toMillis() === milliseconds,
    }
}

function makeWriteResult(): IFirestoreWriteResult {
    const updateTime = makeTimestamp()
    return {
        writeTime: updateTime,
        isEqual: (other) => other.writeTime === updateTime,
    }
}

export class InProcessFirestoreDocRef implements IFirestoreDocRef {
    readonly id: string
    readonly parent: IFirestoreCollectionRef

    constructor(
        readonly path: string,
        readonly firestore: IFirestore & InProcessFirestore,
    ) {
        this.path = _.trim(this.path.replace(/[\/.]+/g, "/"), "/.")
        const pathSplit = this.path.split("/")
        this.id = pathSplit.pop() || ""
        this.parent = new InProcessFirestoreCollectionRef(
            this.firestore,
            pathSplit.join("/"),
        )
    }

    collection(collectionPath: string): IFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(
            this.firestore,
            `${this.path}/${collectionPath}`,
        )
    }

    async get(): Promise<IFirestoreDocumentSnapshot> {
        const value = this.firestore._getPath(this._dotPath())
        return new InProcessFirestoreDocumentSnapshot(
            this.id,
            value !== null && value !== undefined,
            this as IFirestoreDocRef,
            value,
        )
    }

    async create(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult> {
        const existing = await this.get()
        if (existing.exists) {
            throw new FirestoreError(
                GRPCStatusCode.ALREADY_EXISTS,
                `Document already exists: ${this.path}`,
            )
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
        const createTime = makeTimestamp()
        const updateTime = makeTimestamp()
        this.firestore._setPath(
            this._dotPath(),
            _.merge(
                _.cloneDeep(data),
                _.cloneDeep({ _meta: { createTime, updateTime } }),
            ),
        )
        return makeWriteResult()
    }

    async update(
        dataOrField: IFirestoreDocumentData | string | IFieldPath,
        valueOrPrecondition?: any | IPrecondition,
        ...moreFieldsOrPrecondition: any[]
    ): Promise<IFirestoreWriteResult> {
        if (typeof dataOrField === "string" || dataOrField.segments) {
            throw new Error(
                "InProcessFirestoreDocRef.update with field path as first arg is not implemented",
            )
        }
        if (valueOrPrecondition && !valueOrPrecondition.lastUpdateTime) {
            throw new Error(
                "InProcessFirestoreDocRef.update with value as second arg is not implemented",
            )
        }
        if (moreFieldsOrPrecondition && moreFieldsOrPrecondition.length > 0) {
            throw new Error(
                "InProcessFirestoreDocRef.update with more than 2 args is not implemented",
            )
        }

        const data = dataOrField as IFirestoreDocumentData
        const precondition = valueOrPrecondition as IPrecondition
        const current = this.firestore._getPath(this._dotPath())
        const newUpdateTime = makeTimestamp()
        if (precondition && precondition.lastUpdateTime) {
            if (
                current._meta.updateTime &&
                !current._meta.updateTime.isEqual(precondition.lastUpdateTime)
            ) {
                return makeWriteResult()
            }
        }
        const newValue = _.merge(
            _.cloneDeep({ _meta: { createTime: newUpdateTime } }),
            _.cloneDeep(current),
            _.cloneDeep(data),
            _.cloneDeep({
                _meta: { updateTime: newUpdateTime },
            }),
        )
        this.firestore._setPath(this._dotPath(), newValue)
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
        onNext: (snapshot: IFirestoreDocumentSnapshot) => void,
        onError?: (error: Error) => void,
    ): () => void {
        throw new Error("InProcessFirestoreDocRef.onSnapshot not implemented")
    }

    isEqual(other: IFirestoreDocRef): boolean {
        throw new Error("InProcessFirestoreDocRef.onSnapshot not implemented")
    }

    withConverter<U>(converter: any): IFirestoreDocRef<U> {
        throw new Error(
            "InProcessFirestoreDocRef.withConverter not implemented",
        )
    }

    _dotPath(): string[] {
        return _.trim(this.path.replace(/[\/.]+/g, "."), ".").split(".")
    }
}

export class InProcessFirestoreDocumentSnapshot
    implements IFirestoreQueryDocumentSnapshot {
    readonly createTime: IFirestoreTimestamp
    readonly updateTime: IFirestoreTimestamp
    readonly readTime: IFirestoreTimestamp

    constructor(
        readonly id: string,
        readonly exists: boolean,
        readonly ref: IFirestoreDocRef,
        private readonly value: IFirestoreDocumentData | undefined,
    ) {
        if (!ref) {
            throw new Error(
                "InProcessFirestoreDocumentSnapshot created with empty ref",
            )
        }

        const now = makeTimestamp()
        this.readTime = now

        this.createTime = now
        if (value && value._meta && value._meta.createTime) {
            this.createTime = value._meta.createTime
        }

        this.updateTime = now
        if (value && value._meta && value._meta.updateTime) {
            this.updateTime = value._meta.updateTime
        }
    }

    data(): IFirestoreDocumentData {
        if (this.value) {
            return stripMeta(this.value)
        }
        return {}
    }

    get(fieldPath: string | IFieldPath): any {
        throw new Error(
            "InProcessFirestoreDocumentSnapshot.get not implemented",
        )
    }

    isEqual(other: IFirestoreDocumentSnapshot): boolean {
        throw new Error(
            "InProcessFirestoreDocumentSnapshot.isEqual not implemented",
        )
    }
}

export class InProcessFirestoreBuilder implements IFirestoreBuilder {
    constructor(private readonly firestore: IFirestore & InProcessFirestore) {}

    document(path: string): IFirestoreDocumentBuilder {
        return new InProcessFirestoreDocumentBuilder(path, this.firestore)
    }
}

export class InProcessFirestoreDocumentBuilder
    implements IFirestoreDocumentBuilder {
    constructor(
        private readonly path: string,
        private readonly firestore: IFirestore & InProcessFirestore,
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
        documentRef: IFirestoreDocRef,
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

    delete(documentRef: IFirestoreDocRef): IFirestoreTransaction {
        this.writeOperations.push(async () => await documentRef.delete())
        return this
    }

    get(ref: IFirestoreDocRef): Promise<IFirestoreDocumentSnapshot>
    get(ref: IFirestoreQuery): Promise<IFirestoreQuerySnapshot>
    get(
        ref: IFirestoreDocRef | IFirestoreQuery,
    ): Promise<IFirestoreDocumentSnapshot> | Promise<IFirestoreQuerySnapshot> {
        if (this.writeOperations.length > 0) {
            throw new Error("Cannot read after write in Firestore transaction")
        }
        return ref.get()
    }

    getAll(
        ...documentRefsOrReadOptions: Array<IFirestoreDocRef | IReadOptions>
    ): Promise<IFirestoreDocumentSnapshot[]> {
        throw new Error("InProcessFirestoreTransaction.getAll not implemented")
    }

    set(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction {
        this.writeOperations.push(async () => await documentRef.set(data))
        return this
    }

    update(
        documentRef: IFirestoreDocRef,
        dataOrField: IFirestoreDocumentData | string | IFieldPath,
        preconditionOrValue?: any | IPrecondition,
        ...fieldsOrPrecondition: any[]
    ): IFirestoreTransaction {
        if (typeof dataOrField === "string" || dataOrField.segments) {
            throw new Error(
                "InProcessFirestoreTransaction.update with string or field path is not implemented",
            )
        }
        if (preconditionOrValue) {
            throw new Error(
                "InProcessFirestoreTransaction.update with 3rd arg is not implemented",
            )
        }
        if (fieldsOrPrecondition && fieldsOrPrecondition.length > 0) {
            throw new Error(
                "InProcessFirestoreTransaction.update with 4th arg is not implemented",
            )
        }

        const data = dataOrField as IFirestoreDocumentData
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
    private committed = false

    private readonly writeOperations: Array<
        () => Promise<IFirestoreWriteResult>
    > = []

    create(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch {
        this.errorIfAlreadyCommitted()
        this.writeOperations.push(async () => {
            if ((await documentRef.get()).exists) {
                throw new FirestoreError(
                    GRPCStatusCode.ALREADY_EXISTS,
                    `Document already exists: ${documentRef.path}`,
                )
            }
            return documentRef.set(data)
        })
        return this
    }

    delete(documentRef: IFirestoreDocRef): IFirestoreWriteBatch {
        this.errorIfAlreadyCommitted()
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
        dataOrField: IFirestoreDocumentData | string | IFieldPath,
        preconditionOrValue?: any | IPrecondition,
        ...fieldsOrPrecondition: any[]
    ): IFirestoreWriteBatch {
        this.errorIfAlreadyCommitted()

        if (typeof dataOrField === "string" || dataOrField.segments) {
            throw new Error(
                "InProcessFirestoreWriteBatch.update with string or field path is not implemented",
            )
        }
        if (preconditionOrValue && !preconditionOrValue.lastUpdateTime) {
            throw new Error(
                "InProcessFirestoreWriteBatch.update with 3rd arg as value is not implemented",
            )
        }
        if (fieldsOrPrecondition && fieldsOrPrecondition.length > 0) {
            throw new Error(
                "InProcessFirestoreWriteBatch.update with 4th arg is not implemented",
            )
        }

        const data = dataOrField as IFirestoreDocumentData
        const precondition = preconditionOrValue as IPrecondition

        this.writeOperations.push(async () =>
            documentRef.update(data, precondition),
        )
        return this
    }

    async commit(): Promise<IFirestoreWriteResult[]> {
        this.errorIfAlreadyCommitted()

        const results: IFirestoreWriteResult[] = []
        while (this.writeOperations.length > 0) {
            const write = this.writeOperations.pop() || (async () => undefined)
            results.push((await write()) as IFirestoreWriteResult)
        }
        this.committed = true
        return results
    }

    private errorIfAlreadyCommitted(): void {
        if (this.committed) {
            throw new Error(
                "Cannot modify a WriteBatch that has been committed.",
            )
        }
    }
}
