import { Firestore } from "@google-cloud/firestore"
import flatten from "flat"
import _ from "lodash"
import { Readable } from "stream"
import {
    CloudFunction,
    IFirebaseChange,
    IFirebaseEventContext,
    IFirestoreQueryDocumentSnapshot,
    IReadOptions,
} from "../.."
import { makeDelta } from "../../util/makeDelta"
import { versionCheck } from "../../util/nodeVersionCheck"
import { objDel, objGet, objHas, objSet } from "../../util/objPath"
import { sleep } from "../../util/sleep"
import { pickSubMeta, stripMeta } from "../../util/stripMeta"
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
    IFirestoreBulkWriter,
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
    ISetOptions,
} from "./IFirestore"
import { InProcessFirestoreDocumentSnapshot } from "./InProcessFirestoreDocumentSnapshot"
import { makeTimestamp } from "./makeTimestamp"

export class InProcessFirestore implements IFirestore {
    private changeObservers: IDatabaseChangeObserver[] = []

    private mutex = false

    constructor(
        private readonly jobs?: IAsyncJobs,
        public makeId: () => string = fireStoreLikeId,
        public storage = {},
    ) {}

    asFirestore(): Firestore {
        return (this as unknown) as Firestore
    }

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
        while (this.mutex) {
            await sleep(0)
        }

        let result
        try {
            this.mutex = true

            const initialState = _.cloneDeep(this.storage)
            const transaction = new InProcessFirestoreTransaction()

            try {
                result = await updateFunction(transaction)
                await transaction.commit()
            } catch (err) {
                this.storage = initialState
                throw err
            }
        } finally {
            this.mutex = false
        }

