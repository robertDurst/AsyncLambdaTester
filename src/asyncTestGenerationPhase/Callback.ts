import * as fc from 'fast-check';
import { typeOf } from '../utilities/dirUtility';
import { pickRandomEl } from '../utilities/testUtilities'
import { CallbackStrategy } from './CallbackStrategy';

export class Callback {
    private statements: string[];
    private strategy: CallbackStrategy;

    constructor(strategy: CallbackStrategy) {
        this.statements = ['callbackArguments.push(arguments);', 'callbackData.push(data);'];
        this.strategy = strategy;
    }

    public clone() {
        return new Callback(this.strategy);
    }

    /**
     * Here is arguably the most interesting part of test generation, namely where we generated
     * the callback functions following one of the outline strategies from the LambdaTester
     * framework defined in the following paper: http://software-lab.org/publications/oopsla2018_LambdaTester.pdf
     * Here is also where we extend and deviate away from LambdaTester and the original paper.
     *
     * --------   The extension TLDR, nutshell, ascii-hotness version   ---------
     * Again, we are conceptually basing this off of RANDOOP and of course, LambdaTester, which we
     * are building off of. However, we want to generate method calls that are "_nested_ inside the
     * callback argument of the previous call in the sequence" as follows:
     *
     *      function test() {
     *          m1(..., function m2() {
     *              m2(..., function m3() {
     *                  done();
     *              });
     *          });
     *      }
     *
     * Like before, each method is passed a combination of randomly selected values in the surrounding
     * scopes, and either:
     *  a. more synthesize callbacks
     *  b. or a call to done
     *
     * ---- How Is this Accomplished? ----
     * This is the rough outline of an algorithm: during each iteration, selects a previously
     * generated sequence and inserts an additional method call in the body of the innermost nested
     * function (with done placed inside the innermost nested function). If this sequence is extendable,
     * defined as non-crashing and terminating, we add this sequence to our _worklist_.
     */
    public inject(statements: string[]) {
        this.statements = [...this.statements, ...statements];
    }

    // generate code does 1 of 4 things (referencing paper here):
    //      1. empty callbacks ("[this] approach is a baseline")
    //      2. callbacks by quickcheck ("generat[es] functions that return random values,")
    //           - does not perform additional computations
    //           - does not modify state of the program
    //      3. utilize existing callbacks ("extract [callbacks] from already written code")
    //           - statically analyzes for methods passed to methods with name m
    //           - these may follow common usage patterns
    //      4. callback generation via dynamic analysis
    //           - The technique is based on the observation that callbacks are more likely
    //             to be effective for testing when they interact with the tested code
    //           - the callback function should interact with the code executed
    //             after invoking the callback
    //           - The challenge is how to determine the memory locations that the callback
    //             should modify
    //           - Collect the following memory locations
    //              1. read after first invocation of the callback
    //              2. reachable from the callback body: "The reachable memory locations include
    //                                                    memory reachable from the receiver object
    //                                                    and the arguments of the call to the method
    //                                                    under test, the return value of the callback,
    //                                                    and any globally reachable state."
    public generateCode(
        functionPool: any[],
    ) {
        switch (this.strategy) {
            case CallbackStrategy.EmptyCallback: {
                // preface
                let result = 'function callback(err, data) {\n';

                // generate and append string for all the statements
                for (const statement of this.statements) {
                    result += statement + '\n';
                }

                // postface
                result += '}';
                return result;
            }
            case CallbackStrategy.QuickCheck: {
                const quickcheckRaw = fc.func(fc.anything()).toString();

                // generate and append string for all the statements
                let statementsRaw = '';
                for (const statement of this.statements) {
                    statementsRaw += statement + '\n';
                }

                return quickcheckRaw.replace('{', `{${statementsRaw}`);
            }
            case CallbackStrategy.CorpusExtract: {
                // // utilize mined corpus of callbacks
                // const minedCallbacks = getCallbacks(undefined, fnName);
                // const c = minedCallbacks[Math.floor(Math.random() * minedCallbacks.length)].toString();
                // return processFn(c);
            }
            /**
             * Right now, this is not really feedback driven, since the feedback utilizes
             * some dynamic analysis that relies on:
             * https://github.com/robertDurst/AsyncLambdaTester/issues/2
             */
            case CallbackStrategy.FeedbackDriven: {

                // TODO: when we implement dynamic analysis, the only place
                // that writes to paths, we will need to actually utilize
                // this code again.
                // if (paths.length > 0) { /* insert code */}

                const randomEl = pickRandomEl(functionPool);
                const returnVal = typeOf(randomEl) === 'object'
                    || typeOf(randomEl) === 'array' ? JSON.stringify(randomEl) : randomEl;


                // preface
                let fnStr = 'function callback(){\n';

                // generate and append string for all the statements
                let statementsRaw = '';
                for (const statement of this.statements) {
                    statementsRaw += statement + '\n';
                }
                fnStr += statementsRaw;

                // append calculated return values
                fnStr += `return ${returnVal}\n`;

                // postface
                fnStr += '}';

                return fnStr;
            }
            default:
                throw new Error('Unexpected callback type.');
        }
    }
}
