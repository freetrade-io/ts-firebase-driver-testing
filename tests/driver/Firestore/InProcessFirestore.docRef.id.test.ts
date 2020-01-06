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
})
