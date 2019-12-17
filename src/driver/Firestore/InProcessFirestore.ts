import _ from "lodash"
import objectPath = require("object-path")
import {
    ChangeType,
    CloudFunction,
    IDatabaseChangeObserver,
    IFirebaseChange,
    IFirebaseEventContext,
} from "../.."
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
    IFirestoreWriteResult,
} from "./IFirestore"

export class InProcessFirestore implements IFirestore {
    private storage = {}
    private changeObservers: IDatabaseChangeObserver[] = []

    constructor(public makeId: () => string = fireStoreLikeId) {}

    collection(collectionPath: string): InProcessFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(this, collectionPath)
    }

    doc(documentPath: string): InProcessFirestoreDocRef {
        return new InProcessFirestoreDocRef(this, documentPath)
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
        objectPath.set(this.storage, dotPath, value)
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
    constructor(
        private readonly db: InProcessFirestore,
        private readonly path: string,
        private readonly parent?: InProcessFirestoreQuery,
    ) {}

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
            this.path,
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

    dotPath(): string {
        let dotPath = ""
        if (this.parent) {
            dotPath = this.parent.dotPath()
        }
        return _.trim(dotPath + `.${this.path}`, ".")
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
