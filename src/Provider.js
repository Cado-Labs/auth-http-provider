export default class Provider {
  constructor ({ factory, baseURL }) {
    this.factory = factory
    this.baseURL = baseURL
  }

  get = (path, { query, headers } = {}) => this.#request({ method: "GET", path, query, headers })

  post = (path, { json, headers } = {}) => this.#request({ method: "POST", path, json, headers })

  put = (path, { json, headers } = {}) => this.#request({ method: "PUT", path, json, headers })

  patch = (path, { json, headers } = {}) => this.#request({ method: "PATCH", path, json, headers })

  delete = (path, { json, headers } = {}) => this.#request({
    method: "DELETE",
    path,
    json,
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

  #perform = ({ method, path, query, json, headers }, token) => {
    const uri = this.#buildUrl(path, query)

    const requestBody = json ? JSON.stringify(json) : null
    const requestHeaders = { ...headers, Authorization: `Bearer ${token}` }

    if (json) requestHeaders["Content-Type"] = "application/json"

    return fetch(uri, { method, body: requestBody, headers: requestHeaders })
  }

  #buildUrl = (path, query = {}) => {
    const url = new URL(this.baseURL)
    const searchParams = new URLSearchParams(query)

    url.pathname = path
    url.search = searchParams.toString()

    return url.toString()
  }
}
