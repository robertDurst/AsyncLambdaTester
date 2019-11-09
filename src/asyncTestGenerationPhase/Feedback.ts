import { Error } from './Error';

export class Feedback {
  private error: Error;

  constructor() {
    this.error = null;
  }

  public isExtensible() {
    return this.error == null;
  }

  public setError(value: string) {
    this.error = value;
  }
}
