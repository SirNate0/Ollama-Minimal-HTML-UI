/**
 * Gets the models from the server and replaces the input box with it if selecting one.
 */
const sourceInput = document.getElementById("ip-address");
// const modelDropdown = document.getElementById("model-dropdown");
const modelInput = document.getElementById("model-name");

// Wire up form submit to refresh model list
document.getElementById("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  queryAndBuild();
});

/**
 * Makes the options from the query
 */
const buildSelectOptions = (modelsArray) => {
  const newOptionsHtml = modelsArray.map((model) => {
    const newOption = document.createElement("option");
    newOption.value = model.model;
    newOption.innerText = `${model.name} (${model.details.parameter_size})`;
    return newOption;
  });
  modelInput.replaceChildren(...newOptionsHtml);
  updateControlsState();
};

/**
 * Queries for models and builds them if we find them.
 */
const queryAndBuild = async () => {
  const ipAddress = sourceInput.value;

  const response = await fetch(`${ipAddress}/api/tags`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const invalid = "No model";
    if (modelInput.value != invalid) {
      const newOption = document.createElement("option");
      newOption.innerText = "--No models--";
      newOption.value = invalid
      newOption.disabled = true;
      modelInput.replaceChildren(newOption)
      modelInput.value = invalid
    }
    return;
  }

  buildSelectOptions((await response.json()).models);
};

/**
 * Queries for models when the source input (ip) is blurred or when the document is loaded
 */
sourceInput.addEventListener("blur", queryAndBuild);
/**
 * Queries for models when the source input (ip) is blurred or when the document is loaded
 */
document.addEventListener("DOMContentLoaded", queryAndBuild);

// Wire up input listeners to keep controls in sync
document.getElementById('ip-address').addEventListener('input', updateControlsState);
modelInput.addEventListener('input', updateControlsState);

