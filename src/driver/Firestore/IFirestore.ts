export interface IFirestore {
    collection(collectionPath: string): IFirestoreCollectionRef
    doc(documentPath: string): IFirestoreDocRef
}

export interface IFirestoreCollectionRef {
    get(): Promise<IFirestoreCollectionSnapshot>
    doc(documentPath?: string): IFirestoreDocRef
    add(data: IFirestoreDocumentData): Promise<IFirestoreDocumentSnapshot>
}

export interface IFirestoreCollectionSnapshot {
    docs: IFirestoreDocumentSnapshot[]
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
