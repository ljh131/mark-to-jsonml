const R = require('ramda');

const {buildRe, makeTestResult, compact, inspect, getParsedProp} = require('./util');
const {BasicMatcher} = require('./basic_matcher');
const {HeadingCounter} = require('./heading_counter');

class Parser {
  constructor(opt) {
    this.option = R.merge({
      includeRoot: true, // parse시 'markdown' tag와 prop을 붙인다.
      includeHeadingNumber: false, // heading의 prop에 number로 번호를 붙인다.
      parseNewLine: false, // 각 줄마다 개행한다.
      parseToc: false, // tocPattern을 목차로 바꾼다.
      parseFootnote: false, // footnotePattern을 각주로 바꾼다.
      tocPattern: /^{toc}$/, // 목차 패턴
      footnotePattern: /\[\*([^\s]+)?\s([^\]]+)\]/g, // 각주 패턴
    }, opt);

    console.log(`parser option: ${inspect(this.option)}`);

    this.matcher = new BasicMatcher({
      includeHeadingNumber: this.option.includeHeadingNumber,
      footnotePattern: buildRe(this.option.footnotePattern),
    });

    // NOTE: inline regex should have `global` option
    const matchStrike = this.makeBasicInlineMatcher(/~+(.+?)~+/g, {tag: 's'});
    const matchBold = this.makeBasicInlineMatcher(/\*{2,}(.+?)\*{2,}/g, {tag: 'b'});
    const matchItalic = this.makeBasicInlineMatcher(/\*(.+?)\*/g, {tag: 'i'});
    const matchUnderscore = this.makeBasicInlineMatcher(/_+(.+?)_+/g, {tag: 'u'});
    const matchInlineCode = this.makeBasicInlineMatcher(/`(.+?)`/g, {tag: 'code'});

    this.blockMatchers = [
      {matcher: this.matcher.matchHeading},
      {matcher: this.matcher.matchRuler},
      {matcher: this.matcher.matchList},
      {matcher: this.matcher.matchTable},
      {matcher: this.matcher.matchBlockQuote},
      {matcher: this.matcher.matchCode, terminal: true}
    ];

