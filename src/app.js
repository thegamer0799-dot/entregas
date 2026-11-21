(function () {
  "use strict";

  // Detecta se está no Electron (via preload) ou no navegador
  const isElectron = typeof window.api !== "undefined";
  const STORAGE_KEY = "entregas_clientes_v3";

  let entregas = [];
  let filtroAtivo = "todos";

  const $ = (sel) => document.querySelector(sel);

  const form        = $("#formEntrega");
  const inputCliente = $("#cliente");
  const inputData    = $("#data");
  const lista        = $("#listaEntregas");
  const filtroBtns   = document.querySelectorAll("#filtroStatus button");
  const btnLimpar    = $("#limparTudo");

  const stats = {
    total:    $("#statTotal"),
    pendente: $("#statPendente"),
    hoje:     $("#statHoje"),
    atrasado: $("#statAtrasado"),
    entregue: $("#statEntregue"),
  };

  // ===========================
  // Persistência
  // ===========================
  async function carregar() {
    if (isElectron) {
      const dados = await window.api.lerDados();
      entregas = dados.map(sanitizar);
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        entregas = Array.isArray(parsed) ? parsed.map(sanitizar) : [];
      } catch (_) { entregas = []; }
    }
  }

  async function salvar() {
    if (isElectron) {
      await window.api.salvarDados(entregas);
    } else {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entregas)); } catch (_) {}
    }
  }

  function sanitizar(e) {
    return {
      id: Number(e.id) || Date.now() + Math.random(),
      cliente: String(e.cliente || "").slice(0, 80),
      data: String(e.data || ""),
    };
  }

  // ===========================
  // Helpers
  // ===========================
  function hojeISO() { return new Date().toISOString().slice(0, 10); }

  function calcularStatus(dataISO) {
    const hoje = hojeISO();
    if (dataISO < hoje) return "entregue";
    if (dataISO === hoje) return "hoje";
    return "pendente";
  }

  function formatarData(iso) {
    if (!iso) return "—";
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a}`;
  }

  function iniciais(nome) {
    const parts = String(nome).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[m]);
  }

  // ===========================
  // Ícones SVG
  // ===========================
  const I = {
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    clock:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`,
    alert:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    check:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
    trash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    empty:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  };

  const STATUS = {
    pendente: { label: "Pendente", cls: "badge-pendente", icon: I.clock },
    hoje:     { label: "Hoje",     cls: "badge-hoje",     icon: I.calendar },
    atrasado: { label: "Atrasado", cls: "badge-atrasado", icon: I.alert },
    entregue: { label: "Entregue", cls: "badge-entregue", icon: I.check },
  };

  // ===========================
  // Render
  // ===========================
  function renderizar() {
    const ordenadas = [...entregas].sort((a, b) => (a.data > b.data ? 1 : -1));
    const filtradas = ordenadas.filter((e) =>
      filtroAtivo === "todos" ? true : calcularStatus(e.data) === filtroAtivo
    );

    if (!filtradas.length) {
      lista.innerHTML = `
        <div class="empty">
          <div class="empty-icon">${I.empty}</div>
          <h3>Nenhuma entrega encontrada</h3>
          <p>${entregas.length === 0
            ? "Cadastre a primeira entrega usando o formulário acima."
            : "Tente ajustar o filtro de status."}</p>
        </div>`;
    } else {
      lista.innerHTML = filtradas.map((e) => {
        const st = calcularStatus(e.data);
        const m = STATUS[st];
        return `
          <div class="row" data-id="${e.id}">
            <div class="cell-client">
              <div class="avatar" aria-hidden="true">${escapeHtml(iniciais(e.cliente))}</div>
              <span class="client-name" title="${escapeHtml(e.cliente)}">${escapeHtml(e.cliente)}</span>
            </div>
            <div class="cell-date">${I.calendar}<span>${formatarData(e.data)}</span></div>
            <div class="cell-status">
              <span class="badge ${m.cls}">${m.icon}${m.label}</span>
            </div>
            <div class="cell-action">
              <button type="button" class="btn-icon" data-action="delete" data-id="${e.id}"
                aria-label="Excluir entrega de ${escapeHtml(e.cliente)}" title="Excluir">
                ${I.trash}
              </button>
            </div>
          </div>`;
      }).join("");
    }

    const c = { pendente: 0, hoje: 0, atrasado: 0, entregue: 0 };
    entregas.forEach((e) => { c[calcularStatus(e.data)]++; });
    stats.total.textContent = entregas.length;
    stats.pendente.textContent = c.pendente;
    stats.hoje.textContent = c.hoje;
    stats.atrasado.textContent = c.atrasado;
    stats.entregue.textContent = c.entregue;
  }

  // ===========================
  // Ações
  // ===========================
  async function adicionar(cliente, data) {
    entregas.push({ id: Date.now() + Math.random(), cliente: cliente.trim(), data });
    await salvar();
    renderizar();
  }

  async function remover(id) {
    entregas = entregas.filter((e) => e.id !== id);
    await salvar();
    renderizar();
  }

  async function limparTudo() {
    if (!entregas.length) return;
    if (confirm("Deseja remover TODAS as entregas? Esta ação não pode ser desfeita.")) {
      entregas = [];
      await salvar();
      renderizar();
    }
  }

  // ===========================
  // Eventos
  // ===========================
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const cliente = inputCliente.value.trim();
    const data = inputData.value;
    if (!cliente) return inputCliente.focus();
    if (!data) return inputData.focus();
    await adicionar(cliente, data);
    inputCliente.value = "";
    inputData.value = "";
    inputCliente.focus();
  });

  lista.addEventListener("click", (ev) => {
    const btn = ev.target.closest('[data-action="delete"]');
    if (!btn) return;
    remover(Number(btn.dataset.id));
  });

  filtroBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filtroBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filtroAtivo = btn.dataset.filter;
      renderizar();
    });
  });

  btnLimpar.addEventListener("click", limparTudo);

  // Importação via menu do Electron
  if (isElectron) {
    window.api.aoImportar(async (dados) => {
      entregas = dados.map(sanitizar);
      await salvar();
      renderizar();
    });
  }

  // ===========================
  // Init
  // ===========================
  (async function init() {
    await carregar();
    renderizar();
  })();
})();
