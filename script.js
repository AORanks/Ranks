let mainCategory = 'guilds'; // 'guilds' ou 'players'
let subCategory = 'battles';  // 'battles' ou 'battlestotal'
let allDataRows = []; 
let currentIndex = 0;
const rowsPerPage = 100; 

// Estado de Ordenação
let currentSortColumn = null;
let isAscending = true;

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById('load-more-btn')) {
        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.innerText = 'CARREGAR MAIS REGISTROS';
        btn.className = 'load-more-style'; // Definido no CSS
        btn.onclick = () => renderNextRows();
        document.querySelector('.table-responsive').after(btn);
    }
    updateSubTabsUI();
    applyFilters();
});

// Nível 1: Alternar entre Guilds e Players
function switchMainCategory(event, category) {
    const buttons = document.querySelectorAll('.main-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    mainCategory = category;
    updateSubTabsUI();
    resetSortAndApply();
}

// Nível 2: Alternar entre Battles e Total
function switchSubCategory(event, sub) {
    const buttons = document.querySelectorAll('.sub-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    subCategory = sub;
    resetSortAndApply();
}

// Atualiza o texto dos botões de sub-aba para ficar mais claro
function updateSubTabsUI() {
    const label = mainCategory.toUpperCase();
    document.getElementById('btn-battles').innerText = `${label} BATTLES`;
    document.getElementById('btn-total').innerText = `${label} TOTAL`;
}

function resetSortAndApply() {
    currentSortColumn = null;
    isAscending = true;
    applyFilters();
}

function applyFilters() {
    const server = document.getElementById('select-server').value.toLowerCase().trim(); 
    const monthValue = document.getElementById('select-month').value.toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // CONSTRUÇÃO DO CAMINHO: ex americas + guilds + battles
    const folderName = `${server}${mainCategory}${subCategory}`; 
    const fileName = `${mainCategory} (${monthNumber}).json`; 

    const finalPath = `./${folderName}/${fileName}`;
    console.log(`Path: ${finalPath}`);

    // Definição de Colunas conforme sua solicitação
    let columnsVisual = [];
    if (mainCategory === 'guilds') {
        if (subCategory === 'battles') {
            columnsVisual = ['Time', 'Battle ID', 'Guild', 'Kills', 'Deaths', 'Fame'];
        } else {
            columnsVisual = ['Guild', 'Kills', 'Deaths', 'Fame'];
        }
    } else { // Players
        if (subCategory === 'battles') {
            columnsVisual = ['Time', 'Battle ID', 'Player', 'Guild', 'Kills', 'Deaths', 'Fame'];
        } else {
            columnsVisual = ['Player', 'Guild', 'Kills', 'Deaths', 'Fame'];
        }
    }

    fetchData(finalPath, columnsVisual);
}

// --- Restante das funções (Fetch, Sort, Render) permanecem com a mesma lógica robusta ---

function fetchData(fullPath, columnsVisual) {
    const headerRow = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');

    headerRow.innerHTML = '<th>ACESSANDO BANCO DE DADOS...</th>';
    tableBody.innerHTML = '';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    fetch(fullPath)
        .then(response => {
            if (!response.ok) throw new Error("404");
            return response.json();
        })
        .then(jsonData => {
            if (!jsonData || !jsonData.c) return;

            const jsonColumnsNormalized = jsonData.c.map(col => 
                col.toLowerCase().replace(/[\s/_]/g, '')
            );

            allDataRows = jsonData.d;
            window.currentJsonColumns = jsonColumnsNormalized;
            window.currentColumnsVisual = columnsVisual;
            currentIndex = 0;

            if (currentSortColumn) {
                sortData(currentSortColumn, false);
            } else {
                renderHeaders();
                renderNextRows(true);
            }
        })
        .catch(() => {
            headerRow.innerHTML = '<th>ARQUIVO NÃO LOCALIZADO</th>';
        });
}

function renderHeaders() {
    const headerRow = document.getElementById('table-header');
    const columnsVisual = window.currentColumnsVisual;
    headerRow.innerHTML = '';
    columnsVisual.forEach(col => {
        const th = document.createElement('th');
        th.style.cursor = 'pointer';
        let arrow = col === currentSortColumn ? (isAscending ? ' ▲' : ' ▼') : '';
        th.innerText = col.toUpperCase() + arrow;
        th.onclick = () => sortData(col, true);
        headerRow.appendChild(th);
    });
}

function sortData(columnName, toggleDirection) {
    const jsonCols = window.currentJsonColumns;
    const colNorm = columnName.toLowerCase().replace(/[\s/_]/g, '');
    const idx = jsonCols.indexOf(colNorm);
    if (idx === -1) return;

    if (toggleDirection) {
        if (currentSortColumn === columnName) isAscending = !isAscending;
        else { currentSortColumn = columnName; isAscending = true; }
    }

    allDataRows.sort((a, b) => {
        let vA = a[idx], vB = b[idx];
        const nA = Number(vA), nB = Number(vB);
        if (!isNaN(nA) && !isNaN(nB)) return isAscending ? nA - nB : nB - nA;
        return isAscending ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });

    currentIndex = 0;
    renderHeaders();
    renderNextRows(true);
}

function renderNextRows(clear = false) {
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (clear) tableBody.innerHTML = '';
    
    const end = Math.min(currentIndex + rowsPerPage, allDataRows.length);
    for (let i = currentIndex; i < end; i++) {
        const tr = document.createElement('tr');
        window.currentColumnsVisual.forEach(col => {
            const td = document.createElement('td');
            const idx = window.currentJsonColumns.indexOf(col.toLowerCase().replace(/[\s/_]/g, ''));
            td.innerText = idx !== -1 ? allDataRows[i][idx] : '-';
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    }
    currentIndex = end;
    loadMoreBtn.style.display = currentIndex < allDataRows.length ? 'block' : 'none';
}