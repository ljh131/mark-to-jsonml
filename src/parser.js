const R = require('ramda');
const util = require('util');

class HeadingCounter {
  constructor() {
    this.init();
  }

  init() {
    this.counter = { h1: 0, h2: 0, h3: 0 };
  }

  increase(lev) {
    let num;
    if(lev == 1) {
      this.counter.h1 += 1;
      this.counter.h2 = 0;
      this.counter.h3 = 0;
      num = `${this.counter.h1}.`;
    } else if(lev == 2) {
      this.counter.h2 += 1;
      this.counter.h3 = 0;
      num = `${this.counter.h1}.${this.counter.h2}.`;
    } else if(lev == 3) {
      this.counter.h3 += 1;
      num = `${this.counter.h1}.${this.counter.h2}.${this.counter.h3}.`;
    }
    return num;
  }
}

class Parser {
  constructor(opt) {
    this.option = R.merge({ 
      includeRoot: true, // parse시 'markdown' tag와 prop을 붙인다.
      parseToc: false, // tocPattern을 목차로 바꾼다.
      tocPattern: /^{toc}$/, // 목차 패턴
      headingNumber: true, // heading의 prop에 number로 번호를 붙인다.
    }, opt);

    console.log(`parser option: ${inspect(this.option)}`);

    // NOTE: inline regex should have `global` option
    const matchStrike = this.makeBasicInlineMatcher(/~+(.+?)~+/g, { tag: 's' });
    const matchBold = this.makeBasicInlineMatcher(/\*{2,}(.+?)\*{2,}/g, { tag: 'b' });
    const matchItalic = this.makeBasicInlineMatcher(/\*(.+?)\*/g, { tag: 'i' });
    const matchUnderscore = this.makeBasicInlineMatcher(/_+(.+?)_+/g, { tag: 'u' });
    const matchInlineCode = this.makeBasicInlineMatcher(/`(.+?)`/g, { tag: 'code' });

    this.BLOCK_MATCHERS = [
      { matcher: this.matchHeading }, 
      { matcher: this.matchRuler }, 
      { matcher: this.matchList }, 
      { matcher: this.matchTable },
      { matcher: this.matchBlockQuote },
      { matcher: this.matchCode, terminal: true }
    ].map(m => { 
      m.matcher = m.matcher.bind(this);
      return m;
    });

    this.INLINE_MATCHERS = [
      { matcher: matchStrike }, 
      { matcher: matchBold },
      { matcher: matchItalic }, 
      { matcher: matchUnderscore },
      { matcher: matchInlineCode, terminal: true },
      { matcher: this.matchLink, terminal: true }
    ].map(m => { 
      m.matcher = m.matcher.bind(this);
      return m;
    });

    this.headingCounter = new HeadingCounter();
  }

  addBlockParser(blockParser, isTerminal=false) {
    this.BLOCK_MATCHERS.push({matcher: blockParser, terminal: isTerminal});
  }

  addInlineParser(inlineParser, isTerminal=false) {
    this.INLINE_MATCHERS.push({matcher: inlineParser, terminal: isTerminal});
  }

  parse(mdtext) {
    this.headingCounter.init();

    let parsed = [];
    console.log("START PARSE");

    var s = mdtext;
    while(!!s && s.length > 0) {
      // 먼저 test모드로 돌려본다.
      console.log(`BEGIN test match string: '${s}'`);

      const m = this.bestMatch(this.BLOCK_MATCHERS, s);
      if(!m) {
        console.log(`no match: `, s);
        this.addParagraph(parsed, s);
        break;
      }

      if(m.testResult.index > 0) {
        const plain = s.substring(0, m.testResult.index);
        console.log(`no matched as plain: '${plain}'`);
        this.addParagraph(parsed, plain);
      }

      // best matched로 실제 parse
      // FIXME el could be null (테스트에서는 가능했지만 실제 파싱이 불가능한 경우?)
      const el = m.matcher(s, false);

      console.log(`MATCHER ${m.matcher.name}, parse result: ${inspect(el)}`);

      const lastIndex = m.testResult.lastIndex;
      s = s.substring(lastIndex);

      // traverse하며 inline parse를 적용한다.
      const inlinedEl = m.terminal ? el : this.parseInline(el);
      console.log(`INLINE PARSED: ${inspect(inlinedEl)}`);

      // root parse tree에 추가한다.
      parsed.push(inlinedEl);
    }

    //console.log(`FINALLY PARSED:\n${inspect(parsed)}`);

    let tocParsed = false;

    if(this.option.parseToc) {
      const toc = this.parseToc(parsed);
      //console.log(`PARSED TOC:\n${inspect(toc)}`);

      parsed = parsed.map((el) => {
        if(el[0] === 'p' && this.option.tocPattern.test(el[1])) {
          tocParsed = true;
          return toc;
        } else {
          return el;
        }
      });
    }

    console.log(`FINALLY PARSED:\n${inspect(parsed)}`);

    return this.option.includeRoot ? R.concat(['markdown', {tocParsed}], parsed) : parsed;
  }

