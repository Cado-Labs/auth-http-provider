export default class Provider {
  constructor ({ factory, baseURL }) {
    this.factory = factory
    this.baseURL = baseURL
  }

  get = (path, query = {}, headers = {}) => this.#request({ method: "get", path, query, headers })

  post = (path, body = {}, headers = {}) => this.#request({ method: "post", path, body, headers })

  put = (path, body = {}, headers = {}) => this.#request({ method: "put", path, body, headers })

  patch = (path, body = {}, headers = {}) => this.#request({ method: "patch", path, body, headers })

  delete = (path, body = {}, headers = {}) => this.#request({ method: "delete", path, body, headers })

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

  #perform = ({ method, path, query, body, headers }, token) => {
    const uri = this.#buildUrl(path, query)
    const requestHeaders = new Headers({ ...headers, Authorization: `Bearer ${token}` })
    const request = new Request(uri, { method, body, headers: requestHeaders })

    return fetch(request)
  }

  #buildUrl = (path, query = {}) => {
    const url = new URL(this.baseURL)
    const searchParams = new URLSearchParams(query)

    url.pathname = path
    url.search = searchParams.toString()

    return url.toString()
  }
}
