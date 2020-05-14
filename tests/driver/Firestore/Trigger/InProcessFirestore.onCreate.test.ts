import {
    IFirebaseDriver,
    InProcessFirebaseDriver,
    InProcessFirestoreDocRef,
    InProcessFirestoreDocumentSnapshot,
} from "../../../../src"
import { IChangeContext } from "../../../../src/driver/ChangeObserver/DatabaseChangeObserver"
import { IFirestoreChangeSnapshot } from "../../../../src/driver/Firestore/FirestoreChangeObserver"

describe("onCreate trigger of in-process Firestore", () => {
    let driver: InProcessFirebaseDriver & IFirebaseDriver

    beforeEach(() => {
        driver = new InProcessFirebaseDriver()
    })

    test("onCreate handler is triggered on doc create", async () => {
        // Given we set up an onCreate handler on a collection;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onCreate(async (snapshot, context) => {
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
        expect(receivedSnapshots[0].exists).toBeTruthy()
        expect(receivedSnapshots[0].data()).toEqual({
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

    test("onCreate handler is triggered on sub-collection doc create", async () => {
        // Given a database doc exists in a collection;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ colour: "orange", size: "large" })

        // And we set up an onCreate handler on a sub-collection in that doc;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}/hobbies/{hobbyName}")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When a doc in that sub-collection is created;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .collection("hobbies")
            .doc("skiing")
            .set({ skillLevel: "mediocre" })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists).toBeTruthy()
        expect(receivedSnapshots[0].data()).toEqual({ skillLevel: "mediocre" })

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger", hobbyName: "skiing" },
            timestamp: expect.any(String),
        })
    })

    test("onCreate handler not triggered without create", async () => {
        // Given we set up an onCreate handler on a doc;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When some other path is created;
        await driver
            .firestore()
            .collection("plants")
            .doc("venusFlyTrap")
            .set({ colour: "green", bites: true })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should not be triggered.
        expect(receivedSnapshots).toHaveLength(0)
        expect(receivedContexts).toHaveLength(0)
    })

    test("onCreate handler not triggered on update", async () => {
        // Given a database doc exists;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ colour: "orange", size: "large" })

        // And we set up an onCreate handler on that path;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is updated;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "meow",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should not be triggered.
        expect(receivedSnapshots).toHaveLength(0)
        expect(receivedContexts).toHaveLength(0)
    })

    test("onCreate trigger with multiple path parameters", async () => {
        // Given we set up an onCreate handler with multiple path parameters;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}/features/{featureName}")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is created;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .collection("features")
            .doc("colour")
            .set({ value: "orange" })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists).toBeTruthy()
        expect(receivedSnapshots[0].data()).toEqual({ value: "orange" })

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger", featureName: "colour" },
            timestamp: expect.any(String),
        })
    })

    test("multiple onCreate triggers", async () => {
        // Given we set up an onCreate handler on a path;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onCreate(async (change, context) => {
                receivedSnapshots.push(change)
                receivedContexts.push(context)
            })

        // When multiple such paths are created;
        const animalsCollection = driver.firestore().collection("animals")
        await Promise.all([
            animalsCollection.doc("tiger").set({ colour: "orange" }),
            animalsCollection.doc("bear").set({ colour: "brown" }),
            animalsCollection.doc("zebra").set({ colour: "stripey" }),
        ])

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the changes and contexts.
        expect(receivedSnapshots).toHaveLength(3)
        expect(receivedSnapshots[0].data()).toEqual({ colour: "orange" })
        expect(receivedSnapshots[1].data()).toEqual({ colour: "brown" })
        expect(receivedSnapshots[2].data()).toEqual({ colour: "stripey" })

        expect(receivedContexts).toHaveLength(3)
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[1]).toEqual({
            params: { animalName: "bear" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[2]).toEqual({
            params: { animalName: "zebra" },
            timestamp: expect.any(String),
        })
    })

    test("multiple onCreate triggers with multiple path parameters", async () => {
        // Given we set up an onCreate handler with multiple path parameters;
        const receivedSnapshots: IFirestoreChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}/features/{featureName}")
            .onCreate(async (change, context) => {
                receivedSnapshots.push(change)
                receivedContexts.push(context)
            })

        // When multiple such paths are created;
        const animals = driver.firestore().collection("animals")
        await Promise.all([
            animals
                .doc("cat")
                .collection("features")
                .doc("likes")
                .set({ value: "mice" }),
            animals
                .doc("cat")
                .collection("features")
                .doc("sound")
                .set({ value: "meow" }),
            animals
                .doc("dog")
                .collection("features")
                .doc("likes")
                .set({ value: "sticks" }),
            animals
                .doc("dog")
                .collection("features")
                .doc("sound")
                .set({ value: "woof" }),
            animals
                .doc("pig")
                .collection("features")
                .doc("likes")
                .set({ value: "everything" }),
            animals
                .doc("pig")
                .collection("features")
                .doc("sound")
                .set({ value: "oink" }),
        ])

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the changes and contexts.
        expect(receivedSnapshots).toHaveLength(6)
        expect(receivedSnapshots[0].data()).toEqual({ value: "mice" })
        expect(receivedSnapshots[1].data()).toEqual({ value: "meow" })
        expect(receivedSnapshots[2].data()).toEqual({ value: "sticks" })
        expect(receivedSnapshots[3].data()).toEqual({ value: "woof" })
        expect(receivedSnapshots[4].data()).toEqual({ value: "everything" })
        expect(receivedSnapshots[5].data()).toEqual({ value: "oink" })

        expect(receivedContexts).toHaveLength(6)
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "cat", featureName: "likes" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[1]).toEqual({
            params: { animalName: "cat", featureName: "sound" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[2]).toEqual({
            params: { animalName: "dog", featureName: "likes" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[3]).toEqual({
            params: { animalName: "dog", featureName: "sound" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[4]).toEqual({
            params: { animalName: "pig", featureName: "likes" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[5]).toEqual({
            params: { animalName: "pig", featureName: "sound" },
            timestamp: expect.any(String),
        })
    })

    test("cascading onCreate triggering", async () => {
        // Given we set up an onCreate handler on a path, that writes to another
        // path.
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onCreate(async (change, context) => {
                await driver
                    .firestore()
                    .collection("animalSounds")
                    .doc(context.params.animalName)
                    .set({ value: (change.data() || { sound: "" }).sound })
            })

        // And there is also an onCreate handler for that other path, which
        // writes to a third path.
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animalSounds/{animalName}")
            .onCreate(async (change, context) => {
                await driver
                    .firestore()
                    .collection("soundToAnimal")
                    .doc((change.data() || { value: "" }).value)
                    .set({ value: context.params.animalName })
            })

        // When we write to the first path;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ sound: "meow" })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then all the cascading writes should be made.
        const firstWrite = (
            await driver
                .firestore()
                .collection("animals")
                .doc("tiger")
                .get()
        ).data()
        expect(firstWrite).toEqual({ sound: "meow" })

        const secondWrite = (
            await driver
                .firestore()
                .collection("animalSounds")
                .doc("tiger")
                .get()
        ).data()
        expect(secondWrite).toEqual({ value: "meow" })

        const thirdWrite = (
            await driver
                .firestore()
                .collection("soundToAnimal")
                .doc("meow")
                .get()
        ).data()
        expect(thirdWrite).toEqual({ value: "tiger" })
    })

    test("onCreate handler receives document snapshot", async () => {
        // Given we set up an onCreate handler on a collection;
        const receivedSnapshots: InProcessFirestoreDocumentSnapshot[] = []
        driver
            .runWith()
            .region("europe-west1")
            .firestore.document("/animals/{animalName}")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(
                    (snapshot as unknown) as InProcessFirestoreDocumentSnapshot,
                )
            })

        // When a doc is created in that collection;
        await driver
            .firestore()
            .collection("animals")
            .doc("tiger")
            .set({ colour: "orange", size: "large" })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with a document snapshot.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0]).toBeInstanceOf(
            InProcessFirestoreDocumentSnapshot,
        )
        expect(receivedSnapshots[0].exists).toBeTruthy()
        expect(receivedSnapshots[0].ref).toBeTruthy()
        expect(receivedSnapshots[0].ref).toBeInstanceOf(
            InProcessFirestoreDocRef,
        )
        expect(receivedSnapshots[0].ref.path).toEqual("animals/tiger")
        expect(receivedSnapshots[0].data()).toEqual({
            colour: "orange",
            size: "large",
        })
    })
})
