import fetch from 'node-fetch'

export interface Rune {
  rune: {
    id: { block: string; tx: string }
    name: string
    spacedName: string
    divisibility: number
    spacers: number
    symbol: string
  }
  balance: string
}
export interface Outpoint {
  runes: Rune[]
  outpoint: { txid: string; vout: number }
  output: { value: string; script: string }
  txindex: number
  height: 2
}
export interface AlkanesResponse {
  outpoints: Outpoint[]
  balanceSheet: []
}

interface AlkaneSimulateRequest {
  alkanes: any[]
  transaction: string
  block: string
  height: string
  txindex: number
  target: {
    block: string
    tx: string
  }
  inputs: string[]
  pointer: number
  refundPointer: number
  vout: number
}

export class AlkanesRpc {
  public alkanesUrl: string

  constructor(url: string) {
    this.alkanesUrl = url
  }

  async _call(method, params = []) {
    const requestData = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1,
    }

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      cache: 'no-cache',
    }

    try {
      const response = await fetch(this.alkanesUrl, requestOptions)
      const responseData = await response.json()

      if (responseData.error) {
        console.error('Alkanes JSON-RPC Error:', responseData.error)
        throw new Error(responseData.error)
      }

      return responseData.result
    } catch (error) {
      console.error('Request Error:', error)
      throw error
    }
  }

  async getAlkanesByHeight({
    height,
    protocolTag = '1',
  }: {
    height: number
    protocolTag: string
  }) {
    return (await this._call('alkanes_protorunesbyheight', [
      {
        height,
        protocolTag,
      },
    ])) as AlkanesResponse
  }

  async getAlkanesByAddress({
    address,
    protocolTag = '1',
    name,
  }: {
    address: string
    protocolTag?: string
    name?: string
  }): Promise<Outpoint[]> {
    const ret = await this._call('alkanes_protorunesbyaddress', [
      {
        address,
        protocolTag,
      },
    ])
    const alkanesList = ret.outpoints.filter(
      (outpoint) => outpoint.runes.length > 0
    )
    if (name) {
      return alkanesList.flatMap((outpoints) =>
        outpoints.runes.filter((item) => item.rune.name === name)
      )
    }
    return alkanesList
  }



  async trace(request: { vout: number; txid: string }) {
    request.txid = Buffer.from(
      Array.from(Buffer.from(request.txid, 'hex')).reverse()
    ).toString('hex')
    const ret = await this._call('alkanes_trace', [request])
    return await ret
  }

  async runesByAddress(request: { address: string }) {
    const ret = await this._call('alkanes_runesbyaddress', [request])
    return await ret
  }

  async simulate(request: AlkaneSimulateRequest) {
    const ret = await this._call('alkanes_simulate', [request])
    const parsed = this.parseSimulateReturn(ret.execution.data)
    ret.parsed = parsed
    return ret
  }
  async getAlkanesByOutpoint({
    txid,
    vout,
    protocolTag = '1',
  }: {
    txid: string
    vout: number
    protocolTag?: string
  }): Promise<any> {
    return await this._call('alkanes_protorunesbyoutpoint', [
      {
        txid:
          '0x' +
          Buffer.from(Array.from(Buffer.from(txid, 'hex')).reverse()).toString(
            'hex'
          ),
        vout,
        protocolTag,
      },
    ])
  }

  parseSimulateReturn(v: any) {
    console.log(v)
    const stripHexPrefix = (v: string) => (v.startsWith('0x') ? v.slice(2) : v)
    const addHexPrefix = (v: string) => '0x' + stripHexPrefix(v)

    let decodedString: string
    try {
      decodedString = Buffer.from(stripHexPrefix(v), 'hex').toString('utf8')
      if (/[\uFFFD]/.test(decodedString)) {
        throw new Error('Invalid UTF-8 string')
      }
    } catch (err) {
      decodedString = addHexPrefix(v)
    }

    return {
      string: decodedString,
      bytes: addHexPrefix(v),
      le: BigInt(
        addHexPrefix(
          Buffer.from(
            Array.from(Buffer.from(stripHexPrefix(v), 'hex')).reverse()
          ).toString('hex')
        )
      ).toString(),
      be: BigInt(addHexPrefix(v)).toString(),
    }
  }
}

new AlkanesRpc('http://mainnet.sandshrew.io/v1/d6aebfed1769128379aca7d215f0b689').runesByAddress({
  address:
    'bc1p8323esxy75z0x0a44ls9k89ge4ajsqrklcsmcf45nt6s43jrm23q9xh0t0',
}).then((res) => console.log(res))
