"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxifyHadler = void 0;
const sat_utils_1 = require("sat-utils");
const { LOG_LEVEL = 'VERBOSE' } = process.env;
function canBeProxed(arg) {
    try {
        new Proxy(arg, {});
        return true;
    }
    catch (error) {
        return false;
    }
}
sat_utils_1.logger.setLogLevel(LOG_LEVEL);
/**
 * @info
 * @resulter can be a promise or any data
 */
function proxifyHadler(originalCaller, context, chainers, config = {}) {
    const { fromResult = false } = config;
    /**
     * @info
     * this is required for sync call execution
     */
    const proxedLinker = {
        setted: false,
        value: null
    };
    function setProxedLinker(val) {
        proxedLinker.setted = true;
        proxedLinker.value = val;
    }
    let proxifiedResult = originalCaller();
    if (!canBeProxed(proxifiedResult)) {
        setProxedLinker(proxifiedResult);
        proxifiedResult = {};
    }
    let proxed = new Proxy(proxifiedResult, {
        get(_t, p) {
            if (p === 'toJSON') {
                return function () {
                    return proxifiedResult;
                };
            }
            if (chainers[p] && sat_utils_1.isPromise(proxifiedResult)) {
                /** @info logging */
                sat_utils_1.logger.info('add to chain chainers function: ', p);
                return function (...expectation) {
                    async function handler() {
                        const resolved = await proxifiedResult;
                        return chainers[p](...expectation, resolved);
                    }
                    proxifiedResult = handler();
                    return proxed;
                };
            }
            else if (chainers[p] && !sat_utils_1.isPromise(proxifiedResult)) {
                /** @info logging */
                sat_utils_1.logger.info('add sync call to chain chainers function: ', p);
                return function (...expectation) {
                    const result = chainers[p](...expectation, proxifiedResult);
                    /** @info for sync proxing approach */
                    if (fromResult) {
                        proxifiedResult = result;
                    }
                    return proxed;
                };
            }
            else if (sat_utils_1.isFunction(context[p])) {
                /** @info logging */
                const handler = this;
                sat_utils_1.logger.info('add to chain context function: ', p);
                return function (...args) {
                    proxifiedResult = context[p].call(context, ...args);
                    /** @info this is required for sync execution and context */
                    proxed = new Proxy(proxifiedResult, handler);
                    return proxed;
                };
            }
            else if (p === 'then' || p === 'catch') {
                /** @info logging */
                sat_utils_1.logger.info('start call promise: ', p);
                if (!sat_utils_1.isPromise(proxifiedResult)) {
                    return proxifiedResult;
                }
                return async function (onRes, onRej) {
                    const catcher = p === 'catch' ? onRes : onRej;
                    proxifiedResult = await proxifiedResult
                        .catch((error) => ({ error, ____proxed____error: true }));
                    if (proxifiedResult && proxifiedResult.____proxed____error) {
                        return catcher(proxifiedResult.error);
                    }
                    const promised = Promise.resolve(proxifiedResult);
                    return promised[p].call(promised, onRes, onRej);
                };
            }
            else if (proxifiedResult[p]) {
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
exports.proxifyHadler = proxifyHadler;
//# sourceMappingURL=proxify.handler.js.map