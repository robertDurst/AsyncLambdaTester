const fs = require('fs');
const { execSync } = require('child_process');

// https://stackoverflow.com/questions/5842654/how-to-get-an-objects-methods#5842695
function getMethods(obj) {
  const res = [];
  for (const m in obj) {
    if (typeof obj[m] === 'function') {
      res.push(m);
    }
  }
  return res;
}

function checkSync(m, setup) {
  try {
    const output = execSync(`node testGeneration.js ${m} ${setup}`);
    const noCallbacks = output.indexOf('position: []') > -1;
    const isAsync = output.indexOf('isAsync: true') > -1;

    if (noCallbacks) {
      return 'none';
    } if (isAsync) {
      return 'async';
    }
    return 'sync';
  } catch (e) {
    return false;
  }
}

const ms = getMethods(fs);
const c = [];
for (let i = 0; i < ms.length; i++) {
  const classification = checkSync(ms[i], './setupCode/setupFs.js');
  console.log(`${ms[i]}: ${classification}`);
  c.push({
    name: ms[i],
    classification,
  });
}
