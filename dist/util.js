"use strict";

var R = require('ramda');

var util = require('util');

function buildRe(re) {
  var _exec = re.exec;

  re.exec = function (string) {
    var resetLastIndexBefore = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (re.global && resetLastIndexBefore) re.lastIndex = 0;

    var m = _exec.call(re, string);

    return m;
  };

  return re;
}
/**
 * low priority value means higher priority. built-in parser use 0
 */


function makeTestResult(re, result) {
  var priority = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  return result ? R.merge({
    lastIndex: re.lastIndex,
    priority: priority
  }, result) : null;
}

function concatLast(ar, e) {
  if (ar.length > 0) {
    var lastidx = ar.length - 1;
    var last = ar[lastidx];
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
  buildRe: buildRe,
  makeTestResult: makeTestResult,
  concatLast: concatLast,
  compact: compact,
  inspect: inspect,
  getParsedProp: getParsedProp
};