  // headings를 toc로 만들어준다.
  // ['toc', ['toc-item', {level: 1, number: '1.'}, 'introduction', ['s', 'intro']], ...]
  parseToc(parsed) {
    const headings = R.filter((a) => R.type(a) === "Array" && R.head(a) === 'h' && a[1].level <= 3, R.drop(1, parsed));
    const counter = new HeadingCounter();

    const list = headings.map((h) => {
      const lev = h[1].level;
      const num = counter.increase(lev);

      return R.unnest(['toc-item', {level: lev, number: num}, R.drop(2, h)]);
    });
    return R.prepend('toc', list);
  }

  /**
   * @returns regex test result (use simply makeTestResult) if test, parsed jsonml array element if !test
   */
  matchList(string, test) {
    const UL = /(^[ ]*([*-]|\d+\.)[ ]+.+\n?)+/gm;
    const result = UL.exec(string);

    //console.log(`UL test: ${test}, result: ${result}`);

    if(test) return makeTestResult(UL, result);
    if(!result) return null;

    const content = result[0];

    const LI = /([ ]*)([*-]|\d+\.)[ ]+(.+)/;
    const lines = compact(content.split('\n'));
    console.log(`list lines: '${inspect(lines)}'`);

    let lineIdx = 0;

    const visit = (myLev, lastType) => {
      let curNode = [];
      let nodes = [];
      let type;

      while(lineIdx < lines.length) {
        const line = lines[lineIdx];
        const r = LI.exec(line);
        if(!r) {
          lineIdx++; 
          continue;
        }
        console.log(`line: '${line}'`);

        const lev = r[1].length;
        type = (r[2] === '*' || r[2] === '-') ? 'ul' : 'ol';
        const name = r[3];

        if(lastType == null) {
          lastType = type;
        }

        console.log(`idx: ${lineIdx}, line: '${line}', lev: ${lev}, type: ${type}, name: '${name}', nodes: '${inspect(nodes)}', cur node: '${inspect(curNode)}' - my lev: ${myLev}, last type: ${lastType}`);

        if(lev < myLev) {
          console.log('> leave');
          break;
        }

        if(lev == myLev) {
          // 타입이 바뀌면 모아놨던걸 넣어준다.
          if(lastType && lastType != type) {
            curNode.push(R.prepend(lastType, nodes));
            lastType = type;
            nodes = [];
            console.log(`type changed, cur node: ${inspect(curNode)}`);
          }

          nodes.push(['li', name]);
          lineIdx += 1;
        } else if(lev > myLev) {
          console.log(`> enter`);
          const children = visit(lev, type);
          console.log(`got children '${inspect(children)}'`);

          concatLast(nodes, children);
        } 
      }

      if(nodes.length > 0) {
        // curNode의 마지막 type과 남아있는 마지막 type을 비교
        let lastAddedType;
        if(curNode.length > 0) {
          lastAddedType = R.head(R.last(curNode));
        }
        console.log(`remaining nodes: ${inspect(nodes)}, last added type: ${lastAddedType}, last: ${lastType}`);

        if(curNode.length == 0 || lastAddedType != lastType) {
          curNode.push(R.prepend(lastType, nodes));
        } else {
          curNode.push(nodes);
        }
      }

      console.log(`returning cur node: ${inspect(curNode)}`);
      return curNode;
    };

    const listNode = visit(0, null);
    return listNode[0];
  }

