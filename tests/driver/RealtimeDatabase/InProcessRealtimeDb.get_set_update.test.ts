import { InProcessRealtimeDatabase } from "../../../src"

describe("InProcessRealtimeDatabaseRef get set", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test.each([
        [{}, "foobar", null],
        [{ foobar: "hello" }, "foobar", "hello"],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/tiger/description",
            "stripey",
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/tiger",
            { description: "stripey" },
        ],
    ] as Array<[object, string, any]>)(
        "get value",
        async (dataset: object, path: string, expectedValue: any) => {
            // Given an in-process Firebase realtime database with a dataset;
            database.reset(dataset)

            // When we get a ref to a path;
            const ref = await database.ref(path).once("value")

            // Then it should have the right value.
            expect(ref.val()).toEqual(expectedValue)
        },
    )

    test.each([
        [{}, "foobar", "hello", { foobar: "hello" }],
        [{ foobar: "hello" }, "foobar", "goodbye", { foobar: "goodbye" }],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/tiger/description",
            "orange and stripey",
            { animals: { tiger: { description: "orange and stripey" } } },
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/zebra/description",
            "stripey horse",
            {
                animals: {
                    tiger: { description: "stripey" },
                    zebra: { description: "stripey horse" },
                },
            },
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/elephant",
            { description: "big with tusks" },
            {
                animals: {
                    tiger: { description: "stripey" },
                    elephant: { description: "big with tusks" },
                },
            },
        ],
    ] as Array<[object, string, any, object]>)(
        "set value",
        async (
            dataset: object,
            path: string,
            setValue: any,
            expectedDataset: object,
        ) => {
            // Given an in-process Firebase realtime database with a dataset;
            database.reset(dataset)

            // When we set the value of a path;
            await database.ref(path).set(setValue)

            // Then the dataset should be as expected.
            expect((await database.ref("").once("value")).val()).toEqual(
                expectedDataset,
            )
        },
    )

    test("cannot set undefined", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({})

        // When we set the value to undefined;
        // Then the function should throw.
        await expect(database.ref("animals").set(undefined)).rejects.toThrow()
    })

    test("cannot set an object with undefined", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({})

        // When we set the value to an object with undefined;
        // Then the function should throw.
        await expect(
            database.ref("animals").set({ name: "Bertie", age: undefined }),
        ).rejects.toThrow()
    })

    test("cannot set an array with undefined", async () => {
        // Given an in-process Firebase realtime database with a dataset;
        database.reset({})

        // When we set the value to undefined;
        // Then the function should throw.
        await expect(
            database.ref("animals").set({ name: [undefined] }),
        ).rejects.toThrow()
    })

    test.each([
        [{}, "foobar", "hello", { foobar: "hello" }],
        [{ foobar: "hello" }, "foobar", "goodbye", { foobar: "goodbye" }],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/tiger/description",
            "orange and stripey",
            { animals: { tiger: { description: "orange and stripey" } } },
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/zebra/description",
            "stripey horse",
            {
                animals: {
                    tiger: { description: "stripey" },
                    zebra: { description: "stripey horse" },
                },
            },
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/elephant",
            { description: "big with tusks" },
            {
                animals: {
                    tiger: { description: "stripey" },
                    elephant: { description: "big with tusks" },
                },
            },
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals",
            { parrot: { description: "chirpy" } },
            {
                animals: {
                    tiger: { description: "stripey" },
                    parrot: { description: "chirpy" },
                },
            },
        ],
        [
            { animals: { tiger: { description: "stripey" } } },
            "animals/tiger",
            { likes: "chasing things" },
            {
                animals: {
                    tiger: { description: "stripey", likes: "chasing things" },
                },
            },
        ],
        [
            {
                animals: {
                    tiger: { description: "stripey", colour: "orange" },
                },
            },
            "animals/tiger",
            { description: null },
            {
                animals: {
                    tiger: { description: null, colour: "orange" },
                },
            },
        ],
    ] as Array<[object, string, any, object]>)(
        "update value",
        async (
            dataset: object,
            path: string,
            updateValue: any,
            expectedDataset: object,
        ) => {
            // Given an in-process Firebase realtime database with a dataset;
            database.reset(dataset)

            // When we update the value of a path;
            await database.ref(path).update(updateValue)

            // Then the dataset should be as expected.
            expect((await database.ref("").once("value")).val()).toEqual(
                expectedDataset,
            )
        },
    )
})
