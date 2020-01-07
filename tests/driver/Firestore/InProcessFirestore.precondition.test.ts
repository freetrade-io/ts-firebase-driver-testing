import { InProcessFirestore } from "../../../src/driver/Firestore/InProcessFirestore"

describe("In-process Firestore update precondition", () => {
    const db = new InProcessFirestore()

    beforeEach(() => {
        db.reset()
    })

    test("update skipped if last update time has changed", async () => {
        // Given we write a document to a collection;
        const doc = await db.collection("animals").add({ name: "tiger1" })

        // And we note the update time;
        const firstUpdateTime = (await doc.get()).updateTime

        // When the document is updated again in the meantime;
        const interveningUpdate = await doc.update({ name: "tiger2" })

        // And we try to update it again with a precondition that the update
        // time has not changed;
        await doc.update(
            { name: "tiger3" },
            { lastUpdateTime: firstUpdateTime },
        )

        // Then that third write should be ignored due to failing the
        // precondition.
        const finalSnapshot = await doc.get()
        expect(finalSnapshot.updateTime).not.toBeUndefined()
        expect((finalSnapshot.updateTime || {}).seconds).toEqual(
            interveningUpdate.writeTime.seconds,
        )
        expect(finalSnapshot.data()).toEqual({ name: "tiger2" })
    })
})
