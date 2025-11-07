import qs from "qs"

export default class Provider {
  constructor ({ factory, baseURL }) {
    this.factory = factory
    this.baseURL = baseURL
  }

  get = (path, { query, headers } = {}) => this.#request({ method: "GET", path, query, headers })

  post = (path, { json, query, form, headers } = {}) => this.#request({
    method: "POST",
    path,
    json,
    query,
    form,
    headers,
  })

  put = (path, { json, query, form, headers } = {}) => this.#request({
    method: "PUT",
    path,
    json,
    query,
    form,
    headers,
  })

  patch = (path, { json, query, form, headers } = {}) => this.#request({
    method: "PATCH",
    path,
    json,
    query,
    form,
    headers,
  })

  delete = (path, { json, query, form, headers } = {}) => this.#request({
    method: "DELETE",
    path,
    json,
    query,
    form,
    headers,
  })

  #request = async request => {
    const accessToken = await this.factory.getAccessToken()

    const response = await this.#perform(request, accessToken)

    if (response.ok) return response

    if (response.status === 401) {
      const newTokens = await this.factory.refreshTokens()

      if (!newTokens?.accessToken) {
        this.factory.onError(response)
        throw response
      }

      const newResponse = await this.#perform(request, newTokens.accessToken)

      if (newResponse.ok) {
        await this.factory.saveTokens(newTokens)
        return newResponse
      }

      this.factory.onError(response)
      throw newResponse
    }

    throw response
  }

  #perform = ({ method, path, query, json, form, headers }, token) => {
    const uri = this.#buildUrl(path, query)

    const requestBody = this.#buildBody({ json, form })
    const requestHeaders = this.#buildHeaders({ headers, token, json })

    return fetch(uri, { method, body: requestBody, headers: requestHeaders })
  }

  #buildBody = ({ json, form }) => {
    if (json) return JSON.stringify(json)
    if (form) return form

    return null
  }

  #buildHeaders = ({ headers, token, json }) => {
    const requestHeaders = { ...headers, Authorization: `Bearer ${token}` }

    if (json) requestHeaders["Content-Type"] = "application/json"

    return requestHeaders
  }

  #buildUrl = (path, query = {}) => {
    const url = new URL(this.baseURL)

    url.pathname = path
    url.search = qs.stringify(query, { arrayFormat: "brackets" })

    return url.toString()
  }
}
