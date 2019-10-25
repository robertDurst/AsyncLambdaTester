const { typeOf } = require('./dirUtility');

// a call represents the contents of a method call, containing the
// base, a filter, the arguments, and the receiving variable, where
// the filter is actually the method being called (and thus the base
// is the metod on which the receiver is called)
class Call {
  constructor(baseVar, argVars, retVar, filter) {
    this.baseVar = baseVar;
    this.filter = filter;
    this.argVars = argVars;
    this.retVar = retVar;
  }

  toString() {
    if (!this.filter) {
      console.log(this);
    }
    if (typeOf(this.baseVar) === 'array' || typeOf(this.baseVar) === 'object') {
      this.baseVar = JSON.stringify(this.baseVar);
    }

    return `${this.retVar} = ${this.baseVar}.${this.filter}(${this.argVars.slice(0, this.argVars.length)})`;
  }

  clone() {
    return new Call(this.baseVar, this.argVars, this.retVar, this.filter);
  }
}

module.exports = {
  Call,
};
