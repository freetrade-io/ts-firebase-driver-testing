let envLooksLikeProd: boolean | undefined
export function disableEnvLooksLikeProdCheck(): void {
    envLooksLikeProd = false
}

export function throwIfEnvironmentLooksLikeProd(): void {
    if (envLooksLikeProd === undefined) {
        for (const envVar of Object.keys(process.env)) {
            const envVal = String(process.env[envVar]).toLowerCase()
            if (envVal.includes("prod")) {
                throw new Error(
                    `In-process Firebase driver might be running in prod! ${envVar}=${envVal}`,
                )
            }
        }
    }
    envLooksLikeProd = false
}
