/*!
 * Sitcom.js v1.0.0.beta.1
 * Sat, 23 Jun 2018 22:42:08 GMT - commit unknown
 * https://github.com/appletjs/sitcom
 * Released under the MIT License.
 */
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var marked = require('marked');
var marked__default = _interopDefault(marked);
var call2p = _interopDefault(require('call2p'));
var mkdirp = _interopDefault(require('mkdirp'));
var fs = require('fs');
var mustache = require('mustache');
var assert = require('assert');

/**
 * 将函数包装成可缓存结果的新函数
 *
 * @param {function(*=): *} fn
 * @return {function(*=): *}
 */
function cache(fn) {
    const cached = Object.create(null);
    /**
     * 优先自缓存中获取数据
     *
     * @param {string} arg
     * @return {*}
     */
    return function cacheFirstGet(arg) {
        const hit = cached[arg];
        return hit || (cached[arg] = fn(arg));
    };
}

/**
 * 计算 hash 值
 *
 * @link https://adrianmejia.com/blog/2018/04/28/data-structures-time-complexity-for-beginners-arrays-hashmaps-linked-lists-stacks-queues-tutorial/#Improving-Hash-Function
 *
 * @param {*} key
 * @returns {number}
 */
var createHash = cache(function createHash(key) {
    const stringTypeKey = `${key}${typeof key}`;
    let hashValue = 0;
    for (let index = 0; index < stringTypeKey.length; index++) {
        const charCode = stringTypeKey.charCodeAt(index);
        hashValue += charCode << (index * 8);
    }
    return hashValue;
});

/**
 * @type {function(string=): string}
 */
const getDependentKey = cache(
/**
 * 生成占位标识
 *
 * @param {string} encryptString
 * @return {string}
 */
function (encryptString) {
    return '<Dependency#' + createHash(encryptString) + '>';
});
/**
 * 不考虑删除
 */
class Dependency {
    constructor() {
        this.values = new Map();
    }
    /**
     * 依赖数量
     *
     * @return {number}
     */
    get size() {
        return this.values.size;
    }
    /**
     * 设置依赖数据
     *
     * @param {string} key
     * @param {{hash:string,from:string,to:string,via:string,master:boolean}} data
     * @return {Dependency}
     */
    set(key, data) {
        data.isMaster = !this.master;
        if (this.master) {
            this.master.set(key, data);
        }
        this.values.set(key, data);
        return this;
    }
    /**
     * 添加依赖
     *
     * @param {string} origin
     * @param {string|Object} data
     * @return {string}
     */
    add(origin, data = { from: origin }) {
        if (typeof data === 'string') {
            data = { from: data };
        }
        if (!data.from) {
            data.from = origin;
        }
        const hash = getDependentKey(origin);
        data.regex = new RegExp(hash, 'g');
        data.hash = hash;
        this.set(hash, data);
        return hash;
    }
    /**
     * @param {function(Object=,string=,Dependency=): void} fn
     * @param {*} [thisArg]
     */
    forEach(fn, thisArg = this) {
        this.values.forEach((data, hash) => {
            fn.call(thisArg, data, hash, this);
        });
    }
    /**
     * @param {function(Object=,string=,Dependency=): *} fn
     * @param {*} [thisArg]
     * @return {*[]}
     */
    map(fn, thisArg = this) {
        const values = [];
        this.forEach((val, key) => {
            values.push(fn.call(thisArg, val, key, this));
        });
        return values;
    }
}

const hasOwn = Object.prototype.hasOwnProperty;
/**
 * 判断是不是对象的可枚举属性
 *
 * @param {Object} obj
 * @param {string} prop
 * @returns {boolean}
 */
function has (obj, prop) {
    return !!obj && hasOwn.call(obj, prop);
}

function getInputFiles(input, mapping, root) {
    const files = [];
    function append(file) {
        if (typeof file === 'string') {
            files.push(path.resolve(root, file));
        }
        else if (Array.isArray(file)) {
            file.forEach(f => append(f));
        }
    }
    append(typeof input === 'string' && has(mapping, input)
        ? mapping[input]
        : input);
    return files;
}

