import Editable from "../../classes/Editable";
import EditableDefaults from "../../modules/EditableDefaults";
import Editables from "../../modules/Editables";
import Events from "../../modules/Events";
import { getEventTarget } from "../../modules/Helpers";
import db from "../../modules/db/db";
import initHandler from "../../modules/initHandler";
import validator from "../../modules/validator";

const elementsWithInputEventSupport = new Set();

initHandler.onInit(function () {
  // Force save before window is closed
  const onUnloadHandler = () => {
    if (chrome.runtime.id) {
      // console.info("=== Saving on unload");
      db.push();
    }
    // Cleanup the old chrome runtime, since its now disconnected
    // This happens on an extension reload, but the new handler should be in place by now
    else {
      // console.info("=== Removing old onunload handler");
      window.removeEventListener("beforeunload", onUnloadHandler);
    }
  };
  window.addEventListener("beforeunload", onUnloadHandler);

  Events.on("keydown", (e) => changeHandler(getEventTarget(e), "keydown"));
  Events.on("input", (e) => changeHandler(getEventTarget(e), "input"));
  Events.on("change", (e) => changeHandler(getEventTarget(e), "change"));

  // Watch for subtree changes (for contenteditables)
  let observer = new MutationObserver((mutation) =>
    changeHandler(mutation[0].target, "childMutation"),
  );
  Events.on("focus", (e) => {
    observer.disconnect();

    const editable = Editables.get(getEventTarget(e));
    if (editable && editable.isContentEditable()) {
      observer.observe(editable.el, { childList: true, subtree: true });
    }
  });
});

function changeHandler(el, changeEvent) {
  if (window.terafm.pauseLogging) return;

  // Some editors (like Slate) cancel the input event, so we use keydown to capture input
  // for those instead. Because input has some advantages over keydown, we want to use
  // that if possible. Keydown fires before input, so for inputs that support both events
  // (most) the first keystroke will both input and keydown the first time.
  if (elementsWithInputEventSupport.has(el) && changeEvent === "keydown")
    return;
  if (changeEvent === "input" && !elementsWithInputEventSupport.has(el))
    elementsWithInputEventSupport.add(el);

  const editable = Editables.get(el);

  if (!editable) return;

  // Radios and checkboxes will be saved twice due to the change and input
  // events, but we only need to save them once.
  if (
    changeEvent !== "change" &&
    ["radio", "checkbox"].includes(editable.el.type)
  )
    return false;

  editable.touch();

  if (validator.validate(editable)) {
    let entry = editable.getEntry();
    EditableDefaults.update(editable);

    if (editable.type === "radio") {
      deleteRadioSiblings(editable, () => {
        db.saveEntry(entry);
      });
    } else if (editable.isEmpty() === false) {
      db.saveEntry(entry);
    }

    // Did not validate, delete if exists (if value validation failed)
  } else {
    db.deleteEntry(editable.sessionId, editable.id);
  }
}

function deleteRadioSiblings(editable, callback) {
  const radios = editable.el
    .getRootNode()
    .querySelectorAll('input[type="radio"][name="' + editable.el.name + '"]');

  let entriesToDelete = [];
  for (const radio of radios) {
    if (radio !== editable.el) {
      let sib = new Editable(radio);
      entriesToDelete.push([editable.sessionId, sib.id]);
    }
  }

  db.deleteEntries(entriesToDelete, callback);
}
