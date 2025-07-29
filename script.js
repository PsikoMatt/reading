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

  function clearHighlights() {
    document.querySelectorAll('.highlight-sentence').forEach(el => el.classList.remove('highlight-sentence'));
    document.querySelectorAll('.highlight-keyword').forEach(el => el.classList.remove('highlight-keyword'));
    info.innerHTML = placeholder;
  }

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  // Preserve original paragraphs
  const paragraphs = data.originalText.split(/\r?\n/);
  let sentenceIndex = 0;
  paragraphs.forEach(par => {
    const pTag = document.createElement('p');
    // Only split for translation alignment, but preserve text segments
    const paraSentences = par.match(/[^.!?]+[.!?]+/g) || (par ? [par] : []);
    paraSentences.forEach(sent => {
      const spanSent = document.createElement('span');
      spanSent.className = 'sentence-span';
      spanSent.dataset.idx = sentenceIndex;

      // Wrap keywords and words
      let parts = sent.split(/(\s+)/);
      parts.forEach(token => {
        const clean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
        if (defMap[clean]) {
          const kw = document.createElement('span');
          kw.textContent = token;
          kw.className = 'keyword';
          kw.onclick = e => {
            e.stopPropagation();
            const active = kw.classList.contains('highlight-keyword');
            clearHighlights();
            if (!active) {
              kw.classList.add('highlight-keyword');
              info.textContent = defMap[clean];
            }
          };
          spanSent.appendChild(kw);
        } else if (clean) {
          const wd = document.createElement('span');
          wd.textContent = token;
          wd.className = 'word';
          wd.onclick = e => {
            e.stopPropagation();
            const active = spanSent.classList.contains('highlight-sentence');
            clearHighlights();
            if (!active) {
              spanSent.classList.add('highlight-sentence');
              info.textContent = data.translations[sentenceIndex];
            }
          };
          spanSent.appendChild(wd);
        } else {
          spanSent.appendChild(document.createTextNode(token));
        }
      });
      pTag.appendChild(spanSent);
      sentenceIndex++;
    });
    container.appendChild(pTag);
  });
  
}
