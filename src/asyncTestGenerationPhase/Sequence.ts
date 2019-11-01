import { Method } from "./Method";

export class Sequence {
    private methods: Method[];

    constructor(methods?: Method[]) {
        this.methods = methods || [];
    }

    public append(method: Method) {
        this.methods.push(method);
    }

    public getMethods() {
        return this.methods;
    }
}
