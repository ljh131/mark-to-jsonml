'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var R = require('ramda');
var util = require('util');

var Parser = function () {
  function Parser(opt) {
    var _this = this;

    _classCallCheck(this, Parser);

    this.option = R.merge({
      enableLog: false,
      includeRoot: true
    }, opt);
    this.debug = this.option.enableLog ? function () {
      var _console;

      return (_console = console).log.apply(_console, arguments);
    } : function () {};

    this.debug('parser option: ' + inspect(this.option));

    // NOTE: inline regex should have `global` option
    var matchStrike = this.makeBasicInlineMatcher(/~~(.+?)~~/g, { tag: 's' });
    var matchBold = this.makeBasicInlineMatcher(/\*\*(.+?)\*\*/g, { tag: 'b' });
    var matchItalic = this.makeBasicInlineMatcher(/\*(.+?)\*/g, { tag: 'i' });
    var matchUnderscore = this.makeBasicInlineMatcher(/_(.+?)_/g, { tag: 'u' });

    this.BLOCK_MATCHERS = [{ matcher: this.matchHeading }, { matcher: this.matchRuler }, { matcher: this.matchList }, { matcher: this.matchBlockQuote }, { matcher: this.matchCode, terminal: true }].map(function (m) {
      m.matcher = m.matcher.bind(_this);
      return m;
    });

    this.INLINE_MATCHERS = [{ matcher: matchStrike }, { matcher: matchBold }, { matcher: matchItalic }, { matcher: matchUnderscore }, { matcher: this.matchLinkAndImage, terminal: true }].map(function (m) {
      m.matcher = m.matcher.bind(_this);
      return m;
    });
  }

  _createClass(Parser, [{
    key: 'parse',
    value: function parse(mdtext) {
      var parsed = [];
      this.debug("START PARSE");

      var s = mdtext;
      while (!!s && s.length > 0) {
        // 먼저 test모드로 돌려본다.
        this.debug('BEGIN test match string: \'' + s + '\'');

        var m = this.bestMatch(this.BLOCK_MATCHERS, s);
        if (!m) {
          this.debug('no match: ', s);
          this.addParagraph(parsed, s);
          break;
        }

        if (m.testResult.index > 0) {
          var plain = s.substring(0, m.testResult.index);
          this.debug('no matched as plain: \'' + plain + '\'');
          this.addParagraph(parsed, plain);
        }

        // best matched로 실제 parse
        var el = m.matcher(s, false);

        this.debug('MATCHER ' + m.matcher.name + ', parse result: ' + inspect(el));

        var lastIndex = m.testResult.lastIndex;
        s = s.substring(lastIndex);

        // traverse하며 inline parse를 적용한다.
        var inlinedEl = m.terminal ? el : this.parseInline(el);
        this.debug('INLINE PARSED: ' + inspect(inlinedEl));

        // root parse tree에 추가한다.
        parsed.push(inlinedEl);
      }

      this.debug('FINALLY PARSED:\n' + inspect(parsed));
      return this.option.includeRoot ? R.prepend('markdown', parsed) : parsed;
    }

    /**
     * @returns regex test result (use simply makeTestResult) if test, parsed jsonml array element if !test
     */

  }, {
    key: 'matchList',
    value: function matchList(string, test) {
      var _this2 = this;

      var UL = /(^[ ]*[*-][ ]+.+\n?)+/gm;
      var result = UL.exec(string);

      //this.debug(`UL test: ${test}, result: ${result}`);

      if (test) return makeTestResult(UL, result);
      if (!result) return null;

      var content = result[0];

      var LI = /([ ]*)[*-][ ]+(.+)/;
      var lines = compact(content.split('\n'));
      this.debug('list lines: \'' + inspect(lines) + '\'');

      var lineIdx = 0;

      var visit = function visit(curLev, curNode) {
        while (lineIdx < lines.length) {
          var line = lines[lineIdx];
          var r = LI.exec(line);
          if (!r) {
            lineIdx++;
            continue;
          }

          var lev = r[1].length;
          var name = r[2];

          if (lev < curLev) {
            _this2.debug('> leave');
            break;
          }

          _this2.debug('idx: ' + lineIdx + ', line: \'' + line + '\', lev: ' + lev + ', name: \'' + name + '\' - cur lev: ' + curLev + ', cur node: \'' + inspect(curNode) + '\'');
          lineIdx += 1;

          if (lev == curLev) {
            // li붙이기
            curNode.push(['li', name]);
          } else if (lev > curLev) {
            // ul시작
            _this2.debug('> enter');
            var children = visit(lev, [['li', name]]);
            _this2.debug('children \'' + inspect(children) + '\'');
            curNode.push(R.prepend('ul', children));
          }
        }
        return curNode;
      };

      var listEls = visit(-1, [])[0];
      return listEls;
    }
  }, {
    key: 'matchHeading',
    value: function matchHeading(string, test) {
      var H = /^(#+)[ ]*(.+)/gm;
      var result = H.exec(string);

      if (test) return makeTestResult(H, result);
      if (!result) return null;

      var level = result[1].length;
      var title = result[2];

      return ['h', { level: level }, title];
    }
  }, {
    key: 'matchRuler',
    value: function matchRuler(string, test) {
      var HR = /^(-|=|_){3,}$/gm;
      var result = HR.exec(string);

      if (test) return makeTestResult(HR, result);
      if (!result) return null;

      return ['hr'];
    }
  }, {
    key: 'matchBlockQuote',
    value: function matchBlockQuote(string, test) {
      var BLOCK = /(^>.*\n?)+/gm;
      var result = BLOCK.exec(string);

      if (test) return makeTestResult(BLOCK, result);
      if (!result) return null;

      var content = result[0];

      var QUOTE = /^>(.+)/;
      var quote = compact(content.split('\n').map(function (line) {
        var r = QUOTE.exec(line.trim());
        if (!r) return;
        var q = r[1];
        return q;
      })).join('\n');

      return ['blockquote', quote];
    }
  }, {
    key: 'matchCode',
    value: function matchCode(string, test) {
      var CODE = /\`\`\`(.*)\n?((.|\s)+?)\`\`\`/gm;
      var result = CODE.exec(string);

      if (test) return makeTestResult(CODE, result);
      if (!result) return null;

      var lang = result[1].trim();
      var content = result[2];

      return ['code', { lang: lang }, content];
    }
  }, {
    key: 'matchLinkAndImage',
    value: function matchLinkAndImage(string, test) {
      var LINK = /\[(.+?)\]\(([^\s]+?)\)|(https?:\/\/[^\s]+)/g;
      var result = LINK.exec(string);

      if (test) return makeTestResult(LINK, result);
      if (!result) return null;

      var title = result[1];
      var href = result[2];
      var url = result[3];

      if (!!url) {
        // image
        if (/\.(bmp|png|jpg|jpeg|tiff|gif)$/.test(url)) {
          return ['img', { src: url }];
        } else {
          return ['a', { href: url }, url.replace(/https?:\/\//, '')];
        }
      } else {
        return ['a', { href: href }, title];
      }
    }
  }, {
    key: 'makeBasicInlineMatcher',
    value: function makeBasicInlineMatcher(re, attr) {
      var _this3 = this;

      return function (string, test) {
        re.lastIndex = 0;
        //this.debug(`begin basic match s: '${string}', test: ${test}, re: ${re}`);
        var result = re.exec(string);

        if (test) return makeTestResult(re, result);
        if (!result) return null;

        var outer = result[0];
        var inner = result[1];

        _this3.debug(attr.tag + ' outer: ' + outer + ', inner: ' + inner);

        return [attr.tag, inner];
      };
    }
  }, {
    key: 'bestMatch',
    value: function bestMatch(matchers, string) {
      var candidatesResults = matchers.map(function (m) {
        var testResult = m.matcher(string, true);
        //this.debug(`MATCHER ${fn.name}, test result: ${inspect(testResult)}`);
        if (!testResult) return null;
        return R.merge({ testResult: testResult }, m);
      });

      if (R.isEmpty(compact(candidatesResults))) {
        return null;
      }

      // 가장 가까이 매치된 것을 선정
      var bestMatched = compact(candidatesResults).reduce(function (last, val) {
        return val.testResult.index < last.testResult.index ? val : last;
      }, { testResult: { index: string.length } });

      return bestMatched;
    }
  }, {
    key: 'parseInline',
    value: function parseInline(el) {
      return this._applyOnTreePlains(el, this._parseInline.bind(this));
    }

    /*
     * ['tag', 'plain', 'plain2', ['t', 'another md']]
     * ['tag', {attr}, 'plain', 'plain2', ['t', 'another md']]
     */

  }, {
    key: '_applyOnTreePlains',
    value: function _applyOnTreePlains(ar, applyfn) {
      var _this4 = this;

      return R.unnest(R.prepend(ar[0], ar.slice(1).map(function (e) {
        if (R.type(e) == 'String') {
          return applyfn(e);
        } else if (R.type(e) == 'Array') {
          // 이건 unnest되면 안되니 []로 감싸준다.
          // FIXME 더 좋은 방법이 없을까?
          return [_this4._applyOnTreePlains(e, applyfn)];
        } else {
          return e;
        }
      })));
    }
  }, {
    key: '_parseInline',
    value: function _parseInline(s, depth) {
      if (!depth) depth = 0;
      var matched = [];

      /*
      if(R.type(s) != 'String') {
        this.debug(`${s} SHOULD BE STRING FOR INLINE!!!`);
        return s;
      }
      */

      while (!!s && s.length > 0) {
        this.debug('inline - d' + depth + ' begin match: \'' + s + '\'');

        var m = this.bestMatch(this.INLINE_MATCHERS, s);
        if (!m) {
          this.debug('inline - d' + depth + ' no match');
          matched.push(s);
          break;
        }

        if (m.testResult.index > 0) {
          var plain = s.substring(0, m.testResult.index);
          this.debug('inline - d' + depth + ' no matched as plain: \'' + plain + '\'');
          matched.push(plain);
        }

        this.debug('inline - d' + depth + ' best match: ' + inspect(m));

        // best matched로 실제 parse
        var el = m.matcher(s, false);
        this.debug('inline - d' + depth + ' intermediate parsed: ' + inspect(el));

        // 이제 안으로 들어간다
        // inline은 하나의 string에서 여러 el을 만들지 않기 때문에 모두 들어갈 필요는 없다.
        var hasAttr = R.type(el[1]) == 'Object';
        var child = hasAttr ? el[2] : el[1];
        var childEl = void 0;
        if (!m.terminal && !!child) {
          childEl = this._parseInline(child, depth + 1);
          this.debug('inline - d' + depth + ' children: ' + inspect(childEl));
        }

        var lastIndex = m.testResult.lastIndex;
        s = s.substring(lastIndex);

        var finalEl = !!childEl ? hasAttr ? [el[0], el[1]].concat(_toConsumableArray(childEl)) : [el[0]].concat(_toConsumableArray(childEl)) : el;
        this.debug('inline - d' + depth + ' PARSED: ' + inspect(finalEl));

        matched.push(finalEl);
      }

      return matched;
    }
  }, {
    key: 'addParagraph',
    value: function addParagraph(parsed, text) {
      var _this5 = this;

      var paras = text.split("\n\n").map(function (s) {
        var para = null;
        if (s.length > 0 && s != '\n') {
          _this5.debug('PARAGRAPH found: \'' + s + '\'');
          para = _this5.parseInline(['p', s]);
        }
        return para;
      });
      parsed.push.apply(parsed, _toConsumableArray(compact(paras)));
    }
  }]);

  return Parser;
}();

function compact(ar) {
  return R.reject(R.isNil, ar);
}

function inspect(o) {
  return util.inspect(o, false, null);
}

function makeTestResult(re, result) {
  return !!result ? R.merge({ lastIndex: re.lastIndex }, result) : null;
}

module.exports = { Parser: Parser, inspect: inspect };