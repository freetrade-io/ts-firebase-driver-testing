export interface IFirestore {
    collection(collectionPath: string): IFirestoreCollectionRef
    doc(documentPath: string): IFirestoreDocRef
}

export interface IFirestoreCollectionRef {
    doc(documentPath: string): IFirestoreDocRef
}

export interface IFirestoreDocRef {
    collection(collectionPath: string): IFirestoreCollectionRef
    get(): Promise<IFirestoreDocumentSnapshot>
    set(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult>
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
