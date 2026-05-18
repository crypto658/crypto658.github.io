function setCurrentYear() {
    const year = String(new Date().getFullYear());
    const yearNodes = document.querySelectorAll(".js-current-year");
    yearNodes.forEach((node) => {
        node.textContent = year;
    });
}

function setLastUpdated() {
    const lastUpdatedNodes = document.querySelectorAll(".js-last-updated");
    if (!lastUpdatedNodes.length) {
        return;
    }

    const modified = new Date(document.lastModified);
    const hasValidDate = Number.isFinite(modified.getTime()) && modified.getFullYear() >= 2024;
    const display = hasValidDate
        ? modified.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "2-digit" })
        : "Recently updated";

    lastUpdatedNodes.forEach((node) => {
        node.textContent = display;
    });
}

window.addEventListener("DOMContentLoaded", () => {
    setCurrentYear();
    setLastUpdated();
});
