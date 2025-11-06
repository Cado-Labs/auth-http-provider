import Provider from "./Provider"

class Factory {
  static make (params) {
    return new Factory(params)
  }

  constructor ({ getAccessToken, saveTokens, refreshTokens, onError }) {
    this.getAccessToken = getAccessToken
    this.saveTokens = saveTokens
    this.refreshTokens = refreshTokens
    this.onError = onError
  }

  create = params => new Provider({ factory: this, ...params })
}

export default Factory
