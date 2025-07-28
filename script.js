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

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  // clear existing highlights and panel
  function clearHighlights() {
    document.querySelectorAll('.highlight-sentence')
      .forEach(el => el.classList.remove('highlight-sentence'));
    document.querySelectorAll('.highlight-keyword')
      .forEach(el => el.classList.remove('highlight-keyword'));
    info.innerHTML = placeholder;
  }

  // Render paragraphs preserving original breaks
  const paragraphs = data.originalText.split(/\r?\n/);
  let sentenceIdx = 0;
  paragraphs.forEach(par => {
    const p = document.createElement('p');

    // Split paragraph into sentences
    const paraSentences = par.match(/[^.!?]+[.!?]+/g) || [par];
    paraSentences.forEach(sent => {
      const tokens = sent.split(/(\s+)/);

      tokens.forEach(token => {
        const wordClean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
        if (defMap[wordClean]) {
          // Keyword
          const span = document.createElement('span');
          span.textContent = token;
          span.className = 'keyword';
          span.onclick = e => {
            e.stopPropagation();
            clearHighlights();
            span.classList.add('highlight-keyword');
            info.textContent = defMap[wordClean];
          };
          p.appendChild(span);

        } else if (wordClean) {
          // Normal word → sentence highlight
          const span = document.createElement('span');
          span.textContent = token;
          span.className = 'word';
          span.onclick = e => {
            e.stopPropagation();
            clearHighlights();
            p.classList.add('highlight-sentence');
            info.textContent = data.translations[sentenceIdx];
          };
          p.appendChild(span);

        } else {
          // Whitespace or punctuation
          p.appendChild(document.createTextNode(token));
        }
      });

      sentenceIdx++;
    });

    container.appendChild(p);
  });
}
