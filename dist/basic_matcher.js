"use strict";

var _class;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object['ke' + 'ys'](descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object['define' + 'Property'](target, property, desc); desc = null; } return desc; }

var R = require('ramda');

var _require = require('autobind-decorator'),
    boundMethod = _require.boundMethod;

var _require2 = require('./heading_counter'),
    HeadingCounter = _require2.HeadingCounter;

var _require3 = require('./util'),
    buildRe = _require3.buildRe,
    makeTestResult = _require3.makeTestResult,
    compact = _require3.compact,
    inspect = _require3.inspect,
    concatLast = _require3.concatLast;

var BasicMatcher = (_class =
/*#__PURE__*/
function () {
  function BasicMatcher(opt) {
    _classCallCheck(this, BasicMatcher);

    this.headingCounter = new HeadingCounter();
    this.option = opt;
  }

  _createClass(BasicMatcher, [{
    key: "init",
    value: function init() {
      this.headingCounter.init();
      this.footnoteCounter = 1;
      this.footnotes = [];
    }
  }, {
    key: "matchList",
    value: function matchList(string, test) {
      var ULOL = /(^[ ]*([*-]|\d+\.)[ ]+.+\n?)+/gm;
      var result = ULOL.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(ULOL, result);
      var content = result[0];
      var ITEM = /([ ]*)([*-]|\d+\.)[ ]+(.+)/;
      var lines = compact(content.split('\n'));
      var lineIdx = 0;

      var visit = function visit(myLev, lastType) {
        var curNode = [];
        var nodes = [];
        var type;

        while (lineIdx < lines.length) {
          var line = lines[lineIdx];
          var r = ITEM.exec(line);

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
          var lastAddedType;

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
      return listNode;
    }
  }, {
    key: "matchHeading",
    value: function matchHeading(string, test) {
      var H = /^(#+)[ ]*(.*)/gm;
      var result = H.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(H, result);
      var level = result[1].length;
      var title = result[2] || '';
      var number = this.headingCounter.increase(level);
      var prop = R.merge(this.option.includeHeadingNumber ? {
        number: number
      } : {}, {
        level: level
      });
      return ['h', prop, title];
    }
  }, {
    key: "matchRuler",
    value: function matchRuler(string, test) {
      var HR = /^(-|=|_){3,}$/gm;
      var result = HR.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(HR, result);
      return ['hr'];
    }
  }, {
    key: "matchBlockQuote",
    value: function matchBlockQuote(string, test) {
      var BLOCK = /(^>.*\n?)+/gm;
      var result = BLOCK.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(BLOCK, result);
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
    key: "matchCode",
    value: function matchCode(string, test) {
      var CODE = /^```(.*)([^]+?)^```/gm;
      var result = CODE.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(CODE, result);
      var lang = result[1].trim();
      var content = result[2].replace(/^\n/, '');
      return ['codeblock', {
        lang: lang
      }, content];
    }
  }, {
    key: "matchTable",
    value: function matchTable(string, test) {
      var TABLE = /(^((\|[^\n]*)+\|$)\n?)+/gm;
      var result = TABLE.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(TABLE, result);
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

      var th;
      var trs = compact(content.split('\n').map(function (line, idx) {
        if (line.length == 0) return null; //console.log('line', line, idx);
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
      })); // 2줄 이상이고 줄1 내용이 ---로만 이루어져있으면 줄0은 th

      if (trs.length >= 2 && R.all(function (td) {
        return /^-+$/.test(td[1].trim());
      }, R.remove(0, 1, trs[1]))) {
        //console.log('-- th found: ', inspect(trs[1]));
        th = trs[0];
        trs = R.remove(0, 2, trs);
      }

      return th ? ['table', ['thead', th], R.unnest(['tbody', trs])] : ['table', R.unnest(['tbody', trs])];
    }
  }, {
    key: "matchLink",
    value: function matchLink(string, test) {
      var LINK = /\[(.+?)\](?:\(([^\s]+?)\))?|(https?:\/\/[^\s]+)/g;
      var result = LINK.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(LINK, result);
      var title = result[1];
      var href = result[2];
      var urlonly = result[3];

      if (urlonly) {
        return ['a', {
          href: urlonly,
          isAutoLink: true
        }, urlonly];
      } else {
        if (href) {
          return ['a', {
            href: href
          }, title];
        } else {
          // use title as href
          return ['a', {
            href: title
          }, title];
        }
      }
    }
  }, {
    key: "matchFootnote",
    value: function matchFootnote(string, test) {
      var FOOTNOTE = this.option.footnotePattern;
      var result = FOOTNOTE.exec(string);
      if (!result) return null;
      if (test) return makeTestResult(FOOTNOTE, result, -1);
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
  }]);

  return BasicMatcher;
}(), (_applyDecoratedDescriptor(_class.prototype, "matchList", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchList"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchHeading", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchHeading"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchRuler", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchRuler"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchBlockQuote", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchBlockQuote"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchCode", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchCode"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchTable", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchTable"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchLink", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchLink"), _class.prototype), _applyDecoratedDescriptor(_class.prototype, "matchFootnote", [boundMethod], Object.getOwnPropertyDescriptor(_class.prototype, "matchFootnote"), _class.prototype)), _class);
module.exports = {
  BasicMatcher: BasicMatcher
};