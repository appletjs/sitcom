import path from 'path';
import fs from 'fs';
import {SitcomOptions} from '../../types';

const parsers = {
  '.json': readJsonConfig,
  '.js': readJsConfig,
};

type ConfigExtension = '.json' | '.js';

/**
 * 解析配置文件
 *
 * @param {string} file
 * @returns {Object}
 *
 * @throws {Error}
 */
export default function readConfig(file: string): SitcomOptions {
  const extension = path.extname(file);
  const configType = extension.toLowerCase();

  file = path.resolve(file);

  let config: SitcomOptions;

  if (extension === '') {
    ['.js', '.json'].some(function (type: ConfigExtension) {
      try {
        config = parsers[type](file);
        return true;
      } catch (e) {
      }
    });
  } else if (parsers.hasOwnProperty(configType)) {
    config = parsers[configType as ConfigExtension](file);
  } else {
    throw new Error(`non-support the config extension "${extension}"`);
  }

  if (config == null) {
    throw new Error('readFile config failed');
  }

  const type = Object.prototype.toString.call(config)
    .slice(8, -1)
    .toLowerCase();

  if (type !== 'object') {
    throw new Error(`bad config type "${type}"`);
  }

  return config;
}

/**
 * @param {string} file
 * @returns {*}
 */
function readJsonConfig(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * @param {string} file
 * @returns {*}
 */
function readJsConfig(file: string): any {
  return require(file);
}
