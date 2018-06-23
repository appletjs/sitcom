import {MarkedOptions, Renderer} from 'marked';
import {replaceLocalDependency, isLocalDependency, removeSearchAndAnchor} from '../utils/depend';
import selector2expr from '../utils/selector2expr';
import Chunk from './Chunk';

const idMatchRE = /{#([^}]+)}$/;
const idMatchReplaceRE = new RegExp(idMatchRE.source, 'g');

export default class MarkedRenderer extends Renderer {
  options: MarkedOptions;

  /**
   * @param {Chunk} chunk
   */
  constructor(public chunk: Chunk) {
    super(chunk.markedOptions);
  }

  /**
   * 追加到依赖
   * @param {string} href
   */
  add2imports(href: string): string {
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
  heading(text: string, level: number, raw: string): string {
    const matches = raw.match(idMatchRE);
    let rawId, id = '';

    if (matches) {
      text = text.replace(idMatchReplaceRE, '');
      rawId = matches[1].trim();
    } else if (this.options.headerIds) {
      rawId = this.options.headerPrefix + raw;
    }

    if (rawId) {
      rawId = rawId.replace(/[^\w]+/g, '-');

      if (!/^-+$/g.test(rawId)) {
        id = ` id="${rawId}"`;
      } else {
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
  link(href: string, title: string, text: string): string {
    // todo 小文件考虑 data: 方式使用
    const html = super.link(href, title, text);
    if (!html.startsWith('<a')) return html;
    href = this.add2imports(href);
    if (!/^[#.\[]/.test(title)) return html;
    return '<a' + selector2expr(title) + super.link(href, '', text).substring(2);
  }

  /**
   * @param {string} html
   * @return {string}
   */
  html(html: string): string {
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
  image(href: string, title: string, text: string): string {
    href = this.add2imports(href);
    const attr = /^[#.\[]/.test(title) ? selector2expr(title) : '';
    if (attr) title = '';
    const html = super.image(href, title, text);
    return attr ? html.replace(/^<img/i, '<img' + attr) : html;
  }
}
