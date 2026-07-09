/**
 * PulseForge — homepage script.
 * Handles the mobile nav toggle and the live tool search/filter.
 */

(function () {
  pfInitMobileNav();

  // --- Tool search -------------------------------------------------------
  const searchInput = document.getElementById("toolSearch");
  const toolGrid = document.querySelector("[data-tool-grid]");
  const emptyState = document.querySelector("[data-empty-state]");
  const searchMeta = document.querySelector("[data-search-meta]");

  if (!searchInput || !toolGrid) return;

  const cards = Array.from(toolGrid.querySelectorAll(".tool-card"));

  function updateMeta(count) {
    if (!searchMeta) return;
    searchMeta.textContent = count === 1 ? "1 tool available" : `${count} tools available`;
  }

  function filterTools(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const haystack = [
        card.dataset.title || "",
        card.dataset.description || "",
        card.dataset.tags || "",
      ]
        .join(" ")
        .toLowerCase();

      const matches = query === "" || haystack.includes(query);
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (emptyState) emptyState.classList.toggle("is-visible", visibleCount === 0);
    updateMeta(visibleCount);
  }

  searchInput.addEventListener("input", pfDebounce((e) => filterTools(e.target.value), 120));

  // Initial count on load.
  updateMeta(cards.length);
})();
