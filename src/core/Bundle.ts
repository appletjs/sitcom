import Dependency from './Dependency';
import input2chunks from './input2chunks';
import resolveDependentMarked from './resolveDependentMarked';
import htmlWithLayout from './htmlWithLayout';
import printCode from '../utils/printCode';
import relativeId from './relativeId';
import {makeDir, copyFile, writeFile, existsFile} from '../utils/fs';
import wrapChunkResult from './wrapChunkResult';
import cloneObject from '../utils/cloneObject';
import resolveOutputFile from './resolveOutputFile';
import * as path from 'path';
import Sitcom from './Sitcom';
import {Heading, InputOptions, OutputOptions} from '../../types';
import {MarkedOptions} from 'marked';
import Chunk from './Chunk';

export default class Bundle {
  /**
   * @param {Sitcom} sitcom
   * @param {Object} inputOptions
   * @param {Object} [outputOptions]
   * @param {Object} [markedOptions]
   * @return {Promise<Bundle>}
   */
  static async make(
    sitcom: Sitcom,
    inputOptions: InputOptions,
    outputOptions: OutputOptions = {},
    markedOptions: MarkedOptions = {}
  ): Promise<Bundle> {
    const bundle = new Bundle(
      sitcom,
      inputOptions,
      outputOptions,
      markedOptions
    );

    bundle.dependency.master = sitcom.dependency;

    // generate tokens
    for (let i = 0; i < bundle.chunks.length; i++) {
      await bundle.chunks[i].tokenize(bundle.markedOptions);
    }

    return bundle;
  }

  dependency: Dependency = new Dependency();
  chunks: Chunk[];
  outfile?: string;

  /**
   * @param {Sitcom} sitcom
   * @param {Object} inputOptions
   * @param {Object} [outputOptions]
   * @param {Object} [markedOptions]
   */
  constructor(
    public sitcom: Sitcom,
    public inputOptions: InputOptions,
    public outputOptions: OutputOptions = {},
    public markedOptions: MarkedOptions = {}
  ) {
    this.chunks = input2chunks(this);
  }

  /**
   * @param input
   * @return {Promise<Bundle>}
   */
  makeFor(input: string): Promise<Bundle> {
    const file = input.replace(/\.md$/i, '.html');

    return Bundle.make(
      this.sitcom,
      Object.assign({}, this.inputOptions, {input}),
      Object.assign({}, this.outputOptions, {file}),
      this.markedOptions
    ).then(bundle => {
      bundle.dependency.master = this.dependency;
      return bundle;
    });
  }

  /**
   * @param {sitcom.OutputOptions} outputOptions
   * @returns {Promise<{html: string, headings: Heading[], dependency: Dependency}>}
   */
  async generate(outputOptions?: OutputOptions) {
    // merge output markedOptions
    Object.assign(
      this.outputOptions,
      outputOptions || {}
    );

    // 根据入口文件确定输出文件
    this.outfile = resolveOutputFile(
      this.inputOptions.input,
      this.outputOptions.file,
      this.outputOptions.dist
    );

    const length = this.chunks.length;
    const {dependency} = this;

    const headings: Heading[] = [];
    const partials: string[] = [];

    for (let i = 0; i < length; i++) {
      const chunk = this.chunks[i];

      await chunk.transform();
      wrapChunkResult(chunk, this, i + 1, length);
      partials.push(chunk.result);

      if (chunk.headings.length) {
        headings.push(...chunk.headings
          .map(h => cloneObject(h))
        );
      }

      await resolveDependentMarked(chunk, this, !this.outfile);
    }

    // todo html-renderer
    const html = await htmlWithLayout(
      headings,
      partials.join('\n'),
      this
    );

    return {
      html,
      headings,
      dependency,
    };
  }

  /**
   * @todo 取消 console
   * @param outputOptions
   * @return {Promise<void>}
   */
  async write(outputOptions?: OutputOptions): Promise<void> {
    const {html} = await this.generate(outputOptions);
    const {stdout} = this.sitcom;

    // 没有指定输出文件，则将
    // 解析的结果打印到控制台
    if (!this.outfile) {
      printCode(stdout, html);
      stdout(true);
      return;
    }

    const baseDir = process.cwd();
    const {silent} = this.sitcom;

    const notInCwd = (from: string) => {
      if (silent) return;
      stdout(relativeId(baseDir, from));
      stdout('    ');
      stdout('not in working directory', 'err', true);
    };

    const notFound = (from: string, to: string) => {
      if (silent) return;
      stdout(relativeId(baseDir, from));
      stdout(' => ');
      stdout(relativeId(baseDir, to));
      stdout('    ');
      stdout('not found', 'err', true);
    };

    const access = (from: any, to: string) => {
      if (silent) return;
      if (typeof from === 'string') {
        stdout(relativeId(baseDir, from));
        stdout(' => ');
      }
      stdout(relativeId(baseDir, to));
      stdout('    ');
      stdout('ok', 'ok', true);
    };

    // 输入文件
    {
      if (!stdout()) stdout(true);
      stdout('[Bundle]', 'tip', true);
      access(this.inputOptions.input, this.outfile);
      await makeDir(path.dirname(this.outfile));
      await writeFile(this.outfile, html, 'UTF8');
      stdout(true);
    }

    // 输出依赖
    {
      if (!this.dependency.size) return;
      if (!stdout()) stdout(true);
      stdout('[Dependencies]', 'tip', true);

      await Promise.all(this.dependency.master.map(async ({to, from}) => {
        if (!to) {
          notInCwd(from);
        } else if (!(await existsFile(from))) {
          notFound(from, to);
        } else {
          await makeDir(path.dirname(to));
          await copyFile(from, to);
          access(from, to);
        }
      }));

      stdout(true);
    }

  }
}
