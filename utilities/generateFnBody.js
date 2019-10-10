/**
 * Here is arguably the most interesting part of test generation, namely where we generated
 * the callback functions following one of the outline strategies from the LambdaTester
 * framework defined in the following paper: http://software-lab.org/publications/oopsla2018_LambdaTester.pdf
 */
const qc = require('quick_check');
const callbackProvider = require('../callbackMining/callbackProvider');
const { pickRandomEl } = require('./testUtilities');
const { typeOf } = require('./dirUtility');

// processFn replaces left brackets with a call to push arguments to callback arguments
const processFn = (str) => str.replace('{', '{\n callbackArguments.push(arguments) \n');

// generateReturnVal takes in a collection of arguments, puts a binary operator between,
// unless it is a single argument, then puts a unary operator
function generateReturnVal(args) {
  const uoperations = ['++', '--'];
  const boperations = ['+', '-', '*', '/'];

  if (args.length === 1) {
    return args[0][0] + pickRandomEl(uoperations);
  }

  let str = '';
  for (let i = 0; i < args.length; i++) {
    if (i === args.length - 1) {
      str += args[i][0];
    } else {
      str += args[i][0] + pickRandomEl(boperations);
    }
  }

  return str;
}

// generate writes returns an array of arguments that are writeable
// NOT ACTUALLY SURE WHAT THIS DOES!
function generateWrites(paths, decision, start, nbOfArgs, j, position) {
  const min = 1;
  const max = 4;
  const nbOfWrites = Math.floor(Math.random() * (max - min + 1)) + min;

  const writes = [];

  for (let i = 0; i < nbOfWrites; i++) {
    const a = paths[Math.floor(Math.random() * paths.length)];

    if (a.path !== 'undefined' && a.path.indexOf('callbackReturn') === -1) {
      const { path } = a;
      if (path.indexOf('base') > -1) {
        const newPath = path.replace('base', `base_${j}`);
        const str = `${newPath} = ${JSON.stringify(decision.pickRandomConstant(decision.pickRandomType()))}`;
        writes.push(str);

        // this part has to be tested
      } else if (path.indexOf('argument') > -1) {
        const index = Number(path[8]);
        const newIndex = Number(path[8]) + start - 1;

        // change arguments that will be called only in this invocation
        if (newIndex !== position && newIndex < start + nbOfArgs) {
          const oldArgNb = `argument${index}`;
          const regExp = new RegExp(oldArgNb, 'g');
          const newPath = path.replace(regExp, `argument${newIndex}`);
          const str = `${newPath} = ${JSON.stringify(decision.pickRandomConstant(decision.pickRandomType()))}`;
          writes.push(str);
        }
      }
    }
  }

  return writes;
}

// generate function does 1 of 4 things (referencing paper here):
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
function generateFn(type, decision, fnPool, paths, fnName, start, nbArgs, j, position) {
  switch (type) {
    case 0:
      // empty callback
      return 'function callback(){callbackArguments.push(arguments)}';
    case 1: {
      // quickcheck
      const f = qc.function(qc.any);
      const newStr = processFn(f().toString());
      return newStr;
    }
    case 2: {
      // utilize mined corpus of callbacks
      const minedCallbacks = callbackProvider.getCallbacks(undefined, fnName);
      const c = minedCallbacks[Math.floor(Math.random() * minedCallbacks.length)].toString();
      return processFn(c);
    }
    case 3: {
      // dynamic analysis

      // first check to see if there is a path
      if (paths.length > 0) {
        let args;
        [1, 2, 3][fnName](function () {
          args = arguments;
        });

        // create a string of arguments
        const nbOfArguments = args.length;
        const argsymbol = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
        const currentsymbols = [];
        let argstring = '';
        for (let i = 0; i < nbOfArguments; i++) {
          if (i === nbOfArguments - 1) {
            argstring += argsymbol[i];
          } else {
            argstring += `${argsymbol[i]},`;
          }
          currentsymbols.push([argsymbol[i], typeOf(args[i])]);
        }

        const returnStmt = generateReturnVal(currentsymbols);
        const writes = generateWrites(paths, decision, start, nbArgs, j, position);

        let fnStr = `function callback(${argstring}) { \n`;
        fnStr += 'callbackArguments.push(JSON.stringify(arguments))\n';
        for (let i = 0; i < writes.length; i++) {
          fnStr += `${writes[i]}\n`;
        }

        fnStr += `return ${returnStmt}\n`;
        fnStr += '}';

        return fnStr;
      }

      const randomEl = pickRandomEl(fnPool);
      const returnVal = typeOf(randomEl) === 'object' || typeOf(randomEl) === 'array' ? JSON.stringify(randomEl) : randomEl;

      let fnStr = 'function callback(){\n';
      fnStr += 'callbackArguments.push(JSON.stringify(arguments))\n';
      fnStr += `return ${returnVal}\n`;
      fnStr += '}';

      return fnStr;
    }
    default:
      throw new Error('Unexpected function generation type.');
  }
}

exports.generateFn = generateFn;
