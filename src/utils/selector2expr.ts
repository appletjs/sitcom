/**
 * @param {string} str
 * @returns {string}
 */
export default function selector2expr(str: string): string {
  const classList: string[] = [];
  const keys: string[] = [];
  const attrs: Record<string, string | boolean> = {};

  let temp = '';

  // #id
  // .class
  // [attr="value"]
  str = str.replace(/#([\w-]+)/g, function (_, id) {
    if (temp) throw new Error('Repeat declare id');
    temp = ` id="${id}"`;
    return '';
  }).replace(/\.([\w-]+)/g, function (_, c) {
    if (classList.indexOf(c) >= 0) return '';
    classList.push(c);
    return '';
  }).replace(/\[([^\]]+)\]/g, function (_, attr) {
    if (!(attr = attr.trim())) return _;
    const equalIndex = attr.indexOf('=');
    let name: string = attr, value: string;
    if (equalIndex > -1) [name, value] = attr.split('=', 2).map((s: string) => s.trim());
    if (!name) return _;
    if (value && /^["']/.test(value)) value = value.slice(1, -1).replace(/"/g, '&quot;');// 引号转实体
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
