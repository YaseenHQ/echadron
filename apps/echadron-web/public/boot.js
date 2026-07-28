(function () {
  try {
    var v = localStorage.getItem('echadron-web.color-scheme');
    if (v === 'light' || v === 'dark' || v === 'system') {
      document.documentElement.dataset.colorScheme = v;
    }
  } catch {
    /* ignore */
  }
})();
