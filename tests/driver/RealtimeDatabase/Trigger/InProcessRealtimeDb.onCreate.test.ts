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
})
