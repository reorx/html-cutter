const QS = document.querySelector.bind(document)
const QSA = document.querySelectorAll.bind(document)
const STORAGE_KEYS = ['settings']
const S_KEY = {
  // global settings
  defaultFormat: "defaultFormat",
  // site settings
  alwaysUseCanonicalUrl: "canonicalUrl",
  urlParams: "urlParams",
}


/* Class definition */

class App {
  constructor() {
    this.data = {
      selectionText: null,
      selectionHTML: null,
    }
    this.settings = {}

    /* Elements */

    this.elHTML = QS('#d-html')
    this.elHTMLCode = QS('#d-html-code')
    this.elText = QS('#d-text')

    /* UI */
    new TabSwitcher('.tabs')
  }

  handleTab(tab) {
    const url = tab.url || tab.pendingUrl;
    if (!url) {
      return;
    }
    // ignore chrome internal urls (chrome://...)
    if (url.startsWith('chrome')) {
      return;
    }

    const self = this
    this.domain = new URL(url).hostname
    this.data.url = url
    this.data.title = tab.title.trim()

    let canExecuteScript = true;
    if (url.startsWith('https://chrome.google.com/webstore')) {
      canExecuteScript = false;
    }

    if (canExecuteScript) {
      // promise
      chrome.scripting.executeScript(
        {
          target: {tabId: tab.id},
          func: executeInTab,
        },
        (results) => {
          console.log('results', results);
          const data = results[0].result
          if (data) {
            this.data.selectionText = data.selectionText
            this.data.selectionHTML = data.selectionHTML
          }

          self.render();
        });
    } else {
      self.render();
    }
  }

  render() {
    this.renderData()
  }

  renderData() {
    this.elHTML.innerHTML = this.data.selectionHTML
    cleanDescendantsAttributes(this.elHTML)
    this.elHTMLCode.innerText = this.elHTML.innerHTML
    this.elText.innerText = this.data.selectionText
  }

  /* Actions */

  copyRef() {
    this.elRef.select();
    document.execCommand('copy');
  }

  copyURL() {
    this.elUrl.select()
    document.execCommand('copy')
  }

  copyRefAsHTML() {
    const link = this.createLinkElement()
    if (!link) {
      return
    }
    const mark = wrapMarkForEl(link);
    document.body.appendChild(mark);
    copyEl(mark);
  }

  /* Storage */

  loadSettings() {
    const self = this
    return chrome.storage.sync.get(STORAGE_KEYS).then((data) => {
      console.log('loadSettings', JSON.stringify(data))
      if (data.settings)
        self.settings = data.settings
    })
  }

  saveSettings(data) {
    // loop key value in data
    for (const key in data) {
      this.settings[key] = data[key]
    }
    console.log('save settings', this.settings)

    return chrome.storage.sync.set({
      settings: this.settings,
    })
  }
}


/* Main execution */

const app = new App()

app.loadSettings().then(() => {
  chrome.tabs.query({active: true, currentWindow: true}).then((tabs) => {
    const tab = tabs[0];
    app.handleTab(tab)
  });
})

/* Functions */

