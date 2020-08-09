'use strict';

function pad2(num) {
  let sign = num >= 0 ? '' : '-';
  let s = Math.abs(Math.floor(num)).toString();
  if (s.length == 1) s = '0' + s;
  return sign + s;
}

function mkTimestamp(timestamp) {
  const d = new Date(timestamp);
  const iso = d.toISOString();
  return iso.substring(0, 10) + ' ' + iso.substring(11, 16);
}

function getParentLogEntry(el) {
  if (el === document.body) {
    return null;
  }
  if (el.classList && el.classList.contains('logentry')) {
    return el;
  }
  return getParentLogEntry(el.parentElement);
}
function logEntrySelector(ev) {
  const sel = window.getSelection();
  const r = sel.getRangeAt(0);
  if (r.startContainer == r.endContainer) {
    // Either there's no selection or just part of one message.
    return;
  }
  // The user has selected something.
  // Expand their selection to the whole message, so they get timestamp etc.
  let startContainer = getParentLogEntry(r.startContainer);
  let startOffset = 0;
  if (!startContainer) {
    startContainer = r.startContainer;
    startOffset = r.startOffset;
  }
  let endContainer = getParentLogEntry(r.endContainer);
  let endOffset = 3; // 3 is the number of elements in a logentry.
  if (!endContainer) {
    endContainer = r.endContainer;
    endOffset = r.endOffset;
  }
  sel.setBaseAndExtent(startContainer, startOffset, endContainer, endOffset);
}

function mkSubtleHTML(left, inner, right) {
  let s = inner;
  if (left) {
    s = `<span class=subtle>${left}</span>` + s;
  }
  if (right) {
    s = s + `<span class=subtle>${right}</span>`;
  }
  return s;
}
function mkChatMsg(msg) {
  const logentry = document.createElement('div');
  logentry.classList.add('logentry');
  logentry.title = msg.id;

  const timestamp = document.createElement('div');
  logentry.appendChild(timestamp);
  timestamp.classList.add('timestamp');
  timestamp.title = msg.timestamp;
  timestamp.innerHTML = mkSubtleHTML('[', mkTimestamp(msg.timestamp), '] ');

  const author = document.createElement('div');
  logentry.appendChild(author);
  author.classList.add('author');
  author.title = msg.author.id;
  author.innerHTML = mkSubtleHTML('', msg.author.username, ':');

  const text = document.createElement('div');
  logentry.appendChild(text);
  text.classList.add('msg');
  text.innerHTML = markdown.toHTML(msg.msg.replace('#', '\\#'));

  return logentry;
}

export function renderChatLog(container, filecontents) {
  const msgs = filecontents.split('\n');
  for (const msg of msgs) {
    if (msg.length == 0 || msg == ']' || msg == '[') {
      continue;
    }
    container.appendChild(mkChatMsg(JSON.parse(msg)));
  }
}

export function initSelectionMagic(target) {
  target.onmouseup = logEntrySelector;
}

export class ChatLogRenderer {
  constructor(target) {
    this.target = target;
  }
  clear() {
    this.target.innerHTML = ''; // TODO: slow
  }
  append(filename, filecontents) {
    const filenameElem = document.createElement('div');
    this.target.appendChild(filenameElem);
    filenameElem.classList.add('filename');
    filenameElem.innerText = filename;

    this.renderChatLog(this.target, filecontents);
  }
}
