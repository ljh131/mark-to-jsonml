const R = require('ramda');
const util = require('util');

class Parser {
  constructor(opt) {
    this.option = R.merge({ 
      enableLog: false,
      includeRoot: true
    }, opt);
    this.debug = this.option.enableLog ? (...args) => console.log(...args) : () => {};

    this.debug(`parser option: ${inspect(this.option)}`);

    // NOTE: inline regex should have `global` option
    const matchStrike = this.makeBasicInlineMatcher(/~~(.+?)~~/g, { tag: 's' });
    const matchBold = this.makeBasicInlineMatcher(/\*\*(.+?)\*\*/g, { tag: 'b' });
    const matchItalic = this.makeBasicInlineMatcher(/\*(.+?)\*/g, { tag: 'i' });
    const matchUnderscore = this.makeBasicInlineMatcher(/_(.+?)_/g, { tag: 'u' });

    this.BLOCK_MATCHERS = [
      { matcher: this.matchHeading }, 
      { matcher: this.matchRuler }, 
      { matcher: this.matchList }, 
      { matcher: this.matchBlockQuote },
      { matcher: this.matchCode, terminal: true }
    ].map(m => { 
      m.matcher = m.matcher.bind(this) ;
      return m;
    });

    this.INLINE_MATCHERS = [
      { matcher: matchStrike }, 
      { matcher: matchBold },
      { matcher: matchItalic }, 
      { matcher: matchUnderscore },
      { matcher: this.matchLinkAndImage, terminal: true }
    ].map(m => { 
      m.matcher = m.matcher.bind(this) ;
      return m;
    });
  }

  parse(mdtext) {
    const parsed = [];
    this.debug("START PARSE");

    var s = mdtext;
    while(!!s && s.length > 0) {
      // 먼저 test모드로 돌려본다.
      this.debug(`BEGIN test match string: '${s}'`);

      const m = this.bestMatch(this.BLOCK_MATCHERS, s);
      if(!m) {
        this.debug(`no match: `, s);
        this.addParagraph(parsed, s);
        break;
      }

      if(m.testResult.index > 0) {
        const plain = s.substring(0, m.testResult.index);
        this.debug(`no matched as plain: '${plain}'`);
        this.addParagraph(parsed, plain);
      }

      // best matched로 실제 parse
      const el = m.matcher(s, false);

      this.debug(`MATCHER ${m.matcher.name}, parse result: ${inspect(el)}`);

      const lastIndex = m.testResult.lastIndex;
      s = s.substring(lastIndex);

      // traverse하며 inline parse를 적용한다.
      const inlinedEl = m.terminal ? el : this.parseInline(el);
      this.debug(`INLINE PARSED: ${inspect(inlinedEl)}`);

      // root parse tree에 추가한다.
      parsed.push(inlinedEl);
    }

    this.debug(`FINALLY PARSED:\n${inspect(parsed)}`);
    return this.option.includeRoot ? R.prepend('markdown', parsed) : parsed;
  }

  /**
   * @returns regex result and lastIndex (or null) if test, parsed jsonml if !test
   */
  // FIXME ordered list
  matchList(string, test) {
    const UL = /(^[ ]*[*-][ ]+.+\n?)+/gm;
    const result = UL.exec(string);

    //this.debug(`UL test: ${test}, result: ${result}`);

    if(test) return makeTestResult(UL, result);
    if(!result) return null;

    const content = result[0];

    const LI = /([ ]*)[*-][ ]+(.+)/;
    const lines = compact(content.split('\n'));
    this.debug(`list lines: '${inspect(lines)}'`);

    let lineIdx = 0;

    const visit = (curLev, curNode) => {
      while(lineIdx < lines.length) {
        const line = lines[lineIdx];
        const r = LI.exec(line);
        if(!r) {
          lineIdx++; 
          continue;
        }

        const lev = r[1].length;
        const name = r[2];

        if(lev < curLev) {
          this.debug('> leave');
          break;
        }

        this.debug(`idx: ${lineIdx}, line: '${line}', lev: ${lev}, name: '${name}' - cur lev: ${curLev}, cur node: '${inspect(curNode)}'`);
        lineIdx += 1;

        if(lev == curLev) {
          // li붙이기
          curNode.push(['li', name]);
        } else if(lev > curLev) {
          // ul시작
          this.debug(`> enter`);
          const children = visit(lev, [['li', name]]);
          this.debug(`children '${inspect(children)}'`);
          curNode.push(R.prepend('ul', children));
        } 
      }
      return curNode;
    };

    const listEls = visit(-1, [])[0];
    return listEls;
  }

