import has from './has';

/**
 * 浅拷贝对象数据
 *
 * @param {Object} object 数据源
 * @param {*} [excludes] 被忽略的数据
 * @returns {{}}
 */
export default function cloneObject<T = any>(object: any, excludes?: string[]): T {
  // 判断是不是数组，方便 array.map(cloneObject) 这样使用
  if (!Array.isArray(excludes) || !excludes.length) {
    return {...object};
  }

  const newObject: any = {};

  for (let prop in object) {
    if (has(object, prop) && excludes.indexOf(prop) === -1) {
      newObject[prop] = object[prop];
    }
  }

  return newObject;
}
