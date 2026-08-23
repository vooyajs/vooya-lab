const processShim = {
  cwd: () => "/",
  nextTick: (callback: () => void) => queueMicrotask(callback),
  env: {},
};

export default processShim;
