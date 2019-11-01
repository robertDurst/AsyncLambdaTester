import * as fs from 'fs';
import { discoveryPhase } from './asyncDiscoveryPhase/discoverCallbacks';
import { testGenerationPhase } from './asyncTestGenerationPhase/asyncTestGeneration';
import { Decisions } from './utilities/randomGenerator';
import { getDefinedVal } from './utilities/testUtilities';

const generateTests = () => {
    // ----------------- All the Inputs via the CLI --------------//
    // function names: names of methods under test (e.g., reduce)
    const fnNames = process.argv[2];
    // number of tests: number of tests to be generated
    const nbOfTests = Number(process.argv[3]);
    // setup code: file containing setup code
    const setup = process.argv[4];
    // is feedback directed: indicates whether callback position inference
    // and the feedback are part of test generation (0 – no, 1 – yes). To
    // generate tests with Base approach choose 0.
    const positionInference = Number(process.argv[5]);
    // callback type
    const typesOfCallbacks = Number(process.argv[6]);
    // test folder: a path to a folder to put generated test
    const testFolderPath = process.argv[7];

    if (process.argv.length < 8) {
        console.log('Usage: node testGeneration.js <function names> <number of tests> <setupCode> <feedback directed> <type of callacks> <include dynamic analysis> <test folder> <path to polyfills(optional)>');
        process.exit(1);
    }

    // various setup using the given input parameters
    console.log('AsyncLambdaTester initializing...');
    const setupCode = fs.readFileSync(setup).toString();
    const setupValues = getDefinedVal(setupCode);
    fs.mkdirSync(`./${testFolderPath}`);

    // first infer/discover callback positions
    console.log('Discovery Phase...');
    let positions = discoveryPhase(fnNames.split(' '), setupCode);
    console.log('Discovered the following:');
    console.log(positions);
    console.log('Trimming non-async positions');
    positions = positions.filter(
        (method) => Object.keys(method.positions)
            .filter((position) => method.positions[position]
                .classifications
                .indexOf('async') !== -1).length > 0)
        .map((method) => ({
            name: method.name,
            positions: Object.keys(method.positions),
        }));
    console.log(positions);

    testGenerationPhase(
        nbOfTests,
        typesOfCallbacks,
        fnNames.split(' '),
        setupValues,
        new Decisions(),
        testFolderPath,
        positionInference === 1,
        positions,
        setupCode,
    );
};

generateTests();
