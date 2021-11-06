// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

const OPENAI_KEY = "OPENAI_KEY";

(function () {
  const vscode = acquireVsCodeApi();

  const oldState = /** @type {{ text: string} | undefined} */ (
    vscode.getState()
  );

  const originalTextContainer = /** @type {HTMLElement} */ (
    document.getElementById("original")
  );
  const responsesContainer = /** @type {HTMLElement} */ (
    document.getElementById("responses")
  );
  console.log("Initial state", oldState);

  let currentText =
    oldState && oldState.text
      ? generateOriginalCode(oldState.text)
      : "No code was selected. Select some code and run the convertor again!";
  originalTextContainer.innerHTML = `${currentText}`;

  //   setInterval(() => {
  //     originalTextContainer.textContent = `${currentText} `;

  //     // Update state
  //     vscode.setState({ text: currentText });
  //   }, 100);

  function generateOriginalCode(/** @type string */ text) {
    return `Javascript: <p /><code>${text}</code>`;
  }
  function generateResponse(/** @type number */ idx, /** @type string */ text) {
    return `Response ${idx}: <p /><code>${text}</code>`;
  }

  async function fetchConvertedCode(/** @type string */ text) {
    const responses = await fetch(
      "https://api.openai.com/v1/engines/davinci-codex/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + OPENAI_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `#JavaScript to Python:\nJavaScript: \n${text}\n\nPython:\n`,
          temperature: 0,
          max_tokens: 64,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      }
    ).then((res) => res.json());

    return responses;
  }

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", async (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.command) {
      case "convert":
        currentText = message.text;
        originalTextContainer.innerHTML = generateOriginalCode(message.text);
        console.log("convert", message.text);
        const convertedCode = await fetchConvertedCode(message.text);
        console.log("convertedCode", convertedCode);
        // clear responses
        responsesContainer.innerHTML = "";
        convertedCode.choices.forEach(
          (
            /** @type {{ text: string} | undefined} */ choice,
            /** @type number */ idx
          ) => {
            // sanitize responses
            const endToken = "#Python to JavaScript:";

            if (choice && choice.text !== "") {
              const newResponse = document.createElement("div");
              newResponse.innerHTML = generateResponse(
                idx,
                choice.text.split(endToken)[0] // basic end token truncation
              );
              responsesContainer.appendChild(newResponse);
            }
          }
        );
        break;
    }
  });
})();
