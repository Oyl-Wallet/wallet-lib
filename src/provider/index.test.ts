import { networks } from 'bitcoinjs-lib'
import { Provider } from './index'
import * as dotenv from 'dotenv'

dotenv.config()

describe('Provider', () => {
  const urls = ['https://staging-api.oyl.gg/', 'https://api.oyl.gg/']

  urls.forEach((url) => {
    it(`should instantiate a new provider with the specified url: ${url}`, () => {
      const provider = new Provider({
        url,
        projectId: process.env.SANDSHREW_PROJECT_ID!,
        network: networks.bitcoin,
        networkType: 'mainnet',
      })
      expect(provider).toBeDefined()
      expect(provider.api.toObject().host).toBe(url)
    })
  })
})
