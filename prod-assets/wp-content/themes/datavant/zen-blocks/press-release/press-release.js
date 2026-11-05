;(function () {
  const blocks = document.querySelectorAll('.newsroom-pr-section[data-pr]')
  if (!blocks.length) return

  const debounce = (fn, ms = 350) => {
    let t
    return (...a) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...a), ms)
    }
  }

  // ---- URL helpers (page_num) ----
  function getParamName (root) {
    return (root?.dataset?.pageParam || 'page_num').trim() || 'page_num'
  }

  function getUrlPage (param) {
    try {
      const url = new URL(window.location.href)
      const p = parseInt(url.searchParams.get(param) || '1', 10)
      return Number.isFinite(p) && p > 0 ? p : 1
    } catch (e) {
      return 1
    }
  }

  function buildBaseUrl (param) {
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete(param)
      return url
    } catch (e) {
      return null
    }
  }

  function buildPageHref (param, p) {
    const base = buildBaseUrl(param)
    if (!base) return '#'
    const page = parseInt(String(p || 1), 10) || 1
    if (page > 1) base.searchParams.set(param, String(page))
    else base.searchParams.delete(param)
    return base.toString()
  }

  function setUrlPage (param, page, { replace = false } = {}) {
    try {
      const href = buildPageHref(param, page)
      const p = parseInt(String(page || 1), 10) || 1
      if (replace) window.history.replaceState({ page: p }, '', href)
      else window.history.pushState({ page: p }, '', href)
    } catch (e) {}
  }

  // ---- pagination arrow svg ----
  let PR_ARROW_UID = 0
  function makePagArrowSvg () {
    const mid = `pr_mask_${++PR_ARROW_UID}`
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="15" viewBox="0 0 14 15" fill="none" aria-hidden="true" focusable="false">
  <mask id="${mid}" fill="white">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.72474 7.63477L4.19635 2.53164L6.13958 0.73789L13.6112 7.63477L6.13958 14.5316L4.19635 12.7379L9.72474 7.63477Z"/>
  </mask>
  <path fill-rule="evenodd" clip-rule="evenodd" d="M9.72474 7.63477L4.19635 2.53164L6.13958 0.73789L13.6112 7.63477L6.13958 14.5316L4.19635 12.7379L9.72474 7.63477Z" fill="currentColor"/>
  <path d="M4.19635 2.53164L1.99194 0.496801L-0.212467 2.53164L1.99194 4.56648L4.19635 2.53164ZM9.72474 7.63477L11.9291 9.66961L14.1336 7.63477L11.9291 5.59992L9.72474 7.63477ZM6.13958 0.73789L8.34399 -1.29695L6.13958 -3.33179L3.93517 -1.29695L6.13958 0.73789ZM13.6112 7.63477L15.8156 9.66961L18.02 7.63477L15.8156 5.59993L13.6112 7.63477ZM6.13958 14.5316L3.93517 16.5665L6.13958 18.6013L8.34399 16.5665L6.13958 14.5316ZM4.19635 12.7379L1.99194 10.703L-0.212467 12.7379L1.99194 14.7727L4.19635 12.7379ZM1.99194 4.56648L7.52033 9.66961L11.9291 5.59992L6.40076 0.4968L1.99194 4.56648ZM3.93517 -1.29695L1.99194 0.496801L6.40076 4.56648L8.34399 2.77273L3.93517 -1.29695ZM1.99194 14.7727L3.93517 16.5665L8.34399 12.4968L6.40076 10.703L1.99194 14.7727ZM7.52033 5.59993L1.99194 10.703L6.40076 14.7727L11.9291 9.66961L7.52033 5.59993ZM15.8156 5.59993L8.34399 -1.29695L3.93517 2.77273L11.4068 9.66961L15.8156 5.59993ZM8.34399 16.5665L15.8156 9.66961L11.4068 5.59993L3.93517 12.4968L8.34399 16.5665Z"
        fill="currentColor" mask="url(#${mid})"/>
</svg>`
  }

  // registry para popstate (si hay varios bloques)
  window.__zenb_pr_instances = window.__zenb_pr_instances || []
  if (!window.__zenb_pr_popstate_bound) {
    window.__zenb_pr_popstate_bound = true
    window.addEventListener('popstate', () => {
      ;(window.__zenb_pr_instances || []).forEach(fn => {
        try { fn() } catch (e) {}
      })
    })
  }

  blocks.forEach(root => {
    const endpoint = root.dataset.endpoint
    const perPage = parseInt(root.dataset.perPage || '10', 10)
    const listEl = root.querySelector('[data-pr-list]')
    const pagEl = root.querySelector('[data-pr-pagination]')
    const tabs = root.querySelectorAll('.pr-tab')

    const searchInp = root.querySelector('[data-pr-search]')

    const dd = root.querySelector('[data-pr-dropdown]')
    const ddBtn = root.querySelector('[data-pr-dd-trigger]')
    const ddMenu = root.querySelector('[data-pr-dd-menu]')
    const ddLabel = root.querySelector('[data-pr-sort-label]')
    const ddOptions = root.querySelectorAll('[data-pr-sort-option]')

    const labels = {
      date_desc: 'Most recent',
      date_asc: 'Least recent',
      title_asc: 'Title (A–Z)',
      title_desc: 'Title (Z–A)'
    }

    const PARAM = getParamName(root)

    // state inicial: primero dataset (servidor), luego URL como fallback
    const initialFromDom = parseInt(root.dataset.initialPage || '1', 10)
    const initialFromUrl = getUrlPage(PARAM)

    const state = {
      search: '',
      sort: root.dataset.sortDefault || 'date_desc',
      category: '',
      page: Number.isFinite(initialFromDom) && initialFromDom > 0 ? initialFromDom : initialFromUrl,
      per_page: perPage
    }

    ddLabel.textContent = 'Sort by'

    function escapeHtml (s) {
      return (s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))
    }
    function escapeAttr (s) { return escapeHtml(s) }

    async function fetchData () {
      root.classList.add('pr-loading')

      const params = new URLSearchParams({
        page: String(state.page),               // endpoint sigue usando "page"
        per_page: String(state.per_page),
        sort: state.sort
      })
      if (state.search) params.set('search', state.search)
      if (state.category) params.set('category', state.category)

      const res = await fetch(`${endpoint}?${params.toString()}`, { credentials: 'same-origin' })
      root.classList.remove('pr-loading')

      if (!res.ok) {
        listEl.innerHTML = `<div class="pr-empty">Error loading items</div>`
        pagEl.innerHTML = ''
        return
      }

      const data = await res.json()

      // si URL trae un page_num demasiado alto, normalizamos
      const totalPages = parseInt(data.total_pages || '1', 10) || 1
      if (state.page > totalPages && totalPages >= 1) {
        state.page = totalPages
        setUrlPage(PARAM, state.page, { replace: true })
        return fetchData()
      }

      renderList(data.items || [])
      renderPagination(data.page, totalPages)
    }

    function renderList (items) {
      if (!items.length) {
        listEl.innerHTML = `<div class="pr-empty">No results</div>`
        return
      }
      listEl.innerHTML = items.map(item => {
        const img = item.image || 'https://placehold.co/270x140.png'
        const cat = item.category || ''
        const title = item.title || ''
        const url = item.link || '#'
        return `
          <div class="newsroom-pr-tile">
            <img class="newsroom-pr-tile-image" loading="lazy" alt="" src="${escapeAttr(img)}" />
            <div class="newsroom-pr-content-wrapper">
              <div class="newsroom-pr-content">
                <div class="newsroom-pr-tile-eyebrow">${escapeHtml(cat)}</div>
                <a class="newsroom-pr-tile-header-link w-inline-block" href="${escapeAttr(url)}">
                  <h3 class="newsroom-pr-tile-header">${escapeHtml(title)}</h3>
                </a>
              </div>
              <a class="read-more-link-block newsroom-pr-tile-read-more-btn w-inline-block" href="${escapeAttr(url)}">
                <div class="read-more-text-block">Read More</div>
                <img class="read-more-arrow" alt="" loading="lazy"
                     src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='black' d='M4 2l4 4-4 4'/%3E%3C/svg%3E"/>
              </a>
            </div>
          </div>
        `
      }).join('')
    }

    function renderPagination (page, totalPages) {
      if (!totalPages || totalPages <= 1) {
        pagEl.innerHTML = ''
        return
      }

      const parts = []

      const addBtn = (p, current = false) => {
        const href = buildPageHref(PARAM, p)
        parts.push(
          `<a href="${escapeAttr(href)}" class="pagination-button pagination-button-numbers"
              data-pr-page="${p}" ${current ? 'aria-current="page"' : ''}>${p}</a>`
        )
      }

      const addDots = () => parts.push(`<span class="pagination-button pagination-button-dots">…</span>`)

      // PREV (crawlable href)
      if (page <= 1) {
        parts.push(`
          <a href="#" class="pagination-button pagination-button-prev" aria-disabled="true" aria-label="Previous Page">
            <span class="pagination-arrow-icon is-left">${makePagArrowSvg()}</span>
          </a>
        `)
      } else {
        const href = buildPageHref(PARAM, page - 1)
        parts.push(`
          <a href="${escapeAttr(href)}" class="pagination-button pagination-button-prev"
             data-pr-page="${page - 1}" aria-label="Previous Page">
            <span class="pagination-arrow-icon is-left">${makePagArrowSvg()}</span>
          </a>
        `)
      }

      const maxButtons = 7
      if (totalPages <= maxButtons) {
        for (let i = 1; i <= totalPages; i++) addBtn(i, i === page)
      } else {
        const left = Math.max(2, page - 1)
        const right = Math.min(totalPages - 1, page + 1)
        addBtn(1, page === 1)
        if (left > 2) addDots()
        for (let i = left; i <= right; i++) addBtn(i, i === page)
        if (right < totalPages - 1) addDots()
        addBtn(totalPages, page === totalPages)
      }

      // NEXT (crawlable href)
      if (page >= totalPages) {
        parts.push(`
          <a href="#" class="pagination-button pagination-button-next" aria-disabled="true" aria-label="Next Page">
            <span class="pagination-arrow-icon">${makePagArrowSvg()}</span>
          </a>
        `)
      } else {
        const href = buildPageHref(PARAM, page + 1)
        parts.push(`
          <a href="${escapeAttr(href)}" class="pagination-button pagination-button-next"
             data-pr-page="${page + 1}" aria-label="Next Page">
            <span class="pagination-arrow-icon">${makePagArrowSvg()}</span>
          </a>
        `)
      }

      pagEl.innerHTML = parts.join('')
    }

    // ---- Eventos ----
    if (searchInp) {
      searchInp.addEventListener('input', debounce(() => {
        state.search = searchInp.value.trim()
        state.page = 1
        setUrlPage(PARAM, 1, { replace: true })
        fetchData()
      }, 350))
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', e => {
        e.preventDefault()
        tabs.forEach(t => t.classList.remove('is-active'))
        tab.classList.add('is-active')
        state.category = tab.dataset.prCat || ''
        state.page = 1
        setUrlPage(PARAM, 1, { replace: true })
        fetchData()
      })
    })

    // Paginación (AJAX + actualizar URL, pero permitir ctrl/cmd-click para abrir)
    pagEl.addEventListener('click', e => {
      const a = e.target.closest('[data-pr-page]')
      if (!a) return

      // permitir abrir en nueva pestaña con ctrl/cmd/shift
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      e.preventDefault()
      if (a.hasAttribute('aria-disabled')) return

      const p = parseInt(a.getAttribute('data-pr-page'), 10)
      if (!isNaN(p) && p >= 1) {
        state.page = p
        setUrlPage(PARAM, p) // pushState
        fetchData()
      }
    })

    // Dropdown Sort
    const setSortLabel = () => { ddLabel.textContent = labels[state.sort] || 'Sort by' }

    function openDd () {
      dd.classList.add('is-open')
      dd.setAttribute('aria-expanded', 'true')
      ddBtn.setAttribute('aria-expanded', 'true')
    }
    function closeDd () {
      dd.classList.remove('is-open')
      dd.removeAttribute('aria-expanded')
      ddBtn.setAttribute('aria-expanded', 'false')
    }

    ddBtn.addEventListener('click', () => {
      if (dd.classList.contains('is-open')) closeDd()
      else openDd()
    })
    document.addEventListener('click', e => { if (!dd.contains(e.target)) closeDd() })
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDd() })

    ddOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.getAttribute('data-sort')
        if (!val) return
        state.sort = val
        state.page = 1
        setUrlPage(PARAM, 1, { replace: true })
        setSortLabel()
        closeDd()
        fetchData()
      })
    })

    // popstate: back/forward => leer page_num del URL y recargar
    const onPop = () => {
      const p = getUrlPage(PARAM)
      if (p !== state.page) {
        state.page = p
        fetchData()
      }
    }
    window.__zenb_pr_instances.push(onPop)

    // Init: normaliza URL (si viene page_num=1 lo limpia)
    setSortLabel()
    setUrlPage(PARAM, state.page, { replace: true })
    fetchData()
  })
})()
