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
        ...documentRefsOrReadOptions: Array<IFirestoreDocRef | IReadOptions>
    ): Promise<IFirestoreDocumentSnapshot[]>
    listCollections(): Promise<IFirestoreCollectionRef[]>
}

export interface IReadOptions {
    fieldMask?: Array<string | IFieldPath>
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
    readonly id: string

    readonly firestore: IFirestore

    readonly parent: IFirestoreCollectionRef

    readonly path: string

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

    update(
        field: string | IFieldPath,
        value: any,
        ...moreFieldsOrPrecondition: any[]
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

    readonly readTime: IFirestoreTimestamp

    readonly createTime?: IFirestoreTimestamp

    data(): IFirestoreDocumentData | undefined

    get(fieldPath: string | IFieldPath): any

    isEqual(other: IFirestoreDocumentSnapshot): boolean
}

export interface IFirestoreQueryDocumentSnapshot
    extends IFirestoreDocumentSnapshot {
    readonly createTime?: IFirestoreTimestamp
    readonly updateTime: IFirestoreTimestamp
}

export interface IFirestoreDocumentData {
    [field: string]: any
}

export interface IFirestoreWriteResult {
    writeTime: IFirestoreTimestamp

    isEqual(other: IFirestoreWriteResult): boolean
}

export interface IFirestoreTimestamp {
    readonly seconds: number
    readonly nanoseconds: number
    toDate(): Date
    toMillis(): number
    isEqual(other: IFirestoreTimestamp): boolean
}

export interface IFirestoreQuery {
    readonly firestore: IFirestore
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
    isEqual(other: IFirestoreQuery): boolean
}

export interface IFirestoreQuerySnapshot {
    readonly query: IFirestoreQuery

    readonly docs: IFirestoreQueryDocumentSnapshot[]

    readonly empty: boolean

    readonly size: number

    readonly readTime: IFirestoreTimestamp

    docChanges(): any[]

    isEqual(other: IFirestoreQuerySnapshot): boolean

    forEach(callback: (result: IFirestoreQueryDocumentSnapshot) => void): void
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
