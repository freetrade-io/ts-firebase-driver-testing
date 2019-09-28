import {
    CreatedChangeFilter,
    IChange,
    IParameterisedChange,
} from "../../../../src/driver/RealtimeDatabase/RealtimeDatabaseFilter"

describe("CreatedChangeFilter", () => {
    test.each([
        ["", {}, []],
        ["/foo", { after: {} }, []],
        [
            "/foo",
            { after: { foo: "bar" } },
            [{ parameters: {}, change: { after: "bar" } }],
        ],
        [
            "/foo",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: {}, change: { after: { bar: "baz" } } }],
        ],
        [
            "/foo",
            { before: {}, after: { foo: { bar: "baz" } } },
            [{ parameters: {}, change: { after: { bar: "baz" } } }],
        ],
        [
            "/foo",
            {
                before: { hello: "yes" },
                after: { hello: "yes", foo: { bar: "baz" } },
            },
            [{ parameters: {}, change: { after: { bar: "baz" } } }],
        ],
        [
            "/foo/bar",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: {}, change: { after: "baz" } }],
        ],
    ] as Array<[string, IChange, IParameterisedChange[]]>)(
        "changeEvents cases",
        (
            observedPath: string,
            change: IChange,
            expectedChangeEvents: IParameterisedChange[],
        ) => {
            // Given a Created change filter for a path;
            const filter = new CreatedChangeFilter(observedPath)

            // When we observe for created events from a change;
            const createdChangeEvents = filter.changeEvents(change)

            // Then we should get the expected Created change events.
            expect(createdChangeEvents).toEqual(expectedChangeEvents)
        },
    )
})
