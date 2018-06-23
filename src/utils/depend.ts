const externalTagRE = /<\s*(a|area|audio|iframe|img|embed|link|script|source|track|video)\s+([^>]+)>/ig;
const externalAttrRE = /(?:^|\s)(href|src)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/i;
const internetLinkRE = /^([a-z][a-z0-9+.-]*:)?\/\//i;// http、https、ftp、mailto、tel、javascript等
const localLinkRE = /^((\.|\.\.)?\/)?[^\/]+/;
const anchorOrQueryRE = /^[?#].+/;// hash or search

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
export function isLocalDependency(href: string): boolean {
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
export function removeSearchAndAnchor(href: string): string {
  const searchIndex = href.indexOf('?');
  const hashIndex = href.indexOf('#');
  if (searchIndex === -1 && hashIndex === -1) return href;
  if (searchIndex === -1) return href.substring(0, hashIndex);
  if (hashIndex === -1) return href.substring(0, searchIndex);
  return href.substring(0, Math.min(searchIndex, hashIndex));
}

/**
 * 将本地资源用特定的字符串替换
 *
 * @param {string} html
 * @param {function(*=): string} handle
 * @returns {string}
 */
export function replaceLocalDependency(html: string, handle: (href: string) => string): string {
  return html.replace(externalTagRE, function (_, tag, matches) {
    let attr = matches.match(externalAttrRE);
    if (!attr || !attr[1].trim()) return _;
    const prefix = matches.substring(0, attr.index);
    const append = matches.substring(attr.index + attr[0].length);
    const name = attr[1];
    const quote = attr[3] ? '"' : (attr[4] ? "'" : '');
    let value = (attr[3] || attr[4] || attr[5]).trim();
    if (!isLocalDependency(value)) return _;
    if (!(value = removeSearchAndAnchor(value))) return _;
    if (!(value = value.trim())) return _;
    value = handle(value);
    // TODO 输出格式
    return '<' + tag + ' ' + prefix.trim() + ' ' + name + '=' + quote + value + quote + append + '>';
  });
}
