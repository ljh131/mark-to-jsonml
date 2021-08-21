const {Parser, makeTestResult, inspect} = require('../dist/parser');
const chai = require('chai');
const expect = chai.expect;

chai.config.truncateThreshold = 0;

describe('markdown parser should parse', () => {
  const p = new Parser({includeRoot: false, parseToc: false});

  it('paragraph', () => {
    const md = `hello markdown parser!`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ["p", 'hello markdown parser!']
    ]);
  });

  it('paragraph with style', () => {
    const md = `plain ~~strike **bold** strike2~~ plain2`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['p', 'plain ', ['s', 'strike ', ['b', 'bold'], ' strike2'], ' plain2']
    ]);
  });

  it('paragraph with link', () => {
    const md = `link http://daum.net here`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['p', 'link ', ['a', {href: 'http://daum.net', isAutoLink: true}, 'http://daum.net'], ' here']
    ]);
  });

  it('paragraph with image link', () => {
    const md = `link http://daum.net/image.png here`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['p', 'link ', ['a', {href: 'http://daum.net/image.png', isAutoLink: true}, 'http://daum.net/image.png'], ' here']
    ]);
  });

  it('heading', () => {
    const md = `# hello\n## plain **bold me**`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ["h", {level: 1}, "hello"],
      ['h', {level: 2}, 'plain ', ['b', 'bold me']]
    ]);
  });

  it('plain list', () => {
    const md = `* first\n* second **bold** plain\n- third`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ["ul",
        ["li", 'first'],
        ["li", 'second ', ['b', 'bold'], ' plain'],
        ["li", 'third']
      ]
    ]);
  });

  it('nested list', () => {
    const md = `* first\n * nested\n  * deeply nested\n* second`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['ul',
        ['li',
          'first',
          ['ul',
            ['li', 'nested', ['ul', ['li', 'deeply nested']]]]],
        ['li', 'second']]
    ]);
  });

  it('nested list2', () => {
    const md = `
- a
 - b
  - c
- 1
 - 2
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal(
      [ [ 'ul',
        [ 'li', 'a', [ 'ul', [ 'li', 'b', [ 'ul', [ 'li', 'c' ] ] ] ] ],
        [ 'li', '1', [ 'ul', [ 'li', '2' ] ] ] ] ]
    );
  });

  it('mixed list at first level', () => {
    const md = `1. aaa\n- bbb`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['ol', ['li', 'aaa']],
      ['ul', ['li', 'bbb']]
    ]);
  });

  it('spaces ahead of first list item are ignored', () => {
    const md = `  - actually first`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['ul',
        ['li', 'actually first']
      ]
    ]);
  });

  it('reversed nested list', () => {
    const md = `
  - a
 - b
- c
- d
 - e
  - f
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal(
      [ [ 'ul',
        [ 'li', 'a' ],
        [ 'li', 'b' ],
        [ 'li', 'c' ],
        [ 'li', 'd' ],
        [ 'li', 'e' ],
        [ 'li', 'f' ] ] ]
    );
  });

  it('reversed nested list2', () => {
    const md = `
 - a
- b
 - c
  - d
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal(
      [ [ 'ul',
        [ 'li', 'a' ],
        [ 'li', 'b' ],
        [ 'li', 'c', [ 'ul', [ 'li', 'd' ] ] ] ] ]
    );
  });

  it('mixed nested list', () => {
    const md = `
- a
 - b
  - c
 - b
- a
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal(
      [ [ 'ul',
        [ 'li',
          'a',
          [ 'ul', [ 'li', 'b', [ 'ul', [ 'li', 'c' ] ] ], [ 'li', 'b' ] ] ],
        [ 'li', 'a' ] ] ]
    );
  });

  it('code', () => {
    const md = '```\nconsole.log(a)\nreturn\n```';
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['codeblock', {lang: ''}, 'console.log(a)\nreturn\n']
    ]);
  });

  it('code with lang', () => {
    const md = '``` js \nconsole.log(a)\nreturn\n```';
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['codeblock', {lang: 'js'}, 'console.log(a)\nreturn\n']
    ]);
  });

  it('code with inline style', () => {
    const md = '``` js \nconsole.log("**_not a style_**")\nreturn\n```';
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['codeblock', {lang: 'js'}, 'console.log("**_not a style_**")\nreturn\n']
    ]);
  });

  it('empty table', () => {
    const md = `
| |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['tbody',
          ['tr', ['td', '']],
        ]
      ]
    ]);
  });

  it('simple table', () => {
    const md = `
| a |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['tbody',
          ['tr', ['td', 'a']],
        ]
      ]
    ]);
  });

  it('trailing space is not allowed table', () => {
    const md = `
| a | 
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['p', '| a |']
    ]);
  });

  it('basic table', () => {
    const md = `
| a | b |
| 1 | 2 |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['tbody',
          ['tr', ['td', 'a'], ['td', 'b']],
          ['tr', ['td', '1'], ['td', '2']],
        ]
      ]
    ]);
  });

  it('something weired table', () => {
    const md = `
| a |
||
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['tbody',
          ['tr', ['td', 'a']],
        ]
      ]
    ]);
  });

  it('table with head', () => {
    const md = `
| a | b |
| - | -- |
| 1 | 2 |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['thead', ['tr', ['td', 'a'], ['td', 'b']]],
        ['tbody', ['tr', ['td', '1'], ['td', '2']]]
      ]
    ]);
  });

  it('table with head should contains only -', () => {
    const md = `
| a | b |
| - | double dash -- |
| 1 | 2 |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['tbody',
          ['tr', ['td', 'a'], ['td', 'b']],
          ['tr', ['td', '-'], ['td', 'double dash --']],
          ['tr', ['td', '1'], ['td', '2']]]]
    ]);
  });

  it('table with head2', () => {
    const md = `
|| a || b ||
| 1 | 2 |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['thead', ['tr', ['td', 'a'], ['td', 'b']]],
        ['tbody', ['tr', ['td', '1'], ['td', '2']]]
      ]
    ]);
  });

  it('table with mix head1/2', () => {
    const md = `
|| a || b ||
| - | - |
| 1 | 2 |
`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['table',
        ['thead', ['tr', ['td', 'a'], ['td', 'b']]],
        ['tbody',
          ['tr', ['td', '-'], ['td', '-']],
          ['tr', ['td', '1'], ['td', '2']]]
      ]
    ]);
  });

  it('complex for example', () => {
    const markdown = `# hello parser!
* first
* second **bold ~~and strike~~** plain
 * nested
  * deeply **nested**
## try _this!_
\`\`\`javascript
console.log("hello parser!");
\`\`\``;

    const parsed = p.parse(markdown);
    //console.log(inspect(parsed));
    expect(parsed).to.deep.equal(
      [['h', {level: 1}, 'hello parser!'],
        ['ul',
          ['li', 'first'],
          ['li',
            'second ',
            ['b', 'bold ', ['s', 'and strike']],
            ' plain',
            ['ul',
              ['li',
                'nested',
                ['ul', ['li', 'deeply ', ['b', 'nested']]]]]]],
        ['h', {level: 2}, 'try ', ['u', 'this!']],
        ['codeblock',
          {lang: 'javascript'},
          'console.log("hello parser!");\n']]
    );
  });
});

