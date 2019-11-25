import {
    InProcessFirestore,
    InProcessFirestoreCollectionRef,
    InProcessFirestoreDocRef,
} from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore get set", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.reset()
    })

    test.each([
        [{}, ["foo", "bar"], undefined],
        [{ foo: {} }, ["foo", "bar"], undefined],
        [{ foo: { bar: { baz: "hello" } } }, ["foo", "bar"], { baz: "hello" }],
        [
            { foo: { bar: { baz: { someDoc: { something: 123 } } } } },
            ["foo", "bar", "baz", "someDoc"],
            { something: 123 },
        ],
        [
            { foo: { bar: { baz: { something: 123 } } } },
            ["foo", "bar", "baz", "boz"],
            undefined,
        ],
    ] as Array<[object, string[], any]>)(
        "get document",
        async (dataset: object, path: string[], expectedValue: any) => {
            // Given an in-process Firestore database with a dataset;
            firestore.reset(dataset)

            // When we get a doc at a path;
            let ref: InProcessFirestoreCollectionRef | InProcessFirestoreDocRef
            ref = firestore.collection(path.shift() || "")
            while (path.length > 0) {
                if (ref instanceof InProcessFirestoreCollectionRef) {
                    ref = ref.doc(path.shift() || "")
                } else if (ref instanceof InProcessFirestoreDocRef) {
                    ref = ref.collection(path.shift() || "")
                }
            }

            // Then the doc should be as expected;
            expect(ref).toBeInstanceOf(InProcessFirestoreDocRef)
            if (ref instanceof InProcessFirestoreDocRef) {
                const doc = await ref.get()
                expect(doc.data()).toEqual(expectedValue)
            }
        },
    )
})
