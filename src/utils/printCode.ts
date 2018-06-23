import {StdoutLogHandle} from '../../types';

/**
 * 打印代码到控制台
 *
 * @param {StdoutLogHandle} stdout
 * @param {string} code
 * @param {number} [length]
 */
export default function printCode(stdout: StdoutLogHandle, code: string, length: number = 100) {
  const lines: number = code.split('\n').length;
  const spaces: string = ' '.repeat(Math.floor(lines / 100));
  const spacesLength: number = spaces.length;
  const pad = (i: number): string => (spaces + i).slice(-spacesLength);

  stdout(true);
  stdout('Print content to stdout', 'ok', true);
  stdout('='.repeat(length + spaces.length + 2), true);

  let bytes = 0;
  let lineno = 0;
  let buffer = '';

  function flush(i?: number) {
    if (buffer && i) {
      lineno = i;
      stdout(pad(i) + '. ');
      stdout(buffer, 'tip', true);
    } else if (buffer) {
      stdout(spaces + '  ');
      stdout(buffer, 'tip', true);
    }

    buffer = '';
    bytes = 0;
  }

  // 字符编码数值对应的存储长度：
  // UCS-2编码(16进制) UTF-8 字节流(二进制)
  // 0000 - 007F       0xxxxxxx （1字节）
  // 0080 - 07FF       110xxxxx 10xxxxxx （2字节）
  // 0800 - FFFF       1110xxxx 10xxxxxx 10xxxxxx （3字节）
  for (let i = 0; i < code.length; i++) {
    const char = code.charAt(i);
    const charCode = code.charCodeAt(i);

    if (charCode < 0x007f)  {
      bytes++;
    } else if ((0x0080 <= charCode) && (charCode <= 0x07ff))  {
      bytes += 2;
    } else if ((0x0800 <= charCode) && (charCode <= 0xffff))  {
      bytes += 3;
    } else{
      bytes += 4;
    }

    if (char === '\n') {
      flush(++lineno);
      continue;
    }

    buffer += char;

    if (bytes >= length) {
      flush();
    }
  }

  flush();

  stdout('='.repeat(length + spaces.length + 2), true);
}
