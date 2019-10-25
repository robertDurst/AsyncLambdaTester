/**
 * This is the base file for all test generation, with the highest level methods
 * discoveryPhase and testGenerationPhase defined.
 */
const fs = require('fs');
const { execSync } = require('child_process');
const fsextra = require('fs-extra');
const { findPositions } = require('./utilities/inferringSignature');
const { Test, getLog } = require('./utilities/Test');
const {
  extendPool, pickRandomEl, getRandomBase, makeStr, getFeedback, getDefinedVal,
} = require('./utilities/testUtilities.js');
const { AppendAPICallTask } = require('./utilities/AppendAPICallTask');
const utility = require('./utilities/dirUtility.js');
const { Decisions } = require('./utilities/randomGenerator.js');

const discoveryPhase = (names, setupCode) => {
  console.log('Discovery phase...');
  const positions = findPositions(setupCode, names);
  return positions;
};

let afterCallbackPaths = [];

const testGenerationPhase = (
  nbOfTests,
  testFolder,
  positionInference,
  setupValues, names,
  decisions,
  dynAnalysis,
  typesOfCallbacks,
  positions,
  setupCode,
) => {
  console.log('Test Generation phase...');
  for (let i = 0; i < nbOfTests; i++) {
    // various state initializations
    const testName = `./${testFolder}/test${i}.js`;
    const testJSON = `./${testFolder}/test${i}.json`;
    let test = new Test(setupCode, setupValues);

    // establish pools from setup code
    const fnPool = extendPool(JSON.parse(JSON.stringify(setupValues)), decisions);
    const pool = setupValues.length > 0 ? JSON.parse(JSON.stringify(setupValues)) : [];

    // initialize lots of varibles to their type's version of null
    let retVar = null;
    let baseVar = null;
    let toContinue = true;
    const baseArr = [];
    const retArr = [];

    // positionInference 0 means is not feedback directed
    if (positionInference === 0) {
      // just one call
      const fnName = pickRandomEl(names);
      if (pool.length === 0) {
        pool.push(getRandomBase(fnName, decisions));
      }
      retVar = 'r_0';
      baseVar = 'base_0';
      baseArr.push(baseVar);
      retArr.push(retVar);
      test = new AppendAPICallTask(test)
        .createCandidate(
          fnName,
          pool,
          fnPool,
          baseVar,
          retVar,
          0,
          decisions,
          positionInference,
          typesOfCallbacks,
          afterCallbackPaths,
          setupValues,
          positions,
        );

      // testCode is a combination of the test itself and logs
      const testCode = test.toString()
                    + getLog(testJSON, baseVar, retVar, makeStr(baseArr), makeStr(retArr));

      // write the testCode to a file
      fs.writeFileSync(testName, testCode);

      // execute the test
      execSync(`node ${testName}`);
    } else { // if here, then positionInference !== 0 and thus this is feedback directed
      // we go over four possible positions here (where the above did just one)
      for (let j = 0; j < 4; j++) {
        if (!toContinue) {
          break;
        }

        retVar = `r_${j}`;
        baseVar = `base_${j}`;
        baseArr.push(baseVar);
        retArr.push(retVar);
        const fnName = pickRandomEl(names);

        // if nothing in the pool, push a random base that works on the given fnName
        if (pool.length === 0) {
          pool.push(getRandomBase(fnName, decisions));
        }

        // randomly push the retVar into the function pool (to be later invoked????)
        if (decisions.pickRandomBoolean() === true) {
          fnPool.push(retVar);
        }

        // define a new test object and then create a candidate
        test = new AppendAPICallTask(test).createCandidate(fnName, pool, fnPool, baseVar, retVar, j, decisions, positionInference, typesOfCallbacks, afterCallbackPaths, setupValues, positions);
        // console.log(test);
        // return;
        // take the generated test code and write it to the given filename
        const testCode = test.toString(pool, fnPool)
          + getLog(testJSON, baseVar, retVar, makeStr(baseArr), makeStr(retArr));
        fs.writeFileSync(testName, testCode);

        // the following is only for when we do feedback-directed testing
        if (positionInference === 1) {
          // execute and get feedback from the execution of the file written to above
          const feedback = getFeedback(testName);
          pool.push(retVar);

          if (fnPool.indexOf(retVar) === -1) {
            fnPool.push(retVar);
          }

          // feedback exit condition --> there was an error in the execution of the code above
          if (feedback.error !== null) {
            toContinue = false;
          }

          // the following is only for dynamic analysis
          // HERE is where a local version of Jalangi2 is required.
          // See: https://github.com/Samsung/jalangi2
          if (dynAnalysis === 1) {
            const models = process.argv[9].split(' ');

            // update paths
            for (let k = 0; k < models.length; k++) {
              const model = models[k];
              const requireModel = `model_${k}.js`;
              fsextra.copySync(model, `./generated_${testFolder}/${requireModel}`);

              let strCode = `require("./${requireModel}")\n`;
              strCode += test.toString();

              const file1Name = `./generated_${testFolder}/test${i}_model${k}.js`;
              fs.writeFileSync(file1Name, strCode);

              execSync(`timeout 5 node ../jalangi2/src/js/commands/jalangi.js --inlineIID --inlineSource --analysis dynamicAnalysis.js ${file1Name} ${fnName} ${testFolder}`);
              afterCallbackPaths = JSON.parse(fs.readFileSync(`./generated_${testFolder}/pathsAfterCallback.json`));
            }
          }
        }
      }
    }
  }

  // only execute (aka delete the generated folder) if we were performing dynamic analysis
  if (dynAnalysis === 1) {
    utility.deleteFolder(`./generated_${testFolder}`);
  }
};

