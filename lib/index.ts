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
  extendOnly?: boolean;
  extendProxed?: (propName) => { [k: string]: any } | ((item: any) => { [k: string]: any });
  getEntityPropList?: string[] | { [k: string]: any };
};

function extendProxed(target, propName: string | symbol, receiver: any, config: TConfig) {
  if (isObject(config) && isFunction(config.extendProxed) && isUndefined(Reflect.get(target, propName, receiver))) {
    try {
      const extension = config.extendProxed(propName);
      if (isObject(extension)) {
        Object.assign(target, extension);
      } else if (isFunction(extension)) {
        const result = (extension as TConfig['extendProxed'])(target);
        Object.assign(target, result);
      }
    } catch (error) {
      console.error(error);
    }

    return target;
  }
}

/**
 * @example
 * const {chainProps} = require('chain-simple');
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
 * const chainableObj = chainProps(obj);
 * obj.method1().method3().then((val) => console.log(val))
 *
 *
 * @param {!object} item
 * @param {{getEntity: string}} [config] config to describe how to get original not project object
 * @returns {object} object with chainable properties
 */
function chainProps(item, config?: TConfig) {
  const promiseCallableProps: any[] = ['then', 'catch', 'finally'];
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
    throw new TypeError('chainProps(): first argument should be an entity that can be proxed');
  }

  if (!isUndefined(config) && !isObject(config)) {
    throw new TypeError('chainProps(): second argument should be an object');
  }
  const _config = { ...config };

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

      if (_config.extendOnly) {
        extendProxed(item, p, r, config);

        return item[p];
      }

      if (_config.getEntity === p) {
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

      if (!promiseCallableProps.includes(p)) {
        extendProxed(item, p, r, config);
      }

      const isCallable = isFunction(Reflect.get(item, p, r)) || isAsyncFunction(Reflect.get(item, p, r));

      if (!isCallable && !isPromise(proxifiedResult) && item[p] && !proxifiedResult[p]) {
        logger.chainer(`[CHAIN_SIMPLE]: ${String(p)} is not a callable.`);

        return item[p];
      } else if (isCallable) {
        logger.chainer(`[CHAIN_SIMPLE]: ${String(p)} is a callable.`);

        return function (...arguments_) {
          logger.chainer(`[CHAIN_SIMPLE]: ${String(p)} is called with args: `, ...arguments);

          if (isPromise(proxifiedResult)) {
            logger.chainer(`[CHAIN_SIMPLE]: previous call result is a promise`);
            proxifiedResult = proxifiedResult.then(function (r) {
              logger.chainer(`[CHAIN_SIMPLE]: previous call result is: `, r);

              return item[p].call(item, ...arguments_);
            });
          } else {
            logger.chainer(`[CHAIN_SIMPLE]: previous call result is not a promise`);
            logger.chainer(`[CHAIN_SIMPLE]: previous call result is: `, proxifiedResult);

            proxifiedResult = item[p].call(item, ...arguments_);
          }

          return proxed;
        };
      } else if (promiseCallableProps.includes(p) && isPromise(proxifiedResult)) {
        logger.chainer(`[CHAIN_SIMPLE]: previous call result is a promise and next call is a promise method call`);

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
      return chainProps(item, config);
    },
  };
}

function makeConstructorInstancePropertiesChainable(constructorFunction, config?: TConfig) {
  return new Proxy(constructorFunction, handlerConstructor(config));
}

export { chainProps, makeConstructorInstancePropertiesChainable };