describe('inline parser should parse', () => {
  const p = new Parser({includeRoot: false, parseToc: false});

  function makeParagraph(s) {
    return ['p', s];
  }

  it('basic link', () => {
    const parsed = p.parseInline(makeParagraph(`[GitHub](http://github.com)`));
    expect(parsed).to.deep.equal(['p',
      ['a', {href: 'http://github.com'}, 'GitHub']
    ]);
  });

  it('url only link', () => {
    const parsed = p.parseInline(makeParagraph(`[http://github.com]`));
    expect(parsed).to.deep.equal(['p',
      ['a', {href: 'http://github.com'}, 'http://github.com']
    ]);
  });

  it('complex', () => {
    const s = `plain **bold ~~strike *italic*~~** plain`;
    const parsed = p.parseInline(makeParagraph(s));
    expect(parsed).to.deep.equal(['p',
      'plain ',
      ['b', 'bold ', ['s', 'strike ', ['i', 'italic']]],
      ' plain'
    ]);
  });
});

describe('toc parser should parse', () => {
  const p = new Parser({includeRoot: true, includeHeadingNumber: true, parseToc: true});

  it('heading with inline style', () => {
    const mdtext = `
{toc}

# a *s*
## a-1 _u_
### a-1-1
## a-2
# b
`;
    const parsed = p.parse(mdtext);
    expect(parsed).to.deep.equal(
      ['markdown',
        {tocParsed: true, footnoteParsed: false},
        ['toc',
          ['toc-item', {level: 1, number: '1.'}, 'a ', ['i', 's']],
          ['toc-item', {level: 2, number: '1.1.'}, 'a-1 ', ['u', 'u']],
          ['toc-item', {level: 3, number: '1.1.1.'}, 'a-1-1'],
          ['toc-item', {level: 2, number: '1.2.'}, 'a-2'],
          ['toc-item', {level: 1, number: '2.'}, 'b']],
        ['h', {level: 1, number: '1.'}, 'a ', ['i', 's']],
        ['h', {level: 2, number: '1.1.'}, 'a-1 ', ['u', 'u']],
        ['h', {level: 3, number: '1.1.1.'}, 'a-1-1'],
        ['h', {level: 2, number: '1.2.'}, 'a-2'],
        ['h', {level: 1, number: '2.'}, 'b']]
    );
  });
});

