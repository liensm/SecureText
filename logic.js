
const ioField = document.getElementById("ioField");
const cipherSelect = document.getElementById("cipher");
const shiftInput = document.getElementById("shift");
const railsInput = document.getElementById("rails");
const caesarControls = document.getElementById("caesar");
const railControls = document.getElementById("rail");
const statusEl = document.getElementById("status");

function showStatus(message) {
  statusEl.textContent = message;
}

function normalizeShift(shift) {
  // Since alphabet has 26 letters, we can reduce any shift to the range [0, 25].
  return ((shift % 26) + 26) % 26;
}
// GeeksforGeeks: https://www.geeksforgeeks.org/caesar-cipher-in-cryptography/
function caesarTransform(text, shift) {
  const normalized = normalizeShift(shift);

  return Array.from(text, (char) => {
    const code = char.charCodeAt(0);

    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + normalized) % 26) + 65);
    }

    if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + normalized) % 26) + 97);
    }

    return char;
  }).join("");
}
// GeeksforGeeks: https://www.geeksforgeeks.org/rail-fence-cipher-encryption-decryption/
function railFenceEncrypt(text, rails) {
  const chars = Array.from(text);

  if (rails <= 1 || chars.length <= 1) {
    return text;
  }

  const matrix = Array.from({ length: rails }, () => Array(chars.length).fill("\n"));
  let goingDown = false;
  let row = 0;

  for (let col = 0; col < chars.length; col += 1) {
    if (row === 0 || row === rails - 1) {
      goingDown = !goingDown;
    }

    matrix[row][col] = chars[col];
    row += goingDown ? 1 : -1;
  }

  let result = "";
  for (let r = 0; r < rails; r += 1) {
    for (let c = 0; c < chars.length; c += 1) {
      if (matrix[r][c] !== "\n") {
        result += matrix[r][c];
      }
    }
  }

  return result;
}

function railFenceDecrypt(cipherText, rails) {
  const chars = Array.from(cipherText);

  if (rails <= 1 || chars.length <= 1) {
    return cipherText;
  }

  const matrix = Array.from({ length: rails }, () => Array(chars.length).fill("\n"));
  let goingDown = false;
  let row = 0;

  for (let col = 0; col < chars.length; col += 1) {
    if (row === 0) {
      goingDown = true;
    }
    if (row === rails - 1) {
      goingDown = false;
    }

    matrix[row][col] = "*";
    row += goingDown ? 1 : -1;
  }

  let index = 0;
  for (let r = 0; r < rails; r += 1) {
    for (let c = 0; c < chars.length; c += 1) {
      if (matrix[r][c] === "*" && index < chars.length) {
        matrix[r][c] = chars[index];
        index += 1;
      }
    }
  }

  let result = "";
  row = 0;

  for (let col = 0; col < chars.length; col += 1) {
    if (row === 0) {
      goingDown = true;
    }
    if (row === rails - 1) {
      goingDown = false;
    }

    if (matrix[row][col] !== "*") {
      result += matrix[row][col];
    }

    row += goingDown ? 1 : -1;
  }

  return result;
}

function comboEncrypt(text, shift, rails) {
  return railFenceEncrypt(caesarTransform(text, shift), rails);
}

function comboDecrypt(text, shift, rails) {
  return caesarTransform(railFenceDecrypt(text, rails), -shift);
}

function getCipherLabel(cipher) {
  if (cipher === "caesar") {
    return "Caesar";
  }

  if (cipher === "railfence") {
    return "Rail Fence";
  }

  if (cipher === "combo") {
    return "Caesar Backyard Fence";
  }
}

function hideKeys() {
  if (shiftInput.value !== "") {
    shiftInput.type = "password";
  }

  if (railsInput.value !== "") {
    railsInput.type = "password";
  }
}



