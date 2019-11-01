import { typeOf } from '../utilities/dirUtility';
import { Decisions } from '../utilities/randomGenerator';
import { pickRandomEl } from '../utilities/testUtilities';
import { ConstantPool } from './ConstantPool';
import { Sequence } from "./Sequence";

export class Test {
    private sequence: Sequence;

    constructor(sequence: Sequence) {
        this.sequence = sequence;
    }

    public generateRawCode(
        pool: any[],
        fnPool: any[],
        setupCode: string,
        setupValues: any[],
        constantPool: ConstantPool,
    ) {
        // result is the raw code we are generating, so here we append the setupcode
        // to the top
        let result = `${setupCode}\n`;
        result += 'var callbackArguments = [];\n';

        // --------- generate all the constant vars in the constant pool --------
        for (const constantVar of constantPool.getConstantVarNamesArray()) {
            // constant is the actual value (or the constant) for constantVar (constant's name)
            const constant = constantPool[constantVar];

            // turns a constant into a string
            let constantString = typeof constant === 'string' && (setupValues.indexOf(constant) > -1
                || constant.indexOf('function') > -1
                || (pool && pool.indexOf(constant) > -1)
                || (fnPool && fnPool.indexOf(constant) > -1)) ? constant : `"${constant}"`;

            // if constant is an array or an object stringify it, otherwise use the constant value
            if (Array.isArray(constant) || (constant && typeOf(constant) === 'object')) {
                constantString = JSON.stringify(constant);
            } else if (typeof constant === 'boolean'
                || typeOf(constant) === 'null'
                || typeof constant === 'number'
                || (constant &&
                    (constant.indexOf('r_') === 0
                        || constant.indexOf('base_') === 0))
            ) {
                constantString = constant;
            }

            result += `var ${constantVar} = ${constantString};\n`;
        }

        // ------- generate all the sequences, nesting the methods -------
        // clone here to make this pure
        const methods = this.sequence.getMethods().map((method) => method.clone());
        // innermost executes done
        methods[0].injectMethod(['done();']);
        // calculate newBase
        const decisions = new Decisions();
        let newBase = pool.length > 0 ?
            pickRandomEl(pool)
            : decisions.pickRandomConstant(pickRandomEl(decisions.constantTypes));
        if (typeOf(newBase) === 'array' || typeOf(newBase) === 'object') {
            newBase = JSON.stringify(newBase);
        } else if (typeOf(newBase) === 'string'
            && setupValues.indexOf(newBase) === -1
            && pool.indexOf(newBase) === -1) {
            newBase = "\"" + newBase + "\"";
        }

        // the rest nest
        for (let i = 0; i < methods.length - 1; i++) {
            const a = methods[i];
            const b = methods[i + 1];

            b.injectMethod(a.getStatements(newBase, fnPool));
        }

        for (const statement of methods[methods.length - 1].getStatements(newBase, fnPool)) {
            result += statement;
        }

        return result;
    }
}
