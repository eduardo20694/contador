const API_URL = "https://clicks-production-b785.up.railway.app";
let siteElements = {};
let lastClicks = {}; // Guarda último valor de cliques para cada site

// Buscar e renderizar sites
async function fetchSites() {
  const loader = document.getElementById("loader");
  const container = document.getElementById("sitesList");
  const listError = document.getElementById("listError");

  loader.style.display = "block";
  listError.textContent = "";
  container.innerHTML = "";
  siteElements = {};

  try {
    const res = await fetch(`${API_URL}/api/sites`);
    if (!res.ok) throw new Error(`Falha ao listar sites: ${res.status} ${res.statusText}`);
    const sites = await res.json();

    for (const site of sites) {
      const div = document.createElement("div");
      div.className = "site";
      div.innerHTML = `
        <div class="site-header" onclick="toggleDetails(${site.id})">
          <h3><span class="arrow" id="arrow-${site.id}">▶</span> ${site.name}</h3>
          <div class="actions">
            <a href="${API_URL}/r/${site.id}" target="_blank">Visitar</a>
            <button class="remove-btn" onclick="event.stopPropagation(); removeSite(${site.id})">Remover</button>
          </div>
        </div>
        <p>Clique: <span class="clicks" id="clicks-${site.id}">0</span></p>
        <div class="click-details" id="clickDetails-${site.id}"></div>
      `;
      container.appendChild(div);
      siteElements[site.id] = div;
      lastClicks[site.id] = 0; // inicializa o contador
    }

    if (sites.length === 0) container.innerHTML = "<p>Nenhum site cadastrado.</p>";
  } catch (err) {
    console.error(err);
    listError.textContent = `Erro ao carregar sites: ${err.message}`;
  } finally {
    loader.style.display = "none";
  }
}

// Atualiza cliques
async function updateClicks() {
  for (const siteId in siteElements) {
    try {
      const statsRes = await fetch(`${API_URL}/api/stats/${siteId}`);
      if (!statsRes.ok) throw new Error(`Falha ao buscar stats: ${statsRes.status}`);
      const stats = await statsRes.json();

      const clicksElement = document.getElementById(`clicks-${siteId}`);
      const newClicks = stats.total_clicks;
      clicksElement.textContent = newClicks;

      // Notificação de novos cliques
      const diff = newClicks - lastClicks[siteId];
      if (diff > 0) showNotification(`+${diff} CLICK${diff > 1 ? 'S' : ''}`);
      lastClicks[siteId] = newClicks;

      // Atualiza detalhes
      const detailsDiv = document.getElementById(`clickDetails-${siteId}`);
      detailsDiv.innerHTML = "";
      stats.clicks.forEach(c => {
        detailsDiv.innerHTML += `📍 Cidade: ${c.city || "-"}, ${c.region || "-"}, ${c.country || "-"} | 🕒 ${c.created_at}<br>`;
      });
    } catch (err) {
      console.error(err);
    }
  }
}

// Adicionar site
async function addSite() {
  const name = document.getElementById("siteName").value.trim();
  const url = document.getElementById("siteUrl").value.trim();
  const addError = document.getElementById("addError");
  addError.textContent = "";
  if (!name || !url) { addError.textContent = "Preencha nome e URL!"; return; }

  try {
    const res = await fetch(`${API_URL}/api/sites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url })
    });
    const data = await res.json();
    if (res.ok && data.status === "ok") {
      document.getElementById("siteName").value = "";
      document.getElementById("siteUrl").value = "";
      await fetchSites();
      updateClicks();
    } else {
      addError.textContent = data.message || "Erro ao adicionar site";
    }
  } catch (err) {
    console.error(err);
    addError.textContent = `Erro de conexão: ${err.message}`;
  }
}

// Remover site
async function removeSite(siteId) {
  if (!confirm("Tem certeza que deseja remover este site?")) return;
  try {
    const res = await fetch(`${API_URL}/api/sites/${siteId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchSites();
    } else {
      alert("Erro ao remover site");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de conexão ao remover site");
  }
}

// Toggle detalhes
function toggleDetails(siteId) {
  const detailsDiv = document.getElementById(`clickDetails-${siteId}`);
  const arrow = document.getElementById(`arrow-${siteId}`);
  const isOpen = detailsDiv.style.display === "block";
  detailsDiv.style.display = isOpen ? "none" : "block";
  arrow.classList.toggle("open", !isOpen);
}

// Notificação
function showNotification(message) {
  const container = document.getElementById("notification-container");
  const notif = document.createElement("div");
  notif.className = "notification";
  notif.textContent = message;
  container.appendChild(notif);
  setTimeout(() => notif.remove(), 3500);
}

// Inicialização
fetchSites().then(() => {
  updateClicks();
  setInterval(updateClicks, 5000);
});

// Registro do Service Worker (PWA)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
    .then(() => console.log("Service Worker registrado!"))
    .catch(err => console.log("Erro no SW:", err));
}
