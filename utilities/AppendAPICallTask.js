const { getElFromMap, pickRandomEl } = require('./testUtilities');
const { generateFn } = require('./generateFnBody');
const { Call } = require('./Call');
const { typeOf } = require('./dirUtility');

class AppendAPICallTask {
  constructor(test) {
    this.test = test;
  }

  // createCandidate:
  // 1. generates arguments for a test
  // 2. pushes statements onto the test object, based on the generated arguments
  // 3. updates the number of arguments to the test
  // 4. returns the modified test
  createCandidate(fnName, pool, fnPool, baseVar, retVar, nbOfCall, decisions, positionInference, typesOfCallbacks, afterCallbackPaths, setupValues, positions) {
    const argVars = [];

    // pick random position
    const callpositions = getElFromMap(fnName, positions);
    // pick a random callbackPosition
    const callbackPosition = callpositions.length > 0 ? pickRandomEl(callpositions) : undefined;
    // pick a random number of arguments
    const nbOfArgs = callbackPosition !== undefined ? Number(decisions.pickRandomNbOfArgs(callbackPosition)) : Number(decisions.pickRandomNbOfArgs(0));
    // pick a base
    let newBase = pool.length > 0 ? pickRandomEl(pool) : decisions.pickRandomConstant(pickRandomEl(decisions.constantTypes));

    const start = Number(this.test.nbOfArgs);

    // fill the argVars array here
    for (let argIdx = start + 1; argIdx <= nbOfArgs + start; argIdx++) {
      // generate unique names for args
      const name = `argument${argIdx}`;

      // first case, if at callback position, push a callback
      // HAD TO MAKE THIS == !!!!!!!!!!!!!
      if (argIdx - start == callbackPosition) {
        const position = argIdx;
        // here I fetch functions
        const f = generateFn(typesOfCallbacks, decisions, fnPool, afterCallbackPaths, fnName, start + 1, nbOfArgs, nbOfCall, position);
        argVars.push(this.test.varForConstant(f, name));
      } else if (positionInference === 0) {
        // next case, if we are not doing feedback-directed, choose a random type and a random value for that type
        const randomType = pickRandomEl(decisions.constantTypes);
        const value = decisions.pickRandomConstant(randomType);
        argVars.push(this.test.varForConstant(value, name));
      } else if (decisions.pickRandomBoolean() === true && fnPool.length > 0) {
        // if not callback and we are doing feedback-directed AND randomly get true with a non-empty function pool
        // then we pick w function
        const exVal = pickRandomEl(fnPool);
        argVars.push(this.test.varForConstant(exVal, name));
      } else {
        // if all else fails, we just pick a random type and a random value for that type as we did for the non-feedback
        // directed condition path above
        const randomType = pickRandomEl(decisions.constantTypes);
        const value = decisions.pickRandomConstant(randomType);
        argVars.push(this.test.varForConstant(value, name));
      }
    }

    // here we adjust the newBase, either stringifying it if it is an object for an array or using
    // it directed in the raw string form
    if (typeOf(newBase) === 'array' || typeOf(newBase) === 'object') {
      newBase = JSON.stringify(newBase);
    } else if (typeOf(newBase) === 'string' && setupValues.indexOf(newBase) === -1 && pool.indexOf(newBase) === -1) {
      newBase = `"${newBase}"`;
    }

    // push the new base as a statement (the furst statement)
    this.test.statements.push(`var ${baseVar} = ${newBase}`);
    // generate a call object
    const call = new Call(baseVar, argVars, retVar, fnName);
    // push the return variable as the next statement
    this.test.statements.push(`var ${retVar} = undefined`);
    // push the call generated from the above object (invoking its toString method)
    this.test.statements.push(call);
    // update the number of arguments on the test object
    this.test.nbOfArgs += nbOfArgs;

    return this.test;
  }
}

module.exports = {
  AppendAPICallTask,
};
