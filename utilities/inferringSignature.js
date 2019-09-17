const fs = require('fs');
const esprima = require('esprima');
const estraverse = require('estraverse');
const { execSync } = require('child_process');
const { Decisions } = require('./randomGenerator.js');

const decisions = new Decisions();
let maxTests = 100;
const f = 'var f = function () { console.log("I am executed");}';

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

function getDefinedVal(setupCode) {
  const pool = [];
  const ast = esprima.parse(setupCode);
  estraverse.traverse(ast, {
    enter(node, parent) {
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

function constructString(setupCode, apiName, baseObj, position) {
  // setup code
  let str = `${setupCode }\n`;
  str += `${f}\n`;
  str += `var base =${baseObj }\n`;
  str += 'try{ +\n';
  str += `base.${apiName }(`;
  for (let i = 1; i <= position; i++) {
    if (i === position) {
      str += 'f';
    } else {
      pickRandomElement(decisions.constantTypes);
      str += `${JSON.stringify(getValue(setupCode)) },`;
    }
  }
  str += ')';
  str += '}catch(e){\n';
  str += '};\n';

  return str;
}

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

function findPositions(setupCode, names) {
  const positions = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];

    const p = { name, positions: [] };
    const counts = [1, 1, 1, 1, 1];

    while (maxTests >= 0) {
      const basePools = getDefinedVal(setupCode);
      let baseObj;
      if (basePools.length > 0) {
        baseObj = pickRandomElement(basePools);
      } else {
        baseObj = JSON.stringify(pickRandomElement(getRandomVal(name)));
      }

      if (baseObj) {
        const position = getPositions(counts);
        const testStr = constructString(setupCode, name, baseObj, position);

        const feedback = execute(testStr);
        if (feedback === true) {
          if (p.positions.indexOf(position) === -1) {
            p.positions.push(position);
          }
        }
        counts[position]++;
      }
      maxTests--;
    }
    positions.push(p);
    maxTests = 100;
  }
  return positions;
}

exports.findPositions = findPositions;
