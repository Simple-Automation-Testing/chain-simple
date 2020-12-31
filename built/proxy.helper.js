"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chain = void 0;
const proxify_handler_1 = require("./proxify.handler");
const sat_utils_1 = require("sat-utils");
function callable(originalMethodCaller, context, chainers, config) {
    return proxify_handler_1.proxifyHadler(originalMethodCaller, context, chainers, config);
}
function chain(config) {
    const shouldBeDecorated = [];
    const exclude = [];
    const chainers = {};
    const chainIterface = {
        addChain(chainer) {
            /**
             * @info in case if some unexpeted argument - Error
             */
            if (!chainer) {
                throw new Error(`
          addChain argument shoulb be
            () => any | {name: string, chai: () => any} | Array<() => any> | Array<{name: string, chai: () => any}>
        `);
            }
            if (sat_utils_1.isArray(chainer)) {
                chainer.forEach((_chainer) => {
                    /**
                     * @info in case if some unexpeted argument - Error
                     */
                    if (!_chainer || (sat_utils_1.isObject(_chainer) && (!_chainer.name || !_chainer.chain))) {
                        throw new Error(`
              chainer in array should be
                (() => any|void) | {name: string, chai: () => any}
            `);
                    }
                    if (sat_utils_1.isFunction(_chainer) && _chainer.name) {
                        return Object.assign(chainers, { [_chainer.name]: _chainer });
                    }
                    if (sat_utils_1.isObject(_chainer)) {
                        return Object.assign(chainers, _chainer);
                    }
                });
                return chainIterface;
            }
            else if (sat_utils_1.isObject(chainer)) {
                const keys = Object.keys(chainer).forEach((chainerKey) => {
                    if (!sat_utils_1.isFunction(chainer[chainerKey])) {
                        throw new Error(`
              chainer obj should be
                {{[_chainer.name as string]: chai: () => any | void}
            `);
                    }
                });
                Object.assign(chainers, chainer);
                return chainIterface;
            }
            else if (sat_utils_1.isFunction(chainer)) {
                if (!chainer.name) {
                    throw new Error(`chainer function should not be anonymous function`);
                }
                Object.assign(chainers, { [chainer.name]: chainer });
                return chainIterface;
            }
        },
        wrapProto(constructorFunction) {
            const prot = constructorFunction.prototype;
            const ownPropsList = Object.getOwnPropertyNames(prot);
            const protMethods = ownPropsList
                /**
                 * @info ignore constructor function
                 */
                .filter((fnName) => fnName !== 'constructor')
                .filter((fnName) => {
                const descriptor = Object.getOwnPropertyDescriptor(prot, fnName);
                /**
                 * @info ignore getters and setters
                 */
                if (descriptor.set || descriptor.get) {
                    return false;
                }
                /**
                 * @info only configurable methods can be proxified
                 */
                if (descriptor.configurable && (typeof descriptor.value).includes('function')) {
                    return true;
                }
            });
            protMethods.forEach((fnName) => {
                const descriptor = Object.getOwnPropertyDescriptor(prot, fnName);
                /**
                 * @info original method
                 */
                const originalMethod = descriptor.value;
                descriptor.value = function (...args) {
                    /**
                     * @info TBD
                    */
                    const executableMethod = originalMethod.bind(this, ...args);
                    return callable(executableMethod, this, chainers, config);
                };
                Object.defineProperty(prot, fnName, descriptor);
            });
        }
    };
    return chainIterface;
}
exports.chain = chain;
//# sourceMappingURL=proxy.helper.js.map