import readConfig from '../bin/src/readConfig';
import Sitcom from './core/Sitcom';
import {Command} from 'commander';
import {SitcomOptions, StdoutLogType} from '../types';
import chalk from 'chalk';

let isNewline = true;

function defaultStdout(
  message?: string | boolean,
  type?: StdoutLogType | boolean,
  newline?: boolean
) {
  if (message === undefined) {
    return isNewline;
  }

  if (typeof message === 'boolean') {
    [message, newline, type] = ['', message, 'log'];
  } else if (typeof type === 'boolean') {
    [type, newline] = ['log', type];
  }

  isNewline = newline;

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

/**
 * @param {Command} program
 * @param {Sitcom} sitcom
 */
export default function command(
  program: Command,
  sitcom: Sitcom = new Sitcom()
) {
  const args = program.args.slice();
  const startTime = Date.now();
  const stdout = sitcom.stdout;

  sitcom.options.stdout = defaultStdout;

  // 监听退出
  process.on('exit', function () {
    if (!stdout()) stdout(true);
    const time = (Date.now() - startTime) / 1000;
    stdout('Done in ' + time.toFixed(2) + 's', 'tip',true);
  });

  function exit(e: any) {
    let code = 0;
    if (typeof e === 'number') {
      code = e;
    } else if (e instanceof Error) {
      stdout(e.stack || e.message, 'err', true);
      code = (e as any).code || code;
      stdout(true);
    } else if (e) {
      stdout(e, 'ok', true);
    }
    process.exit(code);
  }

  const config: SitcomOptions = {
    input: '',
    output: {},
    marked: {},
  };

  // 读取配置文件可选
  if (program.config) {
    try {
      Object.assign(config, readConfig(program.config));
    } catch (e) {
      exit(e);
    }
  }

  if (!config.stdout) {
    config.stdout = defaultStdout;
  }

  // ????????????
  if (args.length) config.input = args.shift();
  if (args.length) config.output.file = args.shift();

  // 入口必须
  if (!config.input) {
    exit(new Error('Input not found.'));
  }

  sitcom.make(config).then(function (bundle) {
    return bundle.write();
  }).then(function () {
    exit('Success!');
  }).catch(exit);
}
