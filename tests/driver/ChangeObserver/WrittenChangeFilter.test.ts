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
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: { id: "foo" }, change: { after: "baz" } }],
        ],
        [
            "/{id}/{key}",
            { after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: { id: "foo", key: "bar" },
                    change: { after: "baz" },
                },
            ],
        ],
        [
            "/{id}/bar",
            { after: { foo: { bar: "baz" } } },
            [{ parameters: { id: "foo" }, change: { after: "baz" } }],
        ],
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
                    parameters: { id: "foo3" },
                    change: { before: undefined, after: "bar" },
                },
                {
                    parameters: { id: "foo4" },
                    change: { before: undefined, after: "bar" },
                },
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
                    change: { before: undefined, after: "very stripey" },
                },
                {
                    parameters: {
                        animalName: "tiger",
                        featureName: "swimming",
                    },
                    change: { before: undefined, after: "not swimming" },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "stripey",
                    },
                    change: { before: undefined, after: "not stripey" },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: { before: undefined, after: "much swimming" },
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
                    },
                },
                {
                    parameters: {
                        animalName: "dolphin",
                        featureName: "swimming",
                    },
                    change: {
                        before: "mistakenly not swimming",
                        after: "much swimming",
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
            // Given a Written change filter for a path;
            const filter = new WrittenChangeFilter(observedPath)

            // When we observe for written events from a change;
            const createdChangeEvents = filter.changeEvents(change)

            // Then we should get the expected Written change events.
            expect(createdChangeEvents).toEqual(expectedChangeEvents)
        },
    )
})
