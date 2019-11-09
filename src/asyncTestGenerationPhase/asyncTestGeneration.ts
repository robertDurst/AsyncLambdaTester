import { execSync } from 'child_process';
import * as fs from 'fs';
import {
    extendPool,
    getElFromMap,
    getRandomBase,
    pickRandomEl,
} from '../utilities/testUtilities';
import { Callback } from './Callback';
import { ConstantPool } from './ConstantPool';
import { Feedback } from './Feedback';
import { Method } from './Method';
import { Sequence } from './Sequence';
import { Test } from './Test';

const selectSequence = (sequenceList: Sequence[]): Sequence => {
    return pickRandomEl(sequenceList);
};

const selectMethod = (methodNamesList: string[]): string => {
    return pickRandomEl(methodNamesList);
};

const generateArguments = (
    methodName: string,
    constantPool: ConstantPool,
    decisions,
    usingPositionInference: boolean,
    functionPool: any[],
    positionData,
    typeOfCallback: number,
) => {
    const args = [];
    let callback = null;
    const callPositions = getElFromMap(methodName, positionData);

    // pick a random callbackPosition
    // TODO: is zero a good default value here?
    const callbackPosition = callPositions.length > 0 ? Number(pickRandomEl(callPositions)) : 0;

    // n ← nrArguments(m);
    const n = callbackPosition !== undefined ?
        Number(decisions.pickRandomNbOfArgs(callbackPosition))
        : Number(decisions.pickRandomNbOfArgs(0));

    for (let i = 0; i < n; i++) {
        // generate unique names for args
        const name = `argument${i}`;

        // argn ← createCallback();
        if (i === Number(callbackPosition)) {
            callback = new Callback(typeOfCallback);
            break;
        }

        // arg1, ..., argn−1 ← selectArguments(s);
        if (!usingPositionInference) {
            const randomType = pickRandomEl(decisions.constantTypes);
            const value = decisions.pickRandomConstant(randomType);
            args.push(constantPool.append(value, name));
        } else if (decisions.pickRandomBoolean() && functionPool.length > 0) {
            const exVal = pickRandomEl(functionPool);
            args.push(constantPool.append(exVal, name));
        } else {
            const randomType = pickRandomEl(decisions.constantTypes);
            const value = decisions.pickRandomConstant(randomType);
            args.push(constantPool.append(value, name));
        }
    }

    return {
        args,
        callback,
    };
};

// TODO: determine the difference between failure and timeout
const executeAndGetFeedback = (testFileName: string): Feedback => {
    const feedback = new Feedback();

    try {
        execSync(`timeout 5 node ${testFileName}`).toString();
    } catch (e) {
        feedback.error = e.message;
    }

    return feedback;
};

export const testGenerationPhase = (
    testBudget: number,
    typeOfCallback: number,
    methodNamesList: string[],
    setupValues,
    decisions,
    testFolderPath: string,
    usingPositionInference: boolean,
    positionData,
    setupCode: string,
) => {
    // -2. initialize worklist where worklist is an empty set of sequences
    const workList = [];

    // add an empty sequence
    workList.push(new Sequence());

    // -1. initialize baseArr and retArr
    const baseArr = [];
    const retArr = [];

    // WHILE WORK TEST BUDGET
    let testIndex = 0;
    while (testBudget > testIndex) {
        // 0. initialize pool, fnPool, constantPool, testName, testJSON

        const fnPool = extendPool(JSON.parse(JSON.stringify(setupValues)), decisions);
        const pool = setupValues.length > 0 ? JSON.parse(JSON.stringify(setupValues)) : [];
        const constantPool = new ConstantPool();
        const testName = `./${testFolderPath}/test${testIndex}.js`;

        // 1. select a sequence
        const currentSequence = selectSequence(workList);

        // 2. select a method
        const currentMethodName = selectMethod(methodNamesList);

        // 3. if no bases in pool, add a random one
        if (pool.length === 0) {
            pool.push(getRandomBase(currentMethodName, decisions));
        }

        // 4. define base/ret vars and add to base/ret arr
        const retVar = `r_${testIndex}`;
        const baseVar = `base_${testIndex}`;
        baseArr.push(baseVar);
        retArr.push(retVar);

        // 5. generate args and callback
        const { args, callback } = generateArguments(
            currentMethodName,
            constantPool,
            decisions,
            usingPositionInference,
            fnPool,
            positionData,
            typeOfCallback,
        );

        // 5.5 generate a method object and get sequence prime!
        const method = new Method(args, baseVar, callback, testIndex, currentMethodName, retVar);
        currentSequence.append(method);
        const sequencePrime = currentSequence;

        // 6. create test w/ statements and call object
        const test = new Test(sequencePrime);

        // 7. generate raw testcode string and write to a file
        const testCode = test.generateRawCode(pool, fnPool, setupCode, setupValues, constantPool);
        fs.writeFileSync(testName, testCode);

        // 8. execute test, get feedback and save stuff
        const feedback = executeAndGetFeedback(testName);
        pool.push(retVar);
        if (fnPool.indexOf(retVar) === -1) {
            fnPool.push(retVar);
        }

        // 9. check if extensible
        // Non-extensible cases:
        //  a. non-terminating (novel for asynchronous code)
        //  b. crashing (same as LambdaTester)
        // TODO: if it is not extensible, what should I do?
        if (feedback.error === null) {
            workList.push(currentSequence);
        }

        // 10. increment test index
        testIndex++;
    }
};
