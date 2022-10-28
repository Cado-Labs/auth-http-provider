import { babel } from "@rollup/plugin-babel"

const buildConfig = format => {
  return {
    input: "src/index.js",
    output: {
      exports: "default",
      file: `dist/auth-http-provider.${format}.js`,
      format,
    },
    plugins: [babel({ babelHelpers: 'bundled' })],
  }
}

const config = [
  buildConfig("cjs"),
  buildConfig("es"),
]

export default config
