document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('processBtn').addEventListener('click', processText);
  await renderBooks();
}

async function processText() {
  const bookName = document.getElementById('bookName').value.trim();
  const textTitle = document.getElementById('textTitle').value.trim();
  const originalText = document.getElementById('inputText').value;
  const translations = document.getElementById('translationInput').value.trim().split('\n');
  const defLines = document.getElementById('definitionsInput').value.trim().split('\n');

  if (!bookName || !textTitle || !originalText) {
    return alert("Kitap adı, metin başlığı ve orijinal metin zorunlu.");
  }

  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
  if (translations.length !== sentences.length) {
    return alert("Çeviri sayısı cümle sayısıyla eşleşmiyor.");
  }

  const definitions = defLines.map(line => {
    const [w, ...m] = line.split(':');
    return { word: w.trim(), meaning: m.join(':').trim() };
  }).filter(d => d.word && d.meaning);

  const storeObj = { originalText, sentences, translations, definitions };
  try {
    await saveText(bookName, textTitle, storeObj);
    alert("Kaydedildi.");
    await renderBooks();
  } catch (e) {
    console.error(e);
    alert("Kaydetme hatası: " + e.message);
  }
}

async function renderBooks() {
  const data = await loadAllTexts();
  const ul = document.getElementById('booksList');
  ul.innerHTML = '';

  for (const book in data) {
    const li = document.createElement('li');
    li.textContent = book;
    const sub = document.createElement('ul');

    data[book].forEach(item => {
      const { title, content } = item;
      const li2 = document.createElement('li');

      const btn = document.createElement('button');
      btn.textContent = title;
      btn.onclick = () => showOutput(content);
      li2.appendChild(btn);

      const del = document.createElement('button');
      del.textContent = 'Sil';
      del.className = 'delete-btn';
      del.onclick = async () => {
        if (confirm(`"${title}" silinsin mi?`)) {
          await deleteText(book, title);
          await renderBooks();
        }
      };
      li2.appendChild(del);

      sub.appendChild(li2);
    });

    li.appendChild(sub);
    ul.appendChild(li);
  }
}

function showOutput(data) {
  const container = document.getElementById('textContainer');
  container.innerHTML = '';
  const info = document.getElementById('infoPanel');
  const placeholder = '<em>Tıklanan öğenin bilgisi burada gösterilecek.</em>';
  info.innerHTML = placeholder;

  // Clear all highlights and reset panel
  function clearHighlights() {
    document.querySelectorAll('.highlight-sentence')
      .forEach(el => el.classList.remove('highlight-sentence'));
    document.querySelectorAll('.highlight-keyword')
      .forEach(el => el.classList.remove('highlight-keyword'));
    info.innerHTML = placeholder;
  }

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  // Build regex for keywords (longest first)
  const keywords = Object.keys(defMap)
    .sort((a, b) => b.length - a.length)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const kwRegex = new RegExp(`(${keywords.join('|')})`, 'g');

  // Split original text into paragraphs
  const paragraphs = data.originalText.split(/\r?\n/);
  let sentIdx = 0;

  paragraphs.forEach(par => {
    const pElem = document.createElement('p');
    let offset = 0;

    // Iterate sentences
    while (sentIdx < data.sentences.length) {
      const sentence = data.sentences[sentIdx];
      const idx = par.indexOf(sentence, offset);
      if (idx < 0) break;

      // Text before sentence
      if (idx > offset) {
        pElem.appendChild(document.createTextNode(par.slice(offset, idx)));
      }

      // Wrap sentence span
      const spanSent = document.createElement('span');
      spanSent.className = 'sentence-span';
      spanSent.dataset.idx = sentIdx;

      // Process keywords inside sentence
      let last = 0;
      sentence.replace(kwRegex, (match, capture, pos) => {
        if (pos > last) {
          spanSent.appendChild(document.createTextNode(sentence.slice(last, pos)));
        }
        const kw = document.createElement('span');
        kw.textContent = match;
        kw.className = 'keyword';
        kw.onclick = e => {
          e.stopPropagation();
          const isActive = kw.classList.contains('highlight-keyword');
          clearHighlights();
          if (!isActive) {
            kw.classList.add('highlight-keyword');
            info.textContent = defMap[match];
          }
        };
        spanSent.appendChild(kw);
        last = pos + match.length;
      });
      if (last < sentence.length) {
        spanSent.appendChild(document.createTextNode(sentence.slice(last)));
      }

      // Sentence click listener
      spanSent.addEventListener('click', e => {
        e.stopPropagation();
        const isActive = spanSent.classList.contains('highlight-sentence');
        clearHighlights();
        if (!isActive) {
          spanSent.classList.add('highlight-sentence');
          info.textContent = data.translations[sentIdx];
        }
      });

      pElem.appendChild(spanSent);
      offset = idx + sentence.length;
      sentIdx++;
    }

    // Remaining text after last sentence
    if (offset < par.length) {
      pElem.appendChild(document.createTextNode(par.slice(offset)));
    }

    container.appendChild(pElem);
  });
}
