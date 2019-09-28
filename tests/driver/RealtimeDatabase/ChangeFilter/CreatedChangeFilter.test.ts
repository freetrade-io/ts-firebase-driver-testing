import {
    CreatedChangeFilter,
    IChange,
} from "../../../../src/driver/RealtimeDatabase/RealtimeDatabaseFilter"

describe("CreatedChangeFilter", () => {
    test.each([
        // ["", {}, []],
        // ["/foo", { after: {} }, []],
        ["/foo", { after: { foo: "bar" } }, [{ after: "bar" }]],
    ] as Array<[string, IChange, IChange[]]>)(
        "changeEvents cases",
        (
            observedPath: string,
            change: IChange,
            expectedChangeEvents: IChange[],
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
