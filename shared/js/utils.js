/**
 * PulseForge — shared utility helpers.
 * Loaded on every page before any page-specific script.
 */

/**
 * Copies a string to the clipboard, with a legacy fallback for browsers/
 * contexts where navigator.clipboard is unavailable.
 * @param {string} text
 * @returns {Promise<boolean>} whether the copy succeeded
 */
async function pfCopyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // fall through to legacy method
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Shows a transient, non-blocking toast message at the bottom of the screen.
 * Reuses a single toast element across calls.
 * @param {string} message
 */
let pfToastTimer = null;
function pfShowToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(pfToastTimer);
  pfToastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

/**
 * Wires the navbar's mobile menu toggle button. Shared across every page so
 * the behavior only needs to be written once.
 */
function pfInitMobileNav() {
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const mobileNav = document.querySelector("[data-mobile-nav]");
  if (!menuToggle || !mobileNav) return;

  menuToggle.addEventListener("click", () => {
    const isOpen = !mobileNav.hidden;
    mobileNav.hidden = isOpen;
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
  });
}

/**
 * Debounces a function so it only runs after `wait` ms of inactivity.
 * @param {Function} fn
 * @param {number} wait
 */
function pfDebounce(fn, wait = 150) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Wires a "copy" button to copy the given text/getter and show feedback.
 * @param {HTMLElement} button
 * @param {() => string} getText
 */
function pfWireCopyButton(button, getText) {
  if (!button) return;
  const originalLabel = button.innerHTML;

  button.addEventListener("click", async () => {
    const text = getText();
    if (!text) return;
    const ok = await pfCopyText(text);
    if (ok) {
      button.classList.add("btn--copied");
      button.textContent = "Copied";
      pfShowToast("Copied to clipboard");
      setTimeout(() => {
        button.classList.remove("btn--copied");
        button.innerHTML = originalLabel;
      }, 1400);
    } else {
      pfShowToast("Couldn't copy — select and copy manually");
    }
  });
}
