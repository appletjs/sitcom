import call2p from 'call2p';
import mkdirp from 'mkdirp';
import * as fs from 'fs';

export const makeDir = call2p.wrap(mkdirp);
export const writeFile = call2p.wrap(fs.writeFile);
export const readFile = call2p.wrap(fs.readFile);
export const statFile = call2p.wrap(fs.stat);

export function copyFile(file: string, to: string): Promise<any> {
  return call2p(function (cb: (err: Error | null) => void) {
    const read = fs.createReadStream(file);
    const write = fs.createWriteStream(to);
    write.on('error', (err) => cb(err || new Error()));
    write.on('close', () => cb(null));
    read.pipe(write);
  });
}

export function existsFile(file: string): Promise<boolean> {
  return statFile(file)
    .then((stat) => stat.isFile())
    .catch(() => false);
}

export function existsDir(dir: string) {
  return statFile(dir)
    .then(stat => stat.isDirectory())
    .catch(() => false);
}

export function readFileIfExists(file: string, charset = 'utf8') {
  return existsFile(file).then(function (exists) {
    if (exists) return readFile(file, charset);
  });
}
