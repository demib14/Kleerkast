const defaultCats=[
  ['tops','Tops','#dcf4e6'],
  ['bottoms','Broeken en rokken','#d9ecff'],
  ['dresses','Jurken','#ffe1e9'],
  ['jackets','Jassen','#fff0c9'],
  ['shoes','Schoenen','#eadfff'],
  ['bags','Tassen','#f1dfd2'],
  ['accessories','Accessoires','#e8f0ff']
];

let data;
try { data = JSON.parse(localStorage.getItem('kleerkast_v07') || '{}'); }
catch(e) { data = {}; }

if(!data.categories) data.categories = defaultCats.map(c => ({id:c[0], name:c[1], color:c[2]}));
data.categories.forEach(c => { if(!data[c.id]) data[c.id] = []; });
if(!data.wishitems) data.wishitems = [];
if(!data.outfits) data.outfits = [];

let selected = {tops:null, bottoms:null, shoes:null, bags:null};

function save(){
  try {
    localStorage.setItem('kleerkast_v07', JSON.stringify(data));
    return true;
  } catch(e) {
    alert('Opslag is vol. De foto werd niet bewaard. Ik heb daarom vanaf v0.7 fotoverkleining toegevoegd, maar oude grote foto’s kunnen nog plaats innemen.');
    return false;
  }
}

function resizeImage(file, maxSize = 800, quality = 0.62){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = event => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const scale = Math.min(1, maxSize / Math.max(w,h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function show(screen){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screen).classList.add('active');
  document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.screen === screen));
  window.scrollTo(0,0);
  render();
}

function pick(cat){
  const input = document.getElementById('file-' + cat);
  if(input) input.click();
}

async function handleFile(cat, file){
  if(!file) return;
  try {
    const src = await resizeImage(file);
    const newItem = {id:Date.now()+Math.random(), src};
    data[cat].push(newItem);
    const ok = save();
    if(!ok) {
      data[cat] = data[cat].filter(x => x.id !== newItem.id);
    }
    render();
  } catch(e) {
    alert('Foto toevoegen lukte niet. Probeer een andere foto.');
  }
}

function removeItem(cat, id){
  const used = data.outfits.filter(o => Object.values(o.items).includes(id));
  if(used.length && !confirm('Dit kledingstuk zit in ' + used.length + ' outfit(s). Toch verwijderen?')) return;
  data[cat] = data[cat].filter(x => x.id !== id);
  Object.keys(selected).forEach(k => { if(selected[k] === id) selected[k] = null; });
  save();
  render();
}

function select(cat, id, src){
  if(!(cat in selected)) return;
  selected[cat] = id;
  document.getElementById('slot-' + cat).innerHTML = '<img src="' + src + '">';
}

function clearSlots(){
  selected = {tops:null, bottoms:null, shoes:null, bags:null};
  const labels = {tops:'Top', bottoms:'Onderstuk', shoes:'Schoenen', bags:'Tas'};
  Object.keys(labels).forEach(c => document.getElementById('slot-' + c).textContent = labels[c]);
}

function saveOutfit(){
  if(!Object.values(selected).some(Boolean)){
    alert('Kies eerst minstens één kledingstuk.');
    return;
  }
  data.outfits.push({id: Date.now(), date: new Date().toLocaleDateString('nl-BE'), items: {...selected}});
  save();
  alert('Outfit bewaard');
  render();
}

function findImg(id){
  for(const c of data.categories){
    for(const item of data[c.id]){
      if(item.id === id) return item.src;
    }
  }
  return null;
}

function card(cat, item, selectable){
  const d = document.createElement('div');
  d.className = 'piece';
  const img = document.createElement('img');
  img.src = item.src;
  d.appendChild(img);
  if(selectable) img.onclick = () => select(cat, item.id, item.src);
  const x = document.createElement('button');
  x.className = 'delete';
  x.textContent = 'Verwijder';
  x.onclick = e => {
    e.stopPropagation();
    removeItem(cat, item.id);
  };
  d.appendChild(x);
  return d;
}

function row(cat, selectable){
  const r = document.createElement('div');
  r.className = 'row';
  if(!data[cat].length){
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'Nog geen foto’s';
    r.appendChild(e);
  } else {
    data[cat].forEach(i => r.appendChild(card(cat, i, selectable)));
  }
  return r;
}

