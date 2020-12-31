"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
async function sleep(millisecond = 5 * 1000) {
    return new Promise((res) => setTimeout(res, millisecond));
}
exports.sleep = sleep;
//# sourceMappingURL=utils.js.map