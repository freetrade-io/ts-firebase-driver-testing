function randomString() {
    return Math.random()
        .toString(16)
        .slice(-12)
}

export function firebaseLikeId(time = Date.now()) {
    return `-L${time.toString(16)}${randomString()}`
}

export function fireStoreLikeId(minLength: number = 30) {
    let result = ""
    while (result.length < minLength) {
        result += randomString()
    }
    return result
}
