/**
 * A Method is a collection of values related to the invocation and creation of
 * a raw method code snippet. The caveat here that we must consider, which was
 * not present in LambdaTester is that we want to nest methods inside the callback.
 * Note that whenever we create a method, that inherently is the innermost method of
 * a sequence. Thus, the nesting won't be done until the actual code generation for
 * the test itself -- the innermost node taking only 'done();' Consider the following
 * sequence (where the Sequence class itself is defined in Sequence.ts):
 *
 *      Sn = (S0, S1, S2, ..., Sn-1, m)
 *
 * where m is a Method and each sequence is defined recursively, all the way down to
 * the empty sequence, or a sequence with no methods. To nest these methods, we need
 * to inject the later sequence's, Sj, method, Mj, inside the callback of sequence Si,
 * or the callback arg to Mi (where i < j... and infact i+1 === j). Thus, we get, for
 * sequence S2 = (S0, S1, M2):
 *
 *      function test() {
 *          m0(..., function m1() {
 *              m1(..., function m2() {
 *                  done();
 *              })
 *          })
 *      }
 *
 * To create, this, we recurse backwards, or bottom up, "injecting" 'done();' into the
 * innermost method and ending at the empty sequence.
 */
import { typeOf } from '../utilities/dirUtility';
import { Callback } from './Callback';

export class Method {
    private args: any[];
    private baseVar: string;
    private callback: Callback;
    private id: number;
    private name: string;
    private retVar: string;

    constructor(args: any[], baseVar: string, callback: Callback, id: number, name: string, retVar: string) {
        this.args = args;
        this.baseVar = baseVar;
        this.callback = callback;
        this.id = id;
        this.name = name;
        this.retVar = retVar;
    }

    public getStatements(newBase: string, functionPool) {
        const statements = [];

        statements.push(`let ${this.baseVar} = ${newBase};\n`);
        statements.push(this.generateCallString(functionPool));

        return statements;
    }

    public injectMethod(statements: string[]) {
        this.callback.inject(statements);
    }

    public generateCode(functionPool) {
        let result = '';
        for (const statement of this.getStatements('1;', functionPool)) {
            result += statement + '\n';
        }
        return result;
    }

    public clone() {
        if (this.callback) {
            return new Method(this.args, this.baseVar, this.callback.clone(), this.id, this.name, this.retVar);
        }
        return new Method(this.args, this.baseVar, this.callback, this.id, this.name, this.retVar);
    }

    private generateCallString(functionPool) {
        if (typeOf(this.baseVar) === 'array' || typeOf(this.baseVar) === 'object') {
            this.baseVar = JSON.stringify(this.baseVar);
        }

        return `let ${this.retVar} = ${this.baseVar}.${this.name}(${this.args.slice(0, this.args.length)}, ${this.callback ? this.callback.generateCode(functionPool) : ''})`;
    }
}
