import fetch from 'node-fetch'

export const stripHexPrefix = (s: string): string =>
  s.substr(0, 2) === '0x' ? s.substr(2) : s

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

interface AlkaneToken {
  name: string
  symbol: string
  totalSupply: number
  cap: number
  minted: number
  mintActive: boolean
  percentageMinted: number
  mintAmount: number
}

const opcodes: string[] = ['99', '100', '101', '102', '103', '104', '1000']
const opcodesHRV: string[] = [
  'name',
  'symbol',
  'totalSupply',
  'cap',
  'minted',
  'mintAmount',
  'data',
]

export class AlkanesRpc {
  public alkanesUrl: string

  constructor(url: string) {
    this.alkanesUrl = url
  }

  async _call(method: string, params = []) {
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
      if (error.name === 'AbortError') {
        console.error('Request Timeout:', error)
        throw new Error('Request timed out')
      } else {
        console.error('Request Error:', error)
        throw error
      }
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

    const alkanesList = ret.outpoints
      .filter((outpoint) => outpoint.runes.length > 0)
      .map((outpoint) => ({
        ...outpoint,
        runes: outpoint.runes.map((rune) => ({
          ...rune,
          balance: Number(rune.balance),
          rune: {
            ...rune.rune,
            id: {
              block: Number(rune.rune.id.block),
              tx: Number(rune.rune.id.tx),
            },
          },
        })),
      }))

    if (name) {
      return alkanesList.flatMap((outpoints) =>
        outpoints.runes.filter((item) => item.rune.name === name)
      )
    }

    return alkanesList
  }

  async trace(request: { vout: number; txid: string }) {
    request.txid = Buffer.from(request.txid, 'hex').reverse().toString('hex')
    const ret = await this._call('alkanes_trace', [request])
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
     const alkaneList = await this._call('alkanes_protorunesbyoutpoint', [
       {
         txid: Buffer.from(txid, 'hex').reverse().toString('hex'),
         vout,
         protocolTag,
       },
     ])

     return alkaneList.map((outpoint) => ({
      ...outpoint,
      token: {
        ...outpoint.token,
        id: {
          block: Number(outpoint.token.id.block),
          tx: Number(outpoint.token.id.tx),
        },
      },
      value: Number(outpoint.value),
    }))

   }

  async getAlkaneById({
    block,
    tx,
  }: {
    block: string
    tx: string
  }): Promise<AlkaneToken> {
    const alkaneData: AlkaneToken = {
      name: '',
      mintActive: false,
      percentageMinted: 0,
      symbol: '',
      totalSupply: 0,
      cap: 0,
      minted: 0,
      mintAmount: 0,
    }

    for (let j = 0; j < opcodes.length; j++) {
      try {
        const result = await this.simulate({
          target: { block, tx },
          alkanes: [],
          transaction: '0x',
          block: '0x',
          height: '20000',
          txindex: 0,
          inputs: [opcodes[j]],
          pointer: 0,
          refundPointer: 0,
          vout: 0,
        })
        if (result.status === 0) {
          alkaneData[opcodesHRV[j]] = Number(result.parsed.le)
          if (
            opcodesHRV[j] === 'name' ||
            opcodesHRV[j] === 'symbol' ||
            opcodesHRV[j] === 'data'
          ) {
            alkaneData[opcodesHRV[j]] = result.parsed.string
          }
          alkaneData.mintActive =
            Number(alkaneData.minted) < Number(alkaneData.cap)
          alkaneData.percentageMinted = Math.floor(
            (alkaneData.minted / alkaneData.cap) * 100
          )
        }
      } catch (error) {
        console.log(error)
      }
    }
    return alkaneData
  }

  async getAlkanes({
    limit,
    offset = 0,
  }: {
    limit: number
    offset?: number
  }): Promise<AlkaneToken[]> {
    if (limit > 1000) {
      throw new Error(
        'Max limit reached. Request fewer than 1000 alkanes per call'
      )
    }
    const alkaneResults: AlkaneToken[] = []
    for (let i = offset; i <= limit; i++) {
      const alkaneData: any = {}
      let hasValidResult = false
      alkaneData.id = {
        block: '2',
        tx: i.toString(),
      }
      for (let j = 0; j < opcodes.length; j++) {
        try {
          const result = await this.simulate({
            target: { block: '2', tx: i.toString() },
            alkanes: [],
            transaction: '0x',
            block: '0x',
            height: '20000',
            txindex: 0,
            inputs: [opcodes[j]],
            pointer: 0,
            refundPointer: 0,
            vout: 0,
          })
          if (result.status === 0) {
            alkaneData[opcodesHRV[j]] = Number(result.parsed.le)
            if (
              opcodesHRV[j] === 'name' ||
              opcodesHRV[j] === 'symbol' ||
              opcodesHRV[j] === 'data'
            ) {
              alkaneData[opcodesHRV[j]] = result.parsed.string
            }
            hasValidResult = true
            alkaneData.mintActive =
              Number(alkaneData.minted) < Number(alkaneData.cap)
            alkaneData.percentageMinted = Math.floor(
              (alkaneData.minted / alkaneData.cap) * 100
            )
          }
        } catch (error) {
          console.log(error)
        }
      }
      if (hasValidResult) {
        alkaneResults.push(alkaneData)
      }
    }
    return alkaneResults
  }

  parseSimulateReturn(v: any) {
    if (v === '0x') {
      return 'invalid'
    }
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
