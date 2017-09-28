# mark-to-jsonml
Parse markdown into [JsonML](http://www.jsonml.org/)

# Installation
```sh
npm install mark-to-jsonml --save
```

# Usage
```javascript
const { Parser, inspect } = require('mark-to-jsonml');

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
console.log(inspect(parsed));
```

## Output
```javascript
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
```

# Note
Currently, It supports these markdown syntax:
* Heading (h)
* Unordered list (ul) 
  * with unlimited depth level
* Horizontal ruler (hr)
* Code (code)
* Blockquote (quote)
* Paragraph (p)
* Inline styles (b, s, i, u)
* Link (a) 
  * and auto link (starting with `http(s)://` prefix)
* Image (img) 
  * and auto image (starting with `http(s)://` prefix and ends with image file extension)
