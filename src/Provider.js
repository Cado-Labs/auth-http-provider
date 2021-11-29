export default class Provider {
  constructor ({ factory, baseURL }) {
    this.factory = factory
    this.baseURL = baseURL
  }

  get = (path, query = {}, headers = {}) => this.#request({ method: "get", path, query, headers })

  post = (path, body = {}, headers = {}) => this.#request({ method: "post", path, body, headers })

  put = (path, body = {}, headers = {}) => this.#request({ method: "put", path, body, headers })

  patch = (path, body = {}, headers = {}) => this.#request({ method: "patch", path, body, headers })

  delete = (path, body = {}, headers = {}) => this.#request({
    method: "delete",
    path,
    body,
    headers,
  })

  #request = async request => {
    const token = await this.factory.getToken()

    const response = await this.#perform(request, token)

    if (response.ok) return response

    if (response.status === 401) {
      const newToken = await this.factory.refreshToken()
      const newResponse = await this.#perform(request, newToken)

      if (newResponse.ok) {
        await this.factory.saveToken(newToken)
        return newResponse
      }

      this.factory.onError(response)
      throw newResponse
    }

    throw response
  }

  #perform = ({ method, path, query, body, headers }, token) => {
    const uri = this.#buildUrl(path, query)
    const requestHeaders = { ...headers, Authorization: `Bearer ${token}` }

    return fetch(uri, { method, body, headers: requestHeaders })
  }

  #buildUrl = (path, query = {}) => {
    const url = new URL(this.baseURL)
    const searchParams = new URLSearchParams(query)

    url.pathname = path
    url.search = searchParams.toString()

    return url.toString()
  }
}
