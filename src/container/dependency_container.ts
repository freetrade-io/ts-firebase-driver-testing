type Class<T> = string
type Factory<T> = (container: IDependencyContainer) => T

export interface IConfigValues {
    has(key: string): boolean
    get(key: string): any
    getOr(key: string, or: any): any
    getOrThrow(key: string, msg?: string): any
}

export interface IDependencyContainer {
    bind<T>(identifier: Class<T>, factory: Factory<T>): void
    make<T>(identifier: Class<T>): T
    config(): IConfigValues
}

export class DependencyContainer implements IDependencyContainer {
    private factories: { [key: string]: Factory<any> } = {}

    bind<T>(identifier: Class<T>, factory: Factory<T>) {
        this.factories[identifier] = factory
    }

    make<T>(identifier: Class<T>): T {
        if (!this.factories[identifier]) {
            throw new Error(`No factory binding for ${identifier}`)
        }
        return this.factories[identifier](this)
    }

    config(): IConfigValues {
        return this.make<IConfigValues>("IConfigValues")
    }
}
