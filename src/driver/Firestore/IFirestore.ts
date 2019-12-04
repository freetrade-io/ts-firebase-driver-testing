export interface IFirestore {
    collection(collectionPath: string): IFirestoreCollectionRef
    doc(documentPath: string): IFirestoreDocRef
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
    doc(documentPath?: string): IFirestoreDocRef
    add(data: IFirestoreDocumentData): Promise<IFirestoreDocRef>
}

export interface IFirestoreDocRef {
    collection(collectionPath: string): IFirestoreCollectionRef
    get(): Promise<IFirestoreDocumentSnapshot>
    set(
        data: IFirestoreDocumentData,
        options?: { merge: boolean },
    ): Promise<IFirestoreWriteResult>
    update(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult>
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
