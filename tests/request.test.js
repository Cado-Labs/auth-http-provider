import axios from "axios"
import MockAdapter from "axios-mock-adapter"

import Provider from "../src"

const axiosMock = new MockAdapter(axios)

const METHODS = ["get", "post", "put", "patch", "delete"]

const getToken = jest.fn(() => Promise.resolve("current-token"))
const saveToken = jest.fn(_token => Promise.resolve())
const refreshToken = jest.fn(() => Promise.resolve("new-token"))
const onError = jest.fn(_error => Promise.resolve())

const capitalize = string => `${string.charAt(0).toUpperCase()}${string.slice(1).toLowerCase()}`

const onRequest = (method, url, params, token, headers = {}) => {
  const fn = `on${capitalize(method)}`
  const headerMatchers = expect.objectContaining({ ...headers, Authorization: `Bearer ${token}` })

  return axiosMock[fn](url, params, headerMatchers)
}

const createProvider = () => {
  return Provider
    .make({ getToken, saveToken, refreshToken, onError })
    .create({ baseURL: "http://localhost" })
}

describe("making requests", () => {
  beforeAll(() => {
    const params = { key: "value" }
    const headers = { header: "value" }
    const response = { success: true }

    onRequest("get", "/route", { params }, "current-token", headers).reply(200, response)
    onRequest("post", "/route", params, "current-token", headers).reply(200, response)
    onRequest("put", "/route", params, "current-token", headers).reply(200, response)
    onRequest("patch", "/route", params, "current-token", headers).reply(200, response)
    onRequest("delete", "/route", params, "current-token", headers).reply(200, response)
  })

  const provider = createProvider()

  METHODS.forEach(method => {
    it(`${method.toUpperCase()} | performs requests`, async () => {
      const fn = provider[method]
      const { status, data } = await fn("/route", { key: "value" }, { header: "value" })

      expect(status).toEqual(200)
      expect(data).toEqual({ success: true })
      expect(getToken).toHaveBeenCalled()
    })
  })
})

describe("refreshing token", () => {
  METHODS.forEach(method => {
    it(`${method.toUpperCase()} | tries to refresh token`, async () => {
      onRequest(method, "/route", {}, "current-token").replyOnce(401)
      onRequest(method, "/route", {}, "new-token").reply(200, { success: true })

      const provider = createProvider()
      const { status, data } = await provider[method]("/route")

      expect(status).toEqual(200)
      expect(data).toEqual({ success: true })
      expect(getToken).toHaveBeenCalled()
      expect(saveToken).toHaveBeenCalledWith("new-token")
      expect(refreshToken).toHaveBeenCalled()
    })
  })
})

describe("errors", () => {
  METHODS.forEach(method => {
    it(`${method.toUpperCase()} | calls onError when refresh token didn't help`, async () => {
      onRequest(method, "/route", {}, "current-token").replyOnce(401)
      onRequest(method, "/route", {}, "new-token").reply(401)

      const provider = createProvider()

      try {
        await provider[method]("/route")
      } catch (e) {
        expect(e.response.status).toEqual(401)
      }

      expect(getToken).toHaveBeenCalled()
      expect(refreshToken).toHaveBeenCalled()
      expect(saveToken).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()
    })

    it(`${method.toUpperCase()} | throws an error on non-401 statuses`, async () => {
      onRequest(method, "/route", {}, "current-token").replyOnce(500)

      const provider = createProvider()

      try {
        await provider[method]("/route")
      } catch (e) {
        expect(e.response.status).toEqual(500)
      }

      expect(getToken).toHaveBeenCalled()
      expect(refreshToken).not.toHaveBeenCalled()
      expect(saveToken).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })
  })
})
