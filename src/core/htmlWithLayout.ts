import {replaceLocalDependency} from '../utils/depend';
import {render} from 'mustache';
import {existsDir, readFileIfExists} from '../utils/fs';
import * as path from 'path';
import relativeId from './relativeId';
import {Heading} from '../../types';
import Bundle from './Bundle';

const defaultTemplate = `<!doctype html>
<html lang="{{lang}}">
<head>
<meta name="charset" content="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="ie=edge">
<title>{{title}}</title>
<link rel="stylesheet" href="https://unpkg.com/normalize.css@6.0.0/normalize.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.12.0/build/styles/vs.min.css">
<style>
html,body{width:100%;height:100%}
*{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}
body{font: 16px/1.5 Helvetica,Arial,Verdana,sans-serif;background:#fff;margin:0 auto;padding:1rem;max-width:960px;}
nav{position:fixed;z-index:10;top:1rem;right:-4px;border:4px solid rgba(0,0,0,.1);background:#fff;padding:.5rem}
nav a{display:block;text-decoration:none}
pre,code {font-family:Monaco,Courier,monospace}
pre {font-size:1rem;margin-bottom:1rem;overflow:hidden}
:not(pre)>code{background:#f8f8f8;color:#e96900;padding:3px 5px;margin:0 2px;font-size:.8rem;white-space:nowrap}
pre>code[class^="language-"]{display:block;background:#F0F0F0;margin:0;line-height:1.5;overflow-x:auto}
blockquote {padding:1rem 2rem;margin:2rem 0;border-left:4px solid #ddd;background-color:#f8f8f8;color:#777}
</style>
</head>
<body>
<!-- 使用内置的极简模板 -->
<nav>
  {{#headings}}
  <a href="#{{id}}">{{text}}</a>
  {{/headings}}
</nav>
{{{content}}}
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.12.0/build/highlight.min.js"></script>
<script>hljs.initHighlightingOnLoad();</script>
</body>
</html>`;

/**
 * @param {Array<{id: string, text: string}>} headings
 * @param {string} content
 * @param {Bundle} bundle
 * @returns {Promise<string>}
 */
export default async function htmlWithLayout(
  headings: Heading[],
  content: string,
  bundle: Bundle
) {
  // todo 修改 output.layout 为 input.layouts
  const layout = bundle.outputOptions.layout && path.resolve(bundle.outputOptions.layout);

  const isLayoutDir = await existsDir(layout);
  const layoutDir = isLayoutDir ? layout : path.dirname(layout);

  let template = isLayoutDir ? path.join(layout, 'index.html') : layout;
  template = await readFileIfExists(template) || defaultTemplate;

  // 模板的资源文件
  template = replaceLocalDependency(template, function (src) {
    const href = path.normalize(path.join(layout || '.', src));
    return bundle.dependency.add(href);
  });

  // 渲染模板
  const data = Object.assign({}, bundle.outputOptions.data || {});
  data.content = render(content, data);
  data.headings = headings;
  template = render(template, data);

  const dist = bundle.outputOptions.dist || '.';
  const root = bundle.inputOptions.root || process.cwd();
  const baseDir = path.normalize(root);

  bundle.dependency.forEach(function (data) {
    // 排除 markdown 文件和非工作目录下的文件
    if (data.isMarked || !data.from.startsWith(baseDir)) {
      return;
    }

    const from = data.from = path.normalize(data.from);

    if (layoutDir !== baseDir && from.startsWith(layoutDir)) {
      data.via = './' + relativeId(layoutDir, from);
    } else {
      data.via = '.' + data.from.substring(baseDir.length);
    }

    data.to = path.resolve(path.join(dist, data.via));

    template = template.replace(data.regex, (bundle.outfile
      ? relativeId(path.dirname(bundle.outfile), data.to)// 取相对路径
      : data.via));
  });

  return template;
}
