import {
    InProcessFirebaseDriver,
    IRealtimeDatabaseChangeSnapshot,
} from "../../../../src"
import { IChangeContext } from "../../../../src/driver/ChangeObserver/DatabaseChangeObserver"

describe("onCreate trigger of in-process realtime database", () => {
    let driver: InProcessFirebaseDriver

    beforeEach(() => {
        driver = new InProcessFirebaseDriver()
    })

    test("onCreate handler is triggered on object create", async () => {
        // Given we set up an onCreate handler on a path;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is created;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists()).toBeTruthy()
        expect(receivedSnapshots[0].val()).toEqual("purr")

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })

    test("onCreate handler is triggered on field create", async () => {
        // Given a database object exists;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
            })

        // And we set up an onCreate handler on a path in that object;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is created directly inside the object;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger/sound")
            .set("purr")

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists()).toBeTruthy()
        expect(receivedSnapshots[0].val()).toEqual("purr")

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })

    test("onCreate handler not triggered without create", async () => {
        // Given we set up an onCreate handler on a path;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When some other path is created;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should not be triggered.
        expect(receivedSnapshots).toHaveLength(0)
        expect(receivedContexts).toHaveLength(0)
    })

    test("onCreate handler not triggered on update", async () => {
        // Given a database object exists;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And we set up an onCreate handler on that path;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is updated;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
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

    test("onCreate handler triggered on creation via update method", async () => {
        // Given we set up an onCreate handler on a path;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is created via an update call;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .update({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists()).toBeTruthy()
        expect(receivedSnapshots[0].val()).toEqual("purr")

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })

    test("onCreate handler triggered on single-field creation via update method", async () => {
        // Given a database object exists;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
            })

        // And we set up an onCreate handler on a path within that object;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is created via an update call;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .update({
                sound: "purr",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists()).toBeTruthy()
        expect(receivedSnapshots[0].val()).toEqual("purr")

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })

    test("onCreate trigger with multiple path parameters", async () => {
        // Given we set up an onCreate handler with multiple path parameters;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/{featureName}")
            .onCreate(async (snapshot, context) => {
                receivedSnapshots.push(snapshot)
                receivedContexts.push(context)
            })

        // When that path is created;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedSnapshots).toHaveLength(1)
        expect(receivedSnapshots[0]).toBeTruthy()
        expect(receivedSnapshots[0].exists()).toBeTruthy()
        expect(receivedSnapshots[0].val()).toEqual("orange")

        expect(receivedContexts).toHaveLength(1)
        expect(receivedContexts[0]).toBeTruthy()
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "tiger", featureName: "colour" },
            timestamp: expect.any(String),
        })
    })

    test("multiple onCreate triggers", async () => {
        // Given we set up an onCreate handler on a path;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedSnapshots.push(change)
                receivedContexts.push(context)
            })

        // When multiple such paths are created;
        await driver
            .realTimeDatabase()
            .ref("/animals")
            .set({
                cat: {
                    likes: "mice",
                    sound: "meow",
                },
                dog: {
                    likes: "sticks",
                    sound: "woof",
                },
                pig: {
                    likes: "everything",
                    sound: "oink",
                },
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the changes and contexts.
        expect(receivedSnapshots).toHaveLength(3)
        expect(receivedSnapshots[0].val()).toEqual("meow")
        expect(receivedSnapshots[1].val()).toEqual("woof")
        expect(receivedSnapshots[2].val()).toEqual("oink")

        expect(receivedContexts).toHaveLength(3)
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "cat" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[1]).toEqual({
            params: { animalName: "dog" },
            timestamp: expect.any(String),
        })
        expect(receivedContexts[2]).toEqual({
            params: { animalName: "pig" },
            timestamp: expect.any(String),
        })
    })

    test("multiple onCreate triggers with multiple path parameters", async () => {
        // Given we set up an onCreate handler with multiple path parameters;
        const receivedSnapshots: IRealtimeDatabaseChangeSnapshot[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/{featureName}")
            .onCreate(async (change, context) => {
                receivedSnapshots.push(change)
                receivedContexts.push(context)
            })

        // When multiple such paths are created;
        await driver
            .realTimeDatabase()
            .ref("/animals")
            .set({
                cat: {
                    likes: "mice",
                    sound: "meow",
                },
                dog: {
                    likes: "sticks",
                    sound: "woof",
                },
                pig: {
                    likes: "everything",
                    sound: "oink",
                },
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the changes and contexts.
        expect(receivedSnapshots).toHaveLength(6)
        expect(receivedSnapshots[0].val()).toEqual("mice")
        expect(receivedSnapshots[1].val()).toEqual("meow")
        expect(receivedSnapshots[2].val()).toEqual("sticks")
        expect(receivedSnapshots[3].val()).toEqual("woof")
        expect(receivedSnapshots[4].val()).toEqual("everything")
        expect(receivedSnapshots[5].val()).toEqual("oink")

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
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                await driver
                    .realTimeDatabase()
                    .ref(`/animal_sounds/${context.params.animalName}`)
                    .set(change.val())
            })

        // And there is also an onCreate handler for that other path, which
        // writes to a third path.
        driver
            .runWith()
            .database.ref("/animal_sounds/{animalName}")
            .onCreate(async (change, context) => {
                await driver
                    .realTimeDatabase()
                    .ref(`/sound_to_animal/${change.val()}`)
                    .set(context.params.animalName)
            })

        // When we write to the first path;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then all the cascading writes should be made.
        const firstWrite = (
            await driver
                .realTimeDatabase()
                .ref("animals/tiger/sound")
                .once("value")
        ).val()
        expect(firstWrite).toEqual("purr")

        const secondWrite = (
            await driver
                .realTimeDatabase()
                .ref("/animal_sounds/tiger")
                .once("value")
        ).val()
        expect(secondWrite).toEqual("purr")

        const thirdWrite = (
            await driver
                .realTimeDatabase()
                .ref("/sound_to_animal/purr")
                .once("value")
        ).val()
        expect(thirdWrite).toEqual("tiger")
    })
})
