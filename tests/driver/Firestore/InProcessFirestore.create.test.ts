import { GRPCStatusCode } from "../../../src/driver/Common/GRPCStatusCode"
import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore create", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.resetStorage()
    })

    test("create new document", async () => {
        // When we create a new document;
        await db
            .collection("animals")
            .doc("tiger")
            .create({ description: "stripey" })

        // Then the document should be created.
        const snapshot = await db
            .collection("animals")
            .doc("tiger")
            .get()
        expect(snapshot.exists).toBeTruthy()
        expect(snapshot.data()).toEqual({ description: "stripey" })
    })

    test("cannot create existing document", async () => {
        // Given there is an existing document;
        await db
            .collection("animals")
            .doc("tiger")
            .set({ description: "stripey" })

        // When we create the same document;
        let error: Error | null = null
        try {
            await db
                .collection("animals")
                .doc("tiger")
                .create({ size: "large" })
        } catch (err) {
            error = err as any
        }

        // Then the write should fail;
        expect(error).isFirestoreErrorWithCode(
            GRPCStatusCode.ALREADY_EXISTS,
            new RegExp("animals/tiger"),
        )

        // And the document should not be changed.
        const snapshot = await db
            .collection("animals")
            .doc("tiger")
            .get()
        expect(snapshot.exists).toBeTruthy()
        expect(snapshot.data()).toEqual({ description: "stripey" })
    })
})
