import Bundle from './Bundle';
import Chunk from './Chunk';
import {
  Heading,
  WrapData,
  WrapFunction
} from '../../types';

function isHeading(data: any): boolean {
  if (!data || !data.level || !data.title) return false;
  let {title, level} = data;
  if (level !== + level || level < 1 || level > 6) return false;
  return String(title).trim().length > 0;
}

/**
 * intro + result + outro
 *
 * @param {Chunk} chunk
 * @param {Bundle} bundle 输出配置
 * @param {number} times 当前入口调用 intro/outro 的次数
 * @param {number} maxTimes 当前入口会调用 intro/outro 的最大次数
 * @returns {Chunk}
 */
export default function wrapChunkResult(
  chunk: Chunk,
  bundle: Bundle,
  times: number,
  maxTimes: number
): Chunk {
  let {intro, outro, data = {}} = bundle.outputOptions;

  if (!data) {
    data = bundle.outputOptions.data = {};
  }

  const wrapData: WrapData = chunk.flatten();
  wrapData.maxTimes = maxTimes;
  wrapData.times = times;
  wrapData.data = data;

  function ro(value: string | WrapFunction, name: string): string {
    if (value == null) return '';
    if (typeof value !== 'function') return String(value);
    return wrapData ? ro(value(wrapData), name) : `<!-- bad output.${name} -->`;
  }

  intro = ro(intro, 'intro');
  outro = ro(outro, 'outro');

  let headings: Heading[] = [];
  if (wrapData.headings == null) {
    // 删除了 chunk 的 headings 支持
  } else if (Array.isArray(wrapData.headings)) {
    // 取有效的 heading
    headings = wrapData.headings.filter(h => isHeading(h));
  } else if (isHeading(wrapData.headings)) {
    // 如果有标题
    headings.push(wrapData.headings);
  }

  Object.assign(
    bundle.outputOptions.data,
    wrapData.data || {}
  );

  chunk.headings = headings;
  chunk.result = intro + chunk.result + outro;

  return chunk;
}
