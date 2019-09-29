import {
    DeletedChangeFilter,
    IChange,
    IParameterisedChange,
} from "../../../../src/driver/RealtimeDatabase/RealtimeDatabaseFilter"

describe("DeletedChangeFilter", () => {
    test.each([
        ["", {}, []],
        ["/foo", { after: {} }, []],
        ["/foo", { before: {} }, []],
        ["/foo", { before: {}, after: {} }, []],
        [
            "/foo",
            { before: { foo: "bar" }, after: {} },
            [
                {
                    parameters: {},
                    change: { before: "bar", after: undefined },
                },
            ],
        ],
        [
            "/foo",
            { before: { foo: "bar" }, after: { foo: undefined } },
            [
                {
                    parameters: {},
                    change: { before: "bar", after: undefined },
                },
            ],
        ],
        [
            "/foo",
            { before: { foo: "bar" }, after: { foo: null } },
            [
                {
                    parameters: {},
                    change: { before: "bar", after: undefined },
                },
            ],
        ],
        [
            "/foo/bar",
            { before: { foo: { bar: "baz" } }, after: { foo: {} } },
            [
                {
                    parameters: {},
                    change: { before: "baz", after: undefined },
                },
            ],
        ],
        [
            "/foo/bar",
            {
                before: { foo: { bar: "baz" } },
                after: { foo: { bar: undefined } },
            },
            [
                {
                    parameters: {},
                    change: { before: "baz", after: undefined },
                },
            ],
        ],
        [
            "/foo/bar",
            { before: { foo: { bar: "baz" } }, after: { foo: "hello" } },
            [
                {
                    parameters: {},
                    change: { before: "baz", after: undefined },
                },
            ],
        ],
        [
            "/foo/bar",
            { before: { foo: { bar: "baz" } }, after: {} },
            [
                {
                    parameters: {},
                    change: { before: "baz", after: undefined },
                },
            ],
        ],
        [
            "/{id}",
            { before: { foo: "bar" }, after: {} },
            [
                {
                    parameters: { id: "foo" },
                    change: { before: "bar", after: undefined },
                },
            ],
        ],
        [
            "/{id}",
            { before: { foo1: "bar", foo2: "yes" }, after: {} },
            [
                {
                    parameters: { id: "foo1" },
                    change: { before: "bar", after: undefined },
                },
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined },
                },
            ],
        ],
        [
            "/{id}",
            { before: { foo1: "bar", foo2: "yes" }, after: { foo1: "bar" } },
            [
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined },
                },
            ],
        ],
        [
            "/{id}",
            {
                before: { foo1: "bar", foo2: "yes" },
                after: { foo3: "bar", foo4: "bar" },
            },
            [
                {
                    parameters: { id: "foo1" },
                    change: { before: "bar", after: undefined },
                },
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined },
                },
            ],
        ],
        [
            "/things/{id}/{key}",
            {
                before: {
                    things: {
                        id123: { propA: "foo", propB: "bar" },
                        id456: { propA: "hello", propB: "goodbye" },
                    },
                },
                after: {
                    things: {
                        id456: { propA: "hello" },
                    },
                },
            },
            [
                {
                    parameters: { id: "id123", key: "propA" },
                    change: { before: "foo", after: undefined },
                },
                {
                    parameters: { id: "id123", key: "propB" },
                    change: { before: "bar", after: undefined },
                },
                {
                    parameters: { id: "id456", key: "propB" },
                    change: { before: "goodbye", after: undefined },
                },
            ],
        ],
        [
            "/animals/{animalName}/features/{featureName}",
            {
                before: {
                    animals: {
                        tiger: {
                            features: {
                                stripey: "very stripey",
                                swimming: "not swimming",
                            },
                        },
                        dolphin: {
                            features: {
                                stripey: "not stripey",
                                swimming: "much swimming",
                            },
                        },
                    },
                },
                after: {
                    animals: {
                        tiger: {
                            features: {
                                stripey: "very stripey",
                            },
                        },
                    },
                },
            },
            [
                {
                    parameters: {
                        animalName: "tiger",
                        featureName: "swimming",
                    },
                    change: {
                        before: "not swimming",
                        after: undefined,
                    },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "stripey",
                    },
                    change: {
                        before: "not stripey",
                        after: undefined,
                    },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: {
                        before: "much swimming",
                        after: undefined,
                    },
                },
            ],
        ],
    ] as Array<[string, IChange, IParameterisedChange[]]>)(
        "changeEvents cases",
        (
            observedPath: string,
            change: IChange,
            expectedChangeEvents: IParameterisedChange[],
        ) => {
            // Given a Deleted change filter for a path;
            const filter = new DeletedChangeFilter(observedPath)

            // When we observe for deleted events from a change;
            const createdChangeEvents = filter.changeEvents(change)

            // Then we should get the expected Deleted change events.
            expect(createdChangeEvents).toEqual(expectedChangeEvents)
        },
    )
})
