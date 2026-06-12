import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
  name: "skynodes.multiupload",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "LoadImagesMultiUpload") return;
    const onCreated = nodeType.prototype.onNodeCreated;

    nodeType.prototype.onNodeCreated = function () {
      onCreated?.apply(this, arguments);
      const node = this;
      const listWidget = node.widgets.find((w) => w.name === "images_list");
      const indexWidget = node.widgets.find((w) => w.name === "index");
      const modeWidget = node.widgets.find((w) => w.name === "mode");
      const groupWidget = node.widgets.find((w) => w.name === "group_size");
      for (const w of node.widgets) {
        if (w.name !== "multiupload_ui") { w.computeSize = () => [0, -4]; w.hidden = true; }
      }
      const caf = node.widgets.find((w) => w.name === "control_after_generate" || w.name === "control after generate");
      if (caf) caf.value = "increment";
      if (modeWidget) modeWidget.value = "one at a time";

      const dedupe = (a) => [...new Set(a)];
      const getNames = () => { try { return dedupe(JSON.parse(listWidget.value || "[]")); } catch { return []; } };
      const setNames = (n) => { listWidget.value = JSON.stringify(dedupe(n)); render(); };
      const alive = () => app.graph?.getNodeById(node.id) === node;
      const seq = () => true;
      const grp = () => Math.max(1, groupWidget?.value ?? 1);
      const runsNeeded = (n) => Math.ceil(n / grp());
      const thumbURL = (name) => {
        const i = name.lastIndexOf("/");
        return api.apiURL(`/view?filename=${encodeURIComponent(i<0?name:name.slice(i+1))}&subfolder=${encodeURIComponent(i<0?"":name.slice(0,i))}&type=input`);
      };

      const C = {
        bg: "#353535", line: "#444444", line2: "#5a5a5a",
        text: "#dddddd", mut: "#999999", dim: "#777777",
        btn: "#222222", btnH: "#2f2f2f",
      };

      const el = document.createElement("div");
      el.style.cssText = `display:flex;flex-direction:column;box-sizing:border-box;min-height:300px;
        background:${C.bg};border:1px solid ${C.line};border-radius:3px;color:${C.text};
        font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:12px;overflow:hidden;`;

      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid ${C.line};">
          <span data-r="sub" style="color:${C.mut};">0 images</span><span title="Upload images with Add or by dragging files onto this panel, set the Group size, then press Run batch. Images are processed group by group with progress shown below. Hover any control for help." style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:1px solid ${C.line2};border-radius:50%;color:${C.mut};font-size:9px;line-height:1;cursor:help;flex:none;">?</span>
          <div style="flex:1"></div>
          <button data-r="add" title="Pick multiple images at once (Ctrl/Shift-click in the file picker). You can also drag files straight onto this panel." style="background:${C.btn};border:1px solid ${C.line2};color:${C.text};font-size:12px;padding:4px 12px;border-radius:3px;cursor:pointer;">Add…</button>
          <button data-r="reset" style="background:none;border:1px solid ${C.line};color:${C.mut};font-size:12px;padding:4px 10px;border-radius:3px;cursor:pointer;" title="Clears the done marks and the progress bar so the next Run batch starts again from image 1. Does NOT remove your images.">Reset progress</button>
          <button data-r="clear" style="background:none;border:1px solid ${C.line};color:${C.mut};font-size:12px;padding:4px 10px;border-radius:3px;cursor:pointer;" title="Remove all images">Clear</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-bottom:1px solid ${C.line};">
          <span data-r="glabel" title="How many images go through the workflow together per run. 1 = safest and lowest VRAM. Higher = faster overall but heavier on VRAM. Lower this if you get out-of-memory errors." style="color:${C.dim};margin-left:6px;">Group</span><span title="How many images run together per batch step. 1 is safest for VRAM; raise it to finish faster if your GPU can handle it, lower it if you get out-of-memory errors. Tip: set it to your image count to push everything through in one single run." style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:1px solid ${C.line2};border-radius:50%;color:${C.mut};font-size:9px;line-height:1;cursor:help;flex:none;">?</span>
          <div data-r="gwrap" style="display:flex;align-items:center;border:1px solid ${C.line2};border-radius:3px;overflow:hidden;">
            <button data-r="gm" style="background:none;border:none;color:${C.mut};width:20px;padding:2px 0;cursor:pointer;font-size:12px;">-</button>
            <span data-r="gval" title="Images per run" style="min-width:18px;text-align:center;color:${C.text};font-variant-numeric:tabular-nums;">1</span>
            <button data-r="gp" style="background:none;border:none;color:${C.mut};width:20px;padding:2px 0;cursor:pointer;font-size:12px;">+</button>
          </div>
          <div style="flex:1"></div>
          <span data-r="prog" title="Images finished out of total" style="color:${C.mut};font-variant-numeric:tabular-nums;"></span>
        </div>

        <div data-r="grid" style="height:240px;overflow-y:auto;overflow-x:hidden;display:grid;
          grid-template-columns:repeat(auto-fill,72px);grid-auto-rows:72px;gap:6px;
          align-content:start;justify-content:start;padding:10px;background:#222222;"></div>

        <div style="height:2px;background:${C.line};">
          <div data-r="pfill" style="height:100%;width:0%;background:${C.mut};transition:width .3s;"></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid ${C.line};">
          <span data-r="stext" title="Current activity: which image/group is running and which workflow stage" style="flex:1;color:${C.mut};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Ready</span>
          <button data-r="run" title="Starts the whole batch from image 1: queues one run per group automatically. Blocked while runs are still queued, so it can never double-queue." style="background:${C.btn};border:1px solid ${C.line2};color:${C.text};
            font-size:12px;padding:5px 16px;border-radius:3px;cursor:pointer;">Run batch</button>
        </div>`;
      const R = (k) => el.querySelector(`[data-r="${k}"]`);

      el.querySelectorAll("button").forEach((b) => {
        b.onmouseenter = () => (b.style.background = C.btnH);
        b.onmouseleave = () => (b.style.background = b.dataset.r === "add" || b.dataset.r === "run" ? C.btn : "none");
      });

      function paintMode() {
        R("gval").textContent = grp();
        status("Ready");
      }
      R("gm").onclick = () => { if (groupWidget) groupWidget.value = Math.max(1, grp() - 1); paintMode(); render(); };
      R("gp").onclick = () => { if (groupWidget) groupWidget.value = Math.min(64, grp() + 1); paintMode(); render(); };

      function status(text, color) { R("stext").textContent = text; R("stext").style.color = color || C.mut; }
      function progress() {
        const names = getNames();
        const doneImgs = Math.min((indexWidget?.value ?? 0) * grp(), names.length);
        R("pfill").style.width = names.length && seq() ? `${(doneImgs / names.length) * 100}%` : "0%";
        R("prog").textContent = names.length && seq() ? `${doneImgs} / ${names.length} done` : "";
        return doneImgs;
      }

      function render() {
        const names = getNames();
        R("sub").textContent = `${names.length} image${names.length === 1 ? "" : "s"}`;
        const idx = progress();
        const grid = R("grid");
        grid.innerHTML = "";
        if (!names.length) {
          grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:${C.dim};padding:40px 0;">
            Drop images here, or click Add…</div>`;
          return;
        }
        names.forEach((name, i) => {
          const done = seq() && i < idx, active = seq() && i >= idx && i < idx + grp();
          const card = document.createElement("div");
          card.style.cssText = `position:relative;width:72px;height:72px;border-radius:2px;overflow:hidden;
            border:1px solid ${active ? C.mut : C.line};background:#1c1c1c;box-sizing:border-box;`;
          card.innerHTML = `
            <img src="${thumbURL(name)}" loading="lazy" style="position:absolute;inset:0;width:72px;height:72px;object-fit:cover;display:block;${done ? "opacity:.35;" : ""}">
            ${done ? `<span style="position:absolute;top:3px;left:3px;color:${C.text};font-size:10px;
              background:rgba(34,34,34,.9);padding:0 4px;border-radius:2px;">done</span>` : ""}
            ${active ? `<span style="position:absolute;top:3px;left:3px;color:#141414;background:${C.text};font-size:10px;
              padding:0 4px;border-radius:2px;">next</span>` : ""}
            <button data-x style="position:absolute;top:2px;right:2px;background:rgba(34,34,34,.9);
              border:1px solid ${C.line2};color:${C.mut};border-radius:2px;width:18px;height:18px;cursor:pointer;
              display:none;align-items:center;justify-content:center;font-size:10px;line-height:1;padding:0;">✕</button>
            <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(26,26,26,.9);
              color:${C.dim};font-size:9px;padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;">
              ${i + 1}  ${name.split("/").pop()}</span>`;
          const x = card.querySelector("[data-x]");
          card.onmouseenter = () => { card.style.borderColor = C.line2; x.style.display = "flex"; };
          card.onmouseleave = () => { card.style.borderColor = active ? C.mut : C.line; x.style.display = "none"; };
          x.onclick = (e) => {
            e.stopPropagation();
            const n = getNames(); const p = n.indexOf(name);
            if (p >= 0) { n.splice(p, 1); setNames(n); }
          };
          grid.appendChild(card);
        });
      }

      async function uploadFiles(fileList) {
        const files = [...fileList].filter((f) => f.type.startsWith("image/"));
        if (!files.length) return;
        const uploaded = [];
        let done = 0;
        for (const file of files) {
          const body = new FormData();
          body.append("image", file);
          body.append("subfolder", "multi_upload");
          body.append("overwrite", "true");
          try {
            const resp = await api.fetchApi("/upload/image", { method: "POST", body });
            if (resp.status === 200) {
              const d = await resp.json();
              uploaded.push((d.subfolder ? d.subfolder + "/" : "") + d.name);
            }
          } catch (e) { console.error("upload failed:", file.name, e); }
          done++;
          status(`Uploading ${done} of ${files.length}…`);
        }
        setNames([...getNames(), ...uploaded]);
        status("Ready");
      }

      let queueRemaining = 0;
      const onQueueStatus = ({ detail }) => {
        const q = detail?.exec_info?.queue_remaining;
        if (typeof q === "number") queueRemaining = q;
      };
      api.addEventListener("status", onQueueStatus);

      R("run").onclick = () => {
        const n = getNames().length;
        if (!n) return status("No images loaded", "#b86a64");
        if (queueRemaining > 0)
          return status(`${queueRemaining} runs still queued. Wait or clear the queue first`, "#b86a64");
        if (caf) caf.value = "increment";
        if (indexWidget) indexWidget.value = 0;
        render();
        const r = runsNeeded(n);
        status(grp() > 1 ? `Running ${r} groups of ${grp()} (${n} images)` : `Running image 1 of ${n}`);
        app.queuePrompt(0, r);
      };
      R("add").onclick = () => {
        const input = document.createElement("input");
        input.type = "file"; input.multiple = true; input.accept = "image/*";
        input.onchange = () => uploadFiles(input.files);
        input.click();
      };
      R("reset").onclick = () => { if (indexWidget) indexWidget.value = 0; status("Progress reset. Next run starts at image 1"); render(); };
      R("clear").onclick = () => { if (indexWidget) indexWidget.value = 0; setNames([]); status("Ready"); };

      const grid = R("grid");
      ["dragenter","dragover"].forEach((ev) => el.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation(); grid.style.background = "#2a2a2a";
      }));
      ["dragleave","drop"].forEach((ev) => el.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation(); grid.style.background = "#222222";
      }));
      el.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files); });

      const onExecuting = ({ detail }) => {
        if (!alive() || !seq()) return;
        const names = getNames();
        if (!names.length) return;
        const doneI = Math.min((indexWidget?.value ?? 0) * grp(), names.length - 1);
        if (detail) {
          const n2 = app.graph.getNodeById(Number(detail));
          const hi = Math.min(doneI + grp(), names.length);
          status(`Image${grp()>1?"s":""} ${doneI + 1}${grp()>1?"-"+hi:""} of ${names.length}: ${n2?.title || n2?.type || "running"}`);
        }
        progress();
      };
      const onExecuted = () => { if (alive()) { progress(); render(); } };
      const onSuccess = () => {
        if (!alive() || !seq()) return;
        const names = getNames();
        const idx = indexWidget?.value ?? 0;
        if (names.length && idx >= runsNeeded(names.length)) {
          status(`Batch complete (${names.length} of ${names.length})`, "#8fae7e");
          R("pfill").style.width = "100%";
        }
        render();
      };
      api.addEventListener("executing", onExecuting);
      api.addEventListener("executed", onExecuted);
      api.addEventListener("execution_success", onSuccess);
      const onRemovedPrev = node.onRemoved;
      node.onRemoved = function () {
        api.removeEventListener("executing", onExecuting);
        api.removeEventListener("executed", onExecuted);
        api.removeEventListener("execution_success", onSuccess);
        api.removeEventListener("status", onQueueStatus);
        onRemovedPrev?.apply(this, arguments);
      };

      const w = node.addDOMWidget("multiupload_ui", "div", el, { serialize: false, hideOnZoom: false });
      w.computeSize = (width) => [width, 360];
      node.size = [Math.max(node.size[0], 380), Math.max(node.size[1], 420)];

      node.onDragOver = (e) => !!(e.dataTransfer && [...e.dataTransfer.items].some((i) => i.kind === "file"));
      node.onDragDrop = async (e) => { const f = e.dataTransfer?.files; if (!f?.length) return false; await uploadFiles(f); return true; };

      paintMode();
      render();
    };
  },
});
