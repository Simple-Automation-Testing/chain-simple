/**
 * @info
 * @resulter can be a promise or any data
 */
declare function proxifyHadler(originalCaller: any, context: any, chainers: {
    [k: string]: (...args: any[]) => any;
}, config?: any): any;
export { proxifyHadler };