function render(){
  const closet = document.getElementById('closetList');
  closet.innerHTML = '';
  data.categories.forEach(c => {
    const s = document.createElement('div');
    s.className = 'section';
    s.innerHTML = '<h2>' + c.name + '</h2>';
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'Foto toevoegen';
    b.onclick = () => pick(c.id);
    s.appendChild(b);
    closet.appendChild(s);

    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.id = 'file-' + c.id;
    inp.onchange = e => {
      handleFile(c.id, e.target.files[0]);
      e.target.value = '';
    };
    closet.appendChild(inp);
    closet.appendChild(row(c.id, false));
  });

  const outfit = document.getElementById('outfitRows');
  outfit.innerHTML = '';
  ['tops','bottoms','shoes','bags'].forEach(id => {
    const c = data.categories.find(x => x.id === id);
    if(!c) return;
    const s = document.createElement('div');
    s.className = 'section';
    s.innerHTML = '<h2>' + c.name + '</h2>';
    outfit.appendChild(s);
    outfit.appendChild(row(id, true));
  });

  const categoryList = document.getElementById('categoryList');
  categoryList.innerHTML = '';
  data.categories.forEach(c => {
    const div = document.createElement('div');
    div.className = 'catrow';
    div.innerHTML = '<div class="catleft"><div class="dot" style="background:' + c.color + '"></div>' + c.name + '</div><span>•••</span>';
    categoryList.appendChild(div);
  });

  const wish = document.getElementById('wishRow');
  wish.innerHTML = '';
  if(!data.wishitems.length){
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'Nog geen foto’s';
    wish.appendChild(e);
  } else {
    data.wishitems.forEach(i => wish.appendChild(card('wishitems', i, false)));
  }

  const saved = document.getElementById('savedList');
  saved.innerHTML = '';
  if(!data.outfits.length){
    const em = document.createElement('div');
    em.className = 'empty';
    em.textContent = 'Nog geen outfits bewaard';
    saved.appendChild(em);
  } else {
    data.outfits.forEach((o, i) => {
      const box = document.createElement('div');
      box.className = 'panel';
      box.innerHTML = '<h2>Outfit ' + (i+1) + '</h2><p>Bewaard op ' + o.date + '</p>';
      const rr = document.createElement('div');
      rr.className = 'row';
      Object.values(o.items).forEach(id => {
        const src = findImg(id);
        if(src){
          const it = document.createElement('div');
          it.className = 'piece';
          it.innerHTML = '<img src="' + src + '">';
          rr.appendChild(it);
        }
      });
      box.appendChild(rr);
      saved.appendChild(box);
    });
  }

  const recent = document.getElementById('recentRow');
  recent.innerHTML = '';
  const imgs = [];
  data.outfits.slice(-4).forEach(o => Object.values(o.items).forEach(id => {
    const src = findImg(id);
    if(src) imgs.push(src);
  }));
  if(!imgs.length){
    ['Werk outfit','Weekend','Date night','Zondag casual'].forEach(t => {
      const e = document.createElement('div');
      e.className = 'empty';
      e.style.minWidth = '220px';
      e.textContent = t;
      recent.appendChild(e);
    });
  } else {
    imgs.slice(0,4).forEach(src => {
      const it = document.createElement('div');
      it.className = 'piece';
      it.innerHTML = '<img src="' + src + '">';
      recent.appendChild(it);
    });
  }

  const wishInput = document.getElementById('file-wishitems');
  if(wishInput) {
    wishInput.onchange = e => {
      handleFile('wishitems', e.target.files[0]);
      e.target.value = '';
    };
  }
}

document.querySelectorAll('[data-screen]').forEach(b => b.onclick = () => show(b.dataset.screen));

document.getElementById('toggleAssistant').onclick = function(){
  document.getElementById('assistantBox').classList.toggle('collapsed');
  this.textContent = document.getElementById('assistantBox').classList.contains('collapsed') ? '⌄' : '⌃';
};

document.getElementById('saveOutfitBtn').onclick = saveOutfit;
document.getElementById('clearBtn').onclick = clearSlots;
document.getElementById('wishBtn').onclick = () => pick('wishitems');

document.getElementById('addCategoryBtn').onclick = function(){
  const name = prompt('Naam van nieuwe categorie?');
  if(!name) return;
  const id = 'cat_' + Date.now();
  const colors = ['#d9ecff','#dcf4e6','#ffe1e9','#fff0c9','#eadfff','#f1dfd2'];
  data.categories.push({id:id, name:name, color:colors[data.categories.length % colors.length]});
  data[id] = [];
  save();
  render();
};

render();