    this.inlineMatchers = compact([
      {matcher: matchStrike},
      {matcher: matchBold},
      {matcher: matchItalic},
      {matcher: matchUnderscore},
      {matcher: matchInlineCode, terminal: true},
      {matcher: this.matcher.matchLink, terminal: true},
      this.option.parseNewLine ? {matcher: this.matcher.matchNewLine, terminal: true} : null,
      this.option.parseFootnote ? {matcher: this.matcher.matchFootnote, terminal: true} : null
    ]);
  }

  makeBasicInlineMatcher(re, attr) {
    re = buildRe(re);

    return (string, test) => {
      let result = re.exec(string);
      if (!result) return null;

      if (test) return makeTestResult(re, result);

      const outer = result[0];
      const inner = result[1];

      console.log(`${attr.tag} outer: ${outer}, inner: ${inner}`);

      return [attr.tag, inner];
    }
  }

  addBlockParser(blockParser, isTerminal = false) {
    this.blockMatchers.push({matcher: blockParser, terminal: isTerminal});
  }

  addInlineParser(inlineParser, isTerminal = false) {
    this.inlineMatchers.push({matcher: inlineParser, terminal: isTerminal});
  }

  parse(mdtext) {
    this.matcher.init();

    let parsed = [];
    console.log("START PARSE");

    let s = mdtext;
    while (!!s && s.length > 0) {
      // 먼저 test모드로 돌려본다.
      console.log(`\nBEGIN test match string: '${s}'`);

      const m = this._bestMatch(this.blockMatchers, s);
      if (!m) {
        console.log(`no match: `, s);
        this._addParagraph(parsed, s);
        break;
      }

      if (m.testResult.index > 0) {
        const plain = s.substring(0, m.testResult.index);
        console.log(`no matched as plain: '${plain}'`);
        this._addParagraph(parsed, plain);
      }

      // best matched로 실제 parse
      // FIXME el could be null (테스트에서는 가능했지만 실제 파싱이 불가능한 경우?)
      let els = m.matcher(s, false);

      if (R.type(els[0]) != "Array") {
        els = [els];
      }

      console.log(`MATCHER ${m.matcher.name}, PARSE RESULT: ${inspect(els)}`);

      els.forEach(el => {
        // traverse하며 inline parse를 적용한다.
        const inlinedEl = m.terminal ? el : this.parseInline(el);
        console.log(`INLINE PARSED: ${inspect(inlinedEl)}`);

        // root parse tree에 추가한다.
        parsed.push(inlinedEl);
      });

      const lastIndex = m.testResult.lastIndex;
      s = s.substring(lastIndex);
    }

    //console.log(`FINALLY PARSED:\n${inspect(parsed)}`);

    let tocParsed = false;

    if (this.option.parseToc) {
      const toc = this.parseToc(parsed);
      //console.log(`PARSED TOC:\n${inspect(toc)}`);

      parsed = parsed.map((el) => {
        if (el[0] === 'p' && this.option.tocPattern.test(el[1])) {
          tocParsed = true;
          return toc;
        } else {
          return el;
        }
      });
    }

    if (this.matcher.footnotes.length > 0) {
      const footnotes = R.prepend('footnotes', this.matcher.footnotes);
      parsed.push(this.parseInline(footnotes));
    }

    console.log(`FINALLY PARSED:\n${inspect(parsed)}`);

    if (this.option.includeRoot) {
      return R.concat(['markdown', {
        tocParsed,
        footnoteParsed: this.option.parseFootnote
      }], parsed);
    } else {
      return parsed;
    }
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

  parseInline(el) {
    return this._applyOnTreePlains(el, this._parseInline.bind(this));
  }

  _bestMatch(matchers, string) {
    const candidatesResults = matchers.map((m) => {
      const testResult = m.matcher(string, true);
      console.log(`MATCHER ${m.matcher.name}, test result: ${inspect(testResult)}`);
      if (!testResult) return null;
      return R.merge({testResult}, m);
    });

    if (R.isEmpty(compact(candidatesResults))) {
      return null;
    }

    // 가장 가까이 매치된 것을 선정
    const bestMatched = compact(candidatesResults).reduce((last, val) => {
      if (val.testResult.index < last.testResult.index) {
        return val;
      } else if (val.testResult.index > last.testResult.index) {
        return last;
      } else {
        return val.testResult.priority < last.testResult.priority ? val : last;
      }
    }, {testResult: {index: string.length}});

    return bestMatched;
  }

  /*
   * tree를 순회하면서 plain에 대해 applyfn을 적용한다.
   * ['tag', 'plain', 'plain2', ['t', 'another md']]
   * ['tag', {attr}, 'plain', 'plain2', ['t', 'another md']]
   */
  _applyOnTreePlains(ar, applyfn) {
    return R.unnest(R.prepend(ar[0], ar.slice(1).map((e) => {
      if (R.type(e) == 'String') {
        return applyfn(e);
      } else if (R.type(e) == 'Array') {
        // 이건 unnest되면 안되니 []로 감싸준다.
        // FIXME 더 좋은 방법이 없을까?
        return [this._applyOnTreePlains(e, applyfn)];
      } else {
        return e;
      }
    })));
  }

  _parseInline(s, depth) {
    if (!depth) depth = 0;
    const matched = [];

    /*
    if(R.type(s) != 'String') {
      console.log(`${s} SHOULD BE STRING FOR INLINE!!!`);
      return s;
    }
    */

    if (s === '') return [''];

    while (!!s && s.length > 0) {
      console.log(`inline - d${depth} begin match: '${s}'`);

      const m = this._bestMatch(this.inlineMatchers, s);
      if (!m) {
        console.log(`inline - d${depth} no match`);
        matched.push(s);
        break;
      }

      if (m.testResult.index > 0) {
        const plain = s.substring(0, m.testResult.index);
        console.log(`inline - d${depth} no matched as plain: '${plain}'`);
        matched.push(plain);
      }

      console.log(`inline - d${depth} best match: ${inspect(m)}`);

      // best matched로 실제 parse
      const el = m.matcher(s, false);
      console.log(`inline - d${depth} intermediate parsed: ${inspect(el)}`);

      // apply inline parser to child
      // inline은 하나의 string에서 여러 el을 만들지 않기 때문에 모두 들어갈 필요는 없다.
      const hasAttr = R.type(el[1]) == 'Object';
      const child = hasAttr ? el[2] : el[1];
      let childEl;
      if (!m.terminal && !!child) {
        childEl = this._parseInline(child, depth + 1);
        console.log(`inline - d${depth} children: ${inspect(childEl)}`);
      }

      const lastIndex = m.testResult.lastIndex;
      s = s.substring(lastIndex);

      const finalEl = childEl ?
        (hasAttr ? [el[0], el[1], ...childEl] : [el[0], ...childEl]) :
        el;
      console.log(`inline - d${depth} PARSED: ${inspect(finalEl)}`);

      matched.push(finalEl);
    }

    return matched;
  }

  _addParagraph(parsed, text) {
    const paras = text.split("\n\n").map(((s) => {
      let para = null;
      s = s.trim();
      if (s.length > 0 && s != '\n') {
        console.log(`PARAGRAPH found: '${s}'`);
        para = this.parseInline(['p', s]);
      }
      return para;
    }));
    parsed.push(...compact(paras));
  }

}

module.exports = {Parser, getParsedProp, makeTestResult, inspect};
