class TabSwitcher {
  tabsButtonClass = 'tabs-tab'
  tabsButtonActiveClass = 'active'
  tabsBodyClass = 'tabs-body'

  constructor(tabsSelector, defaultTabIndex) {
    const { tabsButtonClass, tabsButtonActiveClass, tabsBodyClass } = this
    if (defaultTabIndex === undefined) defaultTabIndex = 0
    const tabButtons = document.querySelectorAll(`${tabsSelector} .${this.tabsButtonClass}`)
    const tabBodys = document.querySelectorAll('.' + tabsBodyClass)

    const switchTab = function(tabIndex) {
      tabButtons.forEach((el, index) => {
        if (index === tabIndex) {
          el.classList.add(tabsButtonActiveClass)
        } else {
          el.classList.remove(tabsButtonActiveClass)
        }
      })
      tabBodys.forEach((el, index) => {
        if (index === tabIndex) {
          el.style.display = 'block'
        } else {
          el.style.display = 'none'
        }
      })
    }

    tabButtons.forEach((el, index) => {
      el.addEventListener('click', () => {
        switchTab(index)
      })
    })

    switchTab(defaultTabIndex)
  }
}
