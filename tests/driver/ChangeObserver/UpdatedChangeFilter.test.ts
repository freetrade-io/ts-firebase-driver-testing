import {
    IChange,
    IParameterisedChange,
    UpdatedChangeFilter,
} from "../../../src/driver/ChangeObserver/DatabaseChangeFilter"

describe("UpdatedChangeFilter", () => {
    test.each([
        ["", {}, []],
        ["/foo", { after: {} }, []],
        ["/foo", { after: { foo: "bar" } }, []],
        [
            "/foo",
            { before: { foo: "bar" }, after: { foo: "bar2" } },
            [
                {
                    parameters: {},
                    change: { before: "bar", after: "bar2" },
                    path: "foo",
                },
            ],
        ],
        ["/foo", { after: { foo: { bar: "baz" } } }, []],
        ["/foo", { before: {}, after: { foo: { bar: "baz" } } }, []],
        [
            "/foo",
            {
                before: { foo: { bar: "baz" } },
                after: { foo: { bar: "baz2" } },
            },
            [
                {
                    parameters: {},
                    change: { before: { bar: "baz" }, after: { bar: "baz2" } },
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
            [],
        ],
        [
            "/foo",
            {
                before: { hello: "yes", foo: { bar: "baz1" } },
                after: { hello: "yes", foo: { bar: "baz2" } },
            },
            [
                {
                    parameters: {},
                    change: { before: { bar: "baz1" }, after: { bar: "baz2" } },
                    path: "foo",
                },
            ],
        ],
        [
            "/foo/bar",
            { before: { foo: { bar: "wow" } }, after: { foo: { bar: "baz" } } },
            [
                {
                    parameters: {},
                    change: { before: "wow", after: "baz" },
                    path: "foo/bar",
                },
            ],
        ],
        ["/{id}/bar", { after: { foo: { bar: "baz" } } }, []],
        [
            "/{id}/bar",
            {
                before: { foo: { bar: "baz1" } },
                after: { foo: { bar: "baz2" } },
            },
            [
                {
                    parameters: { id: "foo" },
                    change: { before: "baz1", after: "baz2" },
                    path: "foo/bar",
                },
            ],
        ],
        ["/{id}/{key}", { after: { foo: { bar: "baz" } } }, []],
        [
            "/{id}/{key}",
            { before: { foo: { bar: "baz" } }, after: { foo: { bar: "baz" } } },
            [],
        ],
        [
            "/{id}/{key}",
            {
                before: { foo: { bar: "baz1" } },
                after: { foo: { bar: "baz2" } },
            },
            [
                {
                    parameters: { id: "foo", key: "bar" },
                    change: {
                        before: "baz1",
                        after: "baz2",
                    },
                    path: "foo/bar",
                },
            ],
        ],
        ["/{id}/bar", { after: { foo: { bar: "baz" } } }, []],
        [
            "/{id}/bar",
            {
                before: { foo1: { bar: "baz" } },
                after: { foo2: { bar: "baz" } },
            },
            [],
        ],
        [
            "/{id}/bar",
            {
                before: { foo: { bar: "baz1" } },
                after: { foo: { bar: "baz2" } },
            },
            [
                {
                    parameters: { id: "foo" },
                    change: { before: "baz1", after: "baz2" },
                    path: "foo/bar",
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
            // Given a Updated change filter for a path;
            const filter = new UpdatedChangeFilter(observedPath)

            // When we observe for updated events from a change;
            const createdChangeEvents = filter.changeEvents(change)

            // Then we should get the expected Updated change events.
            expect(createdChangeEvents).toEqual(expectedChangeEvents)
        },
    )
})
