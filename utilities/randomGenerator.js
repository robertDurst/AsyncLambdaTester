const seedrandom = require('seedrandom');

function Random(seed) {
  // initialize seedrandom so that it overwrites Math.random with deterministic PRNG
  seedrandom(seed, {
    global: 'true',
  });

  this.nextNb = Math.random;
}

Random.prototype = {
  pickFromArray(array) {
    const index = Math.round(this.nextNb() * (array.length - 1));
    return array[index];
  },
  pickIndex(length) {
    return Math.round(this.nextNb() * (length - 1));
  },
};
function Decisions() {
  this.constantTypes = ['number', 'string', 'null', 'boolean', 'array', 'object'];

  this.charsForRandomStrings = [];
  for (let charCode = 32; charCode < 126; charCode++) {
    // charCode 34 is " We do not want to include it. This generates strings for examples
    // W" which are syntax errors
    if (charCode !== 34 && charCode !== 46 && charCode !== 92 && charCode !== 47) {
      this.charsForRandomStrings.push(String.fromCharCode(charCode));
    }
  }

  // We might want to serialize the seed along with the generated tests in order to replicate
  // the failure
  const seed = Math.floor(100);
  this.r = new Random(seed);

  this.randomNumberPool = [Number.MIN_VALUE, -100, -1, 0, 100, Number.MAX_VALUE];

  const sizeOfRandomNumberPool = 30;
  while (this.randomNumberPool.length !== sizeOfRandomNumberPool) {
    this.randomNumberPool.push(Math.floor(this.r.nextNb() * 1000));
  }
}

Decisions.prototype = {

  pickRandomConstant(typeToGenerate) {
    switch (typeToGenerate) {
      case 'boolean':
        return this.pickRandomBoolean();
      case 'string':
        return this.pickRandomString();
      case 'number':
        return this.pickRandomNumber();
      case 'null':
        return null;
      case 'array':
        return this.pickRandomArray();
      case 'object':
        return this.pickRandomObject();
      default:
        throw new Error('Should never be reached.');
    }
  },
  pickRandomBoolean() {
    return this.r.nextNb() < 0.5;
  },
  pickRandomObject() {
    const obj = {};
    const objSize = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const length = this.r.pickFromArray(objSize);
    let prop;
    let val;
    while (Object.keys(obj).length !== length) {
      prop = this.r.nextNb() < 0.5
        ? this.pickRandomString()
        : this.pickRandomNumber().toFixed(0);
      val = this.r.nextNb() < 0.5
        ? this.pickRandomString()
        : this.pickRandomNumber();
      obj[prop] = val;
    }
    return obj;
  },
  pickRandomArray() {
    const randomArray = [];
    const arrayLengths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const length = this.r.pickFromArray(arrayLengths);
    const PossibleArrayTypes = ['string', 'number', 'both'];
    const arrayType = this.r.pickFromArray(PossibleArrayTypes);
    if (arrayType === 'string') {
      while (randomArray.length !== length) {
        let randomString = this.pickRandomString();
        while (randomString.length === 0 || randomString.indexOf("'") !== -1) {
          randomString = this.pickRandomString();
        }
        randomArray.push(randomString);
      }
    } else if (arrayType === 'number') {
      while (randomArray.length !== length) {
        randomArray.push(this.r.pickFromArray(this.randomNumberPool));
      }
    } else if (arrayType === 'both') {
      while (randomArray.length !== length) {
        if (this.r.nextNb() < 0.5) {
          randomArray.push(this.r.pickFromArray(this.randomNumberPool));
        } else {
          let randomString = this.pickRandomString();
          while (randomString.length === 0 || randomString.indexOf("'") !== -1) {
            randomString = this.pickRandomString();
          }
          randomArray.push(randomString);
        }
      }
    }
    // console.log(randomArray);
    if (!Array.isArray(randomArray)) {
      throw new Error('Not Array');
    }
    return randomArray;
  },

  pickRandomString() {
    let s = '';
    while (this.r.nextNb() < 0.5) {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      for (let i = 0; i < 5; i++) {
        s += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return s;
    }
    return s;
  },
  pickRandomNumber() {
    // 50-50 chance to pick from pre-defined pool of numbers or purely random
    if (this.r.nextNb() < 0.5) {
      return this.r.pickFromArray(this.randomNumberPool);
    }
    return Number.MAX_VALUE * this.r.nextNb();
  },

  pickArguments(types) {
    const args = [];

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      args.push(this.pickRandomConstant(type));
    }

    return args;
  },
  pickRandomNbOfArgs(min) {
    const max = 3;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  pickRandomType() {
    return this.constantTypes[Math.floor(Math.random() * this.constantTypes.length)];
  },
};

exports.Decisions = Decisions;
