const fs = require('fs');
const esprima = require('esprima');
const estraverse = require('estraverse');
const { execSync } = require('child_process');
const { Decisions } = require('./randomGenerator.js');
const { allPossibleInputs } = require('./allInputGenerator');

const decisions = new Decisions();

// testing budget
const maxTests = 100;

// callback function to test
const f = 'var f = function () { console.log("I am executed");}';

// selects a random element from a given array
function pickRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPositions(counts) {
  // find minimal count
  let min = { index: 0, count: counts[0] };
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] < min.count) {
      min = { index: i, count: counts[i] };
    }
  }

  return min.index;
}

// given some setupCode, traverse its ast, capturing all
// variable declarations as possible "defined values", returning
// these variables as a "pool"
function getDefinedVal(setupCode) {
  const pool = [];
  const ast = esprima.parse(setupCode);
  estraverse.traverse(ast, {
    enter(node, parent) {
      // node's:
      //  * type is VariableDeclarator
      //  * value is initialized
      //  * it is not assigned a require (import) or it is not assigned a callee at all
      if (node.type === 'VariableDeclarator' && node.init) {
        pool.push(node.id.name);
      }
    },
  });
  return pool;
}

function getRandomVal(fnName) {
  const randomVal = [];
  for (let i = 0; i < decisions.constantTypes.length; i++) {
    const type = decisions.constantTypes[i];
    const randomObj = decisions.pickRandomConstant(type);
    // if this is a function...
    if (randomObj && randomObj[fnName] && typeof randomObj[fnName] === 'function') {
      randomVal.push(randomObj);
    }
  }
  return randomVal;
}

function getValue(type) {
  return decisions.pickRandomConstant(type);
}

// constructs a function as a raw string
// setupCode: the code from the specified setup code from the cli invocation
// apiName: method name under test
// baseObj: receiver of the method call
// position: number of argument positions
function constructString(setupCode, apiName, baseObj, position, positionTypes) {
  let str = `${setupCode}\n`;

  // raw method string with a callback (see top of file for definition)
  str += `${f}\n`;

  // the receiver of the method call
  str += `var base =${baseObj}\n`;

  // surround the method invocation in a try-catch in case we are trying
  // somthing illegal/nonsensical that throws
  str += 'try{\n';

  // call apiName on the receiving object
  str += `base.${apiName}(`;

  // for each pos < max_params do
  for (let i = 1; i <= position; i++) {
    // if pos = poscb then
    if (i === position) {
      // varcb ← callback function that logs calls to it
      // Append varcb to args
      str += 'f';
    } else {
      // Append vararg to args
      str += `${JSON.stringify(getValue(positionTypes[i]))},`;
    }
  }

  str += ')';
  str += '}catch(e){\n';
  str += '};\n';
  str += 'console.log("hello world");';

  return str;
}

// execute takes in a function to execute as a raw string, synchronously
// writes to to the "testposition.js" file, synchronously executes this
// file, and then returns true/false indicating if the test executed
// with feedback that the callback was executed
function execute(str) {
  try {
    let feedback = 'none';
    fs.writeFileSync('./testPosition.js', str);
    const output = execSync('node testPosition.js');
    const callbackFeedback = output.indexOf('I am executed');
    const asynchronousCheck = output.indexOf('hello world');

    // due to the nature of the event loop, asynchronous callbacks will be
    // executed after the dummy console.log invocation
    if (callbackFeedback !== -1 && (asynchronousCheck < callbackFeedback)) {
      feedback = 'async';
    } else if (callbackFeedback !== -1) {
      feedback = 'sync';
    }

    return feedback;
  } catch (e) {
    return false;
  }
}

function findPositions(setupCode, M) {
  // Initialize C[m] with an empty set for each m ∈ M
  const C = [];

  // for each m ∈ M do
  for (let i = 0; i < M.length; i++) {
    const m = M[i];

    // empty set of callbacks
    const p = { name: m, positions: [] };
    // assume, by default 5 arguments
    const counts = [1, 1, 1, 1, 1];

    allPossibleInputs().forEach((input) => {
      // test ← new test starting with setup
      const basePools = getDefinedVal(setupCode);

      // var rec ← selectReceiver(V,m)
      let rec;
      if (basePools.length > 0) {
        rec = pickRandomElement(basePools);
      } else {
        rec = JSON.stringify(pickRandomElement(getRandomVal(m)));
      }

      if (rec) {
        const position = input.indexOf(6);
        const typePositions = input.slice(0, input.length - 1);
        const testStr = constructString(setupCode, m, rec, position, typePositions);

        // feedback ← execute(test)
        const feedback = execute(testStr);
        // if feedback has non-empty log then
        if (feedback === 'async' || feedback === 'sync') {
          // Add poscb to C[m]
          if (p.positions.indexOf(`${position}: ${feedback}`) === -1) {
            p.positions.push(`${position}: ${feedback}`);
          }
        }
        counts[position]++;
      }
    });


    C.push(p);
  }

  // return C
  return C;
}

exports.findPositions = findPositions;
