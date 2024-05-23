export class SpearLog {
    private quite: boolean;
    constructor(quite :boolean) {
        this.quite = quite;
    }

    get isQuite() {
        return this.quite;
    }

    set isQuite(value: boolean) {
        this.quite = value;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(...args: any[]) {
        if (!this.quite) {
            console.log(...args);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(...args: any[]) {
        if (!this.quite) {
            console.warn(...args);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(...args: any[]) {
        if (!this.quite) {
            console.error(...args);
        }
    }
}