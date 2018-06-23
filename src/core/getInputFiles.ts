import has from '../utils/has';
import * as path from 'path';
import {InputMapping} from '../../types';

export default function getInputFiles(input: string | string[], mapping: InputMapping, root: string): string[] {
  const files: string[] = [];

  function append(file: string | string[]) {
    if (typeof file === 'string') {
      files.push(path.resolve(root, file));
    } else if (Array.isArray(file)) {
      file.forEach(f => append(f));
    }
  }

  append(typeof input === 'string' && has(mapping, input)
    ? mapping[input]
    : input
  );

  return files;
}
