const path = require("path");

module.exports = {
  rootDir: "./ConnectSphere",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest", { configFile: "./ConnectSphere/babel.config.cjs" }],
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg|webp)$": "<rootDir>/__mocks__/fileMock.cjs",
    "^react$": path.resolve(__dirname, "ConnectSphere/node_modules/react"),
    "^react-dom$": path.resolve(__dirname, "ConnectSphere/node_modules/react-dom"),
    "^react-dom/client$": path.resolve(__dirname, "ConnectSphere/node_modules/react-dom/client"),
  },
};