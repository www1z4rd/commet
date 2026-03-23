const readStorage = (key) =>
  new Promise((resolve) => {
    chrome.storage.local.get([key], (storage) => resolve(storage[key]))
  })

const setIcon = (icon) => {
  try {
    chrome.action.setIcon({ path: { 128: icon } })
  } catch (e) {
    chrome.browserAction.setIcon({ path: { 128: icon } })
  }
}

const YOUTUBE_BASE = 'www.youtube.com/watch?v='

const cleanUrl = (url) => {
  const urlNoSlash = url.endsWith('/') ? url.slice(0, -1) : url
  const urlNoProtocol = urlNoSlash.replace(/(^\w+:|^)\/\//, '')
  return urlNoProtocol.split('#')[0]
}

const getYoutubeId = (youtubeIdIndex, url) =>
  url.indexOf('&') === -1
    ? url.substring(youtubeIdIndex + YOUTUBE_BASE.length)
    : url.substring(youtubeIdIndex + YOUTUBE_BASE.length, url.lastIndexOf('&'))

const fetchRedditJson = (url) =>
  fetch(url)
    .then((r) => {
      if (r.status === 429) throw new Error('429 Too Many Requests')
      return r.json()
    })
    .catch((err) => {
      if (err.message === '429 Too Many Requests') throw err
      return err
    })

const fetchSearchApi = (searchString) =>
  fetchRedditJson(
    `https://www.reddit.com/search.json?q=url%3A%27${searchString}%27&include_over_18=on&sort=top&type=link`
  )

const fetchSubmitApi = (url) =>
  fetchRedditJson(`https://www.reddit.com/submit.json?url=${encodeURIComponent(cleanUrl(url))}`)

const compareComments = (a, b) => b.num_comments - a.num_comments

const processResponses = (responses, cleanedUrl, isYoutube, hidePosts) => {
  let posts = responses
    .filter((r) => r.kind === 'Listing' && r.data?.children?.length > 0)
    .reduce((acc, val) => acc.concat(val.data.children), [])
    .reduce((acc, val) => acc.concat(val.data), [])
    .filter((post) => post.num_comments >= (hidePosts ? 1 : 0))
  if (!isYoutube) {
    posts = posts.filter((post) => cleanUrl(post.url) === cleanedUrl)
  }
  posts = [...new Map(posts.map((p) => [p.id, p])).values()]
  return posts.sort(compareComments)
}

const fetchPosts = async (url) => {
  const hidePosts = await readStorage('hidePosts')
  const youtubeIdIndex = url.indexOf(YOUTUBE_BASE)
  const isYoutube = youtubeIdIndex !== -1
  const cleanedUrl = cleanUrl(url)
  let responses
  if (isYoutube) {
    const youtubeId = getYoutubeId(youtubeIdIndex, url)
    responses = [await fetchSearchApi(youtubeId)]
  } else {
    responses = await Promise.all([
      fetchSearchApi(cleanedUrl),
      fetchSubmitApi(cleanedUrl),
    ])
  }
  return processResponses(responses, cleanedUrl, isYoutube, hidePosts)
}

const fetchHnPosts = async (url) => {
  const cleanedUrl = cleanUrl(url)
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(cleanedUrl)}&restrictSearchableAttributes=url&tags=story&hitsPerPage=20`
  ).then((r) => r.json()).catch(() => ({ hits: [] }))
  const hits = (res.hits || [])
    .filter((hit) => hit.url && cleanUrl(hit.url) === cleanedUrl)
  return hits.map((hit) => ({
    id: hit.objectID,
    title: hit.title || '',
    permalink: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    score: hit.points || 0,
    num_comments: hit.num_comments || 0,
    source: 'hn',
  }))
}

const mergeAndSortPosts = (redditPosts, hnPosts) => {
  const reddit = (redditPosts || []).map((p) => ({ ...p, source: 'reddit' }))
  const hn = hnPosts || []
  return [...reddit, ...hn].sort((a, b) => (b.num_comments || 0) - (a.num_comments || 0))
}

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_KEY = 'postCache'
const CACHE_MAX_URLS = 10

const getCachedPosts = async (cleanedUrl) => {
  const cache = await readStorage(CACHE_KEY)
  if (!cache || typeof cache !== 'object') return null
  const entry = cache[cleanedUrl]
  if (!entry || !Array.isArray(entry.posts)) return null
  if (Date.now() - (entry.timestamp || 0) > CACHE_TTL_MS) return null
  return entry.posts
}

const setCachedPosts = async (cleanedUrl, posts) => {
  const cache = (await readStorage(CACHE_KEY)) || {}
  cache[cleanedUrl] = { posts, timestamp: Date.now() }
  const keys = Object.keys(cache)
  if (keys.length > CACHE_MAX_URLS) {
    const sorted = keys.sort((a, b) => (cache[a].timestamp || 0) - (cache[b].timestamp || 0))
    for (let i = 0; i < keys.length - CACHE_MAX_URLS; i++) delete cache[sorted[i]]
  }
  chrome.storage.local.set({ [CACHE_KEY]: cache })
}

const fetchAndMergePosts = async (url) => {
  const [redditPosts, hnPosts] = await Promise.all([fetchPosts(url), fetchHnPosts(url)])
  return mergeAndSortPosts(
    Array.isArray(redditPosts) ? redditPosts : [],
    Array.isArray(hnPosts) ? hnPosts : []
  )
}

const updateIcon = async (url) => {
  const noPopupCheck = await readStorage('noPopupCheck')
  if (!noPopupCheck) {
    const cleanedUrl = cleanUrl(url)
    try {
      let posts = await getCachedPosts(cleanedUrl)
      if (posts === null) {
        posts = await fetchAndMergePosts(url)
        await setCachedPosts(cleanedUrl, posts)
      }
      setIcon(posts.length ? 'icon128.png' : 'iconGrey128.png')
    } catch {
      setIcon('iconGrey128.png')
    }
  }
}

chrome.webNavigation.onHistoryStateUpdated.addListener((e) => {
  if (e.frameType === 'outermost_frame' || e.frameId === 0) updateIcon(e.url)
})

chrome.webNavigation.onBeforeNavigate.addListener((e) => {
  if (e.frameType === 'outermost_frame' || e.frameId === 0) updateIcon(e.url)
})

chrome.tabs.onActivated.addListener(() => {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (tabs[0]?.url) updateIcon(tabs[0].url)
  })
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.url) {
    sendResponse({ error: 'Missing URL' })
    return false
  }
  const cleanedUrl = cleanUrl(request.url)
  getCachedPosts(cleanedUrl).then((cached) => {
    if (cached !== null) {
      sendResponse({ posts: cached })
      return
    }
    fetchAndMergePosts(request.url)
      .then((posts) => setCachedPosts(cleanedUrl, posts).then(() => sendResponse({ posts })))
      .catch((err) => {
        sendResponse({ error: err?.message || String(err) })
      })
  })
  return true
})
