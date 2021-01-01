import {isPromise, isFunction, isAsyncFunction, logger, isSymbol} from 'sat-utils';

const handler1 = {
  construct(target, args) {
    // expected output: "monster1 constructor called"
    const item = new target(...args);
    let proxifiedResult = item;
    const proxed = new Proxy(item, {
      get(_t, p) {

        console.log(p, !(p in item) && (p in proxifiedResult));
        if (p === Symbol.toStringTag) {
          return proxifiedResult;
        }

        logger.info(p);
        if (p === 'toJSON') {
          return function() {
            return proxifiedResult;
          };
        }
        if (!isFunction(item[p]) && !isAsyncFunction(item[p]) && !isPromise(proxifiedResult) && item[p]) {
          return item[p];
        } else if ((isFunction(item[p]) || isAsyncFunction(item[p])) && isPromise(proxifiedResult)) {
          return function(...arguments_) {
            async function handler() {
              const resolved = await proxifiedResult;
              return item[p](...arguments_, resolved);
            }
            proxifiedResult = handler();
            return proxed;
          };
        } else if (isAsyncFunction(item[p]) && !isPromise(proxifiedResult)) {
          return function(...arguments_) {
            async function handler() {
              const resolved = proxifiedResult;
              return item[p](...arguments_, resolved);
            }
            proxifiedResult = handler();
            return proxed;
          };
        } else if (isFunction(item[p]) && !isPromise(proxifiedResult)) {
          return function(...arguments_) {
            proxifiedResult = item[p](...arguments_);
            return proxed;
          };
        } else if ((p === 'then' || p === 'catch') && isPromise(proxifiedResult)) {
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
          return proxifiedResult[p];
        }

        if (!(p in item) && (p in proxifiedResult)) {
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
  },
};

function wrapConstruct(constructorFunction) {
  return new Proxy(constructorFunction, handler1);
}

export {wrapConstruct}
  ;
