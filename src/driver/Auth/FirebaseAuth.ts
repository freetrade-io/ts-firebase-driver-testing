import { throwIfEnvironmentLooksLikeProd } from "../throwIfEnvironmentLooksLikeProd"

export interface IFirebaseAuth {
    createUser(properties: ICreateUserRequest): Promise<IUserRecord>
    verifyIdToken(idToken: string): Promise<IDecodedIdToken>
}

interface ICreateUserRequest {
    uid?: string
    email?: string
}

interface IUserRecord {
    uid: string
    email?: string
}

interface IDecodedIdToken {
    uid: string
}

/**
 * In case it's not clear: this should only be used for mocking out auth in
 * local tests.
 */
export class InProcessFirebaseAuth implements IFirebaseAuth {
    private users: { [key: string]: IUserRecord } = {}

    constructor() {
        throwIfEnvironmentLooksLikeProd()
    }

    async createUser(properties: ICreateUserRequest): Promise<IUserRecord> {
        if (!properties.uid) {
            throw new Error("uid required to create new user")
        }
        if (this.users[properties.uid]) {
            throw new Error(`User already exists with uid ${properties.uid}`)
        }
        const newUser: IUserRecord = {
            uid: properties.uid,
            email: properties.email || "",
        }
        this.users[newUser.uid] = newUser
        return newUser
    }

    /**
     * Just check if such a user has been added to the in-process store.
     * No verification is done.
     * Simulates https://firebase.google.com/docs/auth/admin/verify-id-tokens
     */
    async verifyIdToken(idToken: string): Promise<IDecodedIdToken> {
        throwIfEnvironmentLooksLikeProd()
        const tokenParts = String(idToken).split(".")
        if (tokenParts.length !== 3) {
            throw new Error("Invalid JWT token structure")
        }
        const payload: { [key: string]: string } = JSON.parse(
            Buffer.from(String(tokenParts[1]), "base64").toString(),
        )
        const uid = payload.sub
        if (!this.users[uid]) {
            throw new Error(`User not found for id token ${idToken}`)
        }
        return { uid }
    }

    resetUsers(): void {
        this.users = {}
    }
}
