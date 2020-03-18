import { hasSubMeta } from "../../src/util/stripMeta"

describe("isSubMeta", () => {
    test.each([true, false, null, "string", 1000])(
        "handles $s type",
        (input) => {
            expect(hasSubMeta(input, "someKey")).toEqual(false)
        },
    )
})
