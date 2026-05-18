import { renderPanelsIntoSheet } from "./renderer.js";
import { getComponents } from "./store.js";

const MOD = "dccrpg-character-sheet-customizer";

// Helper to auto-resize sheet height based on content
const AUTO_ATTR = `data-${MOD}-auto-sized`;

function adjustSheetHeight(sheetApp, html, { growThreshold = 24 } = {}) {
  try {
    if (!sheetApp || !html) return;

    // Skip when minimized or not in a pop-out window
    if (sheetApp._minimized) return;

    const $win = html.closest(".app.window-app");
    if (!$win?.length) return;

    const $content = html.find(".window-content");
    if (!$content?.length) return;

    // Compute the total "chrome" (header + borders + margins)
    const chromeOffset = $win.outerHeight() - $content.outerHeight();
    const contentScrollH = $content[0].scrollHeight;

    // Desired height: fit content, but clamp to 90% of viewport
    const maxH = Math.floor(window.innerHeight * 0.9);
    const desiredH = Math.min(contentScrollH + chromeOffset, maxH);

    // Current height
    const currentH = $win.outerHeight();

    // Only resize on first auto-size OR if content grew by the threshold
    const alreadyAutoSized = $win.attr(AUTO_ATTR) === "1";
    const grewEnough = desiredH - currentH >= growThreshold;

    if (!alreadyAutoSized || grewEnough) {
      // Only grow; do not shrink (users may prefer their larger manual size)
      const nextH = Math.max(currentH, desiredH);
      if (nextH > currentH) {
        sheetApp.setPosition({ height: nextH });
        $win.attr(AUTO_ATTR, "1");
      }
    }
  } catch (err) {
    console.warn(`[${MOD}] adjustSheetHeight failed:`, err);
  }
}

/** Install Foundry hooks */
export function installHooks() {
  // Classic sheets
  Hooks.on("renderActorSheet", (app, html, data) => onRender({ app, html, data, v2: false }));
  // V2 sheets (DocumentSheetV2 / ActorSheetV2)
  Hooks.on("renderActorSheetV2", (app, html, data) => onRender({ app, html, data, v2: true }));

  // Re-render open actor sheets whenever the config changes (saved in settings UI)
  Hooks.on(`${MOD}:components-updated`, () => {
    for (const app of Object.values(ui.windows)) {
      if (app?.object instanceof Actor || app?.document instanceof Actor) {
        if (app.rendered) app.render(false);
      }
    }
  });
}

/** Unified renderer for both classic and V2 actor sheets. */
async function onRender({ app: sheetApp, html, data, v2 }) {
  try {
    if (game.system.id !== "dcc") return;

    const $root = html instanceof jQuery ? html : $(html);

    // ——— Character anchor resolution ———
    let anchor = $root.find("section#character").first();
    if (!anchor.length) anchor = $root.find(".tab[data-tab='character']").first();
    if (!anchor.length) anchor = $root.find("section.tab[data-tab='character']").first();
    if (!anchor.length) anchor = $root.find(".window-content").first();
    if (!anchor.length) anchor = $root.find("section.tab, section").first();
    if (!anchor.length) anchor = $root; // last resort

    // ——— Robust Actor extraction (classic + V2) ———
    const actor =
      sheetApp.object ??
      sheetApp.document ??
      sheetApp.actor ??
      data?.actor ??
      sheetApp?.actor?.document ??
      null;

    if (!actor) {
      console.debug?.(`[${MOD}] No actor on sheet; skipping. v2=${v2}`);
      return;
    }

    // ——— Determine PC/NPC (hybrid) ———
    const type = actor?.type;
    const hasPcGrid = anchor.find(".character-grid").length > 0;
    const hasNpcGrid = anchor.find(".npc-grid, .grid-container.npc-grid").length > 0;

    const isPC = (type === "character") || (hasPcGrid && !hasNpcGrid) || (!type && anchor.length);
    const isNPC = (type === "npc") || (hasNpcGrid && !hasPcGrid);

    if (!isPC && !isNPC) {
      console.debug?.(
        `[${MOD}] Unknown actor kind; skip. actor="${actor?.name ?? "?"}" type=${type ?? "?"} v2=${v2}`
      );
      return;
    }

    // ——— Idempotency ———
    $root.find(`[data-${MOD}-container]`).remove();

    // Config
    const components = getComponents();
    const panelsCount = components?.panels?.length ?? 0;
    if (!panelsCount) {
      console.debug?.(`[${MOD}] No panels configured. v2=${v2}`);
      return;
    }

    // ——— Choose insertion grid ———
    const pcGrid = anchor.find(".character-grid");
    const npcGrid = anchor.find(".npc-grid, .grid-container.npc-grid").first();
    const primaryGrid = isPC ? pcGrid : npcGrid;

    // Use system grid if found; otherwise append to the resolved anchor
    const grid = primaryGrid?.length ? primaryGrid : anchor;

    await renderPanelsIntoSheet({
      sheetApp,
      html: $root,
      grid,
      isPC,
      isNPC,
      components
    });
    
    adjustSheetHeight(sheetApp, html, { growThreshold: 24 });

    console.debug?.(
      `[${MOD}] Rendered panels | actor="${actor?.name}" kind=${isPC ? "PC" : "NPC"} v2=${v2} ` +
      `anchor=${primaryGrid?.length ? "grid" : "fallback"} panels=${panelsCount}`
    );
  } catch (err) {
    console.error(`${MOD} | renderActorSheet error`, err);
  }
}

