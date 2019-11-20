const esprima = require('esprima');
const estraverse = require('estraverse');
const { execSync } = require('child_process');
const random = require('random');

// extendPool takes in a pool and a collection of decisions, or
// possible types, pick a random constant for the given type if
// the type is null, undefined, or boolean and extends the pool
// array
const extendPool = (pool, decisions) => {
  for (let i = 0; i < decisions.constantTypes.length; i++) {
    const type = decisions.constantTypes[i];
    if (type === 'null' || type === 'undefined' || type === 'boolean') {
      const el = decisions.pickRandomConstant(type);
      pool.push(el);
    }
  }

  return pool;
};

function getRandomInt(max) {
  return random.int(0, max < 0 ? 0 : max);
}

// get random element from an array
const pickRandomEl = (arr) => arr[getRandomInt(arr.length - 1)];

// attempt to return an element from positions with the given fnName, if
// not found, return an empty array
const getElFromMap = (fnName, positions) => {
  for (let i = 0; i < positions.length; i++) {
    if (positions[i].name && positions[i].name === fnName) {
      return positions[i].positions;
    }
  }
  return [];
};

// for some setupCode, parse and traverse, returning a pool of variables from
// the setupCode where the variable is initialized and the callee (or the expression
// assigned to the variable is not the result of require and does exist, i.e. is not null
// and zero??? -- may be a JavaScript truthiness error here)
function getDefinedVal(setupCode) {
  const pool = [];
  const ast = esprima.parse(setupCode);
  estraverse.traverse(ast, {
    enter(node) {
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

// given some funtion name (fnName), and decisions, an array of types, retreive a type
// and grab a random constant of that type where randomObj, the selected random type
// is a function with the given function name. What this does is retreive an object that
// contains the given function as a type on itself, aka is a property on the selected
// random object. ie the array as a base works for forEach.
const getRandomBase = (fnName, decisions) => {
  for (let i = 0; i < decisions.constantTypes.length; i++) {
    const type = decisions.constantTypes[i];
    const randomObj = decisions.pickRandomConstant(type);

    if (randomObj && randomObj[fnName] && typeof randomObj[fnName] === 'function') {
      return randomObj;
    }
  }
  return undefined;
};

// given an array, return a stringified version: "[1,2,3]"" for [1,2,3]
const makeStr = (arr) => {
  let str = '[';
  for (let i = 0; i < arr.length; i++) {
    if (i === (arr.length - 1)) {
      str += `${arr[i]}]`;
    } else {
      str += `${arr[i]},`;
    }
  }

  return str;
};

// attempt to execute the test, returning an error if one exists (feedback)
const getFeedback = (test) => {
  const feedback = { error: null };
  try {
    execSync(`timeout 5 node ${test}`).toString();
  } catch (e) {
    feedback.error = e.message;
  }

  return feedback;
};

module.exports = {
  extendPool,
  pickRandomEl,
  getElFromMap,
  getDefinedVal,
  getRandomBase,
  makeStr,
  getFeedback,
};
