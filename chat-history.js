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
const chatContainer = document.getElementById("chat-container");

function scrollToBottom() {
  try {
    if (!chatContainer) return;
    // Prefer scrolling the last message into view so that it is not hidden
    const last = historyContainer.lastElementChild;
    if (last) {
      // Use scrollIntoView with block 'end' to position message above fixed form
      last.scrollIntoView({ behavior: 'auto', block: 'end', inline: 'nearest' });
      // Also ensure container is scrolled to bottom as a fallback
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
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

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.innerText = "🖉"; // pencil icon
  editBtn.title = "Edit";
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
        // Find the content div and update only that, preserving controls
        const contentDiv = el.querySelector('.history-content');
        if (contentDiv) {
          try {
            contentDiv.innerHTML = markdown.render(window.chat_history[lastIdx].content || "");
          } catch (e) {
            contentDiv.innerText = window.chat_history[lastIdx].content || "";
          }
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

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.innerText = '🗹';
  saveBtn.title = 'Save';
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
  cancelBtn.innerText = '🗷';
  cancelBtn.title = 'Cancel';
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
  forkBtn.innerText = '⎇';//'⅄';
  forkBtn.title = 'Fork';
  forkBtn.addEventListener('click', () => {
    // create a fork with the history up through this message (inclusive),
    // and include the in-progress edit value. This slices off any messages after this bubble.
    const cloned = JSON.parse(JSON.stringify(window.chat_history.slice(0, index + 1)));
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
    // Prefer compact JSON-url encoding if available, otherwise fallback to JSON
    let encoded;
    if (window.JsonURL && typeof window.JsonURL.stringify === 'function') {
      encoded = encodeURIComponent(window.JsonURL.stringify(payload));
    } else {
      encoded = encodeURIComponent(JSON.stringify(payload));
    }
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
    let payload;
    if (window.JsonURL && typeof window.JsonURL.parse === 'function') {
      try {
        payload = window.JsonURL.parse(decoded);
      } catch (e) {
        // fall back to JSON.parse
        payload = JSON.parse(decoded);
      }
    } else {
      payload = JSON.parse(decoded);
    }
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

// Export chat history (and current settings) as JSON file
function exportChatJSON() {
  try {
    const payload = {
      chat_history: window.chat_history,
      ip: document.getElementById('ip-address')?.value || '',
      model: document.getElementById('model-name')?.value || '',
      exported_at: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Failed to export chat: ' + e.message);
  }
}

// Import chat history from a JSON file. This replaces the current chat history.
function importChatJSONFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const text = ev.target.result;
      const payload = JSON.parse(text);
      if (!payload || !payload.chat_history) {
        alert('Invalid chat file: missing chat_history');
        return;
      }
      // Replace chat history and optionally restore ip/model
      window.chat_history = payload.chat_history;
      if (payload.ip) document.getElementById('ip-address').value = payload.ip;
      if (payload.model) document.getElementById('model-name').value = payload.model;
      renderFullHistory();
    } catch (e) {
      alert('Failed to import chat: ' + e.message);
    }
  };
  reader.onerror = function () {
    alert('Failed to read file');
  };
  reader.readAsText(file);
}

// Wire up export/import UI if present
const exportBtn = document.getElementById('export-button');
if (exportBtn) exportBtn.addEventListener('click', exportChatJSON);

const importBtn = document.getElementById('import-button');
const importFileInput = document.getElementById('import-file');
if (importBtn && importFileInput) {
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) importChatJSONFile(f);
    // clear selection so same file can be re-imported if needed
    importFileInput.value = null;
  });
}

// Render chat history on page load
document.addEventListener('DOMContentLoaded', () => {
  loadFromFragment();
  //renderFullHistory(); already done in loadFromFragment
});

