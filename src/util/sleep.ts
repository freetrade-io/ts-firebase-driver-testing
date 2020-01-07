export function sleep(milliSeconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliSeconds))
}
