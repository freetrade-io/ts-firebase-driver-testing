import { IFirebaseDataSnapshot } from "../.."
import { IFieldPath } from "./FieldPath"

export interface IFirestore {
    collection(collectionPath: string): IFirestoreCollectionRef
    doc(documentPath: string): IFirestoreDocRef
    runTransaction<T>(
        updateFunction: (transaction: IFirestoreTransaction) => Promise<T>,
        transactionOptions?: { maxAttempts?: number },
    ): Promise<T>
    batch(): IFirestoreWriteBatch
    settings(settings: object): void
    collectionGroup(collectionId: string): IFirestoreQuery
    getAll(
        ...documentRefsOrReadOptions: Array<
            IFirestoreDocRef | { fieldMask?: string }
        >
    ): Promise<IFirebaseDataSnapshot>
    listCollections(): Promise<IFirestoreCollectionRef[]>
}

export type FirestoreWhereFilterOp =
    | "<"
    | "<="
    | "=="
    | ">="
    | ">"
    | "array-contains"
    | "in"
    | "array-contains-any"

export interface IFirestoreCollectionRef extends IFirestoreQuery {
    readonly id: string
    readonly path: string
    readonly parent: IFirestoreDocRef | null
    readonly firestore: IFirestore
    doc(documentPath?: string): IFirestoreDocRef
    listDocuments(): Promise<IFirestoreDocRef[]>
    add(data: IFirestoreDocumentData): Promise<IFirestoreDocRef>
    isEqual(other: IFirestoreCollectionRef): boolean
}

export interface IFirestoreDocRef {
    readonly path: string
    readonly id: string
    readonly parent: IFirestoreCollectionRef
    readonly firestore: IFirestore
    collection(collectionPath: string): IFirestoreCollectionRef
    get(): Promise<IFirestoreDocumentSnapshot>
    create(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult>
    set(
        data: IFirestoreDocumentData,
        options?: { merge?: boolean },
    ): Promise<IFirestoreWriteResult>
    update(
        data: IFirestoreDocumentData,
        precondition?: IPrecondition,
    ): Promise<IFirestoreWriteResult>
    delete(): Promise<IFirestoreWriteResult>

    listCollections(): Promise<IFirestoreCollectionRef[]>

    onSnapshot(
        onNext: (snapshot: IFirestoreDocumentSnapshot) => void,
        onError?: (error: Error) => void,
    ): () => void

    isEqual(other: IFirestoreDocRef): boolean
}

export interface IFirestoreDocumentSnapshot {
    readonly id: string
    readonly exists: boolean
    readonly ref: IFirestoreDocRef
    readonly updateTime?: IFirestoreTimestamp
    data(): IFirestoreDocumentData | undefined
}

export interface IFirestoreDocumentData {
    [field: string]: any
}

export interface IFirestoreWriteResult {
    writeTime: IFirestoreTimestamp
}

export interface IFirestoreTimestamp {
    seconds: number
    isEqual(other: IFirestoreTimestamp): boolean
}

export interface IFirestoreQuery {
    // readonly firestore: IFirestore
    orderBy(
        fieldPath: string | IFieldPath,
        directionStr?: "desc" | "asc",
    ): IFirestoreQuery
    offset(offset: number): IFirestoreQuery
    limit(limit: number): IFirestoreQuery
    startAfter(...fieldValues: any[]): IFirestoreQuery
    endBefore(...fieldValues: any[]): IFirestoreQuery
    endAt(...fieldValues: any[]): IFirestoreQuery
    where(
        fieldPath: string,
        opStr: FirestoreWhereFilterOp,
        value: any,
    ): IFirestoreQuery
    select(...field: string[]): IFirestoreQuery
    startAt(...fieldValues: any[]): IFirestoreQuery
    get(): Promise<IFirestoreQuerySnapshot>
    stream(): NodeJS.ReadableStream
    onSnapshot(
        onNext: (snapshot: IFirestoreQuerySnapshot) => void,
        onError?: (error: Error) => void,
    ): () => void
}

export interface IFirestoreQuerySnapshot {
    docs: IFirestoreDocumentSnapshot[]
    empty: boolean
    size: number
    forEach(callback: (result: IFirestoreDocumentSnapshot) => void): void
}

export interface IFirestoreTransaction {
    get(ref: IFirestoreDocRef): Promise<IFirestoreDocumentSnapshot>
    get(ref: IFirestoreQuery): Promise<IFirestoreQuerySnapshot>

    create(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction

    set(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction

    update(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreTransaction

    delete(documentRef: IFirestoreDocRef): IFirestoreTransaction
}

export interface IPrecondition {
    readonly lastUpdateTime?: IFirestoreTimestamp
}

export interface IFirestoreWriteBatch {
    create(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch

    set(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
        options?: { merge?: boolean },
    ): IFirestoreWriteBatch

    update(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
        precondition?: IPrecondition,
    ): IFirestoreWriteBatch

    delete(documentRef: IFirestoreDocRef): IFirestoreWriteBatch

    commit(): Promise<IFirestoreWriteResult[]>
}
