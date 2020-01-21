import {
    IFirestoreCollectionRef,
    IFirestoreDocRef,
    InProcessFirestore,
    InProcessFirestoreCollectionRef,
    InProcessFirestoreDocRef,
} from "../../../src"

describe("InProcessFirestore get", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.reset()
    })

    test(".collection()", async () => {
        // Given there is a collection;
        firestore.reset({
            myCollection: {
                id1: { field: "value 1" },
                id2: { field: "value 2" },
                id3: { field: "value 3" },
            },
        })

        // When we get the collection;
        const collectionSnapshot = await firestore
            .collection("myCollection")
            .get()

        // Then we should get the expected collection.
        expect(collectionSnapshot.docs.map((doc) => doc.exists)).toEqual([
            true,
            true,
            true,
        ])
        expect(collectionSnapshot.docs.map((doc) => doc.id)).toEqual([
            "id1",
            "id2",
            "id3",
        ])
        expect(collectionSnapshot.docs.map((doc) => doc.data())).toEqual([
            { field: "value 1" },
            { field: "value 2" },
            { field: "value 3" },
        ])
    })

    test(".collection() non-existent", async () => {
        // Given there is a collection;
        firestore.reset({
            myCollection: {
                id1: { field: "value 1" },
                id2: { field: "value 2" },
                id3: { field: "value 3" },
            },
        })

        // When we get a non-existent collection;
        const collectionSnapshot = await firestore
            .collection("honestPoliticians")
            .get()

        // Then we should get the expected non-existent collection.
        expect(collectionSnapshot.size).toBe(0)
        expect(collectionSnapshot.empty).toBeTruthy()
        expect(collectionSnapshot.docs).toHaveLength(0)
        expect(collectionSnapshot.docs).toEqual([])
    })

    test(".collection().doc()", async () => {
        // Given there is a collection with a doc;
        firestore.reset({
            myCollection: {
                id1: { field: "value 1" },
            },
        })

        // When we get the doc;
        const docSnapshot = await firestore
            .collection("myCollection")
            .doc("id1")
            .get()

        // Then we should get the expected doc.
        expect(docSnapshot.exists).toBe(true)
        expect(docSnapshot.id).toBe("id1")
        expect(docSnapshot.data()).toEqual({ field: "value 1" })
    })

    test(".collection().doc() non-existent", async () => {
        // Given there is a collection with a doc;
        firestore.reset({
            myCollection: {
                id1: { field: "value 1" },
            },
        })

        // When we get a non-existent doc;
        const docSnapshot = await firestore
            .collection("myCollection")
            .doc("id2")
            .get()

        // Then we should get the expected non-existent doc.
        expect(docSnapshot.exists).toBe(false)
        expect(docSnapshot.id).toBe("id2")
        expect(docSnapshot.data()).toEqual({})
    })

    test(".collection().doc().collection()", async () => {
        // Given there is a collection with a doc and nested collection;
        firestore.reset({
            topCollection: {
                id1: {
                    field: "value 1",
                    subCollection: {
                        subId1: { field: "value 1" },
                        subId2: { field: "value 2" },
                        subId3: { field: "value 3" },
                    },
                },
            },
        })

        // When we get the nested collection;
        const collectionSnapshot = await firestore
            .collection("topCollection")
            .doc("id1")
            .collection("subCollection")
            .get()

        // Then we should get the expected collection.
        expect(collectionSnapshot.docs.map((doc) => doc.exists)).toEqual([
            true,
            true,
            true,
        ])
        expect(collectionSnapshot.docs.map((doc) => doc.id)).toEqual([
            "subId1",
            "subId2",
            "subId3",
        ])
        expect(collectionSnapshot.docs.map((doc) => doc.data())).toEqual([
            { field: "value 1" },
            { field: "value 2" },
            { field: "value 3" },
        ])
    })

    test(".collection().doc().collection() non-existent", async () => {
        // Given there is a collection with a doc and nested collection;
        firestore.reset({
            topCollection: {
                id1: {
                    field: "value 1",
                    subCollection: {
                        subId1: { field: "value 1" },
                        subId2: { field: "value 2" },
                        subId3: { field: "value 3" },
                    },
                },
            },
        })

        // When we get a non-existent collection;
        const collectionSnapshot = await firestore
            .collection("topCollection")
            .doc("id1")
            .collection("honestPoliticians")
            .get()

        // Then we should get the expected non-existent collection.
        expect(collectionSnapshot.size).toBe(0)
        expect(collectionSnapshot.empty).toBeTruthy()
        expect(collectionSnapshot.docs).toHaveLength(0)
        expect(collectionSnapshot.docs).toEqual([])
    })

    test(".collection().doc().collection().doc()", async () => {
        // Given there is a nested collection and doc;
        firestore.reset({
            topCollection: {
                id1: {
                    subCollection: {
                        nestedId: {
                            field: "value",
                        },
                    },
                },
            },
        })

        // When we get the doc;
        const docSnapshot = await firestore
            .collection("topCollection")
            .doc("id1")
            .collection("subCollection")
            .doc("nestedId")
            .get()

        // Then we should get the expected doc.
        expect(docSnapshot.exists).toBe(true)
        expect(docSnapshot.id).toBe("nestedId")
        expect(docSnapshot.data()).toEqual({ field: "value" })
    })

    test(".collection().doc().collection().doc() non-existent", async () => {
        // Given there is a nested collection and doc;
        firestore.reset({
            topCollection: {
                id1: {
                    subCollection: {
                        nestedId: {
                            field: "value",
                        },
                    },
                },
            },
        })

        // When we get a non-existent nested doc;
        const docSnapshot = await firestore
            .collection("topCollection")
            .doc("id1")
            .collection("subCollection")
            .doc("freeLunch")
            .get()

        // Then we should get the expected non-existent doc.
        expect(docSnapshot.exists).toBe(false)
        expect(docSnapshot.id).toBe("freeLunch")
        expect(docSnapshot.data()).toEqual({})
    })

    /**
     * Various general test cases.
     */
    test.each([
        [{}, ["foo", "bar"], {}],
        [{ foo: {} }, ["foo", "bar"], {}],
        [{ foo: { bar: { baz: "hello" } } }, ["foo", "bar"], { baz: "hello" }],
        [
            { foo: { bar: { baz: { someDoc: { something: 123 } } } } },
            ["foo", "bar", "baz", "someDoc"],
            { something: 123 },
        ],
        [
            { foo: { bar: { baz: { something: 123 } } } },
            ["foo", "bar", "baz", "boz"],
            {},
        ],
    ] as Array<[object, string[], any]>)(
        "get document",
        async (dataset: object, path: string[], expectedValue: any) => {
            // Given an in-process Firestore database with a dataset;
            firestore.reset(dataset)

            // When we get a doc at a path;
            let ref: IFirestoreCollectionRef | IFirestoreDocRef
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
