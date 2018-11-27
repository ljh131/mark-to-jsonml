"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var HeadingCounter =
/*#__PURE__*/
function () {
  function HeadingCounter() {
    _classCallCheck(this, HeadingCounter);

    this.init();
  }

  _createClass(HeadingCounter, [{
    key: "init",
    value: function init() {
      this.counter = {
        h1: 0,
        h2: 0,
        h3: 0
      };
    }
  }, {
    key: "increase",
    value: function increase(lev) {
      var num;

      if (lev == 1) {
        this.counter.h1 += 1;
        this.counter.h2 = 0;
        this.counter.h3 = 0;
        num = "".concat(this.counter.h1, ".");
      } else if (lev == 2) {
        this.counter.h2 += 1;
        this.counter.h3 = 0;
        num = "".concat(this.counter.h1, ".").concat(this.counter.h2, ".");
      } else if (lev == 3) {
        this.counter.h3 += 1;
        num = "".concat(this.counter.h1, ".").concat(this.counter.h2, ".").concat(this.counter.h3, ".");
      }

      return num;
    }
  }]);

  return HeadingCounter;
}();

module.exports = {
  HeadingCounter: HeadingCounter
};