const genTests = () => {
  // ----------------- All the Inputs via the CLI --------------//
  // function names: names of methods under test (e.g., reduce)
  const fnNames = process.argv[2];
  // number of tests: number of tests to be generated
  const nbOfTests = process.argv[3];
  // setup code: file containing setup code
  const setup = process.argv[4];
  // is feedback directed: indicates whether callback position inference
  // and the feedback are part of test generation (0 – no, 1 – yes). To
  // generate tests with Base approach choose 0.
  const positionInference = Number(process.argv[5]);
  // callback type
  const typesOfCallbacks = Number(process.argv[6]);
  // run with dynamic analysis: indicates whether the dynamic analysis of
  // memory reads is used during test generation (0 – no, 1 – yes)
  const dynAnalysis = Number(process.argv[7]);
  // test folder: a path to a folder to put generated test
  const testFolder = process.argv[8];

  if (process.argv.length < 9) {
    console.log('Usage: node testGeneration.js <function names> <number of tests> <setupCode> <feedback directed> <type of callacks> <include dynamic analysis> <test folder> <path to polyfills(optional)>');
    process.exit(1);
  }

  // various setup using the given input parameters
  console.log('AsyncLambdaTester initializing...');
  const setupCode = fs.readFileSync(setup).toString();
  const names = fnNames.split(' ');
  const setupValues = getDefinedVal(setupCode);
  const decisions = new Decisions();
  // fs.mkdirSync(`./${testFolder}`);
  if (dynAnalysis === 1) {
    fs.mkdirSync(`./generated_${testFolder}`);
  }

  // first infer/discover callback positions
  const positions = discoveryPhase(names, setupCode);
  // positions.forEach((position) => { position.positions = position.positions.map((x) => x.split(':')[0]); });
  console.log(positions);

  // // then generate tests
  // testGenerationPhase(
  //   nbOfTests,
  //   testFolder,
  //   positionInference,
  //   setupValues,
  //   names,
  //   decisions,
  //   dynAnalysis,
  //   typesOfCallbacks,
  //   positions,
  //   setupCode,
  // );
};

genTests();
