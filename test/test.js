const { Parser, inspect } = require('../');
const chai = require('chai');
const expect = chai.expect;

chai.config.truncateThreshold = 0;

describe('markdown parser should parse', () => {
  const p = new Parser({ enableLog: false, includeRoot: false });

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
      ['p', 'link ', ['a', {href: 'http://daum.net'}, 'daum.net'], ' here']
    ]);
  });

  it('paragraph with image link', () => {
    const md = `link http://daum.net/image.png here`;
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      ['p', 'link ', ['img', {src: 'http://daum.net/image.png'}], ' here']
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
      ["ul", 
        ["li", 'first'], 
        ['ul', ['li', 'nested'], ['ul', ['li', 'deeply nested']]],
        ["li", 'second']
      ]
    ]);
  });

  it('code', () => {
    const md = '```\nconsole.log(a)\nreturn\n```';
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      [ 'code', { lang: '' }, 'console.log(a)\nreturn\n' ]
    ]);
  });

  it('code with lang', () => {
    const md = '``` js \nconsole.log(a)\nreturn\n```';
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      [ 'code', { lang: 'js' }, 'console.log(a)\nreturn\n' ]
    ]);
  });

  it('code with inline style', () => {
    const md = '``` js \nconsole.log("**_not a style_**")\nreturn\n```';
    const parsed = p.parse(md);
    expect(parsed).to.deep.equal([
      [ 'code', { lang: 'js' }, 'console.log("**_not a style_**")\nreturn\n' ]
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

    const parser = new Parser();
    const parsed = parser.parse(markdown);
    //console.log(inspect(parsed));
    expect(parsed).to.deep.equal(
      [ 'markdown',
        [ 'h', { level: 1 }, 'hello parser!' ],
        [ 'ul',
          [ 'li', 'first' ],
          [ 'li',
            'second ',
            [ 'b', 'bold ', [ 's', 'and strike' ] ],
            ' plain' ],
          [ 'ul',
            [ 'li', 'nested' ],
            [ 'ul', [ 'li', 'deeply ', [ 'b', 'nested' ] ] ] ] ],
        [ 'h', { level: 2 }, 'try ', [ 'u', 'this!' ] ],
        [ 'code',
          { lang: 'javascript' },
          'console.log("hello parser!");\n' ] ]
    );
  });

});

describe('inline parser should parse', () => {
  const p = new Parser({ enableLog: false, includeRoot: false });

  function makeParagraph(s) {
    return ['p', s];
  }

  it('basic link', () => {
    const parsed = p.parseInline(makeParagraph(`[GitHub](http://github.com)`));
    expect(parsed).to.deep.equal(['p', 
      ['a', { href: 'http://github.com' }, 'GitHub']
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
