import cache from './cache';

/**
 * 计算 hash 值
 *
 * @link https://adrianmejia.com/blog/2018/04/28/data-structures-time-complexity-for-beginners-arrays-hashmaps-linked-lists-stacks-queues-tutorial/#Improving-Hash-Function
 *
 * @param {*} key
 * @returns {number}
 */
export default cache<string, number>(function createHash(key: string): number {
  const stringTypeKey = `${key}${typeof key}`;
  let hashValue = 0;

  for (let index = 0; index < stringTypeKey.length; index++) {
    const charCode = stringTypeKey.charCodeAt(index);
    hashValue += charCode << (index * 8);
  }

  return hashValue;
});
