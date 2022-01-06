import { IFirebaseDriver, IFirestoreDocumentSnapshot, InProcessFirebaseDriver } from "../../../../src"

describe("onDelete trigger of in-process Firestore", () => {
    let driver: InProcessFirebaseDriver & IFirebaseDriver

    beforeEach(() => {
        driver = new InProcessFirebaseDriver()
    })

    test("onDelete handler is not triggered on doc create", async () => {
        // Given we set up an onDelete handler on a collection;
        const receivedSnapshots: IFirestoreDocumentSnapshot[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onDelete(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
            })

        // When a doc is created in that collection;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({
                colour: "orange", size: "large",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should not be triggered.
        expect(receivedSnapshots).toHaveLength(0)
    })

    test("onDelete handler is triggered on doc delete", async () => {
        // Given we set up an onDelete handler on a collection;
        const receivedSnapshots: IFirestoreDocumentSnapshot[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onDelete(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
            })

        // When a doc is created in that collection;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ colour: "orange", size: "large" })

        // And then deleted
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .delete()

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0].exists).toBeFalsy()
    })

    test("onDelete handler is not triggered when a doc is updated", async () => {
        // Given we set up an onDelete handler on a collection;
        const receivedSnapshots: IFirestoreDocumentSnapshot[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onDelete(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
            })

        // When a doc is created in that collection;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ colour: "orange", size: "large" })

        // And then updated
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .update({ colour: "red" })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should not be triggered.
        expect(receivedSnapshots).toHaveLength(0)
    })


})
