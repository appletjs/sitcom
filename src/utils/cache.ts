/**
 * 将函数包装成可缓存结果的新函数
 *
 * @param {function(*=): *} fn
 * @return {function(*=): *}
 */
export default function cache<A, T>(fn: (str: A) => T) {
  const cached = Object.create(null);

  /**
   * 优先自缓存中获取数据
   *
   * @param {string} arg
   * @return {*}
   */
  return function cacheFirstGet(arg: A): T {
    const hit = cached[arg];
    return hit || (cached[arg] = fn(arg));
  };
}
