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
  if (!bookName || !textTitle || !originalText) return alert("Zorunlu alanlar eksik.");
  const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
  if (translations.length !== sentences.length) return alert("Çeviri sayısı cümle sayısıyla eşleşmiyor.");
  const definitions = defLines.map(l => {
    const [w, ...m] = l.split(':');
    return { word: w.trim(), meaning: m.join(':').trim() };
  }).filter(d => d.word && d.meaning);
  const storeObj = { originalText, sentences, translations, definitions };
  try {
    await saveText(bookName, textTitle, storeObj);
    alert("Kaydedildi.");
    await renderBooks();
  } catch(e) {
    console.error(e);
    alert("Kaydetme hatası: " + e.message);
  }
}
async function renderBooks() {
  const data = await loadAllTexts();
  const ul = document.getElementById('booksList');
  ul.innerHTML = "";
  for (const book in data) {
    const li = document.createElement('li'); li.textContent = book;
    const sub = document.createElement('ul');
    data[book].forEach(item => {
      const { title, content } = item;
      const li2 = document.createElement('li');
      const btn = document.createElement('button'); btn.textContent = title;
      btn.onclick = () => showOutput(content);
      li2.appendChild(btn);
      const del = document.createElement('button'); del.textContent = "Sil"; del.className="delete-btn";
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
  document.getElementById('outputTitle').textContent = "";
  const container = document.getElementById('textContainer'); container.innerHTML = "";
  const info = document.getElementById('infoPanel');
  info.innerHTML = "<em>Tıklanan öğenin bilgisi burada gösterilecek.</em>";
  const defMap = {}; data.definitions.forEach(d => defMap[d.word] = d.meaning);
  data.originalText.split('\n').forEach(line => {
    const lineDiv = document.createElement('div');
    line.split(/(\s+)/).forEach(token => {
      const wordClean = token.replace(/[^\wÇçÖöĞğİıŞşÜü'-]/g, '');
      if (defMap[wordClean]) {
        const span = document.createElement('span');
        span.textContent = token; span.className = 'keyword';
        span.onclick = () => info.textContent = defMap[wordClean];
        lineDiv.appendChild(span);
      } else if (wordClean) {
        const idx = data.sentences.findIndex(s => s.trim().startsWith(wordClean));
        const span = document.createElement('span');
        span.textContent = token; span.className = 'word';
        span.onclick = () => info.textContent = data.translations[idx];
        lineDiv.appendChild(span);
      } else {
        lineDiv.appendChild(document.createTextNode(token));
      }
    });
    container.appendChild(lineDiv);
  });
}
