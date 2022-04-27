import { FieldValue } from "@google-cloud/firestore"
import { GRPCStatusCode } from "../../../src/driver/Common/GRPCStatusCode"
import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("InProcessFirestore update", () => {
    const firestore = new InProcessFirestore()

    beforeEach(() => {
        firestore.resetStorage()
    })

    test(".doc().update() new", async () => {
        // When we update a new document in a collection;
        await expect(
            firestore
                .collection("myCollection")
                .doc("thing")
                .update({
                    name: "thing",
                    good: true,
                }),
        ).rejects.isFirestoreErrorWithCode(GRPCStatusCode.NOT_FOUND)
    })

    test.each([null, "newValue", { someProperty: "value" }])(
        ".doc().update() existing to %s",
        async (update) => {
            // Given there is a doc;
            await firestore
                .collection("myCollection")
                .doc("id1")
                .create({
                    name: "thing",
                    good: true,
                    nop: null,
                })

            // When we set the doc with a different value;
            await firestore
                .collection("myCollection")
                .doc("id1")
                .update({ name: update })

            // Then the data should be stored correctly;
            const stored = await firestore
                .collection("myCollection")
                .doc("id1")
                .get()

            expect(stored.exists).toBe(true)
            expect(stored.data()).toEqual({
                nop: null,
                name: update,
                good: true,
            })
        },
    )

    test(".doc().update() deleting existing field", async () => {
        // Given there is a doc;
        await firestore
            .collection("myCollection")
            .doc("id1")
            .create({
                name: "thing",
                good: true,
                nop: null,
            })

        // When we set the doc with a different value;
        await firestore
            .collection("myCollection")
            .doc("id1")
            .update({ name: FieldValue.delete() })

        // Then the data should be stored correctly;
        const stored = await firestore
            .collection("myCollection")
            .doc("id1")
            .get()

        expect(stored.exists).toBe(true)
        expect(stored.data()).toEqual({
            nop: null,
            good: true,
        })
    })
})
