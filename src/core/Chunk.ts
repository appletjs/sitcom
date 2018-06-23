import Dependency from './Dependency';
import MarkedRenderer from './MarkedRenderer';
import PluginExecutor from './PluginExecutor';
import {withDefaults} from '../utils/marked';
import cloneObject from '../utils/cloneObject';
import {readFile} from '../utils/fs';
import {MarkedOptions, TokensList} from 'marked';
import {Heading, Plugin} from '../../types';

export default class Chunk {

  executor: PluginExecutor;// 执行插件
  dependency: Dependency = new Dependency();// 收集依赖

  markedOptions: MarkedOptions = {};// marked参数
  tokens?: TokensList;// 编译后的Token

  headings: Heading[] = [];// 按顺序不分级记录heading
  result: string = '';// 编译后的HTML

  /**
   * @param filename
   * @param {Plugin[]} [plugins]
   * @param {string} [declare] markdown的引用文件
   */
  constructor(
    public filename: string,
    public plugins?: Plugin[],
    public declare?: string
  ) {
    this.executor = new PluginExecutor(this, plugins);
    this.dependency = new Dependency();
  }

  /**
   * 禁止修改编译结果
   * @return {{headings: *[], result: (string|*)}}
   */
  flatten() {
    const {headings, result} = this;
    return {
      headings: headings.map(x => cloneObject(x)),
      result,
    }
  }

  /**
   * @param {object} markedOptions marked配置
   * @return {Promise<Chunk>}
   */
  async tokenize(markedOptions: MarkedOptions) {
    let content = '';
    if (this.filename) content += await readFile(this.filename, 'UTF8');
    if (this.declare) content += await readFile(this.declare, 'UTF8');

    this.markedOptions = withDefaults(markedOptions);
    this.tokens = await this.executor.tokenize(content);

    return this;
  }

  /**
   * @return {Promise<Chunk>}
   */
  async transform() {
    this.markedOptions.renderer = new MarkedRenderer(this);
    this.result = await this.executor.transform(this.tokens);
    return this;
  }
}
