import fetchMock from "jest-fetch-mock"

import Provider from "../src"

fetchMock.enableMocks()

const METHODS = ["get", "post", "put", "patch", "delete"]

const getToken = jest.fn(() => Promise.resolve("current-token"))
const saveToken = jest.fn(_token => Promise.resolve())
const refreshToken = jest.fn(() => Promise.resolve("new-token"))
const onError = jest.fn(_error => Promise.resolve())

const createProvider = () => {
  return Provider
    .make({ getToken, saveToken, refreshToken, onError })
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

  const makeRequest = method => provider[method]("/route", { key: "value" }, { header: "value" })

  METHODS.forEach(method => {
    it(`${method.toUpperCase()} | performs request`, async () => {
      fetchMock.mockOnce(JSON.stringify({ success: true }), { status: 200 })

      const response = await makeRequest(method)

      const isGet = method === "get"
      const expectedUrl = isGet ? "http://localhost/route?key=value" : "http://localhost/route"
      const expectedBody = isGet ? undefined : { key: "value" }
      const expectedHeaders = makeHeaderMatcher("current-token", { header: "value" })

      expect(response.status).toEqual(200)
      expect(response.json()).resolves.toEqual({ success: true })
      expect(getToken).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith(expectedUrl, {
        method,
        body: expectedBody,
        headers: expectedHeaders,
      })
    })
  })
})

describe("refreshing token", () => {
  const provider = createProvider()

  METHODS.forEach(method => {
    it(`${method.toUpperCase()} | tries to refresh token`, async () => {
      fetchMock.mockResponses(
        ["", { status: 401 }],
        [JSON.stringify({ success: true }), { status: 200 }],
      )

      const response = await provider[method]("/route")

      expect(response.status).toEqual(200)
      expect(response.json()).resolves.toEqual({ success: true })
      expect(getToken).toHaveBeenCalled()
      expect(saveToken).toHaveBeenCalledWith("new-token")
      expect(refreshToken).toHaveBeenCalled()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(1, ...makeCallingMatcher("current-token"))
      expect(fetchMock).toHaveBeenNthCalledWith(2, ...makeCallingMatcher("new-token"))
    })
  })
})

describe("errors", () => {
  METHODS.forEach(method => {
    it(`${method.toUpperCase()} | calls onError when refresh token didn't help`, async () => {
      fetchMock.mockResponse("", { status: 401 })

      const provider = createProvider()

      try {
        await provider[method]("/route")
      } catch (e) {
        expect(e.status).toEqual(401)
      }

      expect(getToken).toHaveBeenCalled()
      expect(refreshToken).toHaveBeenCalled()
      expect(saveToken).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(1, ...makeCallingMatcher("current-token"))
      expect(fetchMock).toHaveBeenNthCalledWith(2, ...makeCallingMatcher("new-token"))
    })

    it(`${method.toUpperCase()} | throws an error on non-401 statuses`, async () => {
      fetchMock.once("", { status: 500 })

      const provider = createProvider()

      try {
        await provider[method]("/route")
      } catch (e) {
        expect(e.status).toEqual(500)
      }

      expect(getToken).toHaveBeenCalled()
      expect(refreshToken).not.toHaveBeenCalled()
      expect(saveToken).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(...makeCallingMatcher("current-token"))
    })
  })
})
