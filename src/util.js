const R = require('ramda');
const util = require('util');

function buildRe(re) {
  const _exec = re.exec;
  re.exec = (string, resetLastIndexBefore=true) => {
    if(re.global && resetLastIndexBefore) re.lastIndex = 0;
    const m = _exec.call(re, string);
    return m;
  }
  return re;
}

/**
 * low priority value means higher priority. built-in parser use 0
 */
function makeTestResult(re, result, priority=0) {
  return result ? 
    R.merge({ lastIndex: re.lastIndex, priority }, result) : null;
}

function concatLast(ar, e) {
  if(ar.length > 0) {
    const lastidx = ar.length - 1;
    const last = ar[lastidx];
    ar[lastidx] = last.concat(e);
  } else {
    ar.push(e);
  }
}

function compact(ar) {
  return R.reject(R.isNil, ar);
}

function inspect(o) {
  return util.inspect(o, false, null);
}

function getParsedProp(parsed) {
  return parsed && parsed[0] === 'markdown' ? parsed[1] : {};
}

module.exports = { 
  buildRe, 
  makeTestResult,
  concatLast,
  compact,
  inspect,
  getParsedProp
};
