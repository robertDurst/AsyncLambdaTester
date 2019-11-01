/**
 * InferringSignature randomly tries various combinations of inputs along with
 * the function f (as the final argument) in attempt to discover at what positions,
 * if any, a method expects a callback as an input. Furthermore, we have extended
 * this original algorithm, as defined in LambdaTester, to also classify positions
 * as expecting synchronous or asynchronous callbacks.
 *
 * Asynchronous classification: the kye intuition here is to realize that asynchronous
 * callbacks are always thrown into the event loop. This means that any code
 * immediately following the deferred asynchronous call will be invoked first (in fact
 * all code on the stack will be executed before the asynchronous callback is invoked).
 * As an example consider the following code snippet:
 *
 *    setTimeout(() => console.log('A'), 0);
 *    console.log('B');
 *
 * While not intuitive, B will actually be logged before A since setTimeout's method is
 * thrown on the event loop at 0... not executed at 0.
 *
 * Based on the above realization, we construct code snippets to test the ordering of the
 * execution, more specifically the logging, of two methods to determine whether or not
 * a callback is executed synchronously or asynchronously. The first is the same method, f,
 * from LambdaTester. The next is a console.log("hello world") statement added after the
 * method under investigation is invoked. If "hello world" is first, the method is asynchronous.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import { Decisions } from '../utilities/randomGenerator';
import { getDefinedVal } from '../utilities/testUtilities';

const decisions = new Decisions();

// testing budget
let maxTests = 100;

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
// position: number of argument positions
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

export function findPositions(setupCode, M) {
  // Initialize C[m] with an empty set for each m ∈ M
  const C = [];

  // for each m ∈ M do
  for (let i = 0; i < M.length; i++) {
    const m = M[i];

    // empty set of callbacks
    const p = { name: m, positions: {} };
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
        if (feedback === 'async' || feedback === 'sync') {
          // Add poscb to C[m]
          if (!p.positions[position]) {
            p.positions[position] = { classifications: [feedback] };
          } else if (p.positions[position].classifications.indexOf(feedback) === -1) {
            p.positions[position].classifications.push(feedback);
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
