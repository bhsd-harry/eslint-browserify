const List = require('./List.js');

exports.isItNaN = x => x !== x; // eslint-disable-line no-self-compare
exports.reject = List.reject;
exports.any = List.any;
exports.all = List.all;
