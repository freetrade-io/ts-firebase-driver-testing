import { InProcessFirebaseDriver } from "../../../src"

/**
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
describe("In-process mock Firebase auth", () => {
    test("In-process auth verify token for non-existent user", async () => {
        // Given no user has been created in the in-process mock Firebase auth;
        const firebase = new InProcessFirebaseDriver()

        // When we verify a mocked auth token for that user;
        const payload = Buffer.from(JSON.stringify({ sub: "foobar" })).toString(
            "base64",
        )
        const token = `fakeHeader.${payload}.fakeSignature`
        let error: Error | undefined
        try {
            await firebase.auth().verifyIdToken(token)
        } catch (err) {
            error = err
        }

        // Then the token should not be verified.
        expect(error).toBeDefined()
        expect(error).toBeInstanceOf(Error)
        expect(error!.message).toContain("User not found for id token")
    })

    test("In-process auth verify token for created user", async () => {
        // Given a user has been created in the in-process mock Firebase auth;
        const firebase = new InProcessFirebaseDriver()
        const user = await firebase.auth().createUser({ uid: "user-123" })

        // When we verify a mocked auth token for that user;
        const payload = Buffer.from(JSON.stringify({ sub: user.uid })).toString(
            "base64",
        )
        const token = `fakeHeader.${payload}.fakeSignature`
        const verified = await firebase.auth().verifyIdToken(token)

        // Then the token should be verified.
        expect(verified).toEqual(expect.objectContaining({ uid: user.uid }))
    })
})
