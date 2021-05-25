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
    terminate(): Promise<void>
}

export interface IReadOptions {
    fieldMask?: Array<string | IFieldPath>
}

export type FirestoreWhereFilterOp =
    | "<"
    | "!="
    | "<="
    | "=="
    | ">="
    | ">"
    | "array-contains"
    | "in"
    | "array-contains-any"

export interface IFirestoreCollectionRef<T = IFirestoreDocumentData>
    extends IFirestoreQuery<T> {
    readonly id: string
    readonly path: string
    readonly parent: IFirestoreDocRef | null
    readonly firestore: IFirestore
    doc(documentPath?: string): IFirestoreDocRef<T>
    listDocuments(): Promise<Array<IFirestoreDocRef<T>>>
    add(data: T): Promise<IFirestoreDocRef<T>>
    isEqual(other: IFirestoreCollectionRef<T>): boolean
    withConverter<U>(converter: any): IFirestoreCollectionRef<U>
}

export interface IFirestoreDocRef<T = IFirestoreDocumentData> {
    readonly id: string

    readonly firestore: IFirestore

    readonly parent: IFirestoreCollectionRef<T>

    readonly path: string

    collection(collectionPath: string): IFirestoreCollectionRef

    get(): Promise<IFirestoreDocumentSnapshot<T>>

    create(data: T): Promise<IFirestoreWriteResult>

    set(data: T, options?: { merge?: boolean }): Promise<IFirestoreWriteResult>

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
        onNext: (snapshot: IFirestoreDocumentSnapshot<T>) => void,
        onError?: (error: Error) => void,
    ): () => void

    isEqual(other: IFirestoreDocRef<T>): boolean

    withConverter<U>(converter: any): IFirestoreDocRef<U>
}

export interface IFirestoreDocumentSnapshot<T = IFirestoreDocumentData> {
    readonly id: string

    readonly exists: boolean

    readonly ref: IFirestoreDocRef<T>

    readonly updateTime?: IFirestoreTimestamp

    readonly readTime: IFirestoreTimestamp

    readonly createTime?: IFirestoreTimestamp

    data(): T | undefined

    get(fieldPath: string | IFieldPath): any

    isEqual(other: IFirestoreDocumentSnapshot<T>): boolean
}

export interface IFirestoreQueryDocumentSnapshot<T = IFirestoreDocumentData>
    extends IFirestoreDocumentSnapshot<T> {
    readonly createTime: IFirestoreTimestamp
    readonly updateTime: IFirestoreTimestamp

    data(): T
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

export interface IFirestoreQuery<T = IFirestoreDocumentData> {
    readonly firestore: IFirestore
    orderBy(
        fieldPath: string | IFieldPath,
        directionStr?: "desc" | "asc",
    ): IFirestoreQuery<T>
    offset(offset: number): IFirestoreQuery<T>
    limit(limit: number): IFirestoreQuery<T>
    startAfter(...fieldValues: any[]): IFirestoreQuery<T>
    endBefore(...fieldValues: any[]): IFirestoreQuery<T>
    endAt(...fieldValues: any[]): IFirestoreQuery<T>
    where(
        fieldPath: string,
        opStr: FirestoreWhereFilterOp,
        value: any,
    ): IFirestoreQuery<T>
    select(...field: string[]): IFirestoreQuery<T>
    startAt(...fieldValues: any[]): IFirestoreQuery<T>
    get(): Promise<IFirestoreQuerySnapshot>
    stream(): NodeJS.ReadableStream
    onSnapshot(
        onNext: (snapshot: IFirestoreQuerySnapshot) => void,
        onError?: (error: Error) => void,
    ): () => void
    isEqual(other: IFirestoreQuery): boolean
    withConverter<U>(converter: any): IFirestoreQuery<U>
}

export interface IFirestoreQuerySnapshot<T = IFirestoreDocumentData> {
    readonly query: IFirestoreQuery<T>

    readonly docs: Array<IFirestoreQueryDocumentSnapshot<T>>

    readonly empty: boolean

    readonly size: number

    readonly readTime: IFirestoreTimestamp

    docChanges(): any[]

    isEqual(other: IFirestoreQuerySnapshot<T>): boolean

    forEach(
        callback: (result: IFirestoreQueryDocumentSnapshot<T>) => void,
    ): void
}

export interface IFirestoreTransaction {
    get<T>(ref: IFirestoreDocRef<T>): Promise<IFirestoreDocumentSnapshot<T>>
    get<T>(ref: IFirestoreQuery<T>): Promise<IFirestoreQuerySnapshot<T>>

    getAll(
        ...documentRefsOrReadOptions: Array<IFirestoreDocRef | IReadOptions>
    ): Promise<IFirestoreDocumentSnapshot[]>

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
        precondition?: IPrecondition,
    ): IFirestoreTransaction

    update(
        documentRef: IFirestoreDocRef,
        field: string | IFieldPath,
        value: any,
        ...fieldsOrPrecondition: any[]
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

    update(
        documentRef: IFirestoreDocRef,
        field: string | IFieldPath,
        value: any,
        ...fieldsOrPrecondition: any[]
    ): IFirestoreWriteBatch

    delete(documentRef: IFirestoreDocRef): IFirestoreWriteBatch

    commit(): Promise<IFirestoreWriteResult[]>
}
