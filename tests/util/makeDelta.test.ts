import { makeDelta } from "../../src/util/makeDelta"

describe("makeDelta", () => {
    test.each([
        [{}, {}, {}],
        [{ a: "123" }, { a: "123" }, {}],
        [{ a: "123" }, {}, { a: undefined }],
        [{}, { a: "123" }, { a: "123" }],
        [{ a: "123" }, "foobar", "foobar"],
        ["foo", "bar", "bar"],
        [
            { a: { b: { c: "123" } }, foo: "hello" },
            { a: { b: { c: "456" } }, foo: "hello" },
            { a: { b: { c: "456" } } },
        ],
        [
            { a: { b: { c: "123" } }, foo: "hello" },
            { a: { b: { c: "123", d: "456" } }, foo: "hello" },
            { a: { b: { d: "456" } } },
        ],
    ] as Array<[any, any, any]>)(
        "makeDelta",
        (oldObject: any, newObject: any, expectedDelta: any): void => {
            // Given an old value and a new value;

            // When we get the delta between them;
            const delta = makeDelta(oldObject, newObject)

            // Then we should get the correct delta.
            expect(delta).toStrictEqual(expectedDelta)
        },
    )
})
