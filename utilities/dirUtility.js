// not really sure what the point of this is, yet here it
// stands, a custom typeof method
const typeOf = (value) => {
  if (value instanceof Array) return 'array';
  if (value === null) return 'null';
  return typeof value;
};

module.exports = {
  typeOf,
};
