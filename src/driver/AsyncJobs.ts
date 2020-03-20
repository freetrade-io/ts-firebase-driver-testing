export interface IAsyncJobs {
    pushJob(job: Promise<any>): void
    pushJobs(jobs: Array<Promise<any>>): void
    jobsComplete(): Promise<void>
}

export class AsyncJobs implements IAsyncJobs {
    private jobs: Array<Promise<any>> = []

    pushJobs(jobs: Array<Promise<any>>): void {
        this.jobs.concat(jobs)
    }

    pushJob(job: Promise<any>): void {
        this.jobs.push(job)
    }

    async jobsComplete(): Promise<void> {
        while (this.jobs.length > 0) {
            const itemsToResolve = this.jobs.map((value, index) => {
                return {
                    promise: value,
                    index,
                }
            })

            await Promise.all(itemsToResolve.map((x) => x.promise))

            // Assumption is that the items are at the start
            this.jobs.splice(
                0,
                Math.max(...itemsToResolve.map((x) => x.index)) + 1,
            )
        }
    }
}
