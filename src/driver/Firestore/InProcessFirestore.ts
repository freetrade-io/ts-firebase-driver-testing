import _ from "lodash"
import objectPath = require("object-path")
import { fireStoreLikeId } from "../identifiers"
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

    constructor(public makeId: () => string = fireStoreLikeId) {}

    collection(collectionPath: string): InProcessFirestoreCollectionRef {
        return new InProcessFirestoreCollectionRef(this, collectionPath)
    }

    doc(documentPath: string): InProcessFirestoreDocRef {
        return new InProcessFirestoreDocRef(this, documentPath)
    }

    reset(dataset: object = {}): void {
        this.storage = dataset
        this.makeId = fireStoreLikeId
    }

    _getPath(dotPath: string): any {
        return objectPath.get(this.storage, dotPath)
    }

    _setPath(dotPath: string, value: any): void {
        objectPath.set(this.storage, dotPath, value)
    }
}

export class InProcessFirestoreQuery implements IFirestoreQuery {
    private readonly filters: Array<
        (item: { [key: string]: any }) => boolean
    > = []

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
                filter = (item) => item[fieldPath] < value
                break
            case "<=":
                filter = (item) => item[fieldPath] <= value
                break
            case "==":
                filter = (item) => String(item[fieldPath]) === String(value)
                break
            case ">=":
                filter = (item) => item[fieldPath] >= value
                break
            case ">":
                filter = (item) => item[fieldPath] > value
                break
            case "array-contains":
                filter = (item) => Array(item[fieldPath]).includes(value)
                break
            case "in":
                filter = (item) => Array(value).includes(item[fieldPath])
                break
            case "array-contains-any":
                filter = (item) => {
                    return Array(item[fieldPath]).some((el) =>
                        Array(value).includes(el),
                    )
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
        return new InProcessFirestoreQuerySnapshot(collection)
    }

    dotPath(): string {
        let dotPath = ""
        if (this.parent) {
            dotPath = this.parent.dotPath()
        }
        return _.trim(dotPath + `.${this.path}`, ".")
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
    constructor(readonly docs: InProcessFirestoreDocumentSnapshot[] = []) {}

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
