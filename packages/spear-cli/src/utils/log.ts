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

    log(...args: any[]) {
        if (!this.quite) {
            console.log(...args);
        }
    }

    warn(...args: any[]) {
        if (!this.quite) {
            console.warn(...args);
        }
    }

    error(...args: any[]) {
        if (!this.quite) {
            console.error(...args);
        }
    }
}