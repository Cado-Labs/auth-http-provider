import fetchMock from "jest-fetch-mock"

import Provider from "../src"

fetchMock.enableMocks()

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

const getAccessToken = jest.fn(() => Promise.resolve("current-token"))
const saveTokens = jest.fn(_tokens => Promise.resolve())
const refreshTokens = jest.fn(() => Promise.resolve({
  accessToken: "new-access-token",
  refreshToken: "new-refresh-token",
}))
const onError = jest.fn(_error => Promise.resolve())

const createProvider = () => {
  return Provider
    .make({ getAccessToken, saveTokens, refreshTokens, onError })
    .create({ baseURL: "http://localhost" })
}

const makeHeaderMatcher = (token, others = {}) => expect.objectContaining({
  ...others,
  Authorization: `Bearer ${token}`,
})

const makeCallingMatcher = token => {
  const routeMatcher = expect.stringContaining("http://localhost/route")
  const paramsMatcher = expect.objectContaining({ headers: makeHeaderMatcher(token) })

  return [routeMatcher, paramsMatcher]
}

describe("making requests", () => {
  const provider = createProvider()

  METHODS.forEach(method => {
    const isGet = method === "GET"

    it(`${method} | performs request`, async () => {
      fetchMock.mockOnce(JSON.stringify({ success: true }), { status: 200 })

      const headers = { header: "value" }
      const data = { key: "value", arr: [1, 2] }
      const params = { headers, query: data }

      if (!isGet) { params.json = data }

      const fn = provider[method.toLowerCase()]
      const response = await fn("/route", params)

      const expectedUrl = "http://localhost/route?key=value&arr%5B%5D=1&arr%5B%5D=2"
      const expectedBody = isGet ? null : JSON.stringify({ key: "value", arr: [1, 2] })

      const expectedHeaders = { header: "value" }
      if (!isGet) { expectedHeaders["Content-Type"] = "application/json" }

      const expectedHeadersMather = makeHeaderMatcher("current-token", expectedHeaders)

      expect(response.status).toEqual(200)
      expect(response.json()).resolves.toEqual({ success: true })
      expect(getAccessToken).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith(expectedUrl, {
        method,
        body: expectedBody,
        headers: expectedHeadersMather,
      })
    })

    if (isGet) return

    it(`${method} | sends form`, async () => {
      fetchMock.mockOnce(JSON.stringify({ success: true }), { status: 200 })

      const headers = { header: "value" }
      const form = new FormData()
      const params = { headers, form }

      const fn = provider[method.toLowerCase()]
      const response = await fn("/route", params)

      expect(response.status).toEqual(200)
      expect(response.json()).resolves.toEqual({ success: true })
      expect(getAccessToken).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith("http://localhost/route", {
        method,
        body: expect.any(FormData),
        headers: makeHeaderMatcher("current-token", { header: "value" }),
      })
    })
  })
})

describe("refreshing token", () => {
  const provider = createProvider()

  METHODS.forEach(method => {
    it(`${method} | tries to refresh token`, async () => {
      fetchMock.mockResponses(
        ["", { status: 401 }],
        [JSON.stringify({ success: true }), { status: 200 }],
      )

      const response = await provider[method.toLowerCase()]("/route")

      expect(response.status).toEqual(200)
      expect(response.json()).resolves.toEqual({ success: true })
      expect(getAccessToken).toHaveBeenCalled()
      expect(saveTokens).toHaveBeenCalledWith({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      })
      expect(refreshTokens).toHaveBeenCalled()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(1, ...makeCallingMatcher("current-token"))
      expect(fetchMock).toHaveBeenNthCalledWith(2, ...makeCallingMatcher("new-access-token"))
    })
  })
})

describe("errors", () => {
  METHODS.forEach(method => {
    it(`${method} | calls onError when refresh token didn't help`, async () => {
      fetchMock.mockResponse("", { status: 401 })

      const provider = createProvider()

      try {
        await provider[method.toLowerCase()]("/route")
      }
      catch (e) {
        expect(e.status).toEqual(401)
      }

      expect(getAccessToken).toHaveBeenCalled()
      expect(refreshTokens).toHaveBeenCalled()
      expect(saveTokens).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(1, ...makeCallingMatcher("current-token"))
      expect(fetchMock).toHaveBeenNthCalledWith(2, ...makeCallingMatcher("new-access-token"))
    })

    it(`${method} | throws an error on non-401 statuses`, async () => {
      fetchMock.once("", { status: 500 })

      const provider = createProvider()

      try {
        await provider[method.toLowerCase()]("/route")
      }
      catch (e) {
        expect(e.status).toEqual(500)
      }

      expect(getAccessToken).toHaveBeenCalled()
      expect(refreshTokens).not.toHaveBeenCalled()
      expect(saveTokens).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(...makeCallingMatcher("current-token"))
    })
  })
})
