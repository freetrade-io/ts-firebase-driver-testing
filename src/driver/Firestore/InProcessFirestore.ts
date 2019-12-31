import _ from "lodash"
import objectPath = require("object-path")
import { CloudFunction, IFirebaseChange, IFirebaseEventContext } from "../.."
import { IAsyncJobs } from "../AsyncJobs"
import {
    ChangeType,
    IDatabaseChangeObserver,
} from "../ChangeObserver/DatabaseChangeObserver"
import { IFirestoreBuilder, IFirestoreDocumentBuilder } from "../FirebaseDriver"
import { fireStoreLikeId } from "../identifiers"
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
    IFirestoreTransaction,
    IFirestoreWriteBatch,
    IFirestoreWriteResult,
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
        return new InProcessFirestoreDocRef(this, documentPath)
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

    reset(dataset: object = {}): void {
        this.storage = dataset
        this.changeObservers = []
        this.makeId = fireStoreLikeId
    }

    _getPath(dotPath: string): any {
        return objectPath.get(this.storage, dotPath)
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

export class InProcessFirestoreQuery implements IFirestoreQuery {
    private filters: Array<(item: { [key: string]: any }) => boolean> = []
    private rangeFilterField: string = ""

    constructor(
        protected readonly db: InProcessFirestore,
        protected readonly path: string,
        protected readonly parent?: InProcessFirestoreDocRef,
    ) {}

    where(
        fieldPath: string,
        opStr: FirestoreWhereFilterOp,
        value: any,
    ): InProcessFirestoreQuery {
        let filter: (item: { [key: string]: any }) => boolean
        switch (opStr) {
            case "<":
                this.enforceSingleFieldRangeFilter(fieldPath)
                filter = (item) => item[fieldPath] < value
                break
            case "<=":
                this.enforceSingleFieldRangeFilter(fieldPath)
                filter = (item) => item[fieldPath] <= value
                break
            case "==":
                filter = (item) => String(item[fieldPath]) === String(value)
                break
            case ">=":
                this.enforceSingleFieldRangeFilter(fieldPath)
                filter = (item) => item[fieldPath] >= value
                break
            case ">":
                this.enforceSingleFieldRangeFilter(fieldPath)
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
        this.filters.push(filter)
        return this
    }

    async get(): Promise<InProcessFirestoreQuerySnapshot> {
        let collection = this.db._getPath(this.dotPath()) || {}
        for (const filter of this.filters) {
            collection = Object.keys(collection)
                .filter((key) => filter(collection[key]))
                .reduce((whole: object, key: string) => {
                    // @ts-ignore
                    whole[key] = collection[key]
                    return whole
                }, {})
        }
        collection = Object.keys(collection).map(
            (key: string): InProcessFirestoreDocumentSnapshot => {
                return new InProcessFirestoreDocumentSnapshot(
                    key,
                    true,
                    new InProcessFirestoreDocRef(
                        this.db,
                        `${this.dotPath()}.${key}`,
                        this,
                    ),
                    collection[key],
                )
            },
        )
        this.filters = []
        this.rangeFilterField = ""
        return new InProcessFirestoreQuerySnapshot(collection)
    }

    dotPath(): string {
        let dotPath = ""
        if (this.parent) {
            dotPath = this.parent.dotPath()
        }
        return _.trim(dotPath + `.${this.path}`, ".")
    }

    private enforceSingleFieldRangeFilter(fieldPath: string): void {
        if (this.rangeFilterField && fieldPath !== this.rangeFilterField) {
            throw new Error(
                "Firestore cannot have range filters on different fields, see " +
                    "https://firebase.google.com/docs/firestore/query-data/queries",
            )
        }
        this.rangeFilterField = fieldPath
    }
}

export class InProcessFirestoreCollectionRef extends InProcessFirestoreQuery
    implements IFirestoreCollectionRef {
    doc(documentPath?: string): InProcessFirestoreDocRef {
        if (!documentPath) {
            documentPath = this.db.makeId()
        }
        return new InProcessFirestoreDocRef(this.db, documentPath, this)
    }

    async add(data: IFirestoreDocumentData): Promise<InProcessFirestoreDocRef> {
        const doc: InProcessFirestoreDocRef = this.doc()
        await doc.set(data)
        return doc
    }
}

export class InProcessFirestoreQuerySnapshot
    implements IFirestoreQuerySnapshot {
    readonly empty: boolean

    constructor(readonly docs: InProcessFirestoreDocumentSnapshot[] = []) {
        this.empty = docs.length === 0
    }

    forEach(
        callback: (result: InProcessFirestoreDocumentSnapshot) => void,
    ): void {
        this.docs.forEach((doc) => callback(doc))
    }
}

export class InProcessFirestoreDocRef implements IFirestoreDocRef {
    readonly path: string

    constructor(
        private readonly db: InProcessFirestore,
        private readonly pathSection: string,
        private readonly parent?: InProcessFirestoreQuery,
    ) {
        let parentFullPath = ""
        if (parent) {
            parentFullPath = parent.dotPath()
        }
        this.path = `${parentFullPath}.${this.pathSection}`.replace(/\.+/g, "/")
    }

    collection(collectionPath: string): InProcessFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(
            this.db,
            collectionPath,
            this,
        )
    }

    async get(): Promise<InProcessFirestoreDocumentSnapshot> {
        const value = this.db._getPath(this.dotPath())
        return new InProcessFirestoreDocumentSnapshot(
            this.pathSection,
            value !== null && value !== undefined,
            this,
            value,
        )
    }

    async set(
        data: IFirestoreDocumentData,
        options: { merge: boolean } = { merge: false },
    ): Promise<IFirestoreWriteResult> {
        if (options && options.merge) {
            return this.update(data)
        }
        this.db._setPath(this.dotPath(), data)
        return { writeTime: { seconds: new Date().getTime() / 1000 } }
    }

    async update(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult> {
        this.db._setPath(
            this.dotPath(),
            _.merge(this.db._getPath(this.dotPath()), data),
        )
        return { writeTime: { seconds: new Date().getTime() / 1000 } }
    }

    async delete(): Promise<IFirestoreWriteResult> {
        this.db._deletePath(this.dotPath())
        return { writeTime: { seconds: new Date().getTime() / 1000 } }
    }

    dotPath(): string {
        let dotPath = ""
        if (this.parent) {
            dotPath = this.parent.dotPath()
        }
        return _.trim(dotPath + `.${this.pathSection}`, ".")
    }
}

class InProcessFirestoreDocumentSnapshot implements IFirestoreDocumentSnapshot {
    constructor(
        readonly id: string,
        readonly exists: boolean,
        readonly ref: InProcessFirestoreDocRef,
        private readonly value: IFirestoreDocumentData | undefined,
    ) {}

    data(): IFirestoreDocumentData | undefined {
        return this.value
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

    get(ref: InProcessFirestoreDocRef): Promise<IFirestoreDocumentSnapshot> {
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
    ): IFirestoreWriteBatch {
        this.writeOperations.push(async () => documentRef.set(data))
        return this
    }

    update(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch {
        this.writeOperations.push(async () => documentRef.update(data))
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
