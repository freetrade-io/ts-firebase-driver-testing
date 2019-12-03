import _ from "lodash"
import objectPath = require("object-path")
import { fireStoreLikeId } from "../identifiers"
import {
    IFirestore,
    IFirestoreCollectionRef,
    IFirestoreCollectionSnapshot,
    IFirestoreDocRef,
    IFirestoreDocumentData,
    IFirestoreDocumentSnapshot,
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

export class InProcessFirestoreCollectionRef
    implements IFirestoreCollectionRef {
    constructor(
        private readonly db: InProcessFirestore,
        private readonly path: string,
        private readonly parent?: InProcessFirestoreDocRef,
    ) {}

    async get(): Promise<InProcessFirestoreCollectionSnapshot> {
        const collection = this.db._getPath(this.dotPath()) || {}
        return new InProcessFirestoreCollectionSnapshot(
            Object.keys(collection).reduce(
                (docs: InProcessFirestoreDocumentSnapshot[], key: string) => {
                    docs.push(
                        new InProcessFirestoreDocumentSnapshot(
                            key,
                            true,
                            new InProcessFirestoreDocRef(
                                this.db,
                                `${this.dotPath()}.${key}`,
                                this,
                            ),
                            collection[key],
                        ),
                    )
                    return docs
                },
                [] as InProcessFirestoreDocumentSnapshot[],
            ),
        )
    }

    doc(documentPath?: string): InProcessFirestoreDocRef {
        if (!documentPath) {
            documentPath = this.db.makeId()
        }
        return new InProcessFirestoreDocRef(this.db, documentPath, this)
    }

    async add(
        data: IFirestoreDocumentData,
    ): Promise<InProcessFirestoreDocumentSnapshot> {
        const doc: InProcessFirestoreDocRef = this.doc()
        await doc.set(data)
        return doc.get()
    }

    dotPath(): string {
        let dotPath = ""
        if (this.parent) {
            dotPath = this.parent.dotPath()
        }
        return _.trim(dotPath + `.${this.path}`, ".")
    }
}

export class InProcessFirestoreCollectionSnapshot
    implements IFirestoreCollectionSnapshot {
    constructor(readonly docs: InProcessFirestoreDocumentSnapshot[] = []) {}
}

export class InProcessFirestoreDocRef implements IFirestoreDocRef {
    constructor(
        private readonly db: InProcessFirestore,
        private readonly path: string,
        private readonly parent?: InProcessFirestoreCollectionRef,
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
