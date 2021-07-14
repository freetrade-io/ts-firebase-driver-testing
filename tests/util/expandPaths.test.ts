import { expandPaths } from "../../src/util/expandPaths"

describe("expandPaths", () => {
    test.each([
        [{}, {}],
        [{ foo: "bar" }, { foo: "bar" }],
        [{ foo: { bar: "baz" } }, { foo: { bar: "baz" } }],
        [{ "foo.bar": "baz" }, { foo: { bar: "baz" } }],
        [
            {
                age: 13,
                "favorites.color": "Red",
            },
            {
                age: 13,
                favorites: {
                    color: "Red",
                },
            },
        ],
        [
            {
                foo: {
                    bar: {
                        "baz.level": {
                            "a.b.c": {
                                final: {
                                    key: [1, 2, 3],
                                },
                            },
                        },
                    },
                },
            },
            {
                foo: {
                    bar: {
                        baz: {
                            level: {
                                a: {
                                    b: {
                                        c: {
                                            final: {
                                                key: [1, 2, 3],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ],
    ] as Array<[object, object]>)(
        "expand dot notation paths in object",
        (
            dotNotated: { [key: string]: any },
            expectedExpanded: { [key: string]: any },
        ) => {
            // Given an object with some dot-notated nested paths;

            // When we expand the dot-notated nested paths in the object;
            const expanded = expandPaths(dotNotated)

            // Then the dot-notated nested paths should be correctly expanded.
            expect(expanded).toEqual(expectedExpanded)
        },
    )

    test.each([
        [{}, {}],
        [{ foo: "bar" }, { foo: "bar" }],
        [{ foo: { bar: "baz" } }, { foo: { bar: "baz" } }],
        [{ "foo/bar": "baz" }, { foo: { bar: "baz" } }],
        [
            {
                age: 13,
                "favorites/color": "Red",
            },
            {
                age: 13,
                favorites: {
                    color: "Red",
                },
            },
        ],
        [
            {
                foo: {
                    bar: {
                        "baz/level": {
                            "a/b/c": {
                                final: {
                                    key: [1, 2, 3],
                                },
                            },
                        },
                    },
                },
            },
            {
                foo: {
                    bar: {
                        baz: {
                            level: {
                                a: {
                                    b: {
                                        c: {
                                            final: {
                                                key: [1, 2, 3],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        ],
    ] as Array<[object, object]>)(
        "expand slash notation paths in object",
        (
            dotNotated: { [key: string]: any },
            expectedExpanded: { [key: string]: any },
        ) => {
            // Given an object with some dot-notated nested paths;

            // When we expand the dot-notated nested paths in the object;
            const expanded = expandPaths(dotNotated, "/")

            // Then the dot-notated nested paths should be correctly expanded.
            expect(expanded).toEqual(expectedExpanded)
        },
    )
})
