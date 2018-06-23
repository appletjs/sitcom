import cache from '../utils/cache';
import createHash from '../utils/createHash';
import {DependencyData} from '../../types';

/**
 * @type {function(string=): string}
 */
const getDependentKey = cache<string, string>(
  /**
   * 生成占位标识
   *
   * @param {string} encryptString
   * @return {string}
   */
  function (encryptString: string): string {
    return '<Dependency#' + createHash(encryptString) + '>';
  }
);

/**
 * 不考虑删除
 */
export default class Dependency {

  values: Map<string, DependencyData> = new Map();
  master?: Dependency;

  /**
   * 依赖数量
   *
   * @return {number}
   */
  get size(): number {
    return this.values.size;
  }

  /**
   * 设置依赖数据
   *
   * @param {string} key
   * @param {{hash:string,from:string,to:string,via:string,master:boolean}} data
   * @return {Dependency}
   */
  set(key: string, data: DependencyData) {
    data.isMaster = !this.master;

    if (this.master) {
      this.master.set(key, data);
    }

    this.values.set(key, data);

    return this;
  }

  /**
   * 添加依赖
   *
   * @param {string} origin
   * @param {string|Object} data
   * @return {string}
   */
  add(origin: string, data: string | DependencyData = {from: origin}) {
    if (typeof data === 'string') {
      data = {from: data};
    }

    if (!data.from) {
      data.from = origin;
    }

    const hash = getDependentKey(origin);

    data.regex = new RegExp(hash, 'g');
    data.hash = hash;

    this.set(hash, data);

    return hash;
  }

  /**
   * @param {function(Object=,string=,Dependency=): void} fn
   * @param {*} [thisArg]
   */
  forEach(fn: (value: DependencyData, hash: string, dep: DependencyData) => void, thisArg: any = this): void {
    this.values.forEach((data, hash) => {
      fn.call(thisArg, data, hash, this);
    });
  }

  /**
   * @param {function(Object=,string=,Dependency=): *} fn
   * @param {*} [thisArg]
   * @return {*[]}
   */
  map<T = any>(fn: (value: DependencyData, hash: string, dep: DependencyData) => T, thisArg: any = this): T[] {
    const values: T[] = [];

    this.forEach( (val, key) => {
      values.push(fn.call(thisArg, val, key, this));
    });

    return values;
  }
}
