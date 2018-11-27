"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var R = require('ramda');

var _require = require('./util'),
    buildRe = _require.buildRe,
    makeTestResult = _require.makeTestResult,
    compact = _require.compact,
    inspect = _require.inspect,
    getParsedProp = _require.getParsedProp;

var _require2 = require('./basic_matcher'),
    BasicMatcher = _require2.BasicMatcher;

var _require3 = require('./heading_counter'),
    HeadingCounter = _require3.HeadingCounter;

var Parser =
/*#__PURE__*/
function () {
  function Parser(opt) {
    _classCallCheck(this, Parser);

    this.option = R.merge({
      includeRoot: true,
      // parse시 'markdown' tag와 prop을 붙인다.
      includeHeadingNumber: true,
      // heading의 prop에 number로 번호를 붙인다.
      parseToc: false,
      // tocPattern을 목차로 바꾼다.
      parseFootnote: false,
      // footnotePattern을 각주로 바꾼다.
      tocPattern: /^{toc}$/,
      // 목차 패턴
      footnotePattern: /\[\*([^\s]+)?\s([^\]]+)\]/g // 각주 패턴

    }, opt);
    this.matcher = new BasicMatcher({
      includeHeadingNumber: this.option.includeHeadingNumber,
      footnotePattern: buildRe(this.option.footnotePattern)
    }); // NOTE: inline regex should have `global` option

    var matchStrike = this.makeBasicInlineMatcher(/~+(.+?)~+/g, {
      tag: 's'
    });
    var matchBold = this.makeBasicInlineMatcher(/\*{2,}(.+?)\*{2,}/g, {
      tag: 'b'
    });
    var matchItalic = this.makeBasicInlineMatcher(/\*(.+?)\*/g, {
      tag: 'i'
    });
    var matchUnderscore = this.makeBasicInlineMatcher(/_+(.+?)_+/g, {
      tag: 'u'
    });
    var matchInlineCode = this.makeBasicInlineMatcher(/`(.+?)`/g, {
      tag: 'code'
    });
    this.blockMatchers = [{
      matcher: this.matcher.matchHeading
    }, {
      matcher: this.matcher.matchRuler
    }, {
      matcher: this.matcher.matchList
    }, {
      matcher: this.matcher.matchTable
    }, {
      matcher: this.matcher.matchBlockQuote
    }, {
      matcher: this.matcher.matchCode,
      terminal: true
    }];
    this.inlineMatchers = compact([{
      matcher: matchStrike
    }, {
      matcher: matchBold
    }, {
      matcher: matchItalic
    }, {
      matcher: matchUnderscore
    }, {
      matcher: matchInlineCode,
      terminal: true
    }, {
      matcher: this.matcher.matchLink,
      terminal: true
    }, this.option.parseFootnote ? {
      matcher: this.matcher.matchFootnote,
      terminal: true
    } : null]);
  }

  _createClass(Parser, [{
    key: "makeBasicInlineMatcher",
    value: function makeBasicInlineMatcher(re, attr) {
      re = buildRe(re);
      return function (string, test) {
        var result = re.exec(string);
        if (!result) return null;
        if (test) return makeTestResult(re, result);
        var outer = result[0];
        var inner = result[1];
        return [attr.tag, inner];
      };
    }
  }, {
    key: "addBlockParser",
    value: function addBlockParser(blockParser) {
      var isTerminal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      this.blockMatchers.push({
        matcher: blockParser,
        terminal: isTerminal
      });
    }
  }, {
    key: "addInlineParser",
    value: function addInlineParser(inlineParser) {
      var isTerminal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      this.inlineMatchers.push({
        matcher: inlineParser,
        terminal: isTerminal
      });
    }
  }, {
    key: "parse",
    value: function parse(mdtext) {
      var _this = this;

      this.matcher.init();
      var parsed = [];
      var s = mdtext;

      var _loop = function _loop() {
        // 먼저 test모드로 돌려본다.
        var m = _this._bestMatch(_this.blockMatchers, s);

        if (!m) {
          _this._addParagraph(parsed, s);

          return "break";
        }

        if (m.testResult.index > 0) {
          var plain = s.substring(0, m.testResult.index);

          _this._addParagraph(parsed, plain);
        } // best matched로 실제 parse
        // FIXME el could be null (테스트에서는 가능했지만 실제 파싱이 불가능한 경우?)


        var els = m.matcher(s, false);

        if (R.type(els[0]) != "Array") {
          els = [els];
        }

        els.forEach(function (el) {
          // traverse하며 inline parse를 적용한다.
          var inlinedEl = m.terminal ? el : _this.parseInline(el);
          // root parse tree에 추가한다.
          parsed.push(inlinedEl);
        });
        var lastIndex = m.testResult.lastIndex;
        s = s.substring(lastIndex);
      };

      while (!!s && s.length > 0) {
        var _ret = _loop();

        if (_ret === "break") break;
      } //console.log(`FINALLY PARSED:\n${inspect(parsed)}`);


      var tocParsed = false;

      if (this.option.parseToc) {
        var toc = this.parseToc(parsed); //console.log(`PARSED TOC:\n${inspect(toc)}`);

        parsed = parsed.map(function (el) {
          if (el[0] === 'p' && _this.option.tocPattern.test(el[1])) {
            tocParsed = true;
            return toc;
          } else {
            return el;
          }
        });
      }

      if (this.matcher.footnotes.length > 0) {
        var footnotes = R.prepend('footnotes', this.matcher.footnotes);
        parsed.push(this.parseInline(footnotes));
      }

      if (this.option.includeRoot) {
        return R.concat(['markdown', {
          tocParsed: tocParsed,
          footnoteParsed: this.option.parseFootnote
        }], parsed);
      } else {
        return parsed;
      }
    } // headings를 toc로 만들어준다.
    // ['toc', ['toc-item', {level: 1, number: '1.'}, 'introduction', ['s', 'intro']], ...]

  }, {
    key: "parseToc",
    value: function parseToc(parsed) {
      var headings = R.filter(function (a) {
        return R.type(a) === "Array" && R.head(a) === 'h' && a[1].level <= 3;
      }, R.drop(1, parsed));
      var counter = new HeadingCounter();
      var list = headings.map(function (h) {
        var lev = h[1].level;
        var num = counter.increase(lev);
        return R.unnest(['toc-item', {
          level: lev,
          number: num
        }, R.drop(2, h)]);
      });
      return R.prepend('toc', list);
    }
  }, {
    key: "parseInline",
    value: function parseInline(el) {
      return this._applyOnTreePlains(el, this._parseInline.bind(this));
    }
  }, {
    key: "_bestMatch",
    value: function _bestMatch(matchers, string) {
      var candidatesResults = matchers.map(function (m) {
        var testResult = m.matcher(string, true);
        if (!testResult) return null;
        return R.merge({
          testResult: testResult
        }, m);
      });

      if (R.isEmpty(compact(candidatesResults))) {
        return null;
      } // 가장 가까이 매치된 것을 선정


      var bestMatched = compact(candidatesResults).reduce(function (last, val) {
        if (val.testResult.index < last.testResult.index) {
          return val;
        } else if (val.testResult.index > last.testResult.index) {
          return last;
        } else {
          return val.testResult.priority < last.testResult.priority ? val : last;
        }
      }, {
        testResult: {
          index: string.length
        }
      });
      return bestMatched;
    }
    /*
     * tree를 순회하면서 plain에 대해 applyfn을 적용한다.
     * ['tag', 'plain', 'plain2', ['t', 'another md']]
     * ['tag', {attr}, 'plain', 'plain2', ['t', 'another md']]
     */

  }, {
    key: "_applyOnTreePlains",
    value: function _applyOnTreePlains(ar, applyfn) {
      var _this2 = this;

      return R.unnest(R.prepend(ar[0], ar.slice(1).map(function (e) {
        if (R.type(e) == 'String') {
          return applyfn(e);
        } else if (R.type(e) == 'Array') {
          // 이건 unnest되면 안되니 []로 감싸준다.
          // FIXME 더 좋은 방법이 없을까?
          return [_this2._applyOnTreePlains(e, applyfn)];
        } else {
          return e;
        }
      })));
    }
  }, {
    key: "_parseInline",
    value: function _parseInline(s, depth) {
      if (!depth) depth = 0;
      var matched = [];
      /*
      if(R.type(s) != 'String') {
        console.log(`${s} SHOULD BE STRING FOR INLINE!!!`);
        return s;
      }
      */

      if (s === '') return [''];

      while (!!s && s.length > 0) {
        var m = this._bestMatch(this.inlineMatchers, s);

        if (!m) {
          matched.push(s);
          break;
        }

        if (m.testResult.index > 0) {
          var plain = s.substring(0, m.testResult.index);
          matched.push(plain);
        }

        // best matched로 실제 parse
        var el = m.matcher(s, false);
        // apply inline parser to child
        // inline은 하나의 string에서 여러 el을 만들지 않기 때문에 모두 들어갈 필요는 없다.
        var hasAttr = R.type(el[1]) == 'Object';
        var child = hasAttr ? el[2] : el[1];
        var childEl = void 0;

        if (!m.terminal && !!child) {
          childEl = this._parseInline(child, depth + 1);
        }

        var lastIndex = m.testResult.lastIndex;
        s = s.substring(lastIndex);
        var finalEl = childEl ? hasAttr ? [el[0], el[1]].concat(_toConsumableArray(childEl)) : [el[0]].concat(_toConsumableArray(childEl)) : el;
        matched.push(finalEl);
      }

      return matched;
    }
  }, {
    key: "_addParagraph",
    value: function _addParagraph(parsed, text) {
      var _this3 = this;

      var paras = text.split("\n\n").map(function (s) {
        var para = null;
        s = s.trim();

        if (s.length > 0 && s != '\n') {
          para = _this3.parseInline(['p', s]);
        }

        return para;
      });
      parsed.push.apply(parsed, _toConsumableArray(compact(paras)));
    }
  }]);

  return Parser;
}();

module.exports = {
  Parser: Parser,
  getParsedProp: getParsedProp,
  makeTestResult: makeTestResult,
  inspect: inspect
};