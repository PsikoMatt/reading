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
  info.innerHTML = '<em>Tıklanan öğenin bilgisi burada gösterilecek.</em>';

  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);

  data.sentences.forEach((sent, idx) => {
    const sentDiv = document.createElement('div');
    const parts = sent.split(/(\s+)/);

    parts.forEach(token => {
      const wordClean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');

      if (defMap[wordClean]) {
        const span = document.createElement('span');
        span.textContent = token;
        span.className = 'keyword';
        span.onclick = () => {
          if (info.textContent === defMap[wordClean]) {
            info.innerHTML = '<em>Tıklanan öğenin bilgisi burada gösterilecek.</em>';
          } else {
            info.textContent = defMap[wordClean];
          }
        };
        sentDiv.appendChild(span);

      } else if (wordClean) {
        const span = document.createElement('span');
        span.textContent = token;
        span.className = 'word';
        span.onclick = () => {
          const translation = data.translations[idx];
          if (info.textContent === translation) {
            info.innerHTML = '<em>Tıklanan öğenin bilgisi burada gösterilecek.</em>';
          } else {
            info.textContent = translation;
          }
        };
        sentDiv.appendChild(span);

      } else {
        sentDiv.appendChild(document.createTextNode(token));
      }
    });

    container.appendChild(sentDiv);
  });
}
