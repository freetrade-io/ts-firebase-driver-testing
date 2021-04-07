import {
    IFirebaseDriver,
    InProcessFirebaseDriver,
    IFirebaseChange,
    IFirestoreDocumentSnapshot,
    IFirestoreDocumentData,
} from "../../../../src"
import { IChangeContext } from "../../../../src/driver/ChangeObserver/DatabaseChangeObserver"

describe("onWrite trigger of in-process Firestore", () => {
    let driver: InProcessFirebaseDriver & IFirebaseDriver

    beforeEach(() => {
        driver = new InProcessFirebaseDriver()
    })

    test("onWrite handler is triggered on doc create", async () => {
        // Given we set up an onCreate handler on a collection;
        const receivedSnapshots: IFirebaseChange<
            IFirestoreDocumentSnapshot<IFirestoreDocumentData>
        >[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onWrite(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When a doc is created in that collection;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ colour: "orange", size: "large" })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].after?.exists).toBeTruthy()
        expect(receivedSnapshots[0].after?.ref.path).toEqual("animals/tiger")
        expect(receivedSnapshots[0].after?.data()).toEqual({
            colour: "orange",
            size: "large",
        })

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })
})
