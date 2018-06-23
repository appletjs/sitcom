import marked from 'marked';
import {
  lexer,
  parser,
  MarkedOptions,
  TokensList
} from 'marked';

/**
 * 拷贝默认配置，并为相关选项设置值
 *
 * @param {MarkedOptions} options
 * @return {MarkedOptions}
 */
export function withDefaults(options: MarkedOptions = {}): MarkedOptions {
  return Object.assign({}, (<any>marked).defaults, options);
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
export function tokenize(markedContent: string, markedOptions: MarkedOptions): TokensList {
  disableMarkedOptions(markedOptions, 'tokenize');
  return lexer(markedContent, markedOptions);
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
export function parse(markedTokens: TokensList, markedOptions: MarkedOptions): string {
  disableMarkedOptions(markedOptions, 'parse');
  return parser(markedTokens, markedOptions);
}

/**
 * 关闭相关选项
 *
 * @todo 评估开启相关选项对项目的影响
 * @param {marked.MarkedOptions} options
 * @param {string} type
 */
function disableMarkedOptions(options: MarkedOptions, type: string): void {
  if (type === 'tokenize' || type === 'parse') {
    options.baseUrl = null;
  }
}