  matchHeading(string, test) {
    var H = /^(#+)[ ]*(.+)/gm;
    var result = H.exec(string);

    if(test) return makeTestResult(H, result);
    if(!result) return null;

    const level = result[1].length;
    const title = result[2];

    return ['h', { level }, title];
  }

  matchRuler(string, test) {
    var HR = /^(-|=|_){3,}$/gm;
    var result = HR.exec(string);

    if(test) return makeTestResult(HR, result);
    if(!result) return null;

    return ['hr'];
  }

  matchBlockQuote(string, test) {
    var BLOCK = /(^>.*\n?)+/gm;
    var result = BLOCK.exec(string);

    if(test) return makeTestResult(BLOCK, result);
    if(!result) return null;

    const content = result[0];

    const QUOTE = /^>(.+)/;
    const quote = compact(content.split('\n').map((line) => {
      const r = QUOTE.exec(line.trim());
      if(!r) return;
      const q = r[1];
      return q;
    })).join('\n');

    return ['blockquote', quote];
  }

  // FIXME 더 이상 파싱하면 안됨;;;
  matchCode(string, test) {
    const CODE = /\`\`\`(.*)\n?((.|\s)+?)\`\`\`/gm;
    var result = CODE.exec(string);

    if(test) return makeTestResult(CODE, result);
    if(!result) return null;

    const lang = result[1].trim();
    const content = result[2];

    return ['code', { lang }, content];
  }

  matchLinkAndImage(string, test) {
    const LINK = /\[(.+?)\]\(([^\s]+?)\)|(https?:\/\/[^\s]+)/g;
    var result = LINK.exec(string);

    if(test) return makeTestResult(LINK, result);
    if(!result) return null;

    const title = result[1];
    const href = result[2];
    const url = result[3];

    if(!!url) {
      // image
      if(/\.(bmp|png|jpg|jpeg|tiff|gif)$/.test(url)) {
        return ['img', { src: url }];
      } else {
        return ['a', { href: url }, url.replace(/https?:\/\//, '')];
      }
    } else {
      return ['a', { href }, title];
    }
  }

  makeBasicInlineMatcher(re, attr) {
    return (string, test) => {
      re.lastIndex = 0;
      //this.debug(`begin basic match s: '${string}', test: ${test}, re: ${re}`);
      var result = re.exec(string);

      if(test) return makeTestResult(re, result);
      if(!result) return null;

      const outer = result[0];
      const inner = result[1];

      this.debug(`${attr.tag} outer: ${outer}, inner: ${inner}`);

      return [attr.tag, inner];
    }
  }

  bestMatch(matchers, string) {
    const candidatesResults = matchers.map((m) => {
      const testResult = m.matcher(string, true);
      //this.debug(`MATCHER ${fn.name}, test result: ${inspect(testResult)}`);
      if(!testResult) return null;
      return R.merge({ testResult }, m);
    });

    if(R.isEmpty(compact(candidatesResults))) {
      return null;
    }

    // 가장 가까이 매치된 것을 선정
    const bestMatched = compact(candidatesResults).reduce((last, val) => {
      return val.testResult.index < last.testResult.index ? val : last;
    }, { testResult: { index: string.length }});

    return bestMatched;
  }

  parseInline(el) {
    return this._applyOnTreePlains(el, this._parseInline.bind(this));
  }

  /*
   * ['tag', 'plain', 'plain2', ['t', 'another md']]
   * ['tag', {attr}, 'plain', 'plain2', ['t', 'another md']]
   */
  _applyOnTreePlains(ar, applyfn) {
    return R.unnest(R.prepend(ar[0], ar.slice(1).map((e) => {
      if(R.type(e) == 'String') {
        return applyfn(e);
      } else if(R.type(e) == 'Array') {
        // 이건 unnest되면 안되니 []로 감싸준다.
        // FIXME 더 좋은 방법이 없을까?
        return [this._applyOnTreePlains(e, applyfn)];
      } else {
        return e;
      }
    })));
  }

  _parseInline(s, depth) {
    if(!depth) depth = 0;
    const matched = [];

    /*
    if(R.type(s) != 'String') {
      this.debug(`${s} SHOULD BE STRING FOR INLINE!!!`);
      return s;
    }
    */

    while(!!s && s.length > 0) {
      this.debug(`inline - d${depth} begin match: '${s}'`);

      const m = this.bestMatch(this.INLINE_MATCHERS, s);
      if(!m) {
        this.debug(`inline - d${depth} no match`);
        matched.push(s);
        break;
      }

      if(m.testResult.index > 0) {
        const plain = s.substring(0, m.testResult.index);
        this.debug(`inline - d${depth} no matched as plain: '${plain}'`);
        matched.push(plain);
      }

      this.debug(`inline - d${depth} best match: ${inspect(m)}`);

      // best matched로 실제 parse
      const el = m.matcher(s, false);
      this.debug(`inline - d${depth} intermediate parsed: ${inspect(el)}`);

      // 이제 안으로 들어간다
      // inline은 하나의 string에서 여러 el을 만들지 않기 때문에 모두 들어갈 필요는 없다.
      const hasAttr = R.type(el[1]) == 'Object';
      const child = hasAttr ? el[2] : el[1];
      let childEl;
      if(!m.terminal && !!child) {
        childEl = this._parseInline(child, depth + 1);
        this.debug(`inline - d${depth} children: ${inspect(childEl)}`);
      }

      const lastIndex = m.testResult.lastIndex;
      s = s.substring(lastIndex);

      const finalEl = !!childEl ? 
        (hasAttr ? [el[0], el[1], ...childEl] : [el[0], ...childEl]) : 
        el;
      this.debug(`inline - d${depth} PARSED: ${inspect(finalEl)}`);

      matched.push(finalEl);
    }

    return matched;
  }

  addParagraph(parsed, text) {
    const paras = text.split("\n\n").map(((s) => {
      let para = null;
      if(s.length > 0 && s != '\n') {
        this.debug(`PARAGRAPH found: '${s}'`);
        para = this.parseInline(['p', s]);
      }
      return para;
    }));
    parsed.push(...compact(paras));
  }

}

function compact(ar) {
  return R.reject(R.isNil, ar);
}

function inspect(o) {
  return util.inspect(o, false, null);
}

function makeTestResult(re, result) {
  return !!result ? R.merge({ lastIndex: re.lastIndex }, result) : null;
}

module.exports = { Parser, inspect };
