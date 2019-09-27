# mark-to-jsonml
Parse markdown into [JsonML](http://www.jsonml.org/)

* Very easy to add custom markdown syntax
  * With automatic inline parsing
* Supports most common markdown specs and other extension specs
  * Which includes: table, footnote, table of content and more

## Another mark-to-*

* [mark-to-jsonml](https://github.com/ljh131/mark-to-jsonml)
* [mark-to-react](https://github.com/ljh131/mark-to-react)

# Installation
```sh
npm install mark-to-jsonml --save
```

# Example
```javascript
const { Parser, makeTestResult, inspect } = require('mark-to-jsonml');

const markdown = `{toc}
# hello parser!
* first
* second **bold ~~and strike~~** plain
 * nested
  1. deeply *nested*
  1. and ordered
## try _this!_
\`\`\`javascript
console.log("hello mark-to-jsonml!");
\`\`\`
@@@@`;

// string {String}: remaining string to parse
// isTest {Boolean}: true if test mode
function parseMyRuler(string, isTest) {
  const RULER = /^@{3,}$/gm;
  const result = RULER.exec(string);

  // you should return the test result on the test mode.
  if(isTest) return makeTestResult(RULER, result);
  if(!result) return null;

  return ['my_ruler'];
}

const parser = new Parser({ parseToc: true });
parser.addBlockParser(parseMyRuler, true);

const parsed = parser.parse(markdown);
console.log(inspect(parsed));    
```

## Output
```javascript
[ 'markdown',
  { tocParsed: true, footnoteParsed: false },
  [ 'toc',
    [ 'toc-item', { level: 1, number: '1.' }, 'hello parser!' ],
    [ 'toc-item',
      { level: 2, number: '1.1.' },
      'try ',
      [ 'u', 'this!' ] ] ],
  [ 'h', { number: '1.', level: 1 }, 'hello parser!' ],
  [ 'ul',
    [ 'li', 'first' ],
    [ 'li',
      'second ',
      [ 'b', 'bold ', [ 's', 'and strike' ] ],
      ' plain',
      [ 'ul',
        [ 'li',
          'nested',
          [ 'ol',
            [ 'li', 'deeply ', [ 'i', 'nested' ] ],
            [ 'li', 'and ordered' ] ] ] ] ] ],
  [ 'h', { number: '1.1.', level: 2 }, 'try ', [ 'u', 'this!' ] ],
  [ 'codeblock',
    { lang: 'javascript' },
    'console.log("hello mark-to-jsonml!");\n' ],
  [ 'my_ruler' ] ]
```

# Markdown and JsonML elements
Find out which markdown is parsed into which JsonML element.

## Block elements

### Heading
```
['h', { level, number }, ...]
```

### Table of content
```
['toc', // an wrapping element
  ['toc-item', { level, number }, ...] // items corresponding to the heading
]
```

### Table
```
['table', 
  ['thead', 
    ['tr', ['td', ...]]
  ], 
  ['tbody', 
    ['tr', ['td', ...]]
  ]
]
```

### List (Unordered and ordered)
```
['ul', ['li', ...], ['li', ...]] // unordered list
['ol', ['li', ...], ['li', ...]] // ordered list
```

### Block quote 
```
['blockquote', ...]
```

### Code block
```
['codeblock', { lang }, ...]
```

### Paragraph
```
['p', ...]
```

### Horizontal ruler 
```
['hr', ...]
```

## Inline elements
### Inline code 
```
['code', ...]
```

### Link 
URL starts with http:// or https:// will be recognized as a link

```
['a', { href }, ...]
```

### Text decoration (bold, strike, italic, underline)
```
['b', ...] // bold
['s', ...] // strike
['i', ...] // italic
['u', ...] // underline
```

# API
## Class: Parser
### new Parser(options)
* `options` {Object}
  * `includeRoot` {Boolean}: Parsed result contains root element `markdown` with some props
  * `includeHeadingNumber` {Boolean}: Parsed heading prop contains number field (eg, 1, 2, 2.1)
  * `parseNewLine` {Boolean}: Parse new line as `br`
  * `parseToc` {Boolean}: Parse `table of content` pattern with `tocPattern` 
  * `parseFootnote` {Boolean}: Parse `footnote` pattern with `footnotePattern` 
  * `tocPattern` {String}: Specify `table of content` regexp pattern
  * `footnotePattern` {String}: Specify `footnote` regexp pattern

### parse(mdtext)
Parse markdown text into JsonML

* returns {Object}: Parsed result

### addBlockParser(blockParser, isTerminal=false)
Add custom block element parse function. 

A block element is an element that cannot contain other block element, but can contain inline elements.

* `blockParser` {Function}: A custom parser function
* `isTerminal` {Boolean}: true if you don't want inline parsing inside (like codeblock)

### addInlineParser(inlineParser, isTerminal=false)
Add custom inline element parse function. 

An inline element is an element that cannot contain other block element, but can contain other inline elements.

* `inlineParser` {Function}: A custom parser function
* `isTerminal` {Boolean}: true if you don't want inline parsing inside (like inline code)

## function: makeTestResult(re, result, priority=0)
Inside your custom parser, you can use this function to make test result and return if your custom parser uses regexp. Note that you should return test result only if the parser is running with the test mode.

* `re` {RegExp}: RegExp object used inside your custom parser
* `result` {Object}: Executed result of RegExp
* `priority` {Integer}: Lower value means highest priority 
  * priority used only when more than one parsers are competing (which means multiple parser return same index)

## Note: Custom syntax parser
The parser(this library itself) will call your custom parser in two different mode. 1. Test mode and 2. Parse mode(non-test mode). 

In test mode, you should return whether you can parse the given string and some information. In parse mode, you should parsed actual JsonML element. All the other things are done automatically, including inline element parsing. See below for details.

- In test mode:
  - Return null if you can't parse.
  - Return `{index, lastIndex, priority}` if you can parse. 
    - index {Integer}: The position of given string that parser can parse.
    - lastIndex {Integer}: The next position after the parser has finished parse.
    - priority {Integer}: Priority is used when two or more parser returns same index in test mode. If you want more higher priority than others, return less than zero. Otherwise, just use 0. 
- In parse mode(non-test mode):
  - Return the JsonML element.
