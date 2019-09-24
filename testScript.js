const { execSync } = require('child_process');
const ProgressBar = require('progress');

// https://stackoverflow.com/questions/5842654/how-to-get-an-objects-methods#5842695
const getMethods = (obj) => {
  const res = [];
  for (const m in obj) {
    if (typeof obj[m] === 'function') {
      res.push(m);
    }
  }
  return res;
};

const checkSync = (m, setup) => {
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
};

const getResultsForModule = (moduleName, setup) => {
  const moduleObj = require(moduleName);
  const ms = getMethods(moduleObj);
  const c = [];
  const bar = new ProgressBar(`discovering callback positions for module: ${moduleName} [:bar] `, {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: ms.length,
  });

  for (let i = 0; i < ms.length; i++) {
    const classification = checkSync(ms[i], setup);
    c.push({
      name: ms[i],
      classification,
    });
    bar.tick();
  }

  return c;
};
