chrome.storage.local.get(
  ['hidePosts', 'noPopupCheck', 'theme'],
  (storage) => {
    document.getElementById('hidePosts').checked = !!storage.hidePosts
    document.getElementById('noPopupCheck').checked = !!storage.noPopupCheck
    document.getElementById('theme').value = storage.theme || 'default'
  }
)

document.getElementById('hidePosts').addEventListener('change', (e) => {
  chrome.storage.local.set({ hidePosts: e.target.checked })
})

document.getElementById('noPopupCheck').addEventListener('change', (e) => {
  chrome.storage.local.set({ noPopupCheck: e.target.checked })
  try {
    chrome.action.setIcon({ path: { 128: 'icon128.png' } })
  } catch (err) {}
})

document.getElementById('theme').addEventListener('change', (e) => {
  chrome.storage.local.set({ theme: e.target.value })
})
