import * as path from 'path';

/**
 * @param {*} input 如何文件
 * @param {string} [output] 输出文件
 * @param {string} [dist]
 */
export default function resolveOutputFile(input: any, output?: string, dist?: string) {
  // 根据入口文件确定输出文件
  if (!output && typeof input === 'string') {
    // 只需要简单替换其扩展名即可，保证其数据结构
    output = input.slice(0, -1 * path.extname(input).length) + '.html';
  }

  if (output && dist) {
    return path.resolve(dist, output);
  } else if (output) {
    return path.resolve(output);
  }
}