function transformText(mode) {
  hideKeys(); // hide keys after use
  const text = ioField.value;
  const cipher = cipherSelect.value;

  if (!text) {
    showStatus("Enter or load text first.");
    return;
  }

  let output = text;
  if (cipher === "caesar") {
    const shift = Number.parseInt(shiftInput.value, 10) || 0;
    if (mode === "encrypt") {
      output = caesarTransform(text, shift);
    } else {
      output = caesarTransform(text, -shift);
    }
  } else if (cipher === "railfence") {
    const rails = Math.max(2, Number.parseInt(railsInput.value, 10) || 2);
    if (mode === "encrypt") {
      output = railFenceEncrypt(text, rails);
    } else {
      output = railFenceDecrypt(text, rails);
    }
  } else if (cipher === "combo") {
    const shift = Number.parseInt(shiftInput.value, 10) || 0;
    const rails = Math.max(2, Number.parseInt(railsInput.value, 10) || 2);
    if (mode === "encrypt") {
      output = comboEncrypt(text, shift, rails);
    } else {
      output = comboDecrypt(text, shift, rails);
    }
  }

  ioField.value = output;

  let actionLabel = "Decrypted";
  if (mode === "encrypt") {
    actionLabel = "Encrypted";
  }

  showStatus(`${actionLabel} using ${getCipherLabel(cipher)}.`);
}

async function withActiveTab(callback) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showStatus("No active tab available.");
    return;
  }

  try {
    await callback(tab.id);
  } catch (error) {
    showStatus("Error retrieving highlighted text from tab.");
  }
}

async function loadHighlightedText() {
  await withActiveTab(async (tabId) => {
    try {
      // Inject content script manually (FIX)
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["textretriever.js"]
      });

      // Now send message
      const response = await chrome.tabs.sendMessage(tabId, { type: "GET_SELECTION" });

      const text = response?.text || "";

      if (!text) {
        showStatus("No highlighted text found.");
        return;
      }

      ioField.value = text;
      showStatus("Loaded highlighted text.");
    } catch (error) {
      showStatus("Error loading highlighted text.");
      console.error(error);
    }
  });
}

async function copyOutput() {
  const text = ioField.value;
  if (!text) {
    showStatus("Nothing to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showStatus("Output copied to clipboard.");
  } catch (error) {
    showStatus("Clipboard copy failed.");
  }
}

function toggleCipherControls() {
  const cipher = cipherSelect.value;
  const showCaesar = cipher === "caesar" || cipher === "combo";
  const showRail = cipher === "railfence" || cipher === "combo";

  caesarControls.classList.toggle("hidden", !showCaesar);
  railControls.classList.toggle("hidden", !showRail);
}

document.getElementById("encrypt").addEventListener("click", () => transformText("encrypt"));
document.getElementById("decrypt").addEventListener("click", () => transformText("decrypt"));
document.getElementById("loadSelection").addEventListener("click", loadHighlightedText);
document.getElementById("copyOutput").addEventListener("click", copyOutput);
cipherSelect.addEventListener("change", toggleCipherControls);

toggleCipherControls();

// Secure Key Handling (show while typing, hide after)
shiftInput.addEventListener("blur", () => {
  if (shiftInput.value !== "") {
    shiftInput.type = "password";
  }
});

railsInput.addEventListener("blur", () => {
  if (railsInput.value !== "") {
    railsInput.type = "password";
  }
});

// Show again when user edits
shiftInput.addEventListener("focus", () => {
  shiftInput.type = "number";
});

railsInput.addEventListener("focus", () => {
  railsInput.type = "number";
});

//  Theme Toggle Feature
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// Moon icon
const moonSVG = `
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#00e5ff">
  <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Z"/>
</svg>
`;

// Sun icon
const sunSVG = `
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#f28638"><path d="M565-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-226.5 56.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"/></svg>   
`;

// Load saved theme
const savedTheme = localStorage.getItem("theme") || "light";

if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeIcon.innerHTML = moonSVG;
} else {
  themeIcon.innerHTML = sunSVG;
}

// Toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  if (isDark) {
    themeIcon.innerHTML = moonSVG;
    localStorage.setItem("theme", "dark");
  } else {
    themeIcon.innerHTML = sunSVG;
    localStorage.setItem("theme", "light");
  }
});
