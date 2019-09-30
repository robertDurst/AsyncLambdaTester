const PARAMS_TO_TEST = 5;
const MAX_TYPE = 6;

const toType = (index) => {
  switch (index) {
    case 0:
      return 'number';
    case 1:
      return 'string';
    case 2:
      return 'null';
    case 3:
      return 'object';
    case 4:
      return 'array';
    default:
      return 'boolean';
  }
};

const allPossibleInputs = () => {
  const all = [];

  const bar = (cur, left, vals) => {
    if (left === 0) {
      all.push([...cur, 6]);
      return;
    }

    for (let i = 0; i < vals; i++) {
      bar([...cur, toType(i)], left - 1, vals);
    }
  };

  const foo = (size, max) => {
    for (let i = 0; i < size; i++) {
      bar([], i, max);
    }
  };

  foo(PARAMS_TO_TEST, MAX_TYPE);

  return all;
};

exports.allPossibleInputs = allPossibleInputs;
