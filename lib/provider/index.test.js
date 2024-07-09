"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const index_1 = require("./index");
const dotenv = tslib_1.__importStar(require("dotenv"));
dotenv.config();
describe('Provider', () => {
    const urls = ['https://staging-api.oyl.gg/', 'https://api.oyl.gg/'];
    urls.forEach((url) => {
        it(`should instantiate a new provider with the specified url: ${url}`, () => {
            const provider = new index_1.Provider({
                url,
                projectId: process.env.SANDSHREW_PROJECT_ID,
                network: bitcoinjs_lib_1.networks.bitcoin,
                networkType: 'mainnet',
            });
            expect(provider).toBeDefined();
            expect(provider.api.toObject().host).toBe(url);
        });
    });
});
//# sourceMappingURL=index.test.js.map