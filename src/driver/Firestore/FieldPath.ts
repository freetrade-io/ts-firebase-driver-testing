/**
 * Replacement for admin.firestore.FieldPath to avoid having to require
 * firebase-admin as a dependency.
 */
export interface IFieldPath {
    readonly segments?: string[] | void
}

export const FIELD_PATH_DOCUMENT_ID = "__name__"

export class FieldPath implements IFieldPath {
    static documentId(): IFieldPath {
        return new FieldPath([FIELD_PATH_DOCUMENT_ID])
    }

    constructor(readonly segments: string[]) {}
}

export function isFieldPathDocumentId(fieldPath: string | IFieldPath): boolean {
    if (!fieldPath) {
        return false
    }
    if (typeof fieldPath !== "object") {
        return false
    }
    if (!fieldPath.segments) {
        return false
    }
    return fieldPath.segments[0] === FIELD_PATH_DOCUMENT_ID
}
