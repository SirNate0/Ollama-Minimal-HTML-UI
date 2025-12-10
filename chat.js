// Shared state for current streaming request so we can abort it
let currentController = null;

const submitButton = document.getElementById("submit-button");
const continueButton = document.getElementById("continue-button");
const stopButton = document.getElementById("stop-button");
// We'll no longer use the separate `current-response` bubble for streaming.
const responseContainer = document.getElementById("current-response");
const errorContainer = document.getElementById("error-container");
// `historyContainer` and `chatScroll` are defined in `chat-history.js` and
// must not be redeclared here. We reference them below.

async function doChat({ addUser = false } = {}) {
  const ipAddress = document.getElementById("ip-address").value.trim();
  const modelName = document.getElementById("model-name").value.trim();
  const promptEl = document.querySelector("#question-form textarea");

  errorContainer.innerText = null;

  // Validate that the server IP and model are present. If not, show error and abort.
  if (!ipAddress || !modelName) {
    errorContainer.innerText = "Please set both the server IP and model before generating.";
    // ensure buttons reflect valid state
    updateControlsState();
    return;
  }

  submitButton.disabled = true;
  continueButton.disabled = true;
  stopButton.disabled = false;

  if (addUser) {
    const prompt = promptEl.value;
    window.addQuestion(prompt);
  }

  // prepare controller and the assistant placeholder
  let answer = "";
  currentController = new AbortController();
  let assistantIndex = -1;
  let assistantEl = null;

  // If addUser is true, window.addQuestion already pushed the user message.
  // Create or reuse the last assistant entry as a streaming placeholder.
  if (addUser) {
    // create a placeholder assistant entry in the history array and DOM
    assistantIndex = window.chat_history.length;
    window.chat_history.push({ role: "assistant", content: "" });

    assistantEl = document.createElement("div");
    assistantEl.classList.add("history", "assistant");
    assistantEl.innerHTML = "";
    historyContainer.appendChild(assistantEl);
  } else {
    // continue: find last assistant in history; if none, create one
    for (let i = window.chat_history.length - 1; i >= 0; i--) {
      if (window.chat_history[i].role === "assistant") {
        assistantIndex = i;
        break;
      }
    }

    if (assistantIndex === -1) {
      assistantIndex = window.chat_history.length;
      window.chat_history.push({ role: "assistant", content: "" });
      assistantEl = document.createElement("div");
      assistantEl.classList.add("history", "assistant");
      assistantEl.innerHTML = "";
      historyContainer.appendChild(assistantEl);
    } else {
      // find the corresponding DOM element (last .assistant)
      const els = historyContainer.querySelectorAll('.assistant');
      assistantEl = els[els.length - 1];
    }
  }

  // Initialize the streaming buffer `answer` with any existing assistant content
  if (assistantIndex !== -1) {
    answer = window.chat_history[assistantIndex].content || "";
    try {
      // ensure the DOM reflects existing content before appending
      if (assistantEl) assistantEl.innerHTML = markdown.render(answer);
    } catch (e) {
      if (assistantEl) assistantEl.innerText = answer;
    }
  }

  // Ensure the new/updated assistant element is visible
  try {
    if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
  } catch (e) {}

  let aborted = false;

  try {
    const res = await fetch(`${ipAddress}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelName, date: Date.now(), messages: window.chat_history }),
      signal: currentController.signal,
    });

    if (!res.ok) throw new Error("Network response was not ok");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulatedData = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      accumulatedData += decoder.decode(value, { stream: true });

      try {
        const jsonChunks = accumulatedData.split("\n");

        for (const chunk of jsonChunks) {
          if (chunk.trim()) {
            const jsonChunk = JSON.parse(chunk);
            const content = jsonChunk?.message?.content ?? jsonChunk?.text ?? "";
            // Append raw markdown content to `answer` (no HTML concatenation)
            answer += content;
          }
        }

        accumulatedData = "";
      } catch (e) {
        // If parsing fails, wait for more data
      }

      // Update the assistant placeholder's raw content in the chat history and re-render markdown
      if (assistantIndex !== -1) {
        window.chat_history[assistantIndex].content = answer;
        try {
          assistantEl.innerHTML = markdown.render(answer);
        } catch (e) {
          assistantEl.innerText = answer;
        }
      } else {
        // Fallback: show in responseContainer
        responseContainer.innerHTML = markdown.render(answer);
      }

      // Keep scroll at bottom while streaming
      try {
        if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
      } catch (e) {}
    }
  } catch (error) {
    if (error.name === "AbortError") {
      aborted = true;
      errorContainer.innerText = "Generation stopped.";
    } else {
      console.error(error);
      errorContainer.innerText = "Error while generating: " + error?.message;
    }
  } finally {
    // cleanup
    currentController = null;
    submitButton.disabled = false;
    continueButton.disabled = false;
    stopButton.disabled = true;

    // If nothing produced and not aborted, remove the placeholder
    if ((!answer || answer.trim().length === 0) && !aborted) {
      if (assistantIndex !== -1) {
        // remove from model data and DOM
        window.chat_history.splice(assistantIndex, 1);
        if (assistantEl && assistantEl.parentNode) assistantEl.parentNode.removeChild(assistantEl);
      }
    }

    // clear the live response container if used
    if (responseContainer) responseContainer.innerHTML = null;
  }
}

// Wire up form submit to send user prompt and start streaming
document.getElementById("question-form").addEventListener("submit", (e) => {
  e.preventDefault();
  doChat({ addUser: true });
});

// Continue button: request the model to continue (no new user message)
continueButton.addEventListener("click", (e) => {
  e.preventDefault();
  doChat({ addUser: false });
});

// Stop button: abort current streaming request
stopButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (currentController) {
    currentController.abort();
  }
});

// initial state
stopButton.disabled = true;

// Enable/disable Submit and Continue based on whether IP and model are set
function updateControlsState() {
  const ip = document.getElementById('ip-address').value.trim();
  const model = document.getElementById('model-name').value.trim();
  const enabled = Boolean(ip && model);
  // Only enable submit/continue when not currently streaming (stopButton indicates streaming)
  if (stopButton && !stopButton.disabled) {
    // streaming in progress, keep submit/continue disabled
    submitButton.disabled = true;
    continueButton.disabled = true;
  } else {
    submitButton.disabled = !enabled;
    continueButton.disabled = !enabled;
  }
}

// Initialize control state on load
updateControlsState();
