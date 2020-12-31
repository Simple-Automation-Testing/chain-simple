declare type ChainerTypeFn = (...args: any[]) => any | void;
declare type ChainerTypeChainerObj = {
    [k: string]: (...args: any[]) => any | void;
};
declare type ChainerTypeArrayFns = Array<(...args: any[]) => any | void>;
declare type ChainerTypeArrayChainerObj = Array<{
    [k: string]: (...args: any[]) => any;
}>;
declare type ChainerTypeArrayWithBothTypes = Array<((...args: any[]) => any | void) | {
    [k: string]: (...args: any[]) => any;
}>;
/**
 * @example
 * const bothTypes: ChainerTypeArrayWithBothTypes = [function test() {}, {name: 'test', chain: function() {}}];
 * const fnType: ChainerTypeFn = function test () {};
 * const objType: ChainerTypeChainerObj = {name: 'test', chain: function() {}};
 * ...etc
 */
declare type ChainerType = ChainerTypeFn | ChainerTypeChainerObj | ChainerTypeArrayFns | ChainerTypeArrayChainerObj | ChainerTypeArrayWithBothTypes;
interface IchainConfig {
    chainResult?: boolean;
}
interface IChain {
    addChain(chainer: ChainerType): IChain;
    wrapProto(fn: new () => any): void;
}
declare function chain(config?: IchainConfig): IChain;
export { chain };
