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

  if (!bookName || !textTitle || !originalText) return alert("Kitap adı, metin başlığı ve orijinal metin zorunlu.");

  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
  if (translations.length !== sentences.length) return alert("Çeviri sayısı cümle sayısıyla eşleşmiyor.");

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
    const li = document.createElement('li'); li.textContent = book;
    const sub = document.createElement('ul');
    data[book].forEach(item => {
      const { title, content } = item;
      const li2 = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = title;
      btn.onclick = () => showOutput(content);
      li2.appendChild(btn);
      const del = document.createElement('button');
      del.textContent = 'Sil'; del.className = 'delete-btn';
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

  // helper to clear highlights
  function clearSentenceHighlights() {
    document.querySelectorAll('p.highlight-sentence').forEach(p => p.classList.remove('highlight-sentence'));
  }
  function clearKeywordHighlights() {
    document.querySelectorAll('span.highlight-keyword').forEach(s => s.classList.remove('highlight-keyword'));
  }

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  // render each sentence preserving paragraphs
  data.originalText.split('\n').forEach((line, idx) => {
    const p = document.createElement('p');
    p.setAttribute('data-sentence-index', idx);
    const tokens = line.split(/(\s+)/);
    tokens.forEach(token => {
      const word = token.trim();
      const wordClean = word.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
      let span;
      if (defMap[wordClean]) {
        // keyword
        span = document.createElement('span');
        span.textContent = token;
        span.className = 'keyword';
        span.onclick = e => {
          e.stopPropagation();
          clearSentenceHighlights();
          clearKeywordHighlights();
          const selected = span.classList.toggle('highlight-keyword');
          if (selected) info.textContent = defMap[wordClean];
          else info.innerHTML = placeholder;
        };
      } else if (wordClean) {
        // normal word
        span = document.createElement('span');
        span.textContent = token;
        span.className = 'word';
        span.onclick = e => {
          e.stopPropagation();
          clearKeywordHighlights();
          clearSentenceHighlights();
          const selected = p.classList.toggle('highlight-sentence');
          const si = parseInt(p.getAttribute('data-sentence-index'), 10);
          if (selected) info.textContent = data.translations[si];
          else info.innerHTML = placeholder;
        };
      } else {
        // whitespace or punctuation
        p.appendChild(document.createTextNode(token));
        return;
      }
      p.appendChild(span);
    });
    container.appendChild(p);
  });
}
