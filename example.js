'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.makeConstructorInstancePropertiesChainable = exports.makePropertiesChainable = void 0;
const sat_utils_1 = require('sat-utils');
const logger_1 = require('./logger');
logger_1.logger.setLogLevel(process.env.CHAIN_SIMPLE_LOG_LEVEL);
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
function makePropertiesChainable(item, config) {
  const promiseCallableProps = ['then', 'catch', 'finally'];
  const propsList = [];
  if ((0, sat_utils_1.isObject)(config) && config.getEntityPropList) {
    if (!(0, sat_utils_1.isObject)(config.getEntityPropList) && !(0, sat_utils_1.isArray)(config.getEntityPropList)) {
      throw new TypeError('config "getEntityPropList" should be an array or an object');
    }
    propsList.push(
      ...((0, sat_utils_1.isObject)(config.getEntityPropList)
        ? Object.keys(config.getEntityPropList)
        : config.getEntityPropList),
    );
  }
  if (!(0, sat_utils_1.canBeProxed)(item)) {
    throw new TypeError('makePropertiesChainable(): first argument should be an entity that can be proxed');
  }
  if (!(0, sat_utils_1.isUndefined)(config) && !(0, sat_utils_1.isObject)(config)) {
    throw new TypeError('makePropertiesChainable(): second argument should be an object');
  }
  let proxifiedResult = item;
  const proxed = new Proxy(item, {
    get(_t, p, r) {
      var _a;
      if (propsList.length && propsList.includes(p)) {
        const propValue =
          (_a = Reflect.getOwnPropertyDescriptor(item, p)) === null || _a === void 0 ? void 0 : _a.value;
        if ((0, sat_utils_1.isFunction)(propValue) || (0, sat_utils_1.isAsyncFunction)(propValue)) {
          return item[p].bind(item);
        }
        return item[p];
      }
      if ((0, sat_utils_1.isObject)(config) && config.getEntity === p) {
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
        !promiseCallableProps.includes(p) &&
        (0, sat_utils_1.isUndefined)(Reflect.get(item, p, r)) &&
        (0, sat_utils_1.isObject)(config) &&
        (0, sat_utils_1.isFunction)(config.extendProxed)
      ) {
        try {
          const extension = config.extendProxed(p);
          if ((0, sat_utils_1.isObject)(extension)) {
            Object.assign(item, extension);
          } else if ((0, sat_utils_1.isFunction)(extension)) {
            // @ts-ignore
            const result = extension(item);
            Object.assign(item, result);
          }
        } catch (error) {
          console.error(error);
        }
      }
      const isCallable =
        (0, sat_utils_1.isFunction)(Reflect.get(item, p, r)) ||
        (0, sat_utils_1.isAsyncFunction)(Reflect.get(item, p, r));
      if (!isCallable && !(0, sat_utils_1.isPromise)(proxifiedResult) && item[p] && !proxifiedResult[p]) {
        logger_1.logger.chainer(`[CHAIN_SIMPLE]: ${String(p)} is not a callable.`);
        return item[p];
      } else if (isCallable) {
        logger_1.logger.chainer(`[CHAIN_SIMPLE]: ${String(p)} is a callable.`);
        return function (...arguments_) {
          logger_1.logger.chainer(`[CHAIN_SIMPLE]: ${String(p)} is called with args: `, ...arguments);
          if ((0, sat_utils_1.isPromise)(proxifiedResult)) {
            logger_1.logger.chainer(`[CHAIN_SIMPLE]: previous call result is a promise`);
            proxifiedResult = proxifiedResult
              .then(function (r) {
                logger_1.logger.chainer(`[CHAIN_SIMPLE]: previous call result is: `, r);
                return item[p].call(item, ...arguments_);
              })
              .catch(e => console.log(e));
          } else {
            logger_1.logger.chainer(`[CHAIN_SIMPLE]: previous call result is not a promise`);
            logger_1.logger.chainer(`[CHAIN_SIMPLE]: previous call result is: `, proxifiedResult);
            proxifiedResult = item[p].call(item, ...arguments_);
          }
          return proxed;
        };
      } else if (promiseCallableProps.includes(p) && (0, sat_utils_1.isPromise)(proxifiedResult)) {
        logger_1.logger.chainer(
          `[CHAIN_SIMPLE]: previous call result is a promise and next call is a promise method call`,
        );
        if (!(0, sat_utils_1.isPromise)(proxifiedResult)) {
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
exports.makePropertiesChainable = makePropertiesChainable;
function handlerConstructor(config) {
  return {
    construct(target, args) {
      const item = new target(...args);
      return makePropertiesChainable(item, config);
    },
  };
}
function makeConstructorInstancePropertiesChainable(constructorFunction, config) {
  return new Proxy(constructorFunction, handlerConstructor(config));
}
exports.makeConstructorInstancePropertiesChainable = makeConstructorInstancePropertiesChainable;
//# sourceMappingURL=index.js.map
