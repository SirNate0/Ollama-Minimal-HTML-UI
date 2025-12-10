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

window.addQuestion = (itemText) => {
  window.chat_history.push({ role: "user", content: itemText });
  const newDiv = document.createElement("div");
  newDiv.classList.add("history", "user");
  try {
    newDiv.innerHTML = markdown.render(itemText);
  } catch (e) {
    newDiv.innerText = itemText;
  }
  historyContainer.appendChild(newDiv);
  scrollToBottom();
};

/**
 * Add an assistant response. Options:
 *   opts.append: boolean - if true, append text to the last assistant message instead of creating a new one
 */
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
      // append to the model data
      window.chat_history[lastIdx].content = (window.chat_history[lastIdx].content || "") + itemText;

      // append to the last assistant DOM element
      const assistantEls = historyContainer.querySelectorAll('.assistant');
      const el = assistantEls[assistantEls.length - 1];
      if (el) {
        try {
          el.innerHTML = (el.innerHTML || "") + markdown.render(itemText);
        } catch (e) {
          el.innerText = (el.innerText || "") + itemText;
        }
        scrollToBottom();
        return;
      }
    }
    // fallback to creating a new message if no assistant found
  }

  // default behavior: create a new assistant message
  window.chat_history.push({ role: "assistant", content: itemText });
  const newDiv = document.createElement("div");
  newDiv.classList.add("history", "assistant");
  try {
    newDiv.innerHTML = markdown.render(itemText);
  } catch (e) {
    newDiv.innerText = itemText;
  }
  historyContainer.appendChild(newDiv);
  scrollToBottom();
};

// initial scroll
scrollToBottom();
