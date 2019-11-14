export interface IFirestore {
    collection(collectionPath: string): IFirestoreCollectionRef
    doc(documentPath: string): IFirestoreDocRef
}

export interface IFirestoreCollectionRef {
    doc(documentPath: string): IFirestoreDocRef
}

export interface IFirestoreDocRef {
    collection(collectionPath: string): IFirestoreCollectionRef
    create(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult>
    set(data: IFirestoreDocumentData): Promise<IFirestoreWriteResult>
}

export interface IFirestoreDocumentData {
    [field: string]: any
}

export interface IFirestoreWriteResult {
    isEqual(other: IFirestoreWriteResult): boolean
}
