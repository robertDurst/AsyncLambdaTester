const fs = require('fs');
const esprima = require('esprima');
const estraverse = require('estraverse');
const { execSync } = require('child_process');
const { Decisions } = require('./randomGenerator.js');

const decisions = new Decisions();

// testing budget
let maxTests = 100;

// calback function to test
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
      if (node.type === 'VariableDeclarator' && node.init && (!node.init.callee || node.init.callee.name !== 'require')) {
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

function getValue(setupCode) {
  const pool = getDefinedVal(setupCode).concat(decisions.constantTypes);
  const randomEl = pickRandomElement(pool);
  if (decisions.constantTypes.indexOf(randomEl) > -1) {
    return decisions.pickRandomConstant(randomEl);
  }
  return randomEl;
}

// constructs a function as a raw string
// setupCode: the code from the specified setup code from the cli invocation
// apiName: method name under test
// baseObj: receiver of the method call
// position:
function constructString(setupCode, apiName, baseObj, position) {
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
      // vararg ← randomChoice(V )
      pickRandomElement(decisions.constantTypes);
      // Append vararg to args
      str += `${JSON.stringify(getValue(setupCode))},`;
    }
  }
  str += ')';
  str += '}catch(e){\n';
  str += '};\n';

  return str;
}

// execute takes in a function to execute as a raw string, synchronously
// writes to to the "testposition.js" file, synchronously executes this
// file, and then returns true/false indicating if the test executed
// with feedback that the callback was executed
function execute(str) {
  try {
    fs.writeFileSync('./testPosition.js', str);
    const output = execSync('node testPosition.js');
    const feedback = output.indexOf('I am executed') > -1;
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

    // while testing budget not exceeded do
    while (maxTests >= 0) {
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
        const position = getPositions(counts);
        const testStr = constructString(setupCode, m, rec, position);

        // feedback ← execute(test)
        const feedback = execute(testStr);
        // if feedback has non-empty log then
        if (feedback === true) {
          // Add poscb to C[m]
          if (p.positions.indexOf(position) === -1) {
            p.positions.push(position);
          }
        }
        counts[position]++;
      }

      maxTests--;
    }
    C.push(p);
    maxTests = 100;
  }

  // return C
  return C;
}

exports.findPositions = findPositions;