        return result as T
    }

    batch(): IFirestoreWriteBatch {
        return new InProcessFirestoreWriteBatch()
    }

    bulkWriter(): IFirestoreBulkWriter {
        return new InProcessFirestoreBulkWriter()
    }

    settings(settings: object): void {
        throw new Error("Not implemented")
    }

    collectionGroup(collectionId: string): IFirestoreQuery {
        const flattenStorage: any = (storage: any, key: string) => {
            if (storage) {
                const children = Object.keys(storage)
                    .filter((childKey) => typeof storage[childKey] === "object")
                    .map((childKey) => flattenStorage(storage[childKey], key))
                const mergedChildren = _.merge({}, storage, ...children)
                return {
                    [key]: mergedChildren[key],
                }
            } else {
                return null
            }
        }
        const newStorage = flattenStorage(this.storage, collectionId)
        const newFirestore = new InProcessFirestore()
        newFirestore.resetStorage(newStorage)

        return new InProcessFirestoreCollectionRef(
            newFirestore,
            collectionId,
        ) as IFirestoreCollectionRef
    }

    getAll(
        ...documentRefsOrReadOptions: Array<IFirestoreDocRef | IReadOptions>
    ): Promise<IFirestoreDocumentSnapshot[]> {
        throw new Error("Not implemented")
    }

    listCollections(): Promise<IFirestoreCollectionRef[]> {
        throw new Error("Not implemented")
    }

    resetStorage(dataset: object = {}): void {
        this.storage = dataset
    }

    /**
     * @deprecated use resetStorage
     */
    reset(dataset: object = {}): void {
        this.resetStorage(dataset)
    }

    terminate(): Promise<void> {
        throw new Error("InProcessFirestore.terminate not implemented")
    }

    _getPath(dotPath: string[]): { _meta: IChildMeta } | any {
        return _.cloneDeep(objGet(this.storage, dotPath))
    }

    _setPath(dotPath: string[], value: { _meta: IChildMeta } | any): void {
        this.triggerChangeEvents(dotPath, () => {
            const extraMeta = pickSubMeta(objGet<any>(this.storage, dotPath))
            if (extraMeta) {
                return objSet(this.storage, dotPath, { ...value, ...extraMeta })
            }
            return objSet(this.storage, dotPath, value)
        })
    }

    _deletePath(dotPath: string[]): void {
        this.triggerChangeEvents(dotPath, () => {
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

    private triggerChangeEvents(
        dotPath: string[],
        makeChange: () => any,
    ): void {
        if (!this.jobs) {
            makeChange()
            return
        }

        const before = this._getPath(dotPath)
        makeChange()
        const after = this._getPath(dotPath)

        const data = before
        const delta = makeDelta(before, after)

        const jobs = this.changeObservers.map(
            async (observer) =>
                new Promise((resolve) => {
                    setTimeout(async () => {
                        resolve(
                            observer.onChange(
                                { before, after, data, delta },
                                dotPath,
                            ),
                        )
                    }, 1)
                }),
        )

        this.jobs.pushJobs(jobs)
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
    filters: Array<(idItem: IIdItem) => boolean>
    orderings: { [fieldPath: string]: (a: IIdItem, b: IIdItem) => number }
    orderDirection: { [fieldPath: string]: "asc" | "desc" }
    transforms: Array<(collection: ICollection) => ICollection>
    rangeFilterField: string
}

export class InProcessFirestoreQuery implements IFirestoreQuery {
    private static compare(a: any, b: any): number {
        const aNormalised = InProcessFirestoreQuery.normalise(a)
        const bNormalised = InProcessFirestoreQuery.normalise(b)

        // Both values are nil
        if (_.isNil(aNormalised) && _.isNil(bNormalised)) {
            return 0
        }

        if (_.isNil(aNormalised)) {
            return -1
        }

        if (_.isNil(bNormalised)) {
            return 1
        }

        // Both are numbers we can actually compare them
        if (_.isNumber(aNormalised) && _.isNumber(bNormalised)) {
            return aNormalised - bNormalised
        }

        // Else String compare
        return String(aNormalised).localeCompare(String(bNormalised))
    }

    // tslint:disable-next-line ban-types
    private static normalise(val: any): String | Number | Boolean | null {
        if (_.isNumber(val)) {
            return val
        }
        if (
            val instanceof InProcessFirestoreDocRef ||
            val instanceof InProcessFirestoreDocumentSnapshot
        ) {
            return val.id
        }
        if (val && typeof val.toISOString === "function") {
            val = val.toISOString()
        }
        if (val && typeof val.toString === "function") {
            val = val.toString()
        }

        return String(val)
    }

    private static enforceSingleFieldRangeFilter(
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
    constructor(
        readonly firestore: IFirestore & InProcessFirestore,
        readonly path: string,
        protected query: IQueryBuilder = {
            filters: [],
            transforms: [],
            maps: [],
            orderings: {},
            orderDirection: {},
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
        const pathParts = String(fieldPath).split(/\.+/)

        const newQuery: IQueryBuilder = _.cloneDeep<IQueryBuilder>(this.query)

        if (fieldPath !== FIELD_PATH_DOCUMENT_ID) {
            // An orderBy() clause also filters for existence of the given field.
            newQuery.filters.push((idItem) => {
                return objHas(idItem.item, pathParts)
            })
        }

        if (directionStr === "asc") {
            newQuery.orderDirection[fieldPath] = "asc"
            newQuery.orderings[fieldPath] = (a, b) => {
                const compareOfA =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? a.id
                        : objGet(a.item, pathParts)
                const compareOfB =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? b.id
                        : objGet(b.item, pathParts)
                return InProcessFirestoreQuery.compare(compareOfA, compareOfB)
            }
        } else {
            newQuery.orderDirection[fieldPath] = "desc"
            newQuery.orderings[fieldPath] = (a, b) => {
                const compareOfA =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? a.id
                        : objGet(a.item, pathParts)
                const compareOfB =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? b.id
                        : objGet(b.item, pathParts)
                return InProcessFirestoreQuery.compare(compareOfB, compareOfA)
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

        fieldValues.forEach((queryFieldValue: any, i: number) => {
            const fieldPath = Object.keys(this.query.orderings)[i]
            const isDesc = this.query.orderDirection[fieldPath] === "desc"
            newQuery.filters.push((idItem: IIdItem): boolean => {
                const itemFieldValue =
                    fieldPath === FIELD_PATH_DOCUMENT_ID
                        ? idItem.id
                        : objGet(idItem.item, fieldPath.split("."))
                const comparisonResult = InProcessFirestoreQuery.compare(
                    itemFieldValue,
                    queryFieldValue,
                )
                return isDesc ? comparisonResult < 0 : comparisonResult > 0
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
        let filter: (idItem: IIdItem) => boolean
        const fieldObjPath = fieldPath.split(/\.+/)
        switch (opStr) {
            case "<":
                InProcessFirestoreQuery.enforceSingleFieldRangeFilter(
                    newQuery,
                    fieldPath,
                )
                filter = (idItem) => objGet(idItem.item, fieldObjPath) < value
                break
            case "<=":
                InProcessFirestoreQuery.enforceSingleFieldRangeFilter(
                    newQuery,
                    fieldPath,
                )
                filter = (idItem) => objGet(idItem.item, fieldObjPath) <= value
                break
            case "==":
                filter = (idItem) => {
                    return objGet(idItem.item, fieldObjPath) === value
                }
                break
            case "!=":
                filter = (idItem) => {
                    return objGet(idItem.item, fieldObjPath) !== value
                }
                break
            case ">=":
                InProcessFirestoreQuery.enforceSingleFieldRangeFilter(
                    newQuery,
                    fieldPath,
                )
                filter = (idItem) => objGet(idItem.item, fieldObjPath) >= value
                break
            case ">":
                InProcessFirestoreQuery.enforceSingleFieldRangeFilter(
                    newQuery,
                    fieldPath,
                )
                filter = (idItem) => objGet(idItem.item, fieldObjPath) > value
                break
            case "array-contains":
                filter = (idItem) => {
                    if (_.isArray(objGet(idItem.item, fieldObjPath))) {
                        return objGet(idItem.item, fieldObjPath).includes(value)
                    }
                    return false
                }
                break
            case "in":
                if (!_.isArray(value)) {
                    throw new Error("Value must be an array for in operator.")
                }
                filter = (item) =>
                    value.includes(objGet(item.item, fieldObjPath))
                break
            case "array-contains-any":
                if (!_.isArray(value)) {
                    throw new Error(
                        "Value must be an array for array-contains-any operator.",
                    )
                }
                filter = (item) => {
                    if (_.isArray(objGet(item.item, fieldObjPath))) {
                        return objGet(item.item, fieldObjPath).some((el: any) =>
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
        return this.getQuerySnapshot()
    }

    stream(): NodeJS.ReadableStream {
        const NODE_MAJOR_VERSION = versionCheck()
        if (NODE_MAJOR_VERSION < 12) {
            throw new Error("Requires Node 12 (or higher)")
        } else {
            const snapshot = this.getQuerySnapshot()
            return Readable.from(snapshot.docs)
        }
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

    private getQuerySnapshot(): IFirestoreQuerySnapshot {
        let collection = stripMeta(
            this.firestore._getPath(this._dotPath()) || {},
        )
        for (const filter of this.query.filters) {
            collection = Object.keys(collection)
                .filter((key) => filter({ item: collection[key], id: key }))
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
                        `${this._dotPath().join(".")}.${key}`,
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
            orderDirection: {},
            rangeFilterField: "",
        }
        return (new InProcessFirestoreQuerySnapshot(
            collection as IFirestoreQueryDocumentSnapshot[],
            this,
        ) as unknown) as IFirestoreQuerySnapshot
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
            orderDirection: {},
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
        return Object.keys(collection)
            .map((key: string): string[] => `${this.path}/${key}`.split("/"))
            .filter((path: string[]): boolean => {
                const valueAt = this.firestore._getPath(path)
                return (
                    typeof valueAt === "object" &&
                    valueAt._meta &&
                    valueAt._meta.type === ChildType.DOC
                )
            })
            .map(
                (path: string[]): InProcessFirestoreDocRef => {
                    return new InProcessFirestoreDocRef(
                        path.join("/"),
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

function makeWriteResult(): IFirestoreWriteResult {
    const updateTime = makeTimestamp()
    return {
        writeTime: updateTime,
        isEqual: (other) => other.writeTime === updateTime,
    }
}

enum ChildType {
    DOC = "DOC",
    COLLECTION = "COLLECTION",
}

interface IChildMeta {
    type: ChildType
    createTime: IFirestoreTimestamp
    updateTime: IFirestoreTimestamp
}

export class InProcessFirestoreDocRef implements IFirestoreDocRef {
    static validateNoUndefinedFields(
        updateDelta: IFirestoreDocumentData,
    ): void {
        const undefinedFields = InProcessFirestoreDocRef.extractUndefinedFields(
            updateDelta,
        )
        if (undefinedFields.length > 0) {
            throw new FirestoreError(
                GRPCStatusCode.INVALID_ARGUMENT,
                `Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in fields ${undefinedFields})`,
            )
        }
    }

    private static extractUndefinedFields(
        updateDelta: IFirestoreDocumentData,
    ): string[] {
        const flattenedUpdateDelta: IFirestoreDocumentData = flatten(
            updateDelta,
        )
        return Object.keys(flattenedUpdateDelta).filter(
            (path) => flattenedUpdateDelta[path] === undefined,
        )
    }

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
                `Document already exists: /documents/${this.path}`,
            )
        }
        InProcessFirestoreDocRef.validateNoUndefinedFields(data)
        return this.set(data)
    }

    async set(
        data: IFirestoreDocumentData,
        options: { merge: boolean } = { merge: false },
    ): Promise<IFirestoreWriteResult> {
        // We only need to do a merge if something exists at the path
        // Due to how update is implemented, this will throw if it does
        // not already exist.
        InProcessFirestoreDocRef.validateNoUndefinedFields(data)
        const current = this.firestore._getPath(this._dotPath())
        if (options && options.merge && current) {
            return this.performUpdate(data, { mergeWithExisting: true })
        }
        const createTime = makeTimestamp()
        const updateTime = makeTimestamp()
        const dotPath: string[] = this._dotPath()
        this.firestore._setPath(
            dotPath,
            _.merge(
                _.cloneDeep(data),
                _.cloneDeep({ _meta: { createTime, updateTime } }),
            ),
        )
        // Ensure metas are set at each level.
        for (let i = 1; i <= dotPath.length; i++) {
            const typeAtPath =
                i % 2 === 0 ? ChildType.DOC : ChildType.COLLECTION
            const metaPath = [...dotPath.slice(0, i), "_meta", "type"]
            objSet(this.firestore.storage, metaPath, typeAtPath)
        }
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

        return this.performUpdate(
            dataOrField,
            { mergeWithExisting: false },
            valueOrPrecondition,
        )
    }

    async delete(): Promise<IFirestoreWriteResult> {
        this.firestore._deletePath(this._dotPath())
        return makeWriteResult()
    }

    async listCollections(): Promise<InProcessFirestoreCollectionRef[]> {
        const collection = this.firestore._getPath(this._dotPath()) || {}
        return Object.keys(collection)
            .map((key: string): string[] => `${this.path}/${key}`.split("/"))
            .filter((path: string[]): boolean => {
                const valueAt = this.firestore._getPath(path)
                return (
                    typeof valueAt === "object" &&
                    valueAt._meta &&
                    valueAt._meta.type !== ChildType.DOC
                )
            })
            .map(
                (path: string[]): InProcessFirestoreCollectionRef => {
                    return new InProcessFirestoreCollectionRef(
                        this.firestore,
                        path.join("/"),
                    )
                },
            ) as InProcessFirestoreCollectionRef[]
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

    private async performUpdate(
        dataOrField: IFirestoreDocumentData | string | IFieldPath,
        { mergeWithExisting }: { mergeWithExisting: boolean },
        valueOrPrecondition?: any | IPrecondition,
    ): Promise<IFirestoreWriteResult> {
        const updateDelta = dataOrField as IFirestoreDocumentData
        InProcessFirestoreDocRef.validateNoUndefinedFields(updateDelta)

        const precondition = valueOrPrecondition as IPrecondition
        const current = this.firestore._getPath(this._dotPath())

        if (!current) {
            throw new FirestoreError(
                GRPCStatusCode.NOT_FOUND,
                `No document to update: ${this.path}`,
            )
        }

        const newUpdateTime = makeTimestamp()
        const type = ChildType.DOC
        if (precondition && precondition.lastUpdateTime) {
            if (
                current._meta.updateTime &&
                !current._meta.updateTime.isEqual(precondition.lastUpdateTime)
            ) {
                return makeWriteResult()
            }
        }
        const valueToWrite = _.merge(
            _.cloneDeep({ _meta: { createTime: newUpdateTime, type } }),
            _.cloneDeep(current),
            _.cloneDeep({
                _meta: { updateTime: newUpdateTime },
            }),
        )
        for (const [path, newValue] of Object.entries(updateDelta)) {
            const pathComponents = path.includes(".") ? path.split(".") : [path]

            // Handling deleteTransform. The class type is not exported from the lib, so we need to decode it
            if (
                newValue?.constructor?.name === "DeleteTransform" &&
                newValue?.methodName === "FieldValue.delete"
            ) {
                objDel(valueToWrite, pathComponents)
                continue
            }

            const existingValue = objGet(valueToWrite, pathComponents)
            const mergedValue =
                mergeWithExisting &&
                _.isObject(existingValue) &&
                _.isObject(newValue)
                    ? _.merge(existingValue, newValue)
                    : newValue

            objSet(valueToWrite, pathComponents, mergedValue)
        }
        this.firestore._setPath(this._dotPath(), valueToWrite)
        this.firestore._setPath(
            [...this._dotPath().slice(0, -1), "_meta", "type"],
            ChildType.COLLECTION,
        )
        return makeWriteResult()
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
            const write =
                this.writeOperations.shift() || (async () => undefined)
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
                    `Document already exists: /documents/${documentRef.path}`,
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
            const write =
                this.writeOperations.shift() || (async () => undefined)
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

/*
    Simple in-process implementation of Firestore BulkWriter
    https://googleapis.dev/nodejs/firestore/latest/BulkWriter.html
*/
class InProcessFirestoreBulkWriter implements IFirestoreBulkWriter {
    private readonly writeOperations: BulkWriterOperation[] = []

    private closed = false

    // Commits all enqueued writes and marks the BulkWriter instance as closed.
    // https://googleapis.dev/nodejs/firestore/latest/BulkWriter.html#close
    async close(): Promise<void> {
        await this.flush()
        this.closed = true
    }

    // Create a document with the provided data. This single operation will fail if a document exists at its location.
    // https://googleapis.dev/nodejs/firestore/latest/BulkWriter.html#create
    create(
        documentRef: IFirestoreDocRef<IFirestoreDocumentData>,
        data: IFirestoreDocumentData,
    ): Promise<IFirestoreWriteResult> {
        this.throwIfClosed()

        const createPromise = async () => {
            if ((await documentRef.get()).exists) {
                throw new FirestoreError(
                    GRPCStatusCode.ALREADY_EXISTS,
                    `Document already exists: /documents/${documentRef.path}`,
                )
            }
            await documentRef.set(data)
        }
        const bulkWriteOpPromise = this.enqueue(createPromise)
        silencePromise(bulkWriteOpPromise)
        return bulkWriteOpPromise
    }

    delete(
        documentRef: IFirestoreDocRef<IFirestoreDocumentData>,
        precondition?: IPrecondition,
    ): Promise<IFirestoreWriteResult> {
        this.throwIfClosed()
        if (precondition) {
            throw new Error(
                "InProcessFirestorBulkWriter.delete with precondition is not implemented",
            )
        }

        const bulkWriteOpPromise = this.enqueue(
            async () => await documentRef.delete(),
        )
        silencePromise(bulkWriteOpPromise)
        return bulkWriteOpPromise
    }

    // Commits all writes that have been enqueued up to this point in parallel.
    // Returns a Promise that resolves when all currently queued operations have been committed.
    // https://googleapis.dev/nodejs/firestore/latest/BulkWriter.html#flush
    async flush(): Promise<void> {
        this.throwIfClosed()

        await Promise.all(
            this.writeOperations.map(async (writeOperation) => {
                try {
                    const res = await writeOperation.op()
                    writeOperation.onSuccess(res)
                } catch (error) {
                    if (error instanceof Error) {
                        writeOperation.onError(error)
                    }
                }
            }),
        )
    }

    onWriteError(_shouldRetryCallback: (error: Error) => boolean): void {
        this.throwIfClosed()
        throw new Error("onWriteError method not implemented.")
    }

    onWriteResult(
        _callback: (
            documentRef: IFirestoreDocRef<any>,
            result: IFirestoreWriteResult,
        ) => void,
    ): void {
        this.throwIfClosed()
        throw new Error("onWriteResult method not implemented.")
    }

    set(
        documentRef: IFirestoreDocRef<IFirestoreDocumentData>,
        data: IFirestoreDocumentData,
        options?: ISetOptions,
    ): Promise<IFirestoreWriteResult> {
        this.throwIfClosed()

        if (options?.mergeFields) {
            throw new Error(
                "InProcessFirestorBulkWriter.set with mergeFields option is not implemented",
            )
        }

        const bulkWriteOpPromise = this.enqueue(
            async () => await documentRef.set(data, options),
        )
        silencePromise(bulkWriteOpPromise)
        return bulkWriteOpPromise
    }

    update(
        documentRef: IFirestoreDocRef,
        dataOrField: IFirestoreDocumentData | string | IFieldPath,
        preconditionOrValue?: any | IPrecondition,
        ...fieldsOrPrecondition: any[]
    ): Promise<IFirestoreWriteResult> {
        this.throwIfClosed()

        if (typeof dataOrField === "string" || dataOrField.segments) {
            throw new Error(
                "InProcessFirestorBulkWriter.update with string or field path is not implemented",
            )
        }
        if (preconditionOrValue && !preconditionOrValue.lastUpdateTime) {
            throw new Error(
                "InProcessFirestorBulkWriter.update with 3rd arg as value is not implemented",
            )
        }
        if (fieldsOrPrecondition && fieldsOrPrecondition.length > 0) {
            throw new Error(
                "InProcessFirestorBulkWriter.update with 4th arg is not implemented",
            )
        }

        const data = dataOrField as IFirestoreDocumentData
        const precondition = preconditionOrValue as IPrecondition

        const bulkWriteOpPromise = this.enqueue(
            async () => await documentRef.update(data, precondition),
        )
        silencePromise(bulkWriteOpPromise)
        return bulkWriteOpPromise
    }

    private throwIfClosed(): void {
        if (this.closed) {
            throw new Error(
                "BulkWriter instance is closed. All subsequent calls will throw an error",
            )
        }
    }

    // Creates a BulkWriterOperation and adds it to array for resolution on flush() or close() calls
    // Returns deferred promise to allow handling of errors per write operation
    private enqueue(op: () => Promise<any>): Promise<any> {
        const bulkWriterOp = new BulkWriterOperation(op)
        this.writeOperations.push(bulkWriterOp)
        return bulkWriterOp.promise
    }
}

/**
 * Represents a single write for BulkWriter, encapsulating operation execution
 * and error handling.
 * Source: https://github.com/googleapis/nodejs-firestore/blob/master/dev/src/bulk-writer.ts#L105
 */
class BulkWriterOperation {
    deferred: Deferred
    op: () => Promise<IFirestoreWriteResult>

    constructor(op: () => Promise<IFirestoreWriteResult>) {
        this.op = op
        this.deferred = new Deferred()
    }

    // BulkWriter does this Deferred promise logic to give the following functionality:
    // The Promise (from flush()) will never be rejected since the results for each individual operation are conveyed via their individual Promises.
    get promise() {
        return this.deferred.promise
    }

    onError(error: Error) {
        this.deferred.reject(error)
    }

    onSuccess(result: IFirestoreWriteResult) {
        this.deferred.resolve(result)
    }
}

/**
 * A Promise implementation that supports deferred resolution.
 * Source: https://github.com/googleapis/nodejs-firestore/blob/master/dev/src/util.ts#L28
 */
class Deferred {
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
    promise: Promise<unknown>

    constructor() {
        this.resolve = () => {}
        this.reject = () => {}
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }
}

// Takes a promise and swallows all errors so it never throws if it's not handled (i.e. await or .then() used)
// Used to ensure WriteOperation completes but result discarded
// Source: https://github.com/googleapis/nodejs-firestore/blob/master/dev/src/util.ts#L191
function silencePromise(promise: Promise<unknown>): Promise<void> {
    return promise.then(
        () => {},
        () => {},
    )
}
