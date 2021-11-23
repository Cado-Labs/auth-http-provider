# @cadolabs/auth-http-provider &middot; <a target="_blank" href="https://github.com/Cado-Labs"><img src="https://github.com/Cado-Labs/cado-labs-logos/raw/main/cado_labs_badge.svg" alt="Supported by Cado Labs" style="max-width: 100%; height: 20px"></a> &middot; [![CI](https://github.com/Cado-Labs/auth-http-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/Cado-Labs/auth-http-provider/actions/workflows/ci.yml) &middot; [![npm version](https://badge.fury.io/js/@cadolabs%2Fauth-http-provider.svg)](https://badge.fury.io/js/@cadolabs%2Fauth-http-provider)

HTTP Provider with integrated auth tokens

Based on [axios](https://github.com/axios/axios) library.

## Install

```sh
npm i --save @cadolabs/auth-http-provider
```

or

```sh
yarn add @cadolabs/auth-http-provider
```

And require it for further usage
```js
import AuthHTTPProvider from "@cadolabs/auth-http-provider"
```

## Usage

First you need to create a factory

```js
const factory = AuthHTTPProvider.make({ getToken, saveToken, refreshToken, onError })
```

Options:

- `getToken` – `void => Promise<string>` – retuns saved auth token
- `saveToken` – `token => Promise<void>` – save refreshed token
- `refreshToken` – `() => Promise<string>` – refresh current token
- `onError` – `Error => void` – calls on error (Error object is just an error from `axios`)

And after that you can create a http provider:

```js
const provider = factory.create({ baseURL })

await provider.get("/some-url")
await provider.post("/some-url")
await provider.put("/some-url")
await provider.patch("/some-url")
await provider.delete("/some-url")
```

Options:
- `baseURL` – `string` – base url of API server (eg. `https://api.example.com/v1`)

## How does it work

On each request performing it calls callback `getToken` to get the auth token and makes the request with auth header `Authorization: Bearer <token>`.

When any request you made fails with 401 error code, it tries to refresh the token using callback `refreshToken` and perform it one more time with the new token. If it fails again, it calls `onError` callback and throws an error.

If request complited successfully with new token, it calls `saveToken` to make your code save it somewhere.

In other cases it behaves like a regular request-performing library.

## Contributing

- Fork it ( https://github.com/Cado-Labs/auth-http-provider )
- Create your feature branch (`git checkout -b feature/my-new-feature`)
- Commit your changes (`git commit -am '[feature_context] Add some feature'`)
- Push to the branch (`git push origin feature/my-new-feature`)
- Create new Pull Request

## License

Released under MIT License.

## Supporting

<a href="https://github.com/Cado-Labs">
  <img src="https://github.com/Cado-Labs/cado-labs-resources/blob/main/cado_labs_supporting_rounded.svg" alt="Supported by Cado Labs" />
</a>

## Authors

[Aleksei Bespalov](https://github.com/nulldef)
