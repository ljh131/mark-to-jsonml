'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var R = require('ramda');
var util = require('util');

var HeadingCounter = function () {
  function HeadingCounter() {
    _classCallCheck(this, HeadingCounter);

    this.init();
  }

  _createClass(HeadingCounter, [{
    key: 'init',
    value: function init() {
      this.counter = { h1: 0, h2: 0, h3: 0 };
    }
  }, {
    key: 'increase',
    value: function increase(lev) {
      var num = void 0;
      if (lev == 1) {
        this.counter.h1 += 1;
        this.counter.h2 = 0;
        this.counter.h3 = 0;
        num = this.counter.h1 + '.';
      } else if (lev == 2) {
        this.counter.h2 += 1;
        this.counter.h3 = 0;
        num = this.counter.h1 + '.' + this.counter.h2 + '.';
      } else if (lev == 3) {
        this.counter.h3 += 1;
        num = this.counter.h1 + '.' + this.counter.h2 + '.' + this.counter.h3 + '.';
      }
      return num;
    }
  }]);

  return HeadingCounter;
}();

var Parser = function () {
  function Parser(opt) {
    var _this = this;

    _classCallCheck(this, Parser);

    this.option = R.merge({
      includeRoot: true, // parse시 'markdown' tag와 prop을 붙인다.
      headingNumber: true, // heading의 prop에 number로 번호를 붙인다.
      parseToc: false, // tocPattern을 목차로 바꾼다.
      parseFootnote: false, // footnotePattern을 각주로 바꾼다.
      tocPattern: /^{toc}$/, // 목차 패턴
      footnotePattern: /\[\*([^\s]+)?\s(.+)\]/g // 각주 패턴
    }, opt);

    // NOTE: inline regex should have `global` option
    var matchStrike = this.makeBasicInlineMatcher(/~+(.+?)~+/g, { tag: 's' });
    var matchBold = this.makeBasicInlineMatcher(/\*{2,}(.+?)\*{2,}/g, { tag: 'b' });
    var matchItalic = this.makeBasicInlineMatcher(/\*(.+?)\*/g, { tag: 'i' });
    var matchUnderscore = this.makeBasicInlineMatcher(/_+(.+?)_+/g, { tag: 'u' });
    var matchInlineCode = this.makeBasicInlineMatcher(/`(.+?)`/g, { tag: 'code' });

    this.BLOCK_MATCHERS = [{ matcher: this.matchHeading }, { matcher: this.matchRuler }, { matcher: this.matchList }, { matcher: this.matchTable }, { matcher: this.matchBlockQuote }, { matcher: this.matchCode, terminal: true }].map(function (m) {
      m.matcher = m.matcher.bind(_this);
      return m;
    });

    this.INLINE_MATCHERS = [{ matcher: matchStrike }, { matcher: matchBold }, { matcher: matchItalic }, { matcher: matchUnderscore }, { matcher: matchInlineCode, terminal: true }, { matcher: this.matchLink, terminal: true }, { matcher: this.matchFootnote, terminal: true }].map(function (m) {
      m.matcher = m.matcher.bind(_this);
      return m;
    });

    this.headingCounter = new HeadingCounter();
  }

  _createClass(Parser, [{
    key: 'addBlockParser',
    value: function addBlockParser(blockParser) {
      var isTerminal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      this.BLOCK_MATCHERS.push({ matcher: blockParser, terminal: isTerminal });
    }
  }, {
    key: 'addInlineParser',
    value: function addInlineParser(inlineParser) {
      var isTerminal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      this.INLINE_MATCHERS.push({ matcher: inlineParser, terminal: isTerminal });
    }
  }, {
    key: 'parse',
    value: function parse(mdtext) {
      var _this2 = this;

      this.headingCounter.init();
      this.footnoteCounter = 1;
      this.footnotes = [];

      var parsed = [];


      var s = mdtext;
      while (!!s && s.length > 0) {

        var m = this.bestMatch(this.BLOCK_MATCHERS, s);
        // 먼저 test모드로 돌려본다.

        if (!m) {
          this.addParagraph(parsed, s);
          break;
        }

        if (m.testResult.index > 0) {
          var plain = s.substring(0, m.testResult.index);

          this.addParagraph(parsed, plain);
        }

        // best matched로 실제 parse
        // FIXME el could be null (테스트에서는 가능했지만 실제 파싱이 불가능한 경우?)
        var el = m.matcher(s, false);

        var lastIndex = m.testResult.lastIndex;
        s = s.substring(lastIndex);

        // traverse하며 inline parse를 적용한다.
        var inlinedEl = m.terminal ? el : this.parseInline(el);


        // root parse tree에 추가한다.
        parsed.push(inlinedEl);
      }

      //console.log(`FINALLY PARSED:\n${inspect(parsed)}`);

      var tocParsed = false;

      if (this.option.parseToc) {
        var toc = this.parseToc(parsed);
        //console.log(`PARSED TOC:\n${inspect(toc)}`);

        parsed = parsed.map(function (el) {
          if (el[0] === 'p' && _this2.option.tocPattern.test(el[1])) {
            tocParsed = true;
            return toc;
          } else {
            return el;
          }
        });
      }

      if (this.footnotes.length > 0) {
        var footnotes = R.prepend('footnotes', this.footnotes);
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
    }

    // headings를 toc로 만들어준다.
    // ['toc', ['toc-item', {level: 1, number: '1.'}, 'introduction', ['s', 'intro']], ...]

  }, {
    key: 'parseToc',
    value: function parseToc(parsed) {
      var headings = R.filter(function (a) {
        return R.type(a) === "Array" && R.head(a) === 'h' && a[1].level <= 3;
      }, R.drop(1, parsed));
      var counter = new HeadingCounter();

      var list = headings.map(function (h) {
        var lev = h[1].level;
        var num = counter.increase(lev);

        return R.unnest(['toc-item', { level: lev, number: num }, R.drop(2, h)]);
      });
      return R.prepend('toc', list);
    }

    /**
     * @returns regex test result (use simply makeTestResult) if test, parsed jsonml array element if !test
     */

  }, {
    key: 'matchList',
    value: function matchList(string, test) {
      var UL = /(^[ ]*([*-]|\d+\.)[ ]+.+\n?)+/gm;
      var result = UL.exec(string);

      //console.log(`UL test: ${test}, result: ${result}`);

      if (test) return makeTestResult(UL, result);
      if (!result) return null;

      var content = result[0];

      var LI = /([ ]*)([*-]|\d+\.)[ ]+(.+)/;
      var lines = compact(content.split('\n'));


      var lineIdx = 0;

      var visit = function visit(myLev, lastType) {
        var curNode = [];
        var nodes = [];
        var type = void 0;

        while (lineIdx < lines.length) {
          var line = lines[lineIdx];
          var r = LI.exec(line);
          if (!r) {
            lineIdx++;
            continue;
          }


          var lev = r[1].length;
          type = r[2] === '*' || r[2] === '-' ? 'ul' : 'ol';
          var name = r[3];

          if (lastType == null) {
            lastType = type;
          }

          if (lev < myLev) {
            break;
          }

          if (lev == myLev) {
            // 타입이 바뀌면 모아놨던걸 넣어준다.
            if (lastType && lastType != type) {
              curNode.push(R.prepend(lastType, nodes));
              lastType = type;
              nodes = [];
            }

            nodes.push(['li', name]);
            lineIdx += 1;
          } else if (lev > myLev) {
            var children = visit(lev, type);


            concatLast(nodes, children);
          }
        }

        if (nodes.length > 0) {
          // curNode의 마지막 type과 남아있는 마지막 type을 비교
          var lastAddedType = void 0;
          if (curNode.length > 0) {
            lastAddedType = R.head(R.last(curNode));
          }


          if (curNode.length == 0 || lastAddedType != lastType) {
            curNode.push(R.prepend(lastType, nodes));
          } else {
            curNode.push(nodes);
          }
        }

        return curNode;
      };

      var listNode = visit(0, null);
      return listNode[0];
    }
  }, {
    key: 'matchHeading',
    value: function matchHeading(string, test) {
      var H = /^(#+)[ ]*(.*)/gm;
      var result = H.exec(string);

      if (test) return makeTestResult(H, result);
      if (!result) return null;

      var level = result[1].length;
      var title = result[2] || '';
      var number = this.headingCounter.increase(level);

      var prop = R.merge(this.option.headingNumber ? { number: number } : {}, { level: level });
      return ['h', prop, title];
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
      var CODE = /^\`\`\`(.*)([^]+?)^\`\`\`/gm;
      var result = CODE.exec(string);

      if (test) return makeTestResult(CODE, result);
      if (!result) return null;

      var lang = result[1].trim();
      var content = result[2].replace(/^\n/, '');

      return ['codeblock', { lang: lang }, content];
    }
  }, {
    key: 'matchTable',
    value: function matchTable(string, test) {
      var TABLE = /(^((\|[^\n]*)+\|$)\n?)+/gm;
      var result = TABLE.exec(string);

      if (test) return makeTestResult(TABLE, result);
      if (!result) return null;

      var content = result[0];
      var extractTds = function extractTds(line) {
        var seperator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : /\|/;

        var tds = compact(line.split(seperator).map(function (col) {
          //console.log('col', col);
          if (col.length == 0) return null;
          return ['td', col.trim()];
        }));
        return tds;
      };

      var th = void 0;
      var trs = compact(content.split('\n').map(function (line, idx) {
        if (line.length == 0) return null;

        //console.log('line', line, idx);

        // `|| head ||` 처리
        if (idx == 0) {
          //console.log('try th');

          // TABLE re로는 ||로 된 TH를 확인할 수 없으므로
          var TH = /^(\|{2,}[^\n]*)+\|{2,}[ ]*$/gm;
          if (TH.test(line)) {
            var _tds = extractTds(line, /\|{2,}/);
            if (_tds.length >= 1) {
              //console.log('|| th found on: ', line);
              th = R.unnest(['tr', _tds]);
              return null;
            }
          }
        }

        var tds = extractTds(line, /\|+/);
        if (tds.length >= 1) {
          return R.unnest(['tr', tds]);
        }

        return null;
      }));

      // 2줄 이상이고 줄1 내용이 ---로만 이루어져있으면 줄0은 th
      if (trs.length >= 2 && R.all(function (td) {
        return (/^-+$/.test(td[1].trim())
        );
      }, R.remove(0, 1, trs[1]))) {
        //console.log('-- th found: ', inspect(trs[1]));
        th = trs[0];
        trs = R.remove(0, 2, trs);
      }

      return th ? ['table', ['thead', th], R.unnest(['tbody', trs])] : ['table', R.unnest(['tbody', trs])];
    }
  }, {
    key: 'execInlineRegex',
    value: function execInlineRegex(re, string) {
      if (!re.global) throw "error: inline regex should have global option";
      re.lastIndex = 0;
      return re.exec(string);
    }
  }, {
    key: 'matchLink',
    value: function matchLink(string, test) {
      var LINK = /\[(.+?)\](?:\(([^\s]+?)\))?|(https?:\/\/[^\s]+)/g;
      var result = this.execInlineRegex(LINK, string);
      if (test) return makeTestResult(LINK, result);
      if (!result) return null;

      var title = result[1];
      var href = result[2];
      var urlonly = result[3];

      if (!!urlonly) {
        return ['a', { href: urlonly, isAutoLink: true }, urlonly];
      } else {
        if (href) {
          return ['a', { href: href }, title];
        } else {
          // use title as href
          return ['a', { href: title }, title];
        }
      }
    }
  }, {
    key: 'matchFootnote',
    value: function matchFootnote(string, test) {
      var result = this.execInlineRegex(this.option.footnotePattern, string);
      if (test) return makeTestResult(this.option.footnotePattern, result, -1);
      if (!result) return null;

      var id = this.footnoteCounter++;
      var title = result[1] || id;
      var content = result[2];

      var meta = {
        id: id,
        title: title
      };

      this.footnotes.push(['footnote-item', meta, content]);

      return ['footnote', meta, title];
    }

    /*
    matchLinkAndImage(string, test) {
      const LINK = /\[(.+?)\]\(([^\s]+?)\)|(https?:\/\/[^\s]+)/g;
      let result = LINK.exec(string);
       if(test) return makeTestResult(LINK, result);
      if(!result) return null;
       const title = result[1];
      const href = result[2];
      const url = result[3];
       if(!!url) {
        // image
        if(/\.(bmp|png|jpg|jpeg|tiff|gif)$/.test(url)) {
          return ['img', { src: url }];
        } else if(/\.(mp4|ogg)$/.test(url)) {
          return ['video', { src: url }];
        } else {
          return ['a', { href: url }, url.replace(/https?:\/\//, '')];
        }
      } else {
        return ['a', { href }, title];
      }
    }
    */

  }, {
    key: 'makeBasicInlineMatcher',
    value: function makeBasicInlineMatcher(re, attr) {
      var _this3 = this;

      return function (string, test) {
        var result = _this3.execInlineRegex(re, string);

        if (test) return makeTestResult(re, result);
        if (!result) return null;

        var outer = result[0];
        var inner = result[1];

        return [attr.tag, inner];
      };
    }
  }, {
    key: 'bestMatch',
    value: function bestMatch(matchers, string) {
      var candidatesResults = matchers.map(function (m) {
        var testResult = m.matcher(string, true);

        if (!testResult) return null;
        return R.merge({ testResult: testResult }, m);
      });

      if (R.isEmpty(compact(candidatesResults))) {
        return null;
      }

      // 가장 가까이 매치된 것을 선정
      var bestMatched = compact(candidatesResults).reduce(function (last, val) {
        if (val.testResult.index < last.testResult.index) {
          return val;
        } else if (val.testResult.index > last.testResult.index) {
          return last;
        } else {
          return val.testResult.priority < last.testResult.priority ? val : last;
        }
      }, { testResult: { index: string.length } });

      return bestMatched;
    }
  }, {
    key: 'parseInline',
    value: function parseInline(el) {
      return this._applyOnTreePlains(el, this._parseInline.bind(this));
    }

    /*
     * tree를 순회하면서 plain에 대해 applyfn을 적용한다.
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
        console.log(`${s} SHOULD BE STRING FOR INLINE!!!`);
        return s;
      }
      */

      if (s === '') return [''];

      while (!!s && s.length > 0) {

        var m = this.bestMatch(this.INLINE_MATCHERS, s);
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


        // 이제 안으로 들어간다
        // inline은 하나의 string에서 여러 el을 만들지 않기 때문에 모두 들어갈 필요는 없다.
        var hasAttr = R.type(el[1]) == 'Object';
        var child = hasAttr ? el[2] : el[1];
        var childEl = void 0;
        if (!m.terminal && !!child) {
          childEl = this._parseInline(child, depth + 1);
        }

        var lastIndex = m.testResult.lastIndex;
        s = s.substring(lastIndex);

        var finalEl = !!childEl ? hasAttr ? [el[0], el[1]].concat(_toConsumableArray(childEl)) : [el[0]].concat(_toConsumableArray(childEl)) : el;


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
        s = s.trim();
        if (s.length > 0 && s != '\n') {
          para = _this5.parseInline(['p', s]);
        }
        return para;
      });
      parsed.push.apply(parsed, _toConsumableArray(compact(paras)));
    }
  }]);

  return Parser;
}();

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

/**
 * low priority value means higher priority. built-in parser use 0
 */
function makeTestResult(re, result) {
  var priority = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  return !!result ? R.merge({ lastIndex: re.lastIndex, priority: priority }, result) : null;
}

function getParsedProp(parsed) {
  return parsed && parsed[0] === 'markdown' ? parsed[1] : {};
}

module.exports = { Parser: Parser, getParsedProp: getParsedProp, makeTestResult: makeTestResult, inspect: inspect };