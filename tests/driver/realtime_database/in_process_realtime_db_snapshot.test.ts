import { InProcessRealtimeDatabase } from "../../../src/driver/in_process_firebase_driver"

describe("InProcessFirebaseRealtimeDatabaseSnapshot", () => {
    const database = new InProcessRealtimeDatabase()

    beforeEach(() => {
        database.reset()
    })

    test.each([
        [{}, "foobar", false],
        [{ foobar: undefined }, "foobar", false],
        [{ foobar: null }, "foobar", false],
        [{ foobar: false }, "foobar", true],
        [{ foobar: true }, "foobar", true],
        [{ foobar: "" }, "foobar", true],
        [{ foobar: "hello" }, "foobar", true],
        [{ foobar: {} }, "foobar", false],
        [{ foo: { bar: "hello" } }, "foo/bar", true],
        [{ foo: { bar: undefined } }, "foo/bar", false],
        [{ foo: { bar: null } }, "foo/bar", false],
        [{ foo: { bar: true } }, "foo/bar", true],
        [{ foo: { bar: false } }, "foo/bar", true],
        [{ foo: { bar: "" } }, "foo/bar", true],
        [{ foo: { bar: "hello" } }, "foo/bar/baz", false],
    ] as Array<[object, string, boolean]>)(
        "exists",
        async (dataset: object, path: string, expectExists: boolean) => {
            // Given an in-process Firebase realtime database with a dataset;
            database.reset(dataset)

            // When we get a snapshot of a path;
            const snapshot = await database.ref(path).once("value")

            // Then we should be able to see if it exists.
            expect(snapshot.exists()).toBe(expectExists)
        },
    )

    test.each([
        [{}, "foobar", undefined],
        [{ foobar: undefined }, "foobar", undefined],
        [{ foobar: null }, "foobar", null],
        [{ foobar: false }, "foobar", false],
        [{ foobar: true }, "foobar", true],
        [{ foobar: "" }, "foobar", ""],
        [{ foobar: "hello" }, "foobar", "hello"],
        [{ foobar: {} }, "foobar", {}],
        [{ foo: { bar: "hello" } }, "foo/bar", "hello"],
        [{ foo: { bar: undefined } }, "foo/bar", undefined],
        [{ foo: { bar: null } }, "foo/bar", null],
        [{ foo: { bar: true } }, "foo/bar", true],
        [{ foo: { bar: false } }, "foo/bar", false],
        [{ foo: { bar: "" } }, "foo/bar", ""],
        [{ foo: { bar: "hello" } }, "foo/bar/baz", undefined],
        [{ foo: { bar: "hello" } }, "foo", { bar: "hello" }],
    ] as Array<[object, string, any]>)(
        "val",
        async (dataset: object, path: string, expectedVal: any) => {
            // Given an in-process Firebase realtime database with a dataset;
            database.reset(dataset)

            // When we get a snapshot of a path;
            const snapshot = await database.ref(path).once("value")

            // Then we should get the correct value.
            expect(snapshot.val()).toEqual(expectedVal)
        },
    )
})
