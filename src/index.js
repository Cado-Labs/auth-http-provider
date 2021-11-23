import Provider from "./Provider"

class Factory {
  static make (params) {
    return new Factory(params)
  }

  constructor ({ getToken, saveToken, refreshToken, onError }) {
    this.getToken = getToken
    this.saveToken = saveToken
    this.refreshToken = refreshToken
    this.onError = onError
  }

  create = params => new Provider({ factory: this, ...params })
}

export default Factory
