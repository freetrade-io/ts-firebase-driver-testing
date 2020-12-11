import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore document reference id", () => {
    test("document reference has id attribute", () => {
        // Given we have an in-process Firestore db instance;
        const db = new InProcessFirestore()

        // When we get a document reference;
        const docRef = db.collection("foobar").doc("thingy-123")

        // Then the document reference should have an id attribute.
        expect(docRef.id).toBe("thingy-123")
    })

    test("document reference is correct after retrieving from a collection", async () => {
        // Given we have an in-process Firestore db instance;
        const db = new InProcessFirestore()

        // And a ref that has been added to the database;
        const docRef = db.doc("collection_1/doc_1/collection_2/doc_2")
        await docRef.set({ id: 123 })

        // When we get the collection items;
        const documents = await db
            .collection("collection_1/doc_1/collection_2")
            .get()

        const retrievedRef = documents.docs[0].ref

        // Then the document reference should be equal to the inital ref;
        expect(retrievedRef).toStrictEqual(docRef)
    })
})