describe('footnote parser should parse', () => {
  const p = new Parser({includeRoot: true, parseFootnote: true});

  // FIXME currently not supported
//   it('link inside footnote', () => {
//     const mdtext = `
// hello[*note [http://link.is.here]]
// `;
//
//     const parsed = p.parse(mdtext);
//     console.log(inspect(parsed));
//     expect(parsed).to.deep.equal(
//       ['markdown',
//         {tocParsed: false, footnoteParsed: true},
//         ['p',
//           'hello',
//           ['footnote', {id: 1, title: 'note'}, 'note']],
//         ['footnotes',
//           ['footnote-item',
//             {id: 1, title: 'note'},
//             ['a',
//               {href: 'http://link.is.here'},
//               'http://link.is.here']]]]
//     );
//   });

  it('multiple footnotes on one line', () => {
    const mdtext = `
hello[* hi] parser[* this thing]
`;

    const parsed = p.parse(mdtext);
    expect(parsed).to.deep.equal(
      ['markdown',
        {tocParsed: false, footnoteParsed: true},
        ['p',
          'hello',
          ['footnote', {id: 1, title: 1}, 1],
          ' parser',
          ['footnote', {id: 2, title: 2}, 2]],
        ['footnotes',
          ['footnote-item', {id: 1, title: 1}, 'hi'],
          ['footnote-item', {id: 2, title: 2}, 'this thing']]]
    );
  });

  it('complex footnote', () => {
    const mdtext = `
hello parser[* it parse markdown into jsonml]
you can[*note in other word, optionally] specify footnote 
is it[* for more information, please visit http://github.com] works?
`;
    const parsed = p.parse(mdtext);
    //console.log(inspect(parsed));
    expect(parsed).to.deep.equal(
      ['markdown',
        {tocParsed: false, footnoteParsed: true},
        ['p',
          'hello parser',
          ['footnote', {id: 1, title: 1}, 1],
          '\nyou can',
          ['footnote', {id: 2, title: 'note'}, 'note'],
          ' specify footnote \nis it',
          ['footnote', {id: 3, title: 3}, 3],
          ' works?'],
        ['footnotes',
          ['footnote-item',
            {id: 1, title: 1},
            'it parse markdown into jsonml'],
          ['footnote-item',
            {id: 2, title: 'note'},
            'in other word, optionally'],
          ['footnote-item',
            {id: 3, title: 3},
            'for more information, please visit ',
            ['a',
              {href: 'http://github.com', isAutoLink: true},
              'http://github.com']]]]
    );
  });
});

describe('custom markdown parser should parse', () => {
  it('my horizontal ruler', () => {
    function parseMyRuler(string, isTest) {
      var HR = /^(-){3,}$/gm;
      var result = HR.exec(string);

      if (isTest) return makeTestResult(HR, result, -1);
      if (!result) return null;

      return ['my_hr'];
    }

    const mdtext = `# first heading\n---\n# second heading `;

    const p = new Parser({includeRoot: false, parseToc: false});
    p.addBlockParser(parseMyRuler, true);

    const parsed = p.parse(mdtext);
    expect(parsed).to.deep.equal(
      [['h', {level: 1}, 'first heading'],
        ['my_hr'],
        ['h', {level: 1}, 'second heading ']]
    );
  });
});


describe('markdown parser with new line option should parse', () => {
  const p = new Parser({includeRoot: false, parseToc: false, parseNewLine: true});

  it('multiline text', () => {
    const markdown = `
hello
new
line!

and
paragraph!
`;
    const parsed = p.parse(markdown);
    expect(parsed).to.deep.equal(
      [['p', 'hello', ['br'], 'new', ['br'], 'line!'],
        ['p', 'and', ['br'], 'paragraph!']]
    );
  });
});

