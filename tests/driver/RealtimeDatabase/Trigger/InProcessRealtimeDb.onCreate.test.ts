import {
    IChangeContext,
    IChangeSnapshots,
    InProcessFirebaseDriver,
} from "../../../../src"

describe("onCreate trigger of in-process realtime database", () => {
    let driver: InProcessFirebaseDriver

    beforeEach(() => {
        driver = new InProcessFirebaseDriver()
    })

    test("onCreate handler is triggered on object create", async () => {
        // Given we set up an onCreate handler on a path;
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
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
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeFalsy()
        expect(receivedChange!.before.val()).toBeUndefined()
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual("purr")

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger" },
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
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
            })

        // When that path is created directly inside the object;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger/sound")
            .set("purr")

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeFalsy()
        expect(receivedChange!.before.val()).toBeUndefined()
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual("purr")

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger" },
        })
    })

    test("onCreate handler not triggered without create", async () => {
        // Given we set up an onCreate handler on a path;
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
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
        expect(receivedChange).toBeUndefined()
        expect(receivedContext).toBeUndefined()
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
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
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
        expect(receivedChange).toBeUndefined()
        expect(receivedContext).toBeUndefined()
    })

    test("onCreate handler triggered on creation via update method", async () => {
        // Given we set up an onCreate handler on a path;
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
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
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeFalsy()
        expect(receivedChange!.before.val()).toBeUndefined()
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual("purr")

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger" },
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
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
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
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeFalsy()
        expect(receivedChange!.before.val()).toBeUndefined()
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual("purr")

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger" },
        })
    })

    test("onCreate trigger with multiple path parameters", async () => {
        // Given we set up an onCreate handler with multiple path parameters;
        let receivedChange: IChangeSnapshots | undefined
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/{featureName}")
            .onCreate(async (change, context) => {
                receivedChange = change
                receivedContext = context
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
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeFalsy()
        expect(receivedChange!.before.val()).toBeUndefined()
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual("orange")

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger", featureName: "colour" },
        })
    })

    test("multiple onCreate triggers", async () => {
        // Given we set up an onCreate handler on a path;
        const receivedChanges: IChangeSnapshots[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onCreate(async (change, context) => {
                receivedChanges.push(change)
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
        expect(receivedChanges).toHaveLength(3)
        expect(receivedChanges[0].before.val()).toBeUndefined()
        expect(receivedChanges[0].after.val()).toEqual("meow")
        expect(receivedChanges[1].before.val()).toBeUndefined()
        expect(receivedChanges[1].after.val()).toEqual("woof")
        expect(receivedChanges[2].before.val()).toBeUndefined()
        expect(receivedChanges[2].after.val()).toEqual("oink")

        expect(receivedContexts).toHaveLength(3)
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "cat" },
        })
        expect(receivedContexts[1]).toEqual({
            params: { animalName: "dog" },
        })
        expect(receivedContexts[2]).toEqual({
            params: { animalName: "pig" },
        })
    })

    test("multiple onCreate triggers with multiple path parameters", async () => {
        // Given we set up an onCreate handler with multiple path parameters;
        const receivedChanges: IChangeSnapshots[] = []
        const receivedContexts: IChangeContext[] = []
        driver
            .runWith()
            .database.ref("/animals/{animalName}/{featureName}")
            .onCreate(async (change, context) => {
                receivedChanges.push(change)
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
        expect(receivedChanges).toHaveLength(6)
        expect(receivedChanges[0].after.val()).toEqual("mice")
        expect(receivedChanges[1].after.val()).toEqual("meow")
        expect(receivedChanges[2].after.val()).toEqual("sticks")
        expect(receivedChanges[3].after.val()).toEqual("woof")
        expect(receivedChanges[4].after.val()).toEqual("everything")
        expect(receivedChanges[5].after.val()).toEqual("oink")

        expect(receivedContexts).toHaveLength(6)
        expect(receivedContexts[0]).toEqual({
            params: { animalName: "cat", featureName: "likes" },
        })
        expect(receivedContexts[1]).toEqual({
            params: { animalName: "cat", featureName: "sound" },
        })
        expect(receivedContexts[2]).toEqual({
            params: { animalName: "dog", featureName: "likes" },
        })
        expect(receivedContexts[3]).toEqual({
            params: { animalName: "dog", featureName: "sound" },
        })
        expect(receivedContexts[4]).toEqual({
            params: { animalName: "pig", featureName: "likes" },
        })
        expect(receivedContexts[5]).toEqual({
            params: { animalName: "pig", featureName: "sound" },
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
                    .set(change.after.val())
            })

        // And there is also an onCreate handler for that other path, which
        // writes to a third path.
        driver
            .runWith()
            .database.ref("/animal_sounds/{animalName}")
            .onCreate(async (change, context) => {
                await driver
                    .realTimeDatabase()
                    .ref(`/sound_to_animal/${change.after.val()}`)
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
        const firstWrite = (await driver
            .realTimeDatabase()
            .ref("animals/tiger/sound")
            .once()).val()
        expect(firstWrite).toEqual("purr")

        const secondWrite = (await driver
            .realTimeDatabase()
            .ref("/animal_sounds/tiger")
            .once()).val()
        expect(secondWrite).toEqual("purr")

        const thirdWrite = (await driver
            .realTimeDatabase()
            .ref("/sound_to_animal/purr")
            .once()).val()
        expect(thirdWrite).toEqual("tiger")
    })
})
