const _ = require('underscore');
const { typeOf } = require('./dirUtility');

// getLog defines a method in string form that is to be called by an
// eval or execute call
const getLog = (fileName, base, result, baseArr, resultArr) => {
  const methodStr = 'function serialize(array){\n'
        + 'return array.map(function(a){\n'
        + 'if (a === null || a == undefined) return a;\n'
        + 'var name = a.constructor.name;\n'
        + "if (name==='Object' || name=='Boolean'|| name=='Array'||name=='Number'||name=='String')\n"
        + 'return JSON.stringify(a);\n'
        + 'return name;\n'

        + ' });\n'
        + '}\n';

  const logStr = `${'setTimeout(function(){\n'
        + 'require("fs").writeFileSync("'}${fileName}",JSON.stringify({"baseObjects":serialize(${baseArr}),"returnObjects":serialize(${resultArr}),"callbackArgs":callbackArguments}))\n`
        + '},300)';

  return methodStr + logStr;
};

class Test {
  constructor(setupCode, setupValues) {
    // static information
    this.statements = [];
    this.constantPool = {}; // variable identifier --> all values
    this.lastVarCtr = 0;
    this.varToType = {}; // string --> string
    this.nbOfArgs = 0;
    this.setupCode = setupCode;
    this.setupValues = setupValues;
  }

  // add a name -> constant to the constantPool
  varForConstant(constant, name) {
    const varName = name;
    this.constantPool[varName] = constant;
    return varName;
  }


  // classic toString method, collecting the result of the test
  toString(pool, fnPool) {
    let result = `${this.setupCode}\n`;
    result += 'var callbackArguments = [];\n';

    // constants
    const constantVars = Object.keys(this.constantPool);

    // for each constant variable in the constant pool
    for (let i = 0; i < constantVars.length; i++) {
      // constantVar is the name of the constant
      const constantVar = constantVars[i];
      // constant is the actual value (or the constant) for constantVar (constant's name)
      const constant = this.constantPool[constantVar];

      // turns a constant into a string
      let constantString = typeof constant === 'string' && (this.setupValues.indexOf(constant) > -1
        || constant.indexOf('function') > -1
        || (pool && pool.indexOf(constant) > -1)
        || (fnPool && fnPool.indexOf(constant) > -1)) ? constant : `"${constant}"`;

      // if constant is an array or an object stringify it, otherwise use the constant value
      if (Array.isArray(constant) || (constant && typeOf(constant) === 'object')) {
        constantString = JSON.stringify(constant);
      } else if (typeof constant === 'boolean' || typeOf(constant) === 'null' || typeof constant === 'number' || constant.indexOf('r_') === 0 || constant.indexOf('base_') === 0) {
        constantString = constant;
      }

      result += `var ${constantVar} = ${constantString};\n`;
    }

    // for each statement, if base variable and return variable, append a try catch around
    // it, otherwise just turn it into a string
    for (let i = 0; i < this.statements.length; i++) {
      const statement = this.statements[i];
      const { baseVar, retVar } = statement;

      if (baseVar && retVar) {
        result += `try {\n${statement}\n}\ncatch(e) {\n${retVar}= 'Error'\n}\n`;
      } else {
        result += `${statement}\n`;
      }
    }

    return result;
  }

  // clone returns a cloned version of itself
  clone() {
    const clonedTest = new Test();

    clonedTest.nbOfArgs = this.nbOfArgs;
    clonedTest.setupCode = this.setupCode;
    clonedTest.setupValues = this.setupValues;
    this.statements.forEach((statement) => clonedTest.statements.push(_.clone(statement)));
    clonedTest.constantPool = _.clone(this.constantPool);
    clonedTest.lastVarCtr = this.lastVarCtr;
    clonedTest.varToType = JSON.parse(JSON.stringify(this.varToType));

    return clonedTest;
  }
}

module.exports = {
  Test,
  getLog,
};
