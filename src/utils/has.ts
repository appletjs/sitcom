const hasOwn = Object.prototype.hasOwnProperty;

/**
 * 判断是不是对象的可枚举属性
 *
 * @param {Object} obj
 * @param {string} prop
 * @returns {boolean}
 */
export default function (obj: any, prop: string): boolean {
  return !!obj && hasOwn.call(obj, prop);
}
