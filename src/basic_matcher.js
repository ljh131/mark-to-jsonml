const R = require('ramda');
const {boundMethod} = require('autobind-decorator');

const {HeadingCounter} = require('./heading_counter');
const {makeTestResult, compact, inspect, concatLast} = require('./util');

class BasicMatcher {
  constructor(opt) {
    this.headingCounter = new HeadingCounter();

    this.option = opt;
  }

  init() {
    this.headingCounter.init();
    this.footnoteCounter = 1;
    this.footnotes = [];
  }

  @boundMethod
  matchList(string, test) {
    const ULOL = /(^[ ]*([*-]|\d+\.)[ ]+.+\n?)+/gm;
    const result = ULOL.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(ULOL, result);

    const content = result[0];

    const ITEM = /([ ]*)([*-]|\d+\.)[ ]+(.+)/;
    const lines = compact(content.split('\n'));
    console.log(`list lines: '${inspect(lines)}'`);

    let lineIdx = 0;

    const visit = (myLev, lastType) => {
      let curNode = [];
      let nodes = [];
      let type;

      while (lineIdx < lines.length) {
        const line = lines[lineIdx];
        const r = ITEM.exec(line);
        if (!r) {
          lineIdx++;
          continue;
        }
        console.log(`line: '${line}'`);

        const lev = r[1].length;
        type = (r[2] === '*' || r[2] === '-') ? 'ul' : 'ol';
        const name = r[3];

        if (lastType == null) {
          lastType = type;
        }

        console.log(`idx: ${lineIdx}, line: '${line}', lev: ${lev}, type: ${type}, name: '${name}', nodes: '${inspect(nodes)}', cur node: '${inspect(curNode)}' - my lev: ${myLev}, last type: ${lastType}`);

        if (lev < myLev) {
          console.log('> leave');
          break;
        }

        if (lev == myLev) {
          // 타입이 바뀌면 모아놨던걸 넣어준다.
          if (lastType && lastType != type) {
            curNode.push(R.prepend(lastType, nodes));
            lastType = type;
            nodes = [];
            console.log(`type changed, cur node: ${inspect(curNode)}`);
          }

          nodes.push(['li', name]);
          lineIdx += 1;
        } else if (lev > myLev) {
          console.log(`> enter`);
          const children = visit(lev, type);
          console.log(`got children '${inspect(children)}'`);

          concatLast(nodes, children);
        }
      }

      if (nodes.length > 0) {
        // curNode의 마지막 type과 남아있는 마지막 type을 비교
        let lastAddedType;
        if (curNode.length > 0) {
          lastAddedType = R.head(R.last(curNode));
        }
        console.log(`remaining nodes: ${inspect(nodes)}, last added type: ${lastAddedType}, last: ${lastType}`);

        if (curNode.length == 0 || lastAddedType != lastType) {
          curNode.push(R.prepend(lastType, nodes));
        } else {
          curNode.push(nodes);
        }
      }

      console.log(`returning cur node: ${inspect(curNode)}`);
      return curNode;
    };

    const listNode = visit(0, null);
    return listNode;
  }

  @boundMethod
  matchHeading(string, test) {
    const H = /^(#+)[ ]+(.*)/gm;
    let result = H.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(H, result);

    const level = result[1].length;
    const title = result[2] || '';
    const number = this.headingCounter.increase(level);

    const prop = R.merge(this.option.includeHeadingNumber ? {number} : {}, {level});
    return ['h', prop, title];
  }

  @boundMethod
  matchRuler(string, test) {
    const HR = /^(-|=|_){3,}$/gm;
    let result = HR.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(HR, result);

    return ['hr'];
  }

  @boundMethod
  matchBlockQuote(string, test) {
    const BLOCK = /(^>.*\n?)+/gm;
    let result = BLOCK.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(BLOCK, result);

    const content = result[0];

    const QUOTE = /^>(.*)/;
    const quote = compact(content.split('\n').map((line) => {
      const r = QUOTE.exec(line.trim());
      if (!r) return;
      const q = r[1];
      return q;
    })).join('\n');

    return ['blockquote', quote];
  }

  @boundMethod
  matchCode(string, test) {
    const CODE = /^```(.*)([^]+?)^```/gm;
    let result = CODE.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(CODE, result);

    const lang = result[1].trim();
    const content = result[2].replace(/^\n/, '');

    return ['codeblock', {lang}, content];
  }

  @boundMethod
  matchTable(string, test) {
    const TABLE = /(^((\|[^\n]*)+\|$)\n?)+/gm;
    const result = TABLE.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(TABLE, result);

    const content = result[0];
    const extractTds = (line, seperator = /\|/) => {
      const tds = compact(line.split(seperator).map((col) => {
        //console.log('col', col);
        if (col.length == 0) return null;
        return ['td', col.trim()];
      }));
      return tds;
    }

    let th;
    let trs = compact(content.split('\n').map((line, idx) => {
      if (line.length == 0) return null;

      //console.log('line', line, idx);

      // `|| head ||` 처리
      if (idx == 0) {
        //console.log('try th');

        // TABLE re로는 ||로 된 TH를 확인할 수 없으므로
        const TH = /^(\|{2,}[^\n]*)+\|{2,}[ ]*$/gm;
        if (TH.test(line)) {
          const tds = extractTds(line, /\|{2,}/);
          if (tds.length >= 1) {
            //console.log('|| th found on: ', line);
            th = R.unnest(['tr', tds]);
            return null;
          }
        }
      }

      const tds = extractTds(line, /\|+/);
      if (tds.length >= 1) {
        return R.unnest(['tr', tds]);
      }

      return null;
    }));

    // 2줄 이상이고 줄1 내용이 ---로만 이루어져있으면 줄0은 th
    if (trs.length >= 2 &&
      R.all(td => /^-+$/.test(td[1].trim()), R.remove(0, 1, trs[1]))) {
      //console.log('-- th found: ', inspect(trs[1]));
      th = trs[0];
      trs = R.remove(0, 2, trs);
    }

    return th ?
      ['table', ['thead', th], R.unnest(['tbody', trs])] :
      ['table', R.unnest(['tbody', trs])];
  }

  @boundMethod
  matchLink(string, test) {
    const LINK = /\[(.+?)\](?:\(([^\s]+?)\))?|(https?:\/\/[^\s]+)/g;
    let result = LINK.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(LINK, result);

    const title = result[1];
    const href = result[2];
    const urlonly = result[3];

    if (urlonly) {
      return ['a', {href: urlonly, isAutoLink: true}, urlonly];
    } else {
      if (href) {
        return ['a', {href}, title];
      } else {
        // use title as href
        return ['a', {href: title}, title];
      }
    }
  }

  @boundMethod
  matchNewLine(string, test) {
    const NEW_LINE = /\n/g;
    let result = NEW_LINE.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(NEW_LINE, result);

    return ['br'];
  }

  @boundMethod
  matchFootnote(string, test) {
    const FOOTNOTE = this.option.footnotePattern;
    let result = FOOTNOTE.exec(string);
    if (!result) return null;

    if (test) return makeTestResult(FOOTNOTE, result, -1);

    const id = this.footnoteCounter++;
    const title = result[1] || id;
    const content = result[2];

    const meta = {
      id,
      title
    };

    this.footnotes.push(['footnote-item', meta, content]);

    return ['footnote', meta, title];
  }

}

module.exports = {BasicMatcher};
