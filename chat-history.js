/**
 * Format:
 * [
 *      {
 *          "role": "user",
 *          "content": "hello"
 *      },
 *      {
 *          "role": "assistant",
 *          "content": "Hi there!"
 *      }
 * ]
 */
window.chat_history = [
  {
    role: "user",
    content: `The current date is: ${new Date()} \n The user's browser useragent is: ${navigator.userAgent}`,
  },
];

const historyContainer = document.getElementById("history");
const chatScroll = document.getElementById("chat-scroll");

function scrollToBottom() {
  try {
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
  } catch (e) {}
}

// Helper: create a DOM entry for a history item (user or assistant)
function createEntry(item, idx) {
  const entry = document.createElement("div");
  entry.classList.add("history", item.role);

  const contentDiv = document.createElement("div");
  contentDiv.classList.add("history-content");
  try {
    contentDiv.innerHTML = markdown.render(item.content || "");
  } catch (e) {
    contentDiv.innerText = item.content || "";
  }

  entry.appendChild(contentDiv);

  // compact controls next to each bubble: Edit (opens inline editor)
  const controls = document.createElement("div");
  controls.classList.add("history-controls");
  controls.style.marginTop = "6px";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.innerText = "Edit";
  editBtn.addEventListener("click", () => startInlineEdit(idx, entry, contentDiv));
  controls.appendChild(editBtn);

  entry.appendChild(controls);
  return entry;
}

function renderFullHistory() {
  historyContainer.innerHTML = "";
  window.chat_history.forEach((item, idx) => {
    const el = createEntry(item, idx);
    historyContainer.appendChild(el);
  });
  scrollToBottom();
}

window.addQuestion = (itemText) => {
  window.chat_history.push({ role: "user", content: itemText });
  const newEl = createEntry({ role: "user", content: itemText }, window.chat_history.length - 1);
  historyContainer.appendChild(newEl);
  scrollToBottom();
};

window.addResponse = (itemText, opts = {}) => {
  const append = opts.append === true;

  if (append) {
    // find last assistant in history array
    let lastIdx = -1;
    for (let i = window.chat_history.length - 1; i >= 0; i--) {
      if (window.chat_history[i].role === "assistant") {
        lastIdx = i;
        break;
      }
    }

    if (lastIdx !== -1) {
      // append raw markdown to the model data
      window.chat_history[lastIdx].content = (window.chat_history[lastIdx].content || "") + itemText;

      // re-render the full markdown for the last assistant DOM element (avoid concatenating rendered HTML)
      const assistantEls = historyContainer.querySelectorAll('.assistant');
      const el = assistantEls[assistantEls.length - 1];
      if (el) {
        try {
          el.innerHTML = markdown.render(window.chat_history[lastIdx].content || "");
        } catch (e) {
          el.innerText = window.chat_history[lastIdx].content || "";
        }
        scrollToBottom();
        return;
      }
    }
    // fallback to creating a new message if no assistant found
  }

  // default behavior: create a new assistant message
  window.chat_history.push({ role: "assistant", content: itemText });
  const newEl = createEntry({ role: "assistant", content: itemText }, window.chat_history.length - 1);
  historyContainer.appendChild(newEl);
  scrollToBottom();
};

// Inline edit feature: replace the content div with a textarea and compact controls (Save, Cancel, Fork)
function startInlineEdit(index, entryEl, contentDiv) {
  // If an editor already exists, do nothing
  if (entryEl.querySelector('textarea')) return;

  const original = window.chat_history[index]?.content || "";

  // Create textarea with existing markdown
  const ta = document.createElement('textarea');
  ta.rows = 6;
  ta.style.width = '100%';
  ta.value = original;

  // compact control buttons (editor-specific)
  const btnBar = document.createElement('div');
  btnBar.classList.add('inline-editor-controls');
  btnBar.style.display = 'inline-flex';
  btnBar.style.gap = '8px';
  btnBar.style.marginTop = '6px';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.innerText = 'Save';
  saveBtn.addEventListener('click', () => {
    window.chat_history[index].content = ta.value;
    // re-render content
    try {
      contentDiv.innerHTML = markdown.render(ta.value);
    } catch (e) {
      contentDiv.innerText = ta.value;
    }
    // remove editor elements and keep controls
    cleanupEditor();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.innerText = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    // restore original render
    try {
      contentDiv.innerHTML = markdown.render(original);
    } catch (e) {
      contentDiv.innerText = original;
    }
    cleanupEditor();
  });

  const forkBtn = document.createElement('button');
  forkBtn.type = 'button';
  forkBtn.innerText = 'Fork';
  forkBtn.addEventListener('click', () => {
    // create a fork with current history and settings (including the in-progress edit value)
    const cloned = JSON.parse(JSON.stringify(window.chat_history));
    cloned[index].content = ta.value;
    createForkFromPayload({ chat_history: cloned, ip: document.getElementById('ip-address')?.value || '', model: document.getElementById('model-name')?.value || '' });
  });

  btnBar.appendChild(saveBtn);
  btnBar.appendChild(cancelBtn);
  btnBar.appendChild(forkBtn);

  // hide the original controls while editing
  const originalControls = entryEl.querySelector('.history-controls');
  if (originalControls) originalControls.style.display = 'none';

  // replace contentDiv with textarea and btnBar visually
  contentDiv.innerHTML = '';
  contentDiv.appendChild(ta);
  contentDiv.appendChild(btnBar);

  // focus the textarea
  ta.focus();

  function cleanupEditor() {
    // remove textarea and editor buttons, then restore original controls
    const taIn = entryEl.querySelector('textarea');
    if (taIn && taIn.parentNode) taIn.parentNode.removeChild(taIn);
    const editorBar = entryEl.querySelector('.inline-editor-controls');
    if (editorBar && editorBar.parentNode) editorBar.parentNode.removeChild(editorBar);
    const originalControls = entryEl.querySelector('.history-controls');
    if (originalControls) originalControls.style.display = '';
    // contentDiv already contains the rendered content (set by caller)
  }
}

// Create a fork URL fragment and open in a new tab
function createForkFromPayload(payload) {
  try {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const url = `${location.pathname}${location.search}#chat=${encoded}`;
    window.open(url, '_blank');
  } catch (e) {
    alert('Failed to create fork: ' + e.message);
  }
}

// On load: if hash contains chat payload, load it
function loadFromFragment() {
  try {
    if (!location.hash) return;
    const m = location.hash.match(/chat=(.*)/);
    if (!m) return;
    const decoded = decodeURIComponent(m[1]);
    const payload = JSON.parse(decoded);
    if (payload?.chat_history) {
      window.chat_history = payload.chat_history;
      // optionally set ip/model inputs
      if (payload.ip) document.getElementById('ip-address').value = payload.ip;
      if (payload.model) document.getElementById('model-name').value = payload.model;
      renderFullHistory();
    }
  } catch (e) {
    console.error('Failed to load chat from fragment', e);
  }
}

// initial render/load
loadFromFragment();
renderFullHistory();
