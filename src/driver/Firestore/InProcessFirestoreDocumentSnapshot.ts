import { cloneDeep, get } from "lodash"
import { objGet } from "../../util/objPath"
import { stripFirestoreMeta } from "../../util/stripMeta"
import { IFieldPath } from "./FieldPath"
import {
    IFirestoreDocRef,
    IFirestoreDocumentData,
    IFirestoreDocumentSnapshot,
    IFirestoreQueryDocumentSnapshot,
    IFirestoreTimestamp,
} from "./IFirestore"
import { makeTimestamp } from "./makeTimestamp"

export class InProcessFirestoreDocumentSnapshot
    implements IFirestoreQueryDocumentSnapshot {
    readonly createTime: IFirestoreTimestamp
    readonly updateTime: IFirestoreTimestamp
    readonly readTime: IFirestoreTimestamp

    constructor(
        readonly id: string,
        readonly exists: boolean,
        readonly ref: IFirestoreDocRef,
        private readonly value: IFirestoreDocumentData | undefined,
    ) {
        if (!ref) {
            throw new Error(
                "InProcessFirestoreDocumentSnapshot created with empty ref",
            )
        }

        const now = makeTimestamp()
        this.readTime = now

        this.createTime = now
        if (value && value._meta && value._meta.createTime) {
            this.createTime = value._meta.createTime
        }

        this.updateTime = now
        if (value && value._meta && value._meta.updateTime) {
            this.updateTime = value._meta.updateTime
        }
    }

    data(): IFirestoreDocumentData {
        if (this.value) {
            return stripFirestoreMeta(this.value)
        }
        return {}
    }

    get(fieldPath: string | IFieldPath): any {
        if (this.value) {
            if (typeof fieldPath === "string") {
                if (!/^[^*~/[\]]+$/.test(fieldPath)) {
                    throw new Error(
                        `Error: Paths can't be empty and must not contain
                        "*~/[]".`,
                    )
                }
                return cloneDeep(get(this.value, fieldPath))
            }
            const segments = fieldPath.segments
            if (segments) {
                return cloneDeep(objGet(this.value, segments))
            }
        }
        return {}
    }

    isEqual(other: IFirestoreDocumentSnapshot): boolean {
        throw new Error(
            "InProcessFirestoreDocumentSnapshot.isEqual not implemented",
        )
    }
}
