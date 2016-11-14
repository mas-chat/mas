function info(...args) {
  console.log(...args); // eslint-disable-line no-console
}

function warn(...args) {
  console.warn(...args); // eslint-disable-line no-console
}

function error(...args) {
  console.error(...args); // eslint-disable-line no-console
}

export default {
  info,
  warn,
  error
};
