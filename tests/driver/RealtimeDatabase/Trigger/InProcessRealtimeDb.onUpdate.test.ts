import { InProcessFirebaseDriver } from "../../../../src"
import { IChangeContext } from "../../../../src/driver/ChangeObserver/DatabaseChangeObserver"

describe("onUpdate trigger of in-process realtime database", () => {
    let driver: InProcessFirebaseDriver

    beforeEach(() => {
        driver = new InProcessFirebaseDriver()
    })

    test("onUpdate handler is triggered on field update", async () => {
        // Given we have data at a path;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And we set up an onUpdate handler on that path;
        let receivedChange: any
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onUpdate(async (change, context) => {
                receivedChange = change
                receivedContext = context
            })

        // When the path is updated;
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

        // Then the handler should be triggered with the change and context.
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeTruthy()
        expect(receivedChange!.before.val()).toEqual("purr")
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual("meow")

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })

    test("onUpdate handler is triggered on object update", async () => {
        // Given we have an object at a path;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And we set up an onUpdate handler on that path;
        let receivedChange: any
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}")
            .onUpdate(async (change, context) => {
                receivedChange = change
                receivedContext = context
            })

        // When the object is updated;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .update({
                colour: "orange",
                size: "large",
                sound: "meow",
            })

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should be triggered with the change and context.
        expect(receivedChange!).toBeTruthy()
        expect(receivedChange!.before.exists()).toBeTruthy()
        expect(receivedChange!.before.val()).toEqual({
            colour: "orange",
            size: "large",
            sound: "purr",
        })
        expect(receivedChange!.after.exists()).toBeTruthy()
        expect(receivedChange!.after.val()).toEqual({
            colour: "orange",
            size: "large",
            sound: "meow",
        })

        expect(receivedContext!).toBeTruthy()
        expect(receivedContext!).toEqual({
            params: { animalName: "tiger" },
            timestamp: expect.any(String),
        })
    })

    test("onUpdate handler is not triggered on no change", async () => {
        // Given we have an object at a path;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And we set up an onUpdate handler on that path;
        let receivedChange: any
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}")
            .onUpdate(async (change, context) => {
                receivedChange = change
                receivedContext = context
            })

        // When an update is made that does not change the object;
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

        // Then the handler should not be triggered.
        expect(receivedChange!).toBeFalsy()
        expect(receivedContext!).toBeFalsy()
    })

    test("onUpdate handler is not triggered on create", async () => {
        // Given we set up an onUpdate handler on a path;
        let receivedChange: any
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onUpdate(async (change, context) => {
                receivedChange = change
                receivedContext = context
            })

        // When the path is created;
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
        expect(receivedChange!).toBeFalsy()
        expect(receivedContext!).toBeFalsy()
    })

    test("onUpdate handler is not triggered on delete", async () => {
        // Given we have an object at a path;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })

        // And we set up an onUpdate handler on that path;
        let receivedChange: any
        let receivedContext: IChangeContext | undefined
        driver
            .runWith()
            .database.ref("/animals/{animalName}")
            .onUpdate(async (change, context) => {
                receivedChange = change
                receivedContext = context
            })

        // When that object is deleted;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .remove()

        // And Firebase finishes its jobs;
        await driver.jobsComplete()

        // Then the handler should not be triggered.
        expect(receivedChange!).toBeFalsy()
        expect(receivedContext!).toBeFalsy()
    })

    test("cascading onUpdate triggering", async () => {
        // Given we have data at some paths;
        await driver
            .realTimeDatabase()
            .ref("/animals/tiger")
            .set({
                colour: "orange",
                size: "large",
                sound: "purr",
            })
        await driver
            .realTimeDatabase()
            .ref(`/animal_sounds/tiger`)
            .set("purr")

        // And we set up an onUpdate handler on the first path, that writes to
        // the second path.
        driver
            .runWith()
            .database.ref("/animals/{animalName}/sound")
            .onUpdate(async (change, context) => {
                await driver
                    .realTimeDatabase()
                    .ref(`/animal_sounds/${context.params.animalName}`)
                    .set(change.after!.val())
            })

        // And there is also an onUpdate handler for the second path, which
        // writes to the third path.
        driver
            .runWith()
            .database.ref("/animal_sounds/{animalName}")
            .onUpdate(async (change, context) => {
                await driver
                    .realTimeDatabase()
                    .ref(`/sound_to_animal/${change.after!.val()}`)
                    .set(context.params.animalName)
            })

        // When we update the first path;
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

        // Then all the cascading writes should be made.
        const firstWrite = (
            await driver
                .realTimeDatabase()
                .ref("animals/tiger/sound")
                .once("value")
        ).val()
        expect(firstWrite).toEqual("meow")

        const secondWrite = (
            await driver
                .realTimeDatabase()
                .ref("/animal_sounds/tiger")
                .once("value")
        ).val()
        expect(secondWrite).toEqual("meow")

        const thirdWrite = (
            await driver
                .realTimeDatabase()
                .ref("/sound_to_animal/meow")
                .once("value")
        ).val()
        expect(thirdWrite).toEqual("tiger")
    })
})
