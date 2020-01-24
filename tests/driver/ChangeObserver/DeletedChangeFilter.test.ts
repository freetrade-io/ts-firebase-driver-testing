import {
    DeletedChangeFilter,
    IChange,
    IParameterisedChange,
} from "../../../src/driver/ChangeObserver/DatabaseChangeFilter"

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
                    path: "foo",
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
                    path: "foo",
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
                    path: "foo",
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
                    path: "foo/bar",
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
                    path: "foo/bar",
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
                    path: "foo/bar",
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
                    path: "foo/bar",
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
                    path: "foo",
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
                    path: "foo1",
                },
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined },
                    path: "foo2",
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
                    path: "foo2",
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
                    path: "foo1",
                },
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined },
                    path: "foo2",
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
                    path: "things/id123/propA",
                },
                {
                    parameters: { id: "id123", key: "propB" },
                    change: { before: "bar", after: undefined },
                    path: "things/id123/propB",
                },
                {
                    parameters: { id: "id456", key: "propB" },
                    change: { before: "goodbye", after: undefined },
                    path: "things/id456/propB",
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
                    path: "animals/tiger/features/swimming",
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
                    path: "animals/dolphin/features/stripey",
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
                    path: "animals/dolphin/features/swimming",
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
