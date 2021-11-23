import axios from "axios"

export default class Provider {
  constructor ({ factory, baseURL }) {
    this.factory = factory
    this.client = axios.create({ baseURL })
  }

  get = (url, params = {}, headers = {}) => this.#request({ method: "get", url, params, headers })

  post = (url, data = {}, headers = {}) => this.#request({ method: "post", url, data, headers })

  put = (url, data = {}, headers = {}) => this.#request({ method: "put", url, data, headers })

  patch = (url, data = {}, headers = {}) => this.#request({ method: "patch", url, data, headers })

  delete = (url, data = {}, headers = {}) => this.#request({ method: "delete", url, data, headers })

  #request = async request => {
    const token = await this.factory.getToken()

    try {
      return await this.#perform(request, token)
    } catch (e) {
      if (e.response.status === 401) {
        try {
          const newToken = await this.factory.refreshToken()
          const response = await this.#perform(request, newToken)
          await this.factory.saveToken(newToken)
          return response
        } catch (e) {
          this.factory.onError(e)
          throw e
        }
      } else {
        throw e
      }
    }
  }

  #perform = ({ method, url, params, data, headers }, token) => {
    const requestHeaders = { ...headers, Authorization: `Bearer ${token}` }
    const request = { method, params, data, url, headers: requestHeaders }

    return this.client.request(request)
  }
}
