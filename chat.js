// Shared state for current streaming request so we can abort it
let currentController = null;

const submitButton = document.getElementById("submit-button");
const continueButton = document.getElementById("continue-button");
const stopButton = document.getElementById("stop-button");
const responseContainer = document.getElementById("current-response");
const errorContainer = document.getElementById("error-container");

async function doChat({ addUser = false } = {}) {
  const ipAddress = document.getElementById("ip-address").value;
  const modelName = document.getElementById("model-name").value;
  const promptEl = document.querySelector("#question-form textarea");

  errorContainer.innerText = null;
  submitButton.disabled = true;
  continueButton.disabled = true;
  stopButton.disabled = false;

  if (addUser) {
    const prompt = promptEl.value;
    window.addQuestion(prompt);
  }

  // reset response area and prepare controller
  responseContainer.innerHTML = "";
  let answer = "";
  currentController = new AbortController();
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
            // Support different shapes: message.content or chunk.text
            const content = jsonChunk?.message?.content ?? jsonChunk?.text ?? "";
            answer += content;
          }
        }

        accumulatedData = "";
      } catch (e) {
        // If parsing fails, wait for more data
      }

      responseContainer.innerHTML = markdown.render(answer);
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

    // If we have any text produced, add as assistant message (partial or full)
    if (answer && answer.trim().length > 0) {
      window.addResponse(answer, { append: !addUser });
    } else if (!aborted) {
      // nothing produced and not aborted -> do nothing
    }

    // clear the live response area (the appended history holds the rendered result)
    responseContainer.innerHTML = null;
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
