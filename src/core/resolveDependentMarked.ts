import * as path from 'path';
import Chunk from './Chunk';
import Bundle from './Bundle';

/**
 * 解决依赖的 Markdown 文件
 *
 * @param {Chunk} chunk
 * @param {Bundle} bundle
 * @param {boolean} ignoreMake
 * @return {Promise<[void]>}
 */
export default function resolveDependentMarked(
  chunk: Chunk,
  bundle: Bundle,
  ignoreMake: boolean
) {
  const dir = path.dirname(chunk.filename);
  const markedRE = /\.md$/i;

  return Promise.all(chunk.dependency.map(function (data/*, key*/) {
    data.from = path.resolve(dir, data.from);

    // 非markdown文件不需要解析
    if (!markedRE.test(data.from)) {
      return;
    }

    data.from = data.from.replace(markedRE, '.html');
    data.isMarked = true;

    if (!ignoreMake) {
      return bundle
        .makeFor(data.from)
        .then(sub => sub.write());
    }
  }));
}
