import {
    InProcessFirestore,
    InProcessFirestoreDocumentSnapshot,
} from "../../../dist"
import { FieldPath } from "../../../dist/driver/Firestore/FieldPath"
import {
    IFirestore,
    IFirestoreDocRef,
    IFirestoreDocumentData,
    InProcessFirestoreDocRef,
} from "../../../src"

describe("InProcessFirestoreDocumentSnapshot get", () => {
    test("simple field", async () => {
        // Given there is a snapshot;
        const snapshot = createSnapshot({
            someField: 5,
        })

        // When we get the value of the field path
        const pathString = "someField"
        const valueFromPathString = snapshot.get(pathString)
        const valueFromPathObject = snapshot.get(
            new FieldPath(pathString.split(".")),
        )

        // Then we should get the expected field value
        expect(valueFromPathString).toEqual(5)
        expect(valueFromPathString).toEqual(valueFromPathObject)
    })

    test("missing field", async () => {
        // Given there is a snapshot;
        const snapshot = createSnapshot({})

        // When we get the value of the field path
        const pathString = "someField"
        const valueFromPathString = snapshot.get(pathString)
        const valueFromPathObject = snapshot.get(
            new FieldPath(pathString.split(".")),
        )

        // Then we should get the expected field value
        expect(valueFromPathString).toBeUndefined()
        expect(valueFromPathString).toEqual(valueFromPathObject)
    })

    test("invalid field throws error", async () => {
        // Given there is a snapshot;
        const snapshot = createSnapshot({})

        // When we use invalid path string
        const pathString = ""
        const getValueFromPathString = () => snapshot.get(pathString)

        // Then we should get an error
        expect(getValueFromPathString).toThrowError()
    })

    test("complex field with arrays", async () => {
        // Given there is a deeply nested snapshot with an array
        const snapshot = createSnapshot({
            foo: {
                bar: [
                    { baz: "free", bax: { bb: "join" } },
                    { baz: "trade", bax: { bb: "us" } },
                ],
            },
        })

        // When we get the value of the field paths
        const pathJoin = "foo.bar.0.bax.bb"
        const pathUs = "foo.bar.1.bax.bb"
        const pathUndefined = "foo.bar.2.bax.bb"

        const valueJoinFromString = snapshot.get(pathJoin)
        const valueJoinFromObject = snapshot.get(
            new FieldPath(pathJoin.split(".")),
        )

        const valueUsFromString = snapshot.get(pathUs)
        const valueUsFromObject = snapshot.get(
            new FieldPath(pathUs.split(".")),
        )

        const valueUndefinedFromString = snapshot.get(pathUndefined)
        const valueUndefinedFromObject = snapshot.get(
            new FieldPath(pathUndefined.split(".")),
        )

        // Then we should get the expected field values
        expect(valueJoinFromString).toEqual("join")
        expect(valueUsFromString).toEqual("us")
        expect(valueUndefinedFromString).toBeUndefined()
        expect(valueJoinFromString).toEqual(valueJoinFromObject)
        expect(valueUsFromString).toEqual(valueUsFromObject)
        expect(valueUndefinedFromString).toEqual(valueUndefinedFromObject)
    })

    function createSnapshot(
        value: IFirestoreDocumentData,
        collection: string = "someCollection",
        key: string = "68e50d59-2c03-4779-b14f-150ba25dc7a9",
    ) {
        const fs: IFirestore & InProcessFirestore = new InProcessFirestore()
        const ref = new InProcessFirestoreDocRef(
            `${collection}/${key}`,
            fs as any,
        ) as IFirestoreDocRef
        return new InProcessFirestoreDocumentSnapshot(key, true, ref, value)
    }
})
