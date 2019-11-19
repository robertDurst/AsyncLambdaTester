import { Error, ErrorType } from './Error';

export class Feedback {
  private error: Error;

  constructor() {
    this.error = null;
  }

  public isExtensible() {
    return this.error == null;
  }

  public setError(value: string, isTimeout: boolean) {
    this.error = new Error(isTimeout ? ErrorType.Timeout : ErrorType.Normal, value);
  }

  public getError() {
    return this.error;
  }
}
