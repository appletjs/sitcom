import Bundle from './Bundle';
import Dependency from './Dependency';
import has from '../utils/has';
import {ok as assert} from 'assert';
import {SitcomOptions, StdoutLogHandle, StdoutLogType} from '../../types';
import * as path from 'path';

function createStdoutHandle(sitcom: Sitcom): StdoutLogHandle {
  return function (
    msg?: string | boolean,
    type: StdoutLogType | boolean = 'log',
    nl: boolean = false
  ) {
    const stdout = sitcom.options && sitcom.options.stdout;
    if (!stdout) return;
    else if (msg === undefined) return stdout();
    else if (typeof msg === 'boolean') stdout(msg);
    else if (typeof type === 'boolean') stdout(msg, type);
    else stdout(msg, type, nl);
  };
}

export default class Sitcom {
  dependency: Dependency = new Dependency();
  stdout: StdoutLogHandle;

  options: SitcomOptions = {};

  /**
   * 创建一个新的 Sitcom 实例
   *
   * @param {boolean} silent 控制台静默开关
   */
  constructor(public silent: boolean = false) {
    this.stdout = createStdoutHandle(this);
  }

  /**
   * @todo 让marked支持流程图
   *
   * @param {object} options
   *
   * - input       # 入口文件、入口文件列表
   * - declare     # 可选，声明文件
   * - plugins     # 可选，插件列表
   * - mapping     # 可选，将入口文件映射成真实的文件或文件列表
   * - layouts     # 可选，根据入口文件映射出其模板文件
   * - silent      # 可选，静默模式
   *
   * - marked      # 可选，marked编译选项，下面是有效选项
   *
   *   - breaks: false,
   *   - gfm: true,
   *   - headerIds: true,
   *   - headerPrefix: '',
   *   - highlight: null,
   *   - langPrefix: 'language-',
   *   - mangle: true,
   *   - pedantic: false,
   *   - sanitize: false,
   *   - sanitizer: null,
   *   - silent: false,
   *   - smartLists: false,
   *   - smartypants: false,
   *   - tables: true,
   *   - xhtml: false
   *
   * - output      # 可选，
   *   - intro     # 可选，添加到每个文件开头
   *   - outro     # 可选，添加到每个文件结尾
   *   - file      # 可选，输出文件，根据入口文件确定，无法确定（入口文件为列表时）时，将内容打包到控制台
   *   - dist      # 可选，输出目录，默认 'dist'
   *   - data      # 可选，模板数据
   *
   * @return {Promise<Bundle>}
   */
  make(options: SitcomOptions) {
    // todo 实现更加精确的参数校验规则
    assert(options, '"options" is required.');
    assert(options.input, '"options.input" is required.');

    this.options = options;

    // 静默开关设置
    if (has(options, 'silent')) {
      this.silent = options.silent;
    }

    if (!options.plugins) {
      options.plugins = [];
    } else if (!Array.isArray(options.plugins) && !this.silent) {
      this.stdout('Invalid plugins type.', 'warn', true);
      this.stdout('We convert "options.plugins" to an Array.', 'warn', true);
      this.stdout(true);
      options.plugins = [];
    }

    // 确定文件根目录（非工作目录）
    options.root = path.resolve(
      options.root || process.cwd()
    );

    // 单独提出 markdown配置、输出配置，
    // 剩下的则都是输入配置选项了。
    const {
      marked = {},
      output = {},
      ...inputOptions
    } = options;

    // 返回入口bundle
    return Bundle.make(
      this,
      inputOptions,
      output,
      marked
    );
  }
}
