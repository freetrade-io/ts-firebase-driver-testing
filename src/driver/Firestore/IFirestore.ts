export interface IFirestore {
    collection(collectionPath: string): IFirestoreCollectionRef
    doc(documentPath: string): IFirestoreDocRef
    runTransaction<T>(
        updateFunction: (transaction: IFirestoreTransaction) => Promise<T>,
        transactionOptions?: { maxAttempts?: number },
    ): Promise<T>
    batch(): IFirestoreWriteBatch
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
    readonly path: string
    readonly parent: IFirestoreDocRef | null
    doc(documentPath?: string): IFirestoreDocRef
    listDocuments(): Promise<IFirestoreDocRef[]>
    add(data: IFirestoreDocumentData): Promise<IFirestoreDocRef>
}

export interface IFirestoreDocRef {
    readonly path: string
    readonly id: string
    readonly parent: IFirestoreCollectionRef
    collection(collectionPath: string): IFirestoreCollectionRef
    get(): Promise<IFirestoreDocumentSnapshot>
    set(
        data: IFirestoreDocumentData,
        options?: { merge?: boolean },
    ): Promise<IFirestoreWriteResult>
    update(
        data: IFirestoreDocumentData,
        precondition?: IPrecondition,
    ): Promise<IFirestoreWriteResult>
    delete(): Promise<IFirestoreWriteResult>
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
    orderBy(fieldPath: string, directionStr?: "desc" | "asc"): IFirestoreQuery
    limit(limit: number): IFirestoreQuery
    startAfter(...fieldValues: any[]): IFirestoreQuery
    where(
        fieldPath: string,
        opStr: FirestoreWhereFilterOp,
        value: any,
    ): IFirestoreQuery
    select(...field: string[]): IFirestoreQuery
    get(): Promise<IFirestoreQuerySnapshot>
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
