export enum ErrorType {
    Normal,
    Timeout,
}

export class Error {
    private errorType: ErrorType;
    private errorRaw: string;

    constructor(errorType: ErrorType, errorRaw: string) {
        this.errorType = errorType;
        this.errorRaw = errorRaw;
    }

    public getErrorType() {
        return this.errorType;
    }

    public getErrorRaw() {
        return this.errorRaw;
    }
}