  matchHeading(string, test) {
    var H = /^(#+)[ ]*(.*)/gm;
    var result = H.exec(string);

    if(test) return makeTestResult(H, result);
    if(!result) return null;

    const level = result[1].length;
    const title = result[2] || '';
    const number = this.headingCounter.increase(level);

    const prop = R.merge(this.option.headingNumber ? { number } : {}, { level });
    return ['h', prop, title];
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

  matchCode(string, test) {
    const CODE = /^\`\`\`(.*)([^]+?)^\`\`\`/gm;
    var result = CODE.exec(string);

    if(test) return makeTestResult(CODE, result);
    if(!result) return null;

    const lang = result[1].trim();
    const content = result[2].replace(/^\n/, '');

    return ['codeblock', { lang }, content];
  }

  matchTable(string, test) {
    const TABLE = /(^((\|[^\n]*)+\|[ ]*$)\n?)+/gm;
    const result = TABLE.exec(string);

    if(test) return makeTestResult(TABLE, result);
    if(!result) return null;

    const content = result[0];
    const extractTds = (line, seperator='\|') => {
      const tds = compact(line.split(seperator).map((col) => {
        if(col.length == 0) return null;
        return ['td', col.trim()];
      }));
      return tds;
    }

    let th;
    let trs = compact(content.split('\n').map((line, idx) => {
      if(line.length == 0) return null;

      // `|| head ||` 처리
      if(idx == 0) {
        const tds = extractTds(line, /\|{2,}/);
        if(tds.length > 1) {
          th = R.unnest(['tr', tds]);
          return null;
        }
      }

      const tds = compact(line.split('\|').map((col) => {
        if(col.length == 0) return null;
        return ['td', col.trim()];
      }));
      return R.unnest(['tr', tds]);
    }));

    // 2줄 이상이고 줄1 내용이 ---로만 이루어져있으면 줄0은 th
    if(trs.length >=2 && 
        R.all(td => td[1].replace(/-+/, '').length == 0, R.remove(0, 1, trs[1]))) {
      th = trs[0];
      trs = R.remove(0, 2, trs);
    }

    return th ? 
      ['table', ['thead', th], R.unnest(['tbody', trs])] :
        ['table', R.unnest(['tbody', trs])];
  }

  matchLink(string, test) {
    const LINK = /\[(.+?)\](?:\(([^\s]+?)\))?|(https?:\/\/[^\s]+)/g;
    var result = LINK.exec(string);

    if(test) return makeTestResult(LINK, result);
    if(!result) return null;

    const title = result[1];
    const href = result[2];
    const urlonly = result[3];

    if(!!urlonly) {
      return ['a', { href: urlonly, isAutoLink: true }, urlonly];
    } else {
      if(href) {
        return ['a', { href }, title];
      } else {
        // use title as href
        return ['a', { href: title }, title];
      }
    }
  }

  /*
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

  makeBasicInlineMatcher(re, attr) {
    return (string, test) => {
      re.lastIndex = 0;
      //console.log(`begin basic match s: '${string}', test: ${test}, re: ${re}`);
      var result = re.exec(string);

      if(test) return makeTestResult(re, result);
      if(!result) return null;

      const outer = result[0];
      const inner = result[1];

      console.log(`${attr.tag} outer: ${outer}, inner: ${inner}`);

      return [attr.tag, inner];
    }
  }

  bestMatch(matchers, string) {
    const candidatesResults = matchers.map((m) => {
      const testResult = m.matcher(string, true);
      console.log(`MATCHER ${m.matcher.name}, test result: ${inspect(testResult)}`);
      if(!testResult) return null;
      return R.merge({ testResult }, m);
    });

    if(R.isEmpty(compact(candidatesResults))) {
      return null;
    }

    // 가장 가까이 매치된 것을 선정
    const bestMatched = compact(candidatesResults).reduce((last, val) => {
      if(val.testResult.index < last.testResult.index) {
        return val;
      } else if(val.testResult.index > last.testResult.index) {
        return last;
      } else {
        return val.testResult.priority < last.testResult.priority ? val : last;
      }
    }, { testResult: { index: string.length }});

    return bestMatched;
  }

  parseInline(el) {
    return this._applyOnTreePlains(el, this._parseInline.bind(this));
  }

  /*
   * tree를 순회하면서 plain에 대해 applyfn을 적용한다.
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
      console.log(`${s} SHOULD BE STRING FOR INLINE!!!`);
      return s;
    }
    */

    while(!!s && s.length > 0) {
      console.log(`inline - d${depth} begin match: '${s}'`);

      const m = this.bestMatch(this.INLINE_MATCHERS, s);
      if(!m) {
        console.log(`inline - d${depth} no match`);
        matched.push(s);
        break;
      }

      if(m.testResult.index > 0) {
        const plain = s.substring(0, m.testResult.index);
        console.log(`inline - d${depth} no matched as plain: '${plain}'`);
        matched.push(plain);
      }

      console.log(`inline - d${depth} best match: ${inspect(m)}`);

      // best matched로 실제 parse
      const el = m.matcher(s, false);
      console.log(`inline - d${depth} intermediate parsed: ${inspect(el)}`);

      // 이제 안으로 들어간다
      // inline은 하나의 string에서 여러 el을 만들지 않기 때문에 모두 들어갈 필요는 없다.
      const hasAttr = R.type(el[1]) == 'Object';
      const child = hasAttr ? el[2] : el[1];
      let childEl;
      if(!m.terminal && !!child) {
        childEl = this._parseInline(child, depth + 1);
        console.log(`inline - d${depth} children: ${inspect(childEl)}`);
      }

      const lastIndex = m.testResult.lastIndex;
      s = s.substring(lastIndex);

      const finalEl = !!childEl ? 
        (hasAttr ? [el[0], el[1], ...childEl] : [el[0], ...childEl]) : 
        el;
      console.log(`inline - d${depth} PARSED: ${inspect(finalEl)}`);

      matched.push(finalEl);
    }

    return matched;
  }

  addParagraph(parsed, text) {
    const paras = text.split("\n\n").map(((s) => {
      let para = null;
      s = s.trim();
      if(s.length > 0 && s != '\n') {
        console.log(`PARAGRAPH found: '${s}'`);
        para = this.parseInline(['p', s]);
      }
      return para;
    }));
    parsed.push(...compact(paras));
  }

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

/**
 * low priority value means higher priority. built-in parser use 0
 */
function makeTestResult(re, result, priority=0) {
  return !!result ? R.merge({ lastIndex: re.lastIndex, priority }, result) : null;
}

function getParsedProp(parsed) {
  return parsed && parsed[0] === 'markdown' ? parsed[1] : {};
}

module.exports = { Parser, getParsedProp, makeTestResult, inspect };
