import {
    IChange,
    IParameterisedChange,
    WrittenChangeFilter,
} from "../../../src/driver/ChangeObserver/DatabaseChangeFilter"

describe("WrittenChangeFilter", () => {
    test.each([
        ["", {}, []],
        ["/foo", { after: {} }, []],
        [
            "/foo",
            { after: { foo: "bar" } },
            [
                {
                    parameters: {},
                    change: { after: "bar", delta: "bar" },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { after: { bar: "baz" }, delta: { bar: "baz" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo",
            { before: {}, after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { after: { bar: "baz" }, delta: { bar: "baz" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo",
            {
                before: { hello: "yes" },
                after: { hello: "yes", foo: { bar: "baz" } },
            },
            [
                {
                    parameters: {},
                    change: { after: { bar: "baz" }, delta: { bar: "baz" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo/bar",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo" },
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/{id}/{key}",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo", key: "bar" },
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo" },
                    change: { after: "baz", delta: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        [
            "/foo",
            { before: { foo: "bar" }, after: {} },
            [
                {
                    parameters: {},
                    change: { before: "bar", after: undefined, data: "bar" },
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
                    change: { before: "bar", after: undefined, data: "bar" },
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
                    change: { before: "bar", after: undefined, data: "bar" },
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
                    change: { before: "baz", after: undefined, data: "baz" },
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
                    change: { before: "baz", after: undefined, data: "baz" },
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
                    change: { before: "baz", after: undefined, data: "baz" },
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
                    change: { before: "baz", after: undefined, data: "baz" },
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
                    change: { before: "bar", after: undefined, data: "bar" },
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
                    change: { before: "bar", after: undefined, data: "bar" },
                    path: "foo1",
                },
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined, data: "yes" },
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
                    change: { before: "yes", after: undefined, data: "yes" },
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
                    parameters: { id: "foo3" },
                    change: { before: undefined, after: "bar", delta: "bar" },
                    path: "foo3",
                },
                {
                    parameters: { id: "foo4" },
                    change: { before: undefined, after: "bar", delta: "bar" },
                    path: "foo4",
                },
                {
                    parameters: { id: "foo1" },
                    change: { before: "bar", after: undefined, data: "bar" },
                    path: "foo1",
                },
                {
                    parameters: { id: "foo2" },
                    change: { before: "yes", after: undefined, data: "yes" },
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
                    change: { before: "foo", after: undefined, data: "foo" },
                    path: "things/id123/propA",
                },
                {
                    parameters: { id: "id123", key: "propB" },
                    change: { before: "bar", after: undefined, data: "bar" },
                    path: "things/id123/propB",
                },
                {
                    parameters: { id: "id456", key: "propB" },
                    change: {
                        before: "goodbye",
                        after: undefined,
                        data: "goodbye",
                    },
                    path: "things/id456/propB",
                },
            ],
        ],
        [
            "/animals/{animalName}/features/{featureName}",
            {
                before: {
                    animals: {},
                },
                after: {
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
            },
            [
                {
                    parameters: { animalName: "tiger", featureName: "stripey" },
                    change: {
                        before: undefined,
                        after: "very stripey",
                        delta: "very stripey",
                    },
                    path: "animals/tiger/features/stripey",
                },
                {
                    parameters: {
                        animalName: "tiger",
                        featureName: "swimming",
                    },
                    change: {
                        before: undefined,
                        after: "not swimming",
                        delta: "not swimming",
                    },
                    path: "animals/tiger/features/swimming",
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "stripey",
                    },
                    change: {
                        before: undefined,
                        after: "not stripey",
                        delta: "not stripey",
                    },
                    path: "animals/dolphin/features/stripey",
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: {
                        before: undefined,
                        after: "much swimming",
                        delta: "much swimming",
                    },
                    path: "animals/dolphin/features/swimming",
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
                        data: "not swimming",
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
                        data: "not stripey",
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
                        data: "much swimming",
                    },
                    path: "animals/dolphin/features/swimming",
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
                                stripey: "mistakenly stripey",
                                swimming: "mistakenly not swimming",
                            },
                        },
                    },
                },
                after: {
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
            },
            [
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "stripey",
                    },
                    change: {
                        before: "mistakenly stripey",
                        after: "not stripey",
                        data: "mistakenly stripey",
                        delta: "not stripey",
                    },
                    path: "animals/dolphin/features/stripey",
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: {
                        before: "mistakenly not swimming",
                        after: "much swimming",
                        data: "mistakenly not swimming",
                        delta: "much swimming",
                    },
                    path: "animals/dolphin/features/swimming",
                },
            ],
        ],
    ] as Array<[string, IChange, IParameterisedChange[]]>)(
        "changeEvents cases %s",
        (
            observedPath: string,
            change: IChange,
            expectedChangeEvents: IParameterisedChange[],
        ) => {
            // Given a Written change filter for a path;
            const filter = new WrittenChangeFilter(observedPath)

            // When we observe for written events from a change;
            const createdChangeEvents = filter.changeEvents(change)

            // Then we should get the expected Written change events.
            expect(createdChangeEvents).toEqual(expectedChangeEvents)
        },
    )
})
