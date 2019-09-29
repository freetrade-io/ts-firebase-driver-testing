export interface IAsyncJobs {
    pushJob(job: Promise<any>): void
    jobsComplete(): Promise<void>
}

export class AsyncJobs implements IAsyncJobs {
    private jobs: Array<Promise<any>> = []

    pushJob(job: Promise<any>): void {
        this.jobs.push(job)
    }

    async jobsComplete(): Promise<void> {
        // More jobs might be added by each job, so we can't just await Promise.all() here.
        while (this.jobs.length > 0) {
            await this.jobs.pop()
        }
    }
}
