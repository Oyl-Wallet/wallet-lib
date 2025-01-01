"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitFiveSeconds = void 0;
const waitFiveSeconds = async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
};
exports.waitFiveSeconds = waitFiveSeconds;
//# sourceMappingURL=utils.js.map