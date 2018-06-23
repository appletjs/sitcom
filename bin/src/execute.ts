import {Command} from 'commander';
import readConfig from './readConfig';
import defaultStdout from './stdout';
import {SitcomOptions, Sitcom, StdoutLogHandle} from '../../types';

let stdout: StdoutLogHandle;

/**
 * @param {Error | number | string} e
 */
function exit(e: number|Error|string) {
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

/**
 * @param {Command} program
 * @param {Sitcom} sitcom
 */
export default function execute(
  program: Command,
  sitcom: Sitcom
) {
  stdout = sitcom.stdout;

  const args = program.args.slice();
  const startTime = Date.now();

  sitcom.options.stdout = defaultStdout;

  // 监听退出
  process.on('exit', function () {
    if (!stdout()) stdout(true);
    const time = (Date.now() - startTime) / 1000;
    stdout('Done in ' + time.toFixed(2) + 's', 'tip', true);
  });

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

  if (!config.stdout) config.stdout = defaultStdout;
  if (args.length) config.input = args.shift();
  if (program.root) config.root = program.root;
  if (program.silent) config.silent = program.silent;
  if (program.declare) config.declare = program.declare;
  if (program.dist) config.output.dist = program.dist;
  if (program.file) config.output.file = program.file;
  if (program.intro) config.output.intro = program.intro;
  if (program.outro) config.output.outro = program.outro;

  // 入口必须
  if (!config.input) {
    exit(new Error('Input not found.'));
  }

  sitcom.make(config)
    .then( bundle => bundle.write())
    .then(() => exit('Success!'))
    .catch(exit);
}
