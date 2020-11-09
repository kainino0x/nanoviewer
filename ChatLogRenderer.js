'use strict';

if (!discordMarkdown) throw new Error('Requires discord-markdown');

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

function mkChatMsg(serverid, channelid, msg, serverMeta) {
  const logentry = document.createElement('div');
  logentry.classList.add('logentry');
  logentry.title = 'message id: ' + msg.id;

  const timestamp = document.createElement('span');
  logentry.appendChild(timestamp);
  timestamp.classList.add('timestamp');
  timestamp.title = msg.timestamp;
  timestamp.innerHTML = mkSubtleHTML('[', mkTimestamp(msg.timestamp), ']&nbsp;');

  const author = document.createElement('span');
  logentry.appendChild(author);
  author.classList.add('author');
  author.title = 'author id: ' + msg.author.id;
  author.innerHTML = mkSubtleHTML('', msg.author.username, ':&nbsp;');

  const text = document.createElement('span');
  logentry.appendChild(text);
  text.classList.add('msg');

  text.innerHTML = discordMarkdown.toHTML(msg.msg.replace('#', '\\#'), {
    discordCallback: {
      user: x => {
        const member = serverMeta.members[x.id];
        const text = member ? `@!${member.username}` : `&lt;@!${x.id}&gt;`;
        return `<a target=_blank href="https://discord.com/users/${x.id}" title="@user id: ${x.id}">${text}</a>`;
      },
      channel: x => {
        const channel = serverMeta.textChannels[x.id];
        const text = channel ? `#${channel.name}` : `&lt;#${x.id}&gt;`;
        return `<a target=_blank href="https://discord.com/channels/${serverid}/${x.id}" title="#channel id: ${x.id}">${text}</a>`;
      },
      role: x => {
        const role = serverMeta.roles[x.id];
        const text = role ? `@&${role.name}` : `&lt;@&${x.id}&gt;`;
        return `<a title="@role id: ${x.id}">${text}</a>`;
      },
    },
  });

  if (msg.attachmentsInText || msg.attachments) {
    const attachmentsList = document.createElement('ul');
    attachmentsList.classList.add('attachments');
    text.appendChild(attachmentsList);

    const allAttachments = [];
    if (msg.attachmentsInText) allAttachments.push(...msg.attachmentsInText);
    if (msg.attachments) allAttachments.push(...msg.attachments);

    for (const att of allAttachments) {
      const url = `server=${serverid}/ch=${channelid}/attachments/${att.localFilename}`;
      const [, snowflake, filename] = att.originalUrl.match(/(\d+)\/([^/]+)$/);

      const li = document.createElement('li');
      li.title = 'attachment id: ' + snowflake;
      attachmentsList.appendChild(li);

      const a = document.createElement('a');
      li.appendChild(a);
      a.href = url;
      a.target = '_blank';
      a.innerText = filename;

      if (/\.(png|jpg)$/.test(att.localFilename)) {
        const img = document.createElement('img');
        a.appendChild(img);
        img.src = url;
        img.alt = ' ' + att.originalUrl;
      }
    }
  }

  return logentry;
}

export function renderChatLog(container, serverid, channelid, filecontents, serverMeta) {
  const msgs = JSON.parse(filecontents);
  for (const msg of msgs) {
    container.appendChild(mkChatMsg(serverid, channelid, msg, serverMeta));
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
  append(filename, serverid, channelid, filecontents, serverMeta) {
    const filenameElem = document.createElement('div');
    this.target.appendChild(filenameElem);
    filenameElem.classList.add('filename');
    filenameElem.innerText = filename;

    renderChatLog(this.target, serverid, channelid, filecontents, serverMeta);
  }
}
