import * as path from 'path';
import getInputFiles from './getInputFiles';
import Chunk from './Chunk';
import Bundle from './Bundle';

/**
 * 将入口文件转化成 Chunk 实例
 *
 * @param {Bundle} bundle
 * @return {Chunk[]}
 */
export default function input2chunks(bundle: Bundle): Chunk[] {
  const {inputOptions} = bundle;
  const {input, mapping, root} = inputOptions;
  const files: string[] = getInputFiles(input, mapping, root);
  const chunks: Chunk[] = [];

  if (files.length) {
    const {declare, plugins} = inputOptions;
    const declaration = declare && path.resolve(root, declare);

    return files.map(function (file) {
      const chunk = new Chunk(file, plugins, declaration);
      chunk.dependency.master = bundle.dependency;
      return chunk;
    });
  }

  return chunks;
}
