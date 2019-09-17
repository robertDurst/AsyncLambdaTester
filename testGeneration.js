const fs = require('fs');
const { findPositions } = require('./utilities/inferringSignature.js');

const genTests = () => {
  const fnNames = process.argv[2];
  const setup = process.argv[3];

  if (process.argv.length < 3) {
    console.log('Usage: node testGeneration.js <function names> <setupCode>');
    process.exit(1);
  }

  const setupCode = fs.readFileSync(setup).toString();
  const names = fnNames.split(' ');
  let positions = [];
  console.log('Discovery phase...');
  positions = findPositions(setupCode, names);
  console.log(positions);
};

genTests();