const externalTagRE = /<\s*(a|area|audio|iframe|img|embed|link|script|source|track|video)\s+([^>]+)>/ig;
const externalAttrRE = /(?:^|\s)(href|src)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/i;
const internetLinkRE = /^([a-z][a-z0-9+.-]*:)?\/\//i; // http、https、ftp、mailto、tel、javascript等
const localLinkRE = /^((\.|\.\.)?\/)?[^\/]+/;
const anchorOrQueryRE = /^[?#].+/; // hash or search
/**
 * 是否为本地依赖
 *
 * 排除下面的情况：
 *
 * - 网络资源：http、https、ftp 等
 * - 脚本定义：javascript、vbscript 等
 * - 打开程序：mailto、tel 等
 *
 * @param {string} href 依赖资源
 * @returns {boolean}
 */
function isLocalDependency(href) {
    return !internetLinkRE.test(href)
        && localLinkRE.test(href)
        && !anchorOrQueryRE.test(href);
}
/**
 * 移除资源上的锚和搜索
 *
 * @example
 *
 * ```js
 * // 四种情况，返回值相同：
 * removeSearchAndAnchor('path/to?search#hash')
 * removeSearchAndAnchor('path/to#hash?search')
 * removeSearchAndAnchor('path/to?search')
 * removeSearchAndAnchor('path/to#hash')
 * // => 'path/to'
 * ```
 *
 * @param {string} href
 * @returns {string}
 */
function removeSearchAndAnchor(href) {
    const searchIndex = href.indexOf('?');
    const hashIndex = href.indexOf('#');
    if (searchIndex === -1 && hashIndex === -1)
        return href;
    if (searchIndex === -1)
        return href.substring(0, hashIndex);
    if (hashIndex === -1)
        return href.substring(0, searchIndex);
    return href.substring(0, Math.min(searchIndex, hashIndex));
}
/**
 * 将本地资源用特定的字符串替换
 *
 * @param {string} html
 * @param {function(*=): string} handle
 * @returns {string}
 */
function replaceLocalDependency(html, handle) {
    return html.replace(externalTagRE, function (_, tag, matches) {
        let attr = matches.match(externalAttrRE);
        if (!attr || !attr[1].trim())
            return _;
        const prefix = matches.substring(0, attr.index);
        const append = matches.substring(attr.index + attr[0].length);
        const name = attr[1];
        const quote = attr[3] ? '"' : (attr[4] ? "'" : '');
        let value = (attr[3] || attr[4] || attr[5]).trim();
        if (!isLocalDependency(value))
            return _;
        if (!(value = removeSearchAndAnchor(value)))
            return _;
        if (!(value = value.trim()))
            return _;
        value = handle(value);
        // TODO 输出格式
        return '<' + tag + ' ' + prefix.trim() + ' ' + name + '=' + quote + value + quote + append + '>';
    });
}

/**
 * @param {string} str
 * @returns {string}
 */
function selector2expr(str) {
    const classList = [];
    const keys = [];
    const attrs = {};
    let temp = '';
    // #id
    // .class
    // [attr="value"]
    str = str.replace(/#([\w-]+)/g, function (_, id) {
        if (temp)
            throw new Error('Repeat declare id');
        temp = ` id="${id}"`;
        return '';
    }).replace(/\.([\w-]+)/g, function (_, c) {
        if (classList.indexOf(c) >= 0)
            return '';
        classList.push(c);
        return '';
    }).replace(/\[([^\]]+)\]/g, function (_, attr) {
        if (!(attr = attr.trim()))
            return _;
        const equalIndex = attr.indexOf('=');
        let name = attr, value;
        if (equalIndex > -1)
            [name, value] = attr.split('=', 2).map((s) => s.trim());
        if (!name)
            return _;
        if (value && /^["']/.test(value))
            value = value.slice(1, -1).replace(/"/g, '&quot;'); // 引号转实体
        attrs[name] = value != null ? value : true;
        keys.push(name);
    });
    if (str.trim()) {
        throw new Error('Bad selector string');
    }
    if (classList.length) {
        temp += ` class="${classList.join(' ')}"`;
    }
    if (keys.length) {
        temp += ' ';
        temp += keys
            .map(key => attrs[key] === true ? key : ` ${key}="${attrs[key]}"`)
            .join(' ');
    }
    return temp;
}

const idMatchRE = /{#([^}]+)}$/;
const idMatchReplaceRE = new RegExp(idMatchRE.source, 'g');
class MarkedRenderer extends marked.Renderer {
    /**
     * @param {Chunk} chunk
     */
    constructor(chunk) {
        super(chunk.markedOptions);
        this.chunk = chunk;
    }
    /**
     * 追加到依赖
     * @param {string} href
     */
    add2imports(href) {
        const origin = href;
        if (isLocalDependency(href)
            && (href = removeSearchAndAnchor(href))
            && (href = href.trim())) {
            return this.chunk.dependency.add(href);
        }
        return origin;
    }
    /**
     * @example
     *
     * ```markdown
     * ## heading{#id}
     * ```
     *
     * @param {string} text
     * @param {number} level
     * @param {string} raw
     * @return {string}
     */
    heading(text, level, raw) {
        const matches = raw.match(idMatchRE);
        let rawId, id = '';
        if (matches) {
            text = text.replace(idMatchReplaceRE, '');
            rawId = matches[1].trim();
        }
        else if (this.options.headerIds) {
            rawId = this.options.headerPrefix + raw;
        }
        if (rawId) {
            rawId = rawId.replace(/[^\w]+/g, '-');
            if (!/^-+$/g.test(rawId)) {
                id = ` id="${rawId}"`;
            }
            else {
                rawId = undefined;
            }
        }
        this.chunk.headings.push({
            level,
            title: text,
            id: rawId
        });
        return `<h${level}${id}>${text}</h${level}>\n`;
    }
    /**
     * @example
     *
     * ```markdown
     * [Yahoo](http://search.yahoo.com/  (#id.class[name=value]))
     * ```
     *
     * @param {string} href
     * @param {string} title
     * @param {string} text
     */
    link(href, title, text) {
        // todo 小文件考虑 data: 方式使用
        const html = super.link(href, title, text);
        if (!html.startsWith('<a'))
            return html;
        href = this.add2imports(href);
        if (!/^[#.\[]/.test(title))
            return html;
        return '<a' + selector2expr(title) + super.link(href, '', text).substring(2);
    }
    /**
     * @param {string} html
     * @return {string}
     */
    html(html) {
        return super.html(replaceLocalDependency(html, href => {
            return this.chunk.dependency.add(href);
        }));
    }
    /**
     * @example
     *
     * ```markdown
     * ![Yahoo](http://search.yahoo.com/  (#id.class[name=value]))
     * ```
     *
     * @param {string} href
     * @param {string} title
     * @param {string} text
     * @return {string}
     */
    image(href, title, text) {
        href = this.add2imports(href);
        const attr = /^[#.\[]/.test(title) ? selector2expr(title) : '';
        if (attr)
            title = '';
        const html = super.image(href, title, text);
        return attr ? html.replace(/^<img/i, '<img' + attr) : html;
    }
}

/**
 * 拷贝默认配置，并为相关选项设置值
 *
 * @param {MarkedOptions} options
 * @return {MarkedOptions}
 */
function withDefaults(options = {}) {
    return Object.assign({}, marked__default.defaults, options);
}
/**
 * 将 markdown 文本转换成 token 列表
 *
 * @param {string} markedContent markdown文本
 * @param {MarkedOptions} markedOptions marked配置
 * @return {TokensList}
 *
 * @throws {Error}
 */
function tokenize(markedContent, markedOptions) {
    disableMarkedOptions(markedOptions, 'tokenize');
    return marked.lexer(markedContent, markedOptions);
}
/**
 * 将 markdown 的 token 列表转换成 HTML
 *
 * @param {TokensList} markedTokens 解析出的token列表
 * @param {MarkedOptions} markedOptions marked配置
 * @return {string}
 *
 * @throws {Error}
 */
function parse(markedTokens, markedOptions) {
    disableMarkedOptions(markedOptions, 'parse');
    return marked.parser(markedTokens, markedOptions);
}
/**
 * 关闭相关选项
 *
 * @todo 评估开启相关选项对项目的影响
 * @param {marked.MarkedOptions} options
 * @param {string} type
 */
function disableMarkedOptions(options, type) {
    if (type === 'tokenize' || type === 'parse') {
        options.baseUrl = null;
    }
}

/**
 * @param {PluginExecutor} executor
 * @param {string} method
 * @param {*} value
 * @param {function(*=): boolean} validate
 * @returns {Promise<Object[]|string>}
 */
function invoke(executor, method, value, validate) {
    const { plugins, chunk } = executor;
    function dispatch(i) {
        const next = dispatch.bind(null, i + 1);
        const plugin = plugins[i];
        if (plugin == null) {
            return i >= plugins.length
                ? Promise.resolve(value)
                : next();
        }
        try {
            if (typeof plugin.setOptions === 'function') {
                plugin.setOptions(chunk.markedOptions);
            }
            const fn = plugin[method];
            return typeof fn === 'function'
                ? transform(fn(value), next, plugin)
                : next();
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
    function transform(transformed, next, plugin) {
        if (transformed == null) {
            return next();
        }
        if (validate(transformed)) {
            value = transformed;
            return next();
        }
        if (transformed instanceof Promise) {
            return transformed.then(function (data) {
                return transform(data, next, plugin);
            });
        }
        const pluginName = plugin.name || 'anonymous';
        const message = 'Bad tokenize for pluginInvoker ' + pluginName;
        throw new Error(message);
    }
    return dispatch(0);
}
/**
 * @example 插件
 *
 * ```
 * function pluginFactory() {
 *   return {
 *     name: 'plugin name',
 *     setOptions(markedOptions) {}
 *     tokenize(tokens) {}
 *     transform(html) {}
 *   }
 * }
 * ```
 */
class PluginExecutor {
    /**
     * @param {Chunk} chunk
     * @param {Object[]} plugins
     */
    constructor(chunk, plugins) {
        this.chunk = chunk;
        this.plugins = plugins;
    }
    /**
     * @param {string} content
     * @returns {Promise<TokensList>}
     */
    tokenize(content) {
        const tokens = tokenize(content, this.chunk.markedOptions);
        return invoke(this, 'tokenize', tokens, Array.isArray);
    }
    /**
     * @param {TokensList} tokens
     * @returns {Promise<string>}
     */
    transform(tokens) {
        const html = parse(tokens, this.chunk.markedOptions);
        const validate = (value) => typeof value === 'string';
        return invoke(this, 'transform', html, validate);
    }
}

/**
 * 浅拷贝对象数据
 *
 * @param {Object} object 数据源
 * @param {*} [excludes] 被忽略的数据
 * @returns {{}}
 */
function cloneObject(object, excludes) {
    // 判断是不是数组，方便 array.map(cloneObject) 这样使用
    if (!Array.isArray(excludes) || !excludes.length) {
        return { ...object };
    }
    const newObject = {};
    for (let prop in object) {
        if (has(object, prop) && excludes.indexOf(prop) === -1) {
            newObject[prop] = object[prop];
        }
    }
    return newObject;
}

const makeDir = call2p.wrap(mkdirp);
const writeFile = call2p.wrap(fs.writeFile);
const readFile = call2p.wrap(fs.readFile);
const statFile = call2p.wrap(fs.stat);
function copyFile(file, to) {
    return call2p(function (cb) {
        const read = fs.createReadStream(file);
        const write = fs.createWriteStream(to);
        write.on('error', (err) => cb(err || new Error()));
        write.on('close', () => cb(null));
        read.pipe(write);
    });
}
function existsFile(file) {
    return statFile(file)
        .then((stat) => stat.isFile())
        .catch(() => false);
}
function existsDir(dir) {
    return statFile(dir)
        .then(stat => stat.isDirectory())
        .catch(() => false);
}
function readFileIfExists(file, charset = 'utf8') {
    return existsFile(file).then(function (exists) {
        if (exists)
            return readFile(file, charset);
    });
}

class Chunk {
    /**
     * @param filename
     * @param {Plugin[]} [plugins]
     * @param {string} [declare] markdown的引用文件
     */
    constructor(filename, plugins, declare) {
        this.filename = filename;
        this.plugins = plugins;
        this.declare = declare;
        this.dependency = new Dependency(); // 收集依赖
        this.markedOptions = {}; // marked参数
        this.headings = []; // 按顺序不分级记录heading
        this.result = ''; // 编译后的HTML
        this.executor = new PluginExecutor(this, plugins);
        this.dependency = new Dependency();
    }
    /**
     * 禁止修改编译结果
     * @return {{headings: *[], result: (string|*)}}
     */
    flatten() {
        const { headings, result } = this;
        return {
            headings: headings.map(x => cloneObject(x)),
            result,
        };
    }
    /**
     * @param {object} markedOptions marked配置
     * @return {Promise<Chunk>}
     */
    async tokenize(markedOptions) {
        let content = '';
        if (this.filename)
            content += await readFile(this.filename, 'UTF8');
        if (this.declare)
            content += await readFile(this.declare, 'UTF8');
        this.markedOptions = withDefaults(markedOptions);
        this.tokens = await this.executor.tokenize(content);
        return this;
    }
    /**
     * @return {Promise<Chunk>}
     */
    async transform() {
        this.markedOptions.renderer = new MarkedRenderer(this);
        this.result = await this.executor.transform(this.tokens);
        return this;
    }
}

/**
 * 将入口文件转化成 Chunk 实例
 *
 * @param {Bundle} bundle
 * @return {Chunk[]}
 */
function input2chunks(bundle) {
    const { inputOptions } = bundle;
    const { input, mapping, root } = inputOptions;
    const files = getInputFiles(input, mapping, root);
    const chunks = [];
    if (files.length) {
        const { declare, plugins } = inputOptions;
        const declaration = declare && path.resolve(root, declare);
        return files.map(function (file) {
            const chunk = new Chunk(file, plugins, declaration);
            chunk.dependency.master = bundle.dependency;
            return chunk;
        });
    }
    return chunks;
}

/**
 * 解决依赖的 Markdown 文件
 *
 * @param {Chunk} chunk
 * @param {Bundle} bundle
 * @param {boolean} ignoreMake
 * @return {Promise<[void]>}
 */
function resolveDependentMarked(chunk, bundle, ignoreMake) {
    const dir = path.dirname(chunk.filename);
    const markedRE = /\.md$/i;
    return Promise.all(chunk.dependency.map(function (data /*, key*/) {
        data.from = path.resolve(dir, data.from);
        // 非markdown文件不需要解析
        if (!markedRE.test(data.from)) {
            return;
        }
        data.from = data.from.replace(markedRE, '.html');
        data.isMarked = true;
        if (!ignoreMake) {
            return bundle
                .makeFor(data.from)
                .then(sub => sub.write());
        }
    }));
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function relativeId(from, to) {
    return path.relative(from, to);
}

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
async function htmlWithLayout(headings, content, bundle) {
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
    data.content = mustache.render(content, data);
    data.headings = headings;
    template = mustache.render(template, data);
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
        }
        else {
            data.via = '.' + data.from.substring(baseDir.length);
        }
        data.to = path.resolve(path.join(dist, data.via));
        template = template.replace(data.regex, (bundle.outfile
            ? relativeId(path.dirname(bundle.outfile), data.to) // 取相对路径
            : data.via));
    });
    return template;
}

/**
 * 打印代码到控制台
 *
 * @param {StdoutLogHandle} stdout
 * @param {string} code
 * @param {number} [length]
 */
function printCode(stdout, code, length = 100) {
    const lines = code.split('\n').length;
    const spaces = ' '.repeat(Math.floor(lines / 100));
    const spacesLength = spaces.length;
    const pad = (i) => (spaces + i).slice(-spacesLength);
    stdout(true);
    stdout('Print content to stdout', 'ok', true);
    stdout('='.repeat(length + spaces.length + 2), true);
    let bytes = 0;
    let lineno = 0;
    let buffer = '';
    function flush(i) {
        if (buffer && i) {
            lineno = i;
            stdout(pad(i) + '. ');
            stdout(buffer, 'tip', true);
        }
        else if (buffer) {
            stdout(spaces + '  ');
            stdout(buffer, 'tip', true);
        }
        buffer = '';
        bytes = 0;
    }
    // 字符编码数值对应的存储长度：
    // UCS-2编码(16进制) UTF-8 字节流(二进制)
    // 0000 - 007F       0xxxxxxx （1字节）
    // 0080 - 07FF       110xxxxx 10xxxxxx （2字节）
    // 0800 - FFFF       1110xxxx 10xxxxxx 10xxxxxx （3字节）
    for (let i = 0; i < code.length; i++) {
        const char = code.charAt(i);
        const charCode = code.charCodeAt(i);
        if (charCode < 0x007f) {
            bytes++;
        }
        else if ((0x0080 <= charCode) && (charCode <= 0x07ff)) {
            bytes += 2;
        }
        else if ((0x0800 <= charCode) && (charCode <= 0xffff)) {
            bytes += 3;
        }
        else {
            bytes += 4;
        }
        if (char === '\n') {
            flush(++lineno);
            continue;
        }
        buffer += char;
        if (bytes >= length) {
            flush();
        }
    }
    flush();
    stdout('='.repeat(length + spaces.length + 2), true);
}

function isHeading(data) {
    if (!data || !data.level || !data.title)
        return false;
    let { title, level } = data;
    if (level !== +level || level < 1 || level > 6)
        return false;
    return String(title).trim().length > 0;
}
/**
 * intro + result + outro
 *
 * @param {Chunk} chunk
 * @param {Bundle} bundle 输出配置
 * @param {number} times 当前入口调用 intro/outro 的次数
 * @param {number} maxTimes 当前入口会调用 intro/outro 的最大次数
 * @returns {Chunk}
 */
function wrapChunkResult(chunk, bundle, times, maxTimes) {
    let { intro, outro, data = {} } = bundle.outputOptions;
    if (!data) {
        data = bundle.outputOptions.data = {};
    }
    const wrapData = chunk.flatten();
    wrapData.maxTimes = maxTimes;
    wrapData.times = times;
    wrapData.data = data;
    function ro(value, name) {
        if (value == null)
            return '';
        if (typeof value !== 'function')
            return String(value);
        return wrapData ? ro(value(wrapData), name) : `<!-- bad output.${name} -->`;
    }
    intro = ro(intro, 'intro');
    outro = ro(outro, 'outro');
    let headings = [];
    if (wrapData.headings == null) ;
    else if (Array.isArray(wrapData.headings)) {
        // 取有效的 heading
        headings = wrapData.headings.filter(h => isHeading(h));
    }
    else if (isHeading(wrapData.headings)) {
        // 如果有标题
        headings.push(wrapData.headings);
    }
    Object.assign(bundle.outputOptions.data, wrapData.data || {});
    chunk.headings = headings;
    chunk.result = intro + chunk.result + outro;
    return chunk;
}

/**
 * @param {*} input 如何文件
 * @param {string} [output] 输出文件
 * @param {string} [dist]
 */
function resolveOutputFile(input, output, dist) {
    // 根据入口文件确定输出文件
    if (!output && typeof input === 'string') {
        // 只需要简单替换其扩展名即可，保证其数据结构
        output = input.slice(0, -1 * path.extname(input).length) + '.html';
    }
    if (output && dist) {
        return path.resolve(dist, output);
    }
    else if (output) {
        return path.resolve(output);
    }
}

class Bundle {
    /**
     * @param {Sitcom} sitcom
     * @param {Object} inputOptions
     * @param {Object} [outputOptions]
     * @param {Object} [markedOptions]
     */
    constructor(sitcom, inputOptions, outputOptions = {}, markedOptions = {}) {
        this.sitcom = sitcom;
        this.inputOptions = inputOptions;
        this.outputOptions = outputOptions;
        this.markedOptions = markedOptions;
        this.dependency = new Dependency();
        this.chunks = input2chunks(this);
    }
    /**
     * @param {Sitcom} sitcom
     * @param {Object} inputOptions
     * @param {Object} [outputOptions]
     * @param {Object} [markedOptions]
     * @return {Promise<Bundle>}
     */
    static async make(sitcom, inputOptions, outputOptions = {}, markedOptions = {}) {
        const bundle = new Bundle(sitcom, inputOptions, outputOptions, markedOptions);
        bundle.dependency.master = sitcom.dependency;
        // generate tokens
        for (let i = 0; i < bundle.chunks.length; i++) {
            await bundle.chunks[i].tokenize(bundle.markedOptions);
        }
        return bundle;
    }
    /**
     * @param input
     * @return {Promise<Bundle>}
     */
    makeFor(input) {
        const file = input.replace(/\.md$/i, '.html');
        return Bundle.make(this.sitcom, Object.assign({}, this.inputOptions, { input }), Object.assign({}, this.outputOptions, { file }), this.markedOptions).then(bundle => {
            bundle.dependency.master = this.dependency;
            return bundle;
        });
    }
    /**
     * @param {sitcom.OutputOptions} outputOptions
     * @returns {Promise<{html: string, headings: Heading[], dependency: Dependency}>}
     */
    async generate(outputOptions) {
        // merge output markedOptions
        Object.assign(this.outputOptions, outputOptions || {});
        // 根据入口文件确定输出文件
        this.outfile = resolveOutputFile(this.inputOptions.input, this.outputOptions.file, this.outputOptions.dist);
        const length = this.chunks.length;
        const { dependency } = this;
        const headings = [];
        const partials = [];
        for (let i = 0; i < length; i++) {
            const chunk = this.chunks[i];
            await chunk.transform();
            wrapChunkResult(chunk, this, i + 1, length);
            partials.push(chunk.result);
            if (chunk.headings.length) {
                headings.push(...chunk.headings
                    .map(h => cloneObject(h)));
            }
            await resolveDependentMarked(chunk, this, !this.outfile);
        }
        // todo html-renderer
        const html = await htmlWithLayout(headings, partials.join('\n'), this);
        return {
            html,
            headings,
            dependency,
        };
    }
    /**
     * @todo 取消 console
     * @param outputOptions
     * @return {Promise<void>}
     */
    async write(outputOptions) {
        const { html } = await this.generate(outputOptions);
        const { stdout } = this.sitcom;
        // 没有指定输出文件，则将
        // 解析的结果打印到控制台
        if (!this.outfile) {
            printCode(stdout, html);
            stdout(true);
            return;
        }
        const baseDir = process.cwd();
        const { silent } = this.sitcom;
        const notInCwd = (from) => {
            if (silent)
                return;
            stdout(relativeId(baseDir, from));
            stdout('    ');
            stdout('not in working directory', 'err', true);
        };
        const notFound = (from, to) => {
            if (silent)
                return;
            stdout(relativeId(baseDir, from));
            stdout(' => ');
            stdout(relativeId(baseDir, to));
            stdout('    ');
            stdout('not found', 'err', true);
        };
        const access = (from, to) => {
            if (silent)
                return;
            if (typeof from === 'string') {
                stdout(relativeId(baseDir, from));
                stdout(' => ');
            }
            stdout(relativeId(baseDir, to));
            stdout('    ');
            stdout('ok', 'ok', true);
        };
        // 输入文件
        {
            if (!stdout())
                stdout(true);
            stdout('[Bundle]', 'tip', true);
            access(this.inputOptions.input, this.outfile);
            await makeDir(path.dirname(this.outfile));
            await writeFile(this.outfile, html, 'UTF8');
            stdout(true);
        }
        // 输出依赖
        {
            if (!this.dependency.size)
                return;
            if (!stdout())
                stdout(true);
            stdout('[Dependencies]', 'tip', true);
            await Promise.all(this.dependency.master.map(async ({ to, from }) => {
                if (!to) {
                    notInCwd(from);
                }
                else if (!(await existsFile(from))) {
                    notFound(from, to);
                }
                else {
                    await makeDir(path.dirname(to));
                    await copyFile(from, to);
                    access(from, to);
                }
            }));
            stdout(true);
        }
    }
}

function createStdoutHandle(sitcom) {
    return function (msg, type = 'log', nl = false) {
        const stdout = sitcom.options && sitcom.options.stdout;
        if (!stdout)
            return;
        else if (msg === undefined)
            return stdout();
        else if (typeof msg === 'boolean')
            stdout(msg);
        else if (typeof type === 'boolean')
            stdout(msg, type);
        else
            stdout(msg, type, nl);
    };
}
class Sitcom {
    /**
     * 创建一个新的 Sitcom 实例
     *
     * @param {boolean} silent 控制台静默开关
     */
    constructor(silent = false) {
        this.silent = silent;
        this.dependency = new Dependency();
        this.options = {};
        this.stdout = createStdoutHandle(this);
    }
    /**
     * @todo 让marked支持流程图
     *
     * @param {object} options
     *
     * - input       # 入口文件、入口文件列表
     * - declare     # 可选，声明文件
     * - plugins     # 可选，插件列表
     * - mapping     # 可选，将入口文件映射成真实的文件或文件列表
     * - layouts     # 可选，根据入口文件映射出其模板文件
     * - silent      # 可选，静默模式
     *
     * - marked      # 可选，marked编译选项，下面是有效选项
     *
     *   - breaks: false,
     *   - gfm: true,
     *   - headerIds: true,
     *   - headerPrefix: '',
     *   - highlight: null,
     *   - langPrefix: 'language-',
     *   - mangle: true,
     *   - pedantic: false,
     *   - sanitize: false,
     *   - sanitizer: null,
     *   - silent: false,
     *   - smartLists: false,
     *   - smartypants: false,
     *   - tables: true,
     *   - xhtml: false
     *
     * - output      # 可选，
     *   - intro     # 可选，添加到每个文件开头
     *   - outro     # 可选，添加到每个文件结尾
     *   - file      # 可选，输出文件，根据入口文件确定，无法确定（入口文件为列表时）时，将内容打包到控制台
     *   - dist      # 可选，输出目录，默认 'dist'
     *   - data      # 可选，模板数据
     *
     * @return {Promise<Bundle>}
     */
    make(options) {
        // todo 实现更加精确的参数校验规则
        assert.ok(options, '"options" is required.');
        assert.ok(options.input, '"options.input" is required.');
        this.options = options;
        // 静默开关设置
        if (has(options, 'silent')) {
            this.silent = options.silent;
        }
        if (!options.plugins) {
            options.plugins = [];
        }
        else if (!Array.isArray(options.plugins) && !this.silent) {
            this.stdout('Invalid plugins type.', 'warn', true);
            this.stdout('We convert "options.plugins" to an Array.', 'warn', true);
            this.stdout(true);
            options.plugins = [];
        }
        // 确定文件根目录（非工作目录）
        options.root = path.resolve(options.root || process.cwd());
        // 单独提出 markdown配置、输出配置，
        // 剩下的则都是输入配置选项了。
        const { marked$$1 = {}, output = {}, ...inputOptions } = options;
        // 返回入口bundle
        return Bundle.make(this, inputOptions, output, marked$$1);
    }
}

function sitcom(silent = false) {
    return new Sitcom(silent);
}
sitcom.Sitcom = Sitcom;

module.exports = sitcom;
