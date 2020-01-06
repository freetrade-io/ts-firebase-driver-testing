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
        options?: { merge: boolean },
    ): Promise<IFirestoreWriteResult>
    update(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult>
    delete(): Promise<IFirestoreWriteResult>
}

export interface IFirestoreDocumentSnapshot {
    id: string
    exists: boolean
    ref: IFirestoreDocRef
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
}

export interface IFirestoreQuery {
    orderBy(fieldPath: string, directionStr?: "desc" | "asc"): IFirestoreQuery
    limit(limit: number): IFirestoreQuery
    where(
        fieldPath: string,
        opStr: FirestoreWhereFilterOp,
        value: any,
    ): IFirestoreQuery
    get(): Promise<IFirestoreQuerySnapshot>
}

export interface IFirestoreQuerySnapshot {
    docs: IFirestoreDocumentSnapshot[]
    empty: boolean
    forEach(callback: (result: IFirestoreDocumentSnapshot) => void): void
}

export interface IFirestoreTransaction {
    get(documentRef: IFirestoreDocRef): Promise<IFirestoreDocumentSnapshot>

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

export interface IFirestoreWriteBatch {
    create(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch

    set(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch

    update(
        documentRef: IFirestoreDocRef,
        data: IFirestoreDocumentData,
    ): IFirestoreWriteBatch

    delete(documentRef: IFirestoreDocRef): IFirestoreWriteBatch

    commit(): Promise<IFirestoreWriteResult[]>
}
