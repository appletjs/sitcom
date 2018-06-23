import Sitcom from './src/core/Sitcom';
import {MarkedOptions, TokensList} from 'marked';
import Bundle from './src/core/Bundle';

declare function sitcom(silent: boolean = false): sitcom.Sitcom;

namespace sitcom {
  import {MarkedOptions, TokensList} from 'marked';

  interface Plugin {
    name?: string;

    setOptions?(options: MarkedOptions): void;

    tokenize?(tokens: TokensList): TokensList;

    transform?(tokens: TokensList): string;

    [key: string]: any;
  }

  type Heading = {
    title: string;
    level: number;
    id?: string;
    [key: string]: any;
  }

  type WrapData = {
    headings: Heading[];
    result: string;
    times?: number;
    maxTimes?: number;
    [key: string]: any;
  };

  interface WrapFunction {
    (data: WrapData): any;
  }

  type InputMapping = Record<string, string[]>;

  interface InputOptions {
    input?: string | string[];
    root?: string;
    declare?: string;
    plugins?: Plugin[];
    mapping?: InputMapping;
    layouts?: string | Record<string, string>;
  }

  interface OutputOptions {
    intro?: string | WrapFunction;
    outro?: string | WrapFunction;
    file?: string;
    dist?: string;
    data?: Record<string, any>;

    // runtime properties
    layout?: string;
  }

  type StdoutLogType = 'tip' | 'err' | 'warn' | 'ok' | 'log';

  interface StdoutLogHandle {
    /**
     * 是否换行结束
     * @returns {boolean}
     */
    (): boolean;

    /**
     * 直接换行
     * @param {boolean} newline
     */
    (newline: boolean): void;

    /**
     * log类型日志、不换行
     * @param {string} message
     */
    (message: string): void;

    /**
     * 指定类型日志、不换行
     * @param {string} message
     * @param {string} type
     */
    (message: string, type: StdoutLogType): void;

    /**
     * log类型日志、换行
     * @param {string} message
     * @param {boolean} newline
     */
    (message: string, newline: boolean): void;

    /**
     * 指定类型日志、换行
     * @param {string} message
     * @param {string} [type]
     * @param {boolean} [newline]
     */
    (message: string, type: StdoutLogType, newline: boolean): void;
  }

  interface SitcomOptions extends InputOptions {
    marked?: MarkedOptions;
    output?: OutputOptions;
    stdout?: StdoutLogHandle;
    silent?: boolean;
  }

  type DependencyData = {
    from: string;
    to?: string;
    hash?: string;
    regex?: RegExp;
    via?: string;
    isMaster?: boolean;
    isMarked?: boolean;
  };

  class Dependency {
    readonly size: number;
    master?: Dependency;
    set(key: string, data: DependencyData): this;
    add(origin:string, data?: string | DependencyData): this;
    forEach(fn: (value: DependencyData, hash: string, dep: DependencyData) => void, thisArg: any = this): void;
    map<T = any>(fn: (value: DependencyData, hash: string, dep: DependencyData) => T, thisArg: any = this): T[];
  }

  type GeneratedData = {
    html: string;
    headings: Heading[];
    dependency: Dependency;
  };

  class Bundle {
    dependency: Dependency;
    outfile?: string;
    sitcom: Sitcom;
    inputOptions: InputOptions;
    outputOptions: OutputOptions;
    markedOptions: MarkedOptions;
    generate(outputOptions?: OutputOptions): Promise<GeneratedData>;
    write(outputOptions?: OutputOptions): Promise<void>;
  }

  class Sitcom {
    dependency: Dependency;
    stdout: StdoutLogHandle;
    options: SitcomOptions;
    silent: boolean;
    constructor(silent?: boolean);
    make(options: SitcomOptions): Promise<Bundle>;
  }
}

export = sitcom;
