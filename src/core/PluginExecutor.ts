import {tokenize, parse} from '../utils/marked';
import {Plugin} from '../../types';
import {TokensList} from 'marked';
import Chunk from './Chunk';

/**
 * @param {PluginExecutor} executor
 * @param {string} method
 * @param {*} value
 * @param {function(*=): boolean} validate
 * @returns {Promise<Object[]|string>}
 */
function invoke<T, R>(executor: PluginExecutor, method: string, value: T, validate: (transformed: any) => boolean): Promise<R> {
  const {plugins, chunk} = executor;

  function dispatch(i: number) {
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
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function transform(transformed: T, next: ()=>Promise<R>, plugin: Plugin): Promise<R> {
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
export default class PluginExecutor {
  /**
   * @param {Chunk} chunk
   * @param {Object[]} plugins
   */
  constructor(
    public chunk: Chunk,
    public plugins: Plugin[]
  ) {}

  /**
   * @param {string} content
   * @returns {Promise<TokensList>}
   */
  tokenize(content: string): Promise<TokensList> {
    const tokens = tokenize(content, this.chunk.markedOptions);
    return invoke(this, 'tokenize', tokens, Array.isArray);
  }

  /**
   * @param {TokensList} tokens
   * @returns {Promise<string>}
   */
  transform(tokens: TokensList): Promise<string> {
    const html = parse(tokens, this.chunk.markedOptions);
    const validate = (value: any) => typeof value === 'string';
    return invoke<string, string>(this, 'transform', html, validate);
  }
}
