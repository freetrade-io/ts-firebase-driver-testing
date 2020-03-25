export interface IAsyncJobs {
    pushJob(job: Promise<any>): void
    pushJobs(jobs: Array<Promise<any>>): void
    jobsComplete(): Promise<void>
}

export class AsyncJobs implements IAsyncJobs {
    private jobs: Array<Promise<any>> = []

    // To prevent trying to resolve 100s or possibly 1000s of promises at once
    // maxConcurrentJobs was added
    constructor(private maxConcurrentJobs: number = 20) {}

    pushJobs(jobs: Array<Promise<any>>): void {
        this.jobs = this.jobs.concat(jobs)
    }

    pushJob(job: Promise<any>): void {
        this.jobs.push(job)
    }

    async jobsComplete(): Promise<void> {
        // More jobs might be added by each job, so we can't just await Promise.all() here
        while (this.jobs.length > 0) {
            const itemsToResolve = this.jobs.slice(0, this.maxConcurrentJobs)

            await Promise.all(itemsToResolve)

            // Remove the items we just processed from the front of the job queue
            this.jobs.splice(0, itemsToResolve.length)
        }
    }
}
