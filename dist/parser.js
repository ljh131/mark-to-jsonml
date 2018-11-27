!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports["mark-to-jsonml"]=e():t["mark-to-jsonml"]=e()}(global,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)n.d(r,o,function(e){return t[e]}.bind(null,o));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=3)}([function(t,e){t.exports=require("ramda")},function(t,e,n){var r=n(0),o=n(4);t.exports={buildRe:function(t){var e=t.exec;return t.exec=function(n){var r=!(arguments.length>1&&void 0!==arguments[1])||arguments[1];return t.global&&r&&(t.lastIndex=0),e.call(t,n)},t},makeTestResult:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0;return e?r.merge({lastIndex:t.lastIndex,priority:n},e):null},concatLast:function(t,e){if(t.length>0){var n=t.length-1,r=t[n];t[n]=r.concat(e)}else t.push(e)},compact:function(t){return r.reject(r.isNil,t)},inspect:function(t){return o.inspect(t,!1,null)},getParsedProp:function(t){return t&&"markdown"===t[0]?t[1]:{}}}},function(t,e){function n(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}var r=function(){function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.init()}var e,r,o;return e=t,(r=[{key:"init",value:function(){this.counter={h1:0,h2:0,h3:0}}},{key:"increase",value:function(t){var e;return 1==t?(this.counter.h1+=1,this.counter.h2=0,this.counter.h3=0,e="".concat(this.counter.h1,".")):2==t?(this.counter.h2+=1,this.counter.h3=0,e="".concat(this.counter.h1,".").concat(this.counter.h2,".")):3==t&&(this.counter.h3+=1,e="".concat(this.counter.h1,".").concat(this.counter.h2,".").concat(this.counter.h3,".")),e}}])&&n(e.prototype,r),o&&n(e,o),t}();t.exports={HeadingCounter:r}},function(t,e,n){function r(t){return function(t){if(Array.isArray(t)){for(var e=0,n=new Array(t.length);e<t.length;e++)n[e]=t[e];return n}}(t)||function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}function o(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}var i=n(0),a=n(1),u=a.buildRe,c=a.makeTestResult,l=a.compact,s=a.inspect,h=a.getParsedProp,p=n(5).BasicMatcher,f=n(2).HeadingCounter,m=function(){function t(e){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.option=i.merge({includeRoot:!0,includeHeadingNumber:!0,parseToc:!1,parseFootnote:!1,tocPattern:/^{toc}$/,footnotePattern:/\[\*([^\s]+)?\s([^\]]+)\]/g},e),this.matcher=new p({includeHeadingNumber:this.option.includeHeadingNumber,footnotePattern:u(this.option.footnotePattern)});var n=this.makeBasicInlineMatcher(/~+(.+?)~+/g,{tag:"s"}),r=this.makeBasicInlineMatcher(/\*{2,}(.+?)\*{2,}/g,{tag:"b"}),o=this.makeBasicInlineMatcher(/\*(.+?)\*/g,{tag:"i"}),a=this.makeBasicInlineMatcher(/_+(.+?)_+/g,{tag:"u"}),c=this.makeBasicInlineMatcher(/`(.+?)`/g,{tag:"code"});this.blockMatchers=[{matcher:this.matcher.matchHeading},{matcher:this.matcher.matchRuler},{matcher:this.matcher.matchList},{matcher:this.matcher.matchTable},{matcher:this.matcher.matchBlockQuote},{matcher:this.matcher.matchCode,terminal:!0}],this.inlineMatchers=l([{matcher:n},{matcher:r},{matcher:o},{matcher:a},{matcher:c,terminal:!0},{matcher:this.matcher.matchLink,terminal:!0},this.option.parseFootnote?{matcher:this.matcher.matchFootnote,terminal:!0}:null])}var e,n,a;return e=t,(n=[{key:"makeBasicInlineMatcher",value:function(t,e){return t=u(t),function(n,r){var o=t.exec(n);if(!o)return null;if(r)return c(t,o);o[0];var i=o[1];return[e.tag,i]}}},{key:"addBlockParser",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1];this.blockMatchers.push({matcher:t,terminal:e})}},{key:"addInlineParser",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]&&arguments[1];this.inlineMatchers.push({matcher:t,terminal:e})}},{key:"parse",value:function(t){var e=this;this.matcher.init();for(var n=[],r=t,o=function(){var t=e._bestMatch(e.blockMatchers,r);if(!t)return e._addParagraph(n,r),"break";if(t.testResult.index>0){var o=r.substring(0,t.testResult.index);e._addParagraph(n,o)}var a=t.matcher(r,!1);"Array"!=i.type(a[0])&&(a=[a]),a.forEach(function(r){var o=t.terminal?r:e.parseInline(r);n.push(o)});var u=t.testResult.lastIndex;r=r.substring(u)};r&&r.length>0;){if("break"===o())break}var a=!1;if(this.option.parseToc){var u=this.parseToc(n);n=n.map(function(t){return"p"===t[0]&&e.option.tocPattern.test(t[1])?(a=!0,u):t})}if(this.matcher.footnotes.length>0){var c=i.prepend("footnotes",this.matcher.footnotes);n.push(this.parseInline(c))}return this.option.includeRoot?i.concat(["markdown",{tocParsed:a,footnoteParsed:this.option.parseFootnote}],n):n}},{key:"parseToc",value:function(t){var e=i.filter(function(t){return"Array"===i.type(t)&&"h"===i.head(t)&&t[1].level<=3},i.drop(1,t)),n=new f,r=e.map(function(t){var e=t[1].level,r=n.increase(e);return i.unnest(["toc-item",{level:e,number:r},i.drop(2,t)])});return i.prepend("toc",r)}},{key:"parseInline",value:function(t){return this._applyOnTreePlains(t,this._parseInline.bind(this))}},{key:"_bestMatch",value:function(t,e){var n=t.map(function(t){var n=t.matcher(e,!0);return n?i.merge({testResult:n},t):null});return i.isEmpty(l(n))?null:l(n).reduce(function(t,e){return e.testResult.index<t.testResult.index?e:e.testResult.index>t.testResult.index?t:e.testResult.priority<t.testResult.priority?e:t},{testResult:{index:e.length}})}},{key:"_applyOnTreePlains",value:function(t,e){var n=this;return i.unnest(i.prepend(t[0],t.slice(1).map(function(t){return"String"==i.type(t)?e(t):"Array"==i.type(t)?[n._applyOnTreePlains(t,e)]:t})))}},{key:"_parseInline",value:function(t,e){e||(e=0);var n=[];if(""===t)return[""];for(;t&&t.length>0;){var o=this._bestMatch(this.inlineMatchers,t);if(!o){n.push(t);break}if(o.testResult.index>0){var a=t.substring(0,o.testResult.index);n.push(a)}var u=o.matcher(t,!1),c="Object"==i.type(u[1]),l=c?u[2]:u[1],s=void 0;!o.terminal&&l&&(s=this._parseInline(l,e+1));var h=o.testResult.lastIndex;t=t.substring(h);var p=s?c?[u[0],u[1]].concat(r(s)):[u[0]].concat(r(s)):u;n.push(p)}return n}},{key:"_addParagraph",value:function(t,e){var n=this,o=e.split("\n\n").map(function(t){var e=null;return(t=t.trim()).length>0&&"\n"!=t&&(e=n.parseInline(["p",t])),e});t.push.apply(t,r(l(o)))}}])&&o(e.prototype,n),a&&o(e,a),t}();t.exports={Parser:m,getParsedProp:h,makeTestResult:c,inspect:s}},function(t,e){t.exports=require("util")},function(t,e,n){var r;function o(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function i(t,e,n,r,o){var i={};return Object.keys(r).forEach(function(t){i[t]=r[t]}),i.enumerable=!!i.enumerable,i.configurable=!!i.configurable,("value"in i||i.initializer)&&(i.writable=!0),i=n.slice().reverse().reduce(function(n,r){return r(t,e,n)||n},i),o&&void 0!==i.initializer&&(i.value=i.initializer?i.initializer.call(o):void 0,i.initializer=void 0),void 0===i.initializer&&(Object.defineProperty(t,e,i),i=null),i}var a=n(0),u=n(6).boundMethod,c=n(2).HeadingCounter,l=n(1),s=(l.buildRe,l.makeTestResult),h=l.compact,p=(l.inspect,l.concatLast),f=(i((r=function(){function t(e){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.headingCounter=new c,this.option=e}var e,n,r;return e=t,(n=[{key:"init",value:function(){this.headingCounter.init(),this.footnoteCounter=1,this.footnotes=[]}},{key:"matchList",value:function(t,e){var n=/(^[ ]*([*-]|\d+\.)[ ]+.+\n?)+/gm,r=n.exec(t);if(!r)return null;if(e)return s(n,r);var o=r[0],i=/([ ]*)([*-]|\d+\.)[ ]+(.+)/,u=h(o.split("\n")),c=0;return function t(e,n){for(var r,o,l=[],s=[];c<u.length;){var h=u[c],f=i.exec(h);if(f){var m=f[1].length;r="*"===f[2]||"-"===f[2]?"ul":"ol";var v=f[3];if(null==n&&(n=r),m<e)break;if(m==e)n&&n!=r&&(l.push(a.prepend(n,s)),n=r,s=[]),s.push(["li",v]),c+=1;else if(m>e){var d=t(m,r);p(s,d)}}else c++}s.length>0&&(l.length>0&&(o=a.head(a.last(l))),0==l.length||o!=n?l.push(a.prepend(n,s)):l.push(s));return l}(0,null)}},{key:"matchHeading",value:function(t,e){var n=/^(#+)[ ]*(.*)/gm,r=n.exec(t);if(!r)return null;if(e)return s(n,r);var o=r[1].length,i=r[2]||"",u=this.headingCounter.increase(o);return["h",a.merge(this.option.includeHeadingNumber?{number:u}:{},{level:o}),i]}},{key:"matchRuler",value:function(t,e){var n=/^(-|=|_){3,}$/gm,r=n.exec(t);return r?e?s(n,r):["hr"]:null}},{key:"matchBlockQuote",value:function(t,e){var n=/(^>.*\n?)+/gm,r=n.exec(t);if(!r)return null;if(e)return s(n,r);var o=r[0],i=/^>(.+)/;return["blockquote",h(o.split("\n").map(function(t){var e=i.exec(t.trim());if(e)return e[1]})).join("\n")]}},{key:"matchCode",value:function(t,e){var n=/^```(.*)([^]+?)^```/gm,r=n.exec(t);return r?e?s(n,r):["codeblock",{lang:r[1].trim()},r[2].replace(/^\n/,"")]:null}},{key:"matchTable",value:function(t,e){var n=/(^((\|[^\n]*)+\|$)\n?)+/gm,r=n.exec(t);if(!r)return null;if(e)return s(n,r);var o,i=r[0],u=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:/\|/;return h(t.split(e).map(function(t){return 0==t.length?null:["td",t.trim()]}))},c=h(i.split("\n").map(function(t,e){if(0==t.length)return null;if(0==e){if(/^(\|{2,}[^\n]*)+\|{2,}[ ]*$/gm.test(t)){var n=u(t,/\|{2,}/);if(n.length>=1)return o=a.unnest(["tr",n]),null}}var r=u(t,/\|+/);return r.length>=1?a.unnest(["tr",r]):null}));return c.length>=2&&a.all(function(t){return/^-+$/.test(t[1].trim())},a.remove(0,1,c[1]))&&(o=c[0],c=a.remove(0,2,c)),o?["table",["thead",o],a.unnest(["tbody",c])]:["table",a.unnest(["tbody",c])]}},{key:"matchLink",value:function(t,e){var n=/\[(.+?)\](?:\(([^\s]+?)\))?|(https?:\/\/[^\s]+)/g,r=n.exec(t);if(!r)return null;if(e)return s(n,r);var o=r[1],i=r[2],a=r[3];return a?["a",{href:a,isAutoLink:!0},a]:i?["a",{href:i},o]:["a",{href:o},o]}},{key:"matchFootnote",value:function(t,e){var n=this.option.footnotePattern,r=n.exec(t);if(!r)return null;if(e)return s(n,r,-1);var o=this.footnoteCounter++,i=r[1]||o,a=r[2],u={id:o,title:i};return this.footnotes.push(["footnote-item",u,a]),["footnote",u,i]}}])&&o(e.prototype,n),r&&o(e,r),t}()).prototype,"matchList",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchList"),r.prototype),i(r.prototype,"matchHeading",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchHeading"),r.prototype),i(r.prototype,"matchRuler",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchRuler"),r.prototype),i(r.prototype,"matchBlockQuote",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchBlockQuote"),r.prototype),i(r.prototype,"matchCode",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchCode"),r.prototype),i(r.prototype,"matchTable",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchTable"),r.prototype),i(r.prototype,"matchLink",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchLink"),r.prototype),i(r.prototype,"matchFootnote",[u],Object.getOwnPropertyDescriptor(r.prototype,"matchFootnote"),r.prototype),r);t.exports={BasicMatcher:f}},function(t,e){t.exports=require("autobind-decorator")}])});