const executeInTab = function() {
  const sel = window.getSelection()

  if (sel.type === 'Range') {
    const data = {}
    // get selection as text
    data.selectionText = sel.toString()

    // get selection as HTML
    const range = sel.getRangeAt(0)
    if (range) {
      const div = document.createElement('div')
      div.appendChild(range.cloneContents())
      data.selectionHTML = div.innerHTML
      div.remove()
    }
    return data
  }

  // enable element selector
  const hoverFrameId = 'html-cutter-hover-frame'
  const getPointerEl = (e) => {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    if (!els || els.length === 0) {
      return
    }
    // console.log('els', els.map(el => el.outerHTML));
    return els[0]
  }
  const clearHoverFrame = () => {
    const existingFrame = document.getElementById(hoverFrameId);
    if (existingFrame) {
      existingFrame.remove();
    }
  }
  const mouseoverListener = (e) => {
    // console.log(e);
    const el = getPointerEl(e)
    if (!el) return

    // Remove any existing frame element
    clearHoverFrame()

    // Create a new frame element
    const frame = document.createElement('div');
    frame.id = hoverFrameId;
    frame.style.position = 'absolute';
    frame.style.pointerEvents = 'none'; // Ensure it doesn't interfere with mouse events
    frame.style.border = '2px solid red';
    frame.style.boxSizing = 'border-box';

    // Calculate and set the position and size of the frame
    const rect = el.getBoundingClientRect();
    frame.style.left = `${rect.left + window.scrollX}px`;
    frame.style.top = `${rect.top + window.scrollY}px`;
    frame.style.width = `${rect.width}px`;
    frame.style.height = `${rect.height}px`;

    // Append the frame to the body
    document.body.appendChild(frame);
  }
  document.addEventListener('mouseover', mouseoverListener)
  const clickListener = (e) => {
    const el = getPointerEl(e)
    console.log('get final el', el)
    showDialogWithElement(el)

    clearHoverFrame()
    document.removeEventListener('click', clickListener)
    document.removeEventListener('mouseover', mouseoverListener)
  }
  document.addEventListener('click', clickListener)

  const showDialogWithElement = (el) => {
    // Create the dialog element
    const dialog = document.createElement('dialog');
    dialog.style.position = 'fixed';
    dialog.style.top = '10vh';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, 0)';
    dialog.style.width = '80vw';
    dialog.style.height = '80vh';
    dialog.style.padding = '0';
    dialog.style.border = 'none';
    dialog.style.zIndex = '10000';
    dialog.style.padding = '16px';
    dialog.style.overflowY = 'auto';

    const container = document.createElement('div');
    dialog.appendChild(container)

    // Create the backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Gray backdrop
    backdrop.style.zIndex = '9999';

    // Create a shadow root in the dialog
    const shadowRoot = container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');

    // Add CSS to the style element
    style.textContent = `
      /* prevent img with large width attribute from overflowing */
      img {
        max-width: 100%;
        width: auto;
        height: auto;
      }
    `;
    shadowRoot.appendChild(style);

    // Clone the provided element and append it to the shadow root
    const clonedElement = el.cloneNode(true);
    shadowRoot.appendChild(clonedElement);

    // Append dialog and backdrop to the body
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);

    // Show the dialog
    dialog.showModal();

    // When dialog is closed, remove it and the backdrop from the DOM
    dialog.addEventListener('close', () => {
      dialog.remove();
      backdrop.remove();
    });

    // Clicking the backdrop closes the dialog
    backdrop.addEventListener('click', () => {
      dialog.close();
    });
  }
}

const uselessAttributes = ['class', 'id', 'style']

const cleanDescendantsAttributes = function(parent) {
  parent.querySelectorAll('*').forEach(el => {
    for (const attr of el.attributes) {
      if (uselessAttributes.includes(attr.name) || attr.name.startsWith('data-')) {
        el.removeAttribute(attr.name)
      }
    }
  })
}


const createElement = function(tagName, className, text, attrs) {
  const el = document.createElement(tagName)
  if (className)
    el.className = className
  if (text)
    el.textContent = text
  if (attrs) {
    for (const key in attrs) {
      el.setAttribute(key, attrs[key])
    }
  }
  return el
}

const wrapMarkForEl = function(el) {
  const mark = document.createElement("div");
  // Reset box model
  mark.style.border = "0";
  mark.style.padding = "0";
  mark.style.margin = "0";
  // Move element out of screen
  mark.style.position = "fixed";
  mark.style["right"] = "-9999px";
  mark.style.top =
    (window.pageYOffset || document.documentElement.scrollTop) + "px";
  // more hiding
  mark.setAttribute("readonly", "");
  mark.style.opacity = 0;
  mark.style.pointerEvents = "none";
  mark.style.zIndex = -1;
  mark.setAttribute("tabindex", "0"); // so it can be focused
  //mark.innerHTML = html;
  mark.appendChild(el);
  return mark;
}

const wrapMarkForElNoHide = function(el) {
  const mark = document.createElement("div");
  mark.appendChild(el);
  return mark;
}

const createLink = function(title, url) {
  const a = document.createElement("a");
  a.textContent = title;
  a.href = url;
  return a;
}

const copyEl = function(el) {
  range = document.createRange();
  selection = document.getSelection();
  range.selectNode(el);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("copy");
}
