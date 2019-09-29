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

    test("onCreate handler is triggered on create", async () => {
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
})
