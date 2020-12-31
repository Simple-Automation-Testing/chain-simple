import {proxifyHadler} from './proxify.handler';
import {isArray, isFunction, isObject} from 'sat-utils';

function callable(originalMethodCaller: () => any | void, context, chainers, config) {
  return proxifyHadler(originalMethodCaller, context, chainers, config);
}

type ChainerTypeFn = (...args: any[]) => any | void;
type ChainerTypeChainerObj = {[k: string]: (...args: any[]) => any | void};
type ChainerTypeArrayFns = Array<(...args: any[]) => any | void>;
type ChainerTypeArrayChainerObj = Array<{[k: string]: (...args: any[]) => any}>
type ChainerTypeArrayWithBothTypes = Array<((...args: any[]) => any | void) | {[k: string]: (...args: any[]) => any}>;

/**
 * @example
 * const bothTypes: ChainerTypeArrayWithBothTypes = [function test() {}, {name: 'test', chain: function() {}}];
 * const fnType: ChainerTypeFn = function test () {};
 * const objType: ChainerTypeChainerObj = {name: 'test', chain: function() {}};
 * ...etc
 */
type ChainerType = ChainerTypeFn | ChainerTypeChainerObj | ChainerTypeArrayFns | ChainerTypeArrayChainerObj | ChainerTypeArrayWithBothTypes;


interface IchainConfig {
  chainResult?: boolean;
}

interface IChain {
  addChain(chainer: ChainerType): IChain;
  wrapProto(fn: new () => any): void
}
function chain(config?: IchainConfig): IChain {

  const chainers = {};
  const chainIterface = {
    addChain(chainer: ChainerType) {
      /**
       * @info in case if some unexpeted argument - Error
       */
      if (!chainer) {
        throw new Error(`
          addChain argument shoulb be
            (...args: any[]) => any |
            {name: string; chain: (...args) => any} |
            Array<(...args: any[]) => any> |
            Array<{name: string; chain: (...args: anyp[]) => any}>
        `);
      }

      if (isArray(chainer)) {
        (chainer as ChainerTypeArrayWithBothTypes).forEach((_chainer) => {
          /**
           * @info in case if some unexpeted argument - Error
           */
          if (!_chainer || (isObject(_chainer) && (!_chainer.name || !(_chainer as ChainerTypeChainerObj).chain))) {
            throw new Error(`
              chainer in array should be
                ((...args) => any) |
                {name: string; chain: (...) => any}
            `);
          }
          if (isFunction(_chainer) && _chainer.name) {
            return Object.assign(chainers, {[(_chainer as ChainerTypeFn).name]: _chainer});
          }
          if (isObject(_chainer)) {
            return Object.assign(chainers, _chainer);
          }
        });

        return chainIterface;
      } else if (isObject(chainer)) {
        const keys = Object.keys(chainer).forEach((chainerKey) => {
          if (!isFunction(chainer[chainerKey])) {
            throw new Error(`
              chainer obj should be
                {{[name as string]: (...args: any[]) => any | void}
            `);
          }
        });
        Object.assign(chainers, chainer);
        return chainIterface;
      } else if (isFunction(chainer)) {
        if (!(chainer as ChainerTypeFn).name) {
          throw new Error(`chainer function should not be anonymous function`);
        }
        Object.assign(chainers, {[(chainer as ChainerTypeFn).name]: chainer});
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

        descriptor.value = function(...args) {
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

export {
  chain
};
