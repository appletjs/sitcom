import chalk from 'chalk';
import {StdoutLogType} from '../../types';

let lastCallNewline = true;

export default function stdout(
  message?: string | boolean,
  type?: StdoutLogType | boolean,
  newline?: boolean
) {
  if (message === undefined) {
    return lastCallNewline;
  }

  if (typeof message === 'boolean') {
    [message, newline, type] = ['', message, 'log'];
  } else if (typeof type === 'boolean') {
    [type, newline] = ['log', type];
  }

  lastCallNewline = newline;

  switch (type) {
    case 'ok':
      message = chalk.bold.green(message);
      break;
    case 'warn':
      message = chalk.bold.yellow(message);
      break;
    case 'err':
      message = chalk.bold.red(message);
      break;
    case 'log':
      message = chalk.gray(message);
      break;
  }

  if (newline) {
    message += '\n';
  }

  process.stdout.write(message);
}
