import { isArray, isObject, isPromise, isFunction, isAsyncFunction, canBeProxed, isUndefined } from 'sat-utils';

import { logger } from './logger';

logger.setLogLevel(process.env.CHAIN_SIMPLE_LOG_LEVEL);

type TFn = (...args: any) => any;

type TReplaceReturnType<T extends TFn, TNewReturnType> = (...args: Parameters<T>) => TNewReturnType;

export type TChainable<T extends Record<string, TFn>> = {
  [K in keyof T]: TReplaceReturnType<T[K], ReturnType<T[K]> & TChainable<T>>;
};

type TConfig = {
  getEntity?: string;
  extendProxed?: (propName) => { [k: string]: any } | ((item: any) => { [k: string]: any });
  getEntityPropList?: string[] | { [k: string]: any };
};

/**
 * @example
 * const {makePropertiesChainable} = require('chain-simple');
 * const obj = {
 *   async method1() {
 *    return Promise.resolve(1).then(value => {
 *      console.log('method1', value);
 *      return value;
 *    });
 *   },
 *   async method2() {
 *     return Promise.resolve(2).then(value => {
 *       console.log('method2', value);
 *       return value;
 *     });
 *   },
 *   async method3() {
 *     return Promise.resolve(3).then(value => {
 *       console.log('method3', value);
 *       return value;
 *     });
 *   },
 * };
 * const chainableObj = makePropertiesChainable(obj);
 * obj.method1().method3().then((val) => console.log(val))
 *
 *
 * @param {!object} item
 * @param {{getEntity: string}} [config] config to describe how to get original not project object
 * @returns {object} object with chainable properties
 */
function makePropertiesChainable(item, config?: TConfig) {
  const propsList = [];
  if (isObject(config) && config.getEntityPropList) {
    if (!isObject(config.getEntityPropList) && !isArray(config.getEntityPropList)) {
      throw new TypeError('config "getEntityPropList" should be an array or an object');
    }

    propsList.push(
      ...(isObject(config.getEntityPropList)
        ? Object.keys(config.getEntityPropList)
        : (config.getEntityPropList as string[])),
    );
  }

  if (!canBeProxed(item)) {
    throw new TypeError('makePropertiesChainable(): first argument should be an entity that can be proxed');
  }

  if (!isUndefined(config) && !isObject(config)) {
    throw new TypeError('makePropertiesChainable(): second argument should be an object');
  }

  let proxifiedResult = item;
  const proxed = new Proxy(item, {
    get(_t, p, r) {
      if (propsList.length && propsList.includes(p)) {
        const propValue = Reflect.getOwnPropertyDescriptor(item, p)?.value;
        if (isFunction(propValue) || isAsyncFunction(propValue)) {
          return item[p].bind(item);
        }
        return item[p];
      }

      if (isObject(config) && config.getEntity === p) {
        return item;
      }

      if (p === Symbol.toStringTag) {
        return proxifiedResult[Symbol.toStringTag];
      }

      if (p === 'toString') {
        return function (...args) {
          return proxifiedResult.toString(...args);
        };
      }

      if (p === 'toJSON') {
        return function () {
          return proxifiedResult;
        };
      }

      if (
        p !== 'then' &&
        p !== 'catch' &&
        isUndefined(Reflect.get(item, p, r)) &&
        isObject(config) &&
        isFunction(config.extendProxed)
      ) {
        try {
          const extension = config.extendProxed(p);
          if (isObject(extension)) {
            Object.assign(item, extension);
          } else if (isFunction(extension)) {
            // @ts-ignore
            const result = extension(item);
            Object.assign(item, result);
          }
        } catch (error) {
          console.error(error);
        }
      }

      const isCallable = isFunction(Reflect.get(item, p, r)) || isAsyncFunction(Reflect.get(item, p, r));

      if (!isCallable && !isPromise(proxifiedResult) && item[p] && !proxifiedResult[p]) {
        logger.info('In to not function, not async function, resulter is not a promise and target has prop');
        return item[p];
      } else if (isCallable) {
        return function (...arguments_) {
          proxifiedResult = isPromise(proxifiedResult)
            ? proxifiedResult.then(function () {
                return item[p].call(item, ...arguments_);
              })
            : item[p].call(item, ...arguments_);
          return proxed;
        };
      } else if ((p === 'then' || p === 'catch') && isPromise(proxifiedResult)) {
        if (!isPromise(proxifiedResult)) {
          return proxifiedResult;
        }

        return function (onRes, onRej) {
          const promised = proxifiedResult;
          proxifiedResult = item;

          return promised[p].call(promised, onRes, onRej);
        };
      } else if (proxifiedResult[p]) {
        return proxifiedResult[p];
      }
      if (!(p in item) && p in proxifiedResult) {
        return proxifiedResult[p];
      }
    },

    /** @info base */
    getPrototypeOf(_t) {
      return Object.getPrototypeOf(proxifiedResult);
    },
    ownKeys(_t) {
      return Object.getOwnPropertyNames(proxifiedResult);
    },
    getOwnPropertyDescriptor(_t, p) {
      return Object.getOwnPropertyDescriptor(proxifiedResult, p);
    },
  });
  return proxed;
}

function handlerConstructor(config) {
  return {
    construct(target, args) {
      const item = new target(...args);
      return makePropertiesChainable(item, config);
    },
  };
}

function makeConstructorInstancePropertiesChainable(constructorFunction, config?: TConfig) {
  return new Proxy(constructorFunction, handlerConstructor(config));
}

export { makePropertiesChainable, makeConstructorInstancePropertiesChainable };
