export class ConstantPool {
    private pool: object;

    constructor() {
        this.pool = {};
    }

    // this used to be called varForConstant
    public append(constant: any, name: string) {
        const varName = name;
        this.pool[varName] = constant;
        return varName;
    }

    public getPoolValueByKey(key: string) {
        return this.pool[key];
    }

    public getConstantVarNamesArray() {
        return Object.keys(this.pool);
    }
}
