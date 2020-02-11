import {
    InProcessFirestore,
    InProcessFirestoreCollectionRef,
    InProcessFirestoreDocRef,
} from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore collection listing documents", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.reset()
    })

    test("list documents empty collection", async () => {
        // Given an empty collection;
        const collectionRef = db.collection("animals")

        // When we list documents;
        const listedDocuments = await collectionRef.listDocuments()

        // Then it should be empty.
        expect(listedDocuments).toHaveLength(0)
        expect(listedDocuments).toStrictEqual([])
    })

    test("list documents on collection", async () => {
        // Given an empty collection with some documents;
        await db.collection("animals").add({ name: "tiger" })
        await db.collection("animals").add({ name: "elephant" })
        await db.collection("animals").add({ name: "kangaroo" })

        // When we list documents;
        const listedDocuments = await db.collection("animals").listDocuments()

        // Then we should get references to all the documents.
        expect(listedDocuments).toHaveLength(3)
        expect((await listedDocuments[0].get()).data()).toEqual({
            name: "tiger",
        })
        expect((await listedDocuments[1].get()).data()).toEqual({
            name: "elephant",
        })
        expect((await listedDocuments[2].get()).data()).toEqual({
            name: "kangaroo",
        })
    })

    test("listDocuments with numeric id", async () => {
        // Given we add a document with a numeric id;
        await db
            .collection("things")
            .doc("123")
            .create({ foo: "bar" })

        // When we list documents on that collection;
        const docs = await db.collection("things").listDocuments()

        // Then we should get that single doc.
        expect(docs.length).toBe(1)
        expect((await docs[0].get()).data()).toEqual({ foo: "bar" })
    })

    test("listDocuments with numeric id in batch", async () => {
        // Given we add a document with a numeric id in a batch;
        const batch = db.batch()
        const docRef = db.collection("things").doc("123")
        batch.create(docRef, { id: "123", foo: "bar" })
        await batch.commit()

        // When we list documents on that collection;
        const docs = await db.collection("things").listDocuments()

        // Then we should get that single doc.
        expect(docs.length).toBe(1)
        expect((await docs[0].get()).data()).toEqual({ id: "123", foo: "bar" })
    })

    test("listDocuments on nested path", async () => {
        // Given a document is added to a collection via a nested path;
        await db.doc("queues/queue0/item0").set({ processed: false })

        // When we list documents in the collection;
        const docRefs = await db.collection("queues").listDocuments()

        // Then we should get that doc.
        expect(docRefs).toHaveLength(1)

        const docRef = docRefs[0]
        expect(docRef).toBeInstanceOf(InProcessFirestoreDocRef)
        expect(docRef.path).toBe("queues/queue0")

        const collectionRefs = await docRef.listCollections()
        expect(collectionRefs).toHaveLength(1)

        const collectionRef = collectionRefs[0]
        expect(collectionRef).toBeInstanceOf(InProcessFirestoreCollectionRef)
        expect(collectionRef.path).toBe("queues/queue0/item0")
    })
})
