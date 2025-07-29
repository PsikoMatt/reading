document.addEventListener('DOMContentLoaded', init);

async function init() {
  document.getElementById('processBtn').addEventListener('click', processText);
  await renderBooks();
}

async function processText() {
  const bookName = document.getElementById('bookName').value.trim();
  const textTitle = document.getElementById('textTitle').value.trim();
  const originalText = document.getElementById('inputText').value;
  const translationLines = document.getElementById('translationInput').value.trim().split('\n').filter(l => l.trim());
  const defLines = document.getElementById('definitionsInput').value.trim().split('\n').filter(l => l.trim());

  if (!bookName || !textTitle || !originalText) {
    return alert("Kitap adı, metin başlığı ve orijinal metin zorunlu.");
  }

  // Parse numbered lists: remove leading 'n)'
  const sentences = originalText.split('\n').filter(l => l.trim()).map(l => l.replace(/^\s*\d+\)\s*/, ''));
  const translations = translationLines.map(l => l.replace(/^\s*\d+\)\s*/, ''));

  if (translations.length !== sentences.length) {
    return alert(`Cümle sayısı (${sentences.length}) ile çeviri sayısı (${translations.length}) eşleşmiyor.`);
  }

  const definitions = defLines.map(line => {
    const [w, ...m] = line.split(':');
    return { word: w.trim(), meaning: m.join(':').trim() };
  }).filter(d => d.word && d.meaning);

  const storeObj = { sentences, translations, definitions };
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

  function clearHighlights() {
    document.querySelectorAll('.highlight-sentence').forEach(el => el.classList.remove('highlight-sentence'));
    document.querySelectorAll('.highlight-keyword').forEach(el => el.classList.remove('highlight-keyword'));
    info.innerHTML = placeholder;
  }

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  data.sentences.forEach((sent, idx) => {
    const p = document.createElement('p');
    const tokens = sent.split(/(\s+)/);
    tokens.forEach(token => {
      const clean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
      if (defMap[clean]) {
        const kw = document.createElement('span');
        kw.textContent = token;
        kw.className = 'keyword';
        kw.onclick = e => {
          e.stopPropagation();
          const isActive = kw.classList.toggle('highlight-keyword');
          clearHighlights();
          if (isActive) info.textContent = defMap[clean];
        };
        p.appendChild(kw);
      } else if (clean) {
        const wd = document.createElement('span');
        wd.textContent = token;
        wd.className = 'word';
        wd.onclick = e => {
          e.stopPropagation();
          const isActive = p.classList.toggle('highlight-sentence');
          clearHighlights();
          if (isActive) info.textContent = data.translations[idx];
        };
        p.appendChild(wd);
      } else {
        p.appendChild(document.createTextNode(token));
      }
    });
    container.appendChild(p);
  });
}
