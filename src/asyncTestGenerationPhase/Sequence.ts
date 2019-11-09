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

    public clone(): Sequence {
        const sequence = new Sequence();
        for (const method of this.methods) {
            sequence.append(method);
        }
        return sequence;
    }
}
