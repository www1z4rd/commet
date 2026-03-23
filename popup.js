const formatCount = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n)

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark' || (theme === 'default' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderPostItem(post) {
  const isReddit = post.source === 'reddit' && post.subreddit
  const link = isReddit
    ? `https://reddit.com${post.permalink || ''}`
    : (post.source === 'hn' && post.id
      ? `https://news.ycombinator.com/item?id=${post.id}`
      : (post.permalink || ''))
  const sourceHtml = isReddit
    ? `<a href="https://reddit.com/r/${encodeURIComponent(post.subreddit)}" target="_blank" rel="noreferrer" class="post-meta-link">r/${escapeHtml(post.subreddit)}</a>`
    : '<a href="https://news.ycombinator.com" target="_blank" rel="noreferrer" class="post-meta-link">Hacker News</a>'
  const score = post.score != null ? post.score : 0
  const numComments = post.num_comments != null ? post.num_comments : 0
  const scoreLabel = isReddit ? (score === 1 ? 'vote' : 'votes') : (score === 1 ? 'point' : 'points')
  return `
    <li class="post-item">
      <a href="${escapeHtml(link)}" target="_blank" rel="noreferrer" class="post-title">${escapeHtml(post.title || '')}</a>
      <div class="post-meta">
        ${sourceHtml}
        <span>${formatCount(score)} ${scoreLabel}</span>
        <span>${formatCount(numComments)} ${numComments === 1 ? 'comment' : 'comments'}</span>
      </div>
    </li>`
}

function render(messageOrPosts) {
  const container = document.getElementById('app-container')
  if (typeof messageOrPosts === 'string') {
    container.innerHTML = `<div class="message-wrap">${messageOrPosts}</div>`
    return
  }
  const posts = messageOrPosts || []
  if (posts.length === 0) {
    container.innerHTML = `<div class="message-wrap">No posts found. <a href="https://www.reddit.com/submit?url=${encodeURIComponent(currentUrl || '')}" target="_blank" rel="noreferrer">Submit to Reddit</a></div>`
    return
  }
  container.innerHTML = `<ul class="post-list">${posts.map(renderPostItem).join('')}</ul>`
}

let currentUrl = ''

chrome.storage.local.get(['theme'], (storage) => applyTheme(storage.theme || 'default'))

chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
  currentUrl = tabs[0]?.url || ''
  if (!currentUrl) {
    render('Open a webpage to find Reddit posts.')
    return
  }
  render('Loading...')
  chrome.runtime.sendMessage({ url: currentUrl }, (response) => {
    if (chrome.runtime.lastError) {
      render(`Error: ${chrome.runtime.lastError.message}`)
      return
    }
    if (!response) {
      render('Could not load. Try again.')
      return
    }
    if (response.error) {
      render(`Error: ${response.error}`)
      return
    }
    const posts = Array.isArray(response.posts) ? response.posts : []
    render(posts)
  })
})
