# mark-to-jsonml
Parse markdown into [JsonML](http://www.jsonml.org/)

* Supports most common markdown specs and other extensions
  * Extension includes: table, toc and heading numbers
* Easy to add custom syntax parser
  * With automatic inline style parsing

**This is a parser, not a renderer! If you're looking rendering (in React), check [mark-to-react](https://github.com/ljh131/mark-to-react)!**
# Installation
```sh
npm install mark-to-jsonml --save
```

# Usage example
```javascript
const { Parser, inspect } = require('mark-to-jsonml');

const markdown = `{toc}                          
# hello parser!                                  
* first                                          
* second **bold ~~and strike~~** plain           
 * nested                                        
  1. deeply *nested*                             
  1. and ordered                                 
## try _this!_                                   
\`\`\`javascript                                 
console.log("hello parser!");                    
\`\`\``;                                         
                                                 
const parser = new Parser({ parseToc: true });   
const parsed = parser.parse(markdown);           
console.log(inspect(parsed));                    
```

## Output
```javascript
[ 'markdown',
  { tocParsed: true },
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
    'console.log("hello parser!");\n' ] ]
```


# Supported markdown specs (include extensions)
* Table of content (toc)
* Heading (h1/h2/h3/h4/h5)
* Table (table)
* Ordered list (ol, li) and Unordered list (ul, li)
  * with unlimited depth level
  * mixing Ordered and Unordered is also possible
* Block quote (blockquote)
* Code block (codeblock)
* Paragraph (p)
* Horizontal ruler (hr)
* And Inlines
  * Inline code (code)
  * Link (a) 
    * and auto link (if anything starting with `http(s)://` prefix)
  * bold (b)
  * strike (s)
  * italic (i)
  * underline (u)

# API
## Class: Parser
### new Parser(options)
* `options` {Object}
  * `parseToc` {Boolean}: Parse `table of content` pattern with `tocPattern` 
  * `tocPattern` {String}: Specify `table of content` pattern in text
  * `headingNumber` {Boolean}: Parsed heading props include number (eg, 1, 2, 2.1)
  * `includeRoot` {Boolean}: Parsed result include root element `markdown` with some props
### parse(mdtext)
Parse markdown text into JsonML

* returns {Object}: Parsed result

### addBlockParser(blockParser, isTerminal=false)
Add custom block parse function

* `blockParser` {Function}: A custom parser function (see below)
* `isTerminal`: true if you don't want inline parsing inside (like codeblock)

#### Note: example of custom parser
```javascript
// string {String}: remaining string to parse
// isTest {Boolean}: true if test mode (to check which parser should be run in current step)
function parseMyRuler(string, isTest) {             
  var HR = /^(-){3,}$/gm;                           
  var result = HR.exec(string);                     
                                                    
  // you should return test result on test mode.
  if(isTest) return makeTestResult(HR, result, -1); 
  if(!result) return null;                          
                                                    
  return ['my_hr'];                                 
}                         
          
const p = new Parser();
p.addBlockParser(parseMyRuler, true);                
```

### addInlineParser(inlineParser, isTerminal=false)
Add custom inline parse function

See `addBlockParser`
## function: makeTestResult(re, result, priority=0)
When you use custom parser, you should use this function to make test result and return if parser running with test mode. See example of custom parser.

* `re` {RegExp}: RegExp object used inside your custom parser
* `result` {Object}: Executed result of RegExp
* `priority` {Integer}: Lower value means highest priority 
  * priority used only when more than one parsers are competing

# Note
* Basically, parsed JsonML elements' names follow corresponding HTML elements' names.
