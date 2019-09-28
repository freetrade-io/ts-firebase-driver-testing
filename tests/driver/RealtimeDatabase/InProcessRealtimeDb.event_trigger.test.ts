import {
    IFirebaseChange,
    IFirebaseDataSnapshot,
    IFirebaseEventContext,
    InProcessFirebaseDriver,
} from "../../../src"

type SnapshotChange = IFirebaseChange<IFirebaseDataSnapshot>

describe("InProcessRealtimeDatabase event triggers", () => {
    const firebase = new InProcessFirebaseDriver()

    beforeEach(() => {
        firebase.realTimeDatabase().reset()
    })

    test("single field onWrite trigger", async () => {
        // Given we have set up a database write trigger on a single field;
        let triggeredChange: SnapshotChange | undefined
        let triggeredContext: IFirebaseEventContext | undefined

        firebase
            .runWith()
            .database.ref("animals/{name}")
            .onWrite(
                async (
                    change: SnapshotChange,
                    context: IFirebaseEventContext,
                ) => {
                    triggeredChange = change
                    triggeredContext = context
                },
            )

        // When that field gets written;
        await firebase
            .realTimeDatabase()
            .ref("animals/tiger")
            .set("roar")

        // Then the onWrite trigger function should have been called with the
        // details of the write.
        expect(triggeredChange).not.toBeUndefined()
        if (triggeredChange) {
            //
        }

        expect(triggeredContext).not.toBeUndefined()
        if (triggeredContext) {
            //
        }
    })
})
