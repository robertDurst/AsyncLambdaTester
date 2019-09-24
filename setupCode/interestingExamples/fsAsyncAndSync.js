const fs = require('fs');

fs.foo = (a, b, c, d) => {
  try {
    setTimeout(b, 0);
  } catch (e) { console.log('error'); }
  a();
  console.log(d);
  console.log(c + 1);
};
