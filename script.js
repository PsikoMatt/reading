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

  // clear highlights and panel
  function clearHighlights() {
    document.querySelectorAll('.highlight-sentence').forEach(el => el.classList.remove('highlight-sentence'));
    document.querySelectorAll('.highlight-keyword').forEach(el => el.classList.remove('highlight-keyword'));
    info.innerHTML = placeholder;
  }

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  // Global sentence index
  let globalIdx = 0;

  // Render paragraphs preserving original breaks
  data.originalText.split(/\r?\n/).forEach(par => {
    const p = document.createElement('p');

    // Split into sentences for this paragraph
    const paraSents = par.match(/[^.!?]+[.!?]+/g) || [par];
    paraSents.forEach(sent => {
      // Create a span wrapping the entire sentence
      const sentSpan = document.createElement('span');
      sentSpan.className = 'sentence-span';
      sentSpan.setAttribute('data-idx', globalIdx);

      // Tokenize the sentence
      const tokens = sent.split(/(\s+)/);
      tokens.forEach(token => {
        const clean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
        if (defMap[clean]) {
          // Keyword span
          const kw = document.createElement('span');
          kw.textContent = token;
          kw.className = 'keyword';
          kw.onclick = e => {
            e.stopPropagation();
            clearHighlights();
            kw.classList.add('highlight-keyword');
            info.textContent = defMap[clean];
          };
          sentSpan.appendChild(kw);
        } else {
          // Word span for translation click
          const wd = document.createElement('span');
          wd.textContent = token;
          wd.className = 'word';
          wd.onclick = e => {
            e.stopPropagation();
            clearHighlights();
            sentSpan.classList.add('highlight-sentence');
            info.textContent = data.translations[globalIdx];
          };
          sentSpan.appendChild(wd);
        }
      });

      p.appendChild(sentSpan);
      globalIdx++;
    });

    
    container.appendChild(p);
  });
}
