import {isPromise, isFunction, isAsyncFunction, logger} from 'sat-utils';

logger.setLogLevel(process.env.LOG_LEVEL);

function wrapObj(item) {
  let proxifiedResult = item;
  const proxed = new Proxy(item, {
    get(_t, p) {
      if (p === Symbol.toStringTag) {
        return proxifiedResult;
      }

      if (p === 'toString') {
        return function(...args) {
          return proxifiedResult.toString(...args);
        };
      }

      logger.info(p);
      if (p === 'toJSON') {
        logger.info('In to JSON');
        return function() {
          return proxifiedResult;
        };
      }
      if (!isFunction(item[p]) && !isAsyncFunction(item[p]) && !isPromise(proxifiedResult) && item[p] && !proxifiedResult[p]) {
        logger.info('In to not function, not async function, resulter is not a promise and target has prop');
        return item[p];
      } else if ((isFunction(item[p]) || isAsyncFunction(item[p])) && isPromise(proxifiedResult)) {
        logger.info('In to function or async function and resulter is a promise');
        return function(...arguments_) {
          async function handler() {
            await proxifiedResult;
            return item[p](...arguments_);
          }
          proxifiedResult = handler();
          return proxed;
        };
      } else if (isAsyncFunction(item[p]) && !isPromise(proxifiedResult)) {
        logger.info('In to async function and resulter is a promise');
        return function(...arguments_) {
          async function handler() {
            return item[p](...arguments_);
          }
          proxifiedResult = handler();
          return proxed;
        };
      } else if (isFunction(item[p]) && !isPromise(proxifiedResult)) {
        logger.info('In to function and resulter is not a promise');
        return function(...arguments_) {
          proxifiedResult = item[p](...arguments_);
          return proxed;
        };
      } else if ((p === 'then' || p === 'catch') && isPromise(proxifiedResult)) {
        logger.info('In then catch');
        /** @info logging */
        logger.info('start call promise: ', p);
        if (!isPromise(proxifiedResult)) {
          return proxifiedResult;
        }
        return async function(onRes, onRej) {
          const catcher = p === 'catch' ? onRes : onRej;

          proxifiedResult = await proxifiedResult
            .catch((error) => ({error, ____proxed____error: true}));

          if (proxifiedResult && proxifiedResult.____proxed____error) {
            return catcher(proxifiedResult.error);
          }

          const promised = Promise.resolve(proxifiedResult);
          return promised[p].call(promised, onRes, onRej);
        };
      } else if (proxifiedResult[p]) {
        logger.info('In resulter has prop');
        return proxifiedResult[p];
      }
      if (!(p in item) && (p in proxifiedResult)) {
        logger.info('In target does not have prop but resulter has prop');
        return proxifiedResult[p];
      }
    },
    /** @info basics */

    getPrototypeOf(_t) {
      return Object.getPrototypeOf(proxifiedResult);
    },
    ownKeys(_t) {
      return Object.getOwnPropertyNames(proxifiedResult);
    },
    getOwnPropertyDescriptor(_t, p) {
      return Object.getOwnPropertyDescriptor(proxifiedResult, p);
    }
  });
  return proxed;
}

const handlerConstructor = {
  construct(target, args) {
    const item = new target(...args);
    return wrapObj(item);
  },
};

function wrapConstruct(constructorFunction) {
  return new Proxy(constructorFunction, handlerConstructor);
}

export {
  wrapConstruct,
  wrapObj
};
