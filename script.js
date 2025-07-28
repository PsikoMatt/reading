document.addEventListener('DOMContentLoaded', init);
function init() {
  document.getElementById('processBtn').addEventListener('click', processText);
  renderBooks();
}
function processText() {
  const bookName = document.getElementById('bookName').value.trim();
  const textTitle = document.getElementById('textTitle').value.trim();
  const originalText = document.getElementById('inputText').value;
  const translationText = document.getElementById('translationInput').value.trim();
  const definitionsText = document.getElementById('definitionsInput').value.trim();
  if (!bookName || !textTitle || !originalText) {
    return alert("Kitap adı, metin başlığı ve orijinal metin zorunlu.");
  }
  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
  const translations = translationText ? translationText.split('\n').map(l => l.trim()).filter(l => l) : [];
  if (translations.length !== sentences.length) {
    return alert(`Çeviri sayısı (${translations.length}) cümle sayısı (${sentences.length}) ile eşleşmiyor.`);
  }
  const definitions = definitionsText ? definitionsText.split('\n').map(line => {
    const parts = line.split(':');
    return { word: parts[0].trim(), meaning: parts.slice(1).join(':').trim() };
  }).filter(d => d.word && d.meaning) : [];
  const storeObj = { originalText, sentences, translations, definitions };
  const key = bookName + "::" + textTitle;
  localStorage.setItem(key, JSON.stringify(storeObj));
  showOutput(bookName, textTitle, storeObj);
  renderBooks();
}
function renderBooks() {
  const books = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const parts = key.split("::");
    if (parts.length !== 2) continue;
    const [book, title] = parts;
    books[book] = books[book] || [];
    books[book].push(title);
  }
  const ul = document.getElementById('booksList');
  ul.innerHTML = "";
  for (const book in books) {
    const li = document.createElement('li');
    li.textContent = book;
    const sub = document.createElement('ul');
    books[book].forEach(title => {
      const key = book + "::" + title;
      const sli = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = title;
      btn.onclick = () => {
        const data = JSON.parse(localStorage.getItem(key));
        showOutput(book, title, data);
      };
      sli.appendChild(btn);
      const delBtn = document.createElement('button');
      delBtn.textContent = "Sil";
      delBtn.className = "delete-btn";
      delBtn.onclick = () => {
        if (confirm(`"${title}" silinsin mi?`)) {
          localStorage.removeItem(key);
          document.getElementById('textContainer').innerHTML = "";
          document.getElementById('outputTitle').textContent = "";
          document.getElementById('infoPanel').innerHTML = "<em>Tıklanan kelime veya cümlenin çevirisi/bilgisi burada gösterilecek.</em>";
          renderBooks();
        }
      };
      sli.appendChild(delBtn);
      sub.appendChild(sli);
    });
    li.appendChild(sub);
    ul.appendChild(li);
  }
}
function showOutput(book, title, data) {
  document.getElementById('outputTitle').textContent = title;
  const container = document.getElementById('textContainer');
  container.innerHTML = "";
  const info = document.getElementById('infoPanel');
  info.innerHTML = "<em>Tıklanan kelime veya cümlenin çevirisi/bilgisi burada gösterilecek.</em>";
  const defMap = {};
  data.definitions.forEach(d => defMap[d.word] = d.meaning);
  const lines = data.originalText.split('\n');
  lines.forEach(line => {
    const lineDiv = document.createElement('div');
    const parts = line.split(/(\s+)/);
    parts.forEach(token => {
      const wordClean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
      if (defMap[wordClean]) {
        const span = document.createElement('span');
        span.textContent = token;
        span.className = 'keyword';
        span.dataset.word = wordClean;
        span.onclick = () => { info.textContent = defMap[wordClean]; };
        lineDiv.appendChild(span);
      } else if (wordClean) {
        const idx = data.sentences.findIndex(s => s.trim().startsWith(wordClean));
        const span = document.createElement('span');
        span.textContent = token;
        span.className = 'word';
        span.onclick = () => { info.textContent = data.translations[idx]; };
        lineDiv.appendChild(span);
      } else {
        lineDiv.appendChild(document.createTextNode(token));
      }
    });
    container.appendChild(lineDiv);
  });
}
