let currentCategory = 'guildsbattles';
let allDataRows = []; 
let currentIndex = 0;
const rowsPerPage = 100; 

// Variáveis para controlar o estado da ordenação
let currentSortColumn = null;
let isAscending = true;

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById('load-more-btn')) {
        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.innerText = 'CARREGAR MAIS REGISTROS';
        btn.style = 'display:none; margin: 20px auto; padding: 12px 24px; background: #00ff87; color: #000; border: none; font-family: monospace; font-weight: bold; cursor: pointer; box-shadow: 0 0 10px rgba(0, 255, 135, 0.3);';
        btn.onclick = () => renderNextRows();
        document.querySelector('.table-responsive').after(btn);
    }
    applyFilters();
});

function switchCategory(event, category) {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (event.currentTarget) event.currentTarget.classList.add('active');
    currentCategory = category;
    
    // Reseta a ordenação ao mudar de aba
    currentSortColumn = null;
    isAscending = true;
    
    applyFilters();
}

function applyFilters() {
    const server = document.getElementById('select-server').value.toLowerCase().trim(); 
    const monthValue = document.getElementById('select-month').value.toLowerCase().trim();
    
    let monthNumber = "1";
    if (monthValue === "january" || monthValue === "janeiro") monthNumber = "1";
    else if (monthValue === "february" || monthValue === "fevereiro") monthNumber = "2";
    else if (monthValue === "march" || monthValue === "março") monthNumber = "3";
    else if (monthValue === "april" || monthValue === "abril") monthNumber = "4";

    const folderName = `${server}${currentCategory}`; 
    let fileName = "";

    if (currentCategory.startsWith('guilds')) {
        fileName = `guilds (${monthNumber}).json`; 
    } else if (currentCategory.startsWith('players')) {
        fileName = `players (${monthNumber}).json`; 
    }

    const finalPath = `./${folderName}/${fileName}`;
    
    const titleElement = document.getElementById('panel-title');
    if (titleElement) {
        titleElement.innerText = `DIRETÓRIO ATIVO: ./${folderName}/${fileName}`;
    }

    let columnsVisual = [];
    if (currentCategory === 'guildsbattles') {
        columnsVisual = ['Time', 'Battle ID', 'Guild', 'Kills', 'Deaths', 'Fame'];
    } else if (currentCategory === 'guildsbattlestotal') {
        columnsVisual = ['Guild', 'Kills', 'Deaths', 'Fame'];
    } else if (currentCategory === 'playersbattles') {
        columnsVisual = ['Time', 'Battle ID', 'Player', 'Guild', 'Kills', 'Deaths', 'Fame'];
    } else if (currentCategory === 'playersbattlestotal') {
        columnsVisual = ['Player', 'Guild', 'Kills', 'Deaths', 'Fame'];
    }

    fetchData(finalPath, columnsVisual);
}

function fetchData(fullPath, columnsVisual) {
    const headerRow = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');

    headerRow.innerHTML = '<th>ACESSANDO BANCO DE DADOS LOCAL...</th>';
    tableBody.innerHTML = '';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    fetch(fullPath)
        .then(response => {
            if (!response.ok) throw new Error(`Status ${response.status}: Arquivo não localizado.`);
            return response.json();
        })
        .then(jsonData => {
            if (!jsonData || !jsonData.c || !Array.isArray(jsonData.d)) {
                headerRow.innerHTML = '<th>ERRO: Estrutura compacta vazia ou inválida.</th>';
                return;
            }

            const jsonColumnsNormalized = jsonData.c.map(col => 
                col.toLowerCase().replace(' ', '').replace('/', '').replace('_', '')
            );

            allDataRows = jsonData.d;
            window.currentJsonColumns = jsonColumnsNormalized;
            window.currentColumnsVisual = columnsVisual;
            currentIndex = 0;

            // Se o usuário já tiver clicado para ordenar antes, mantém a ordenação ao atualizar filtros
            if (currentSortColumn) {
                sortData(currentSortColumn, false);
            } else {
                renderHeaders();
                renderNextRows(true);
            }
        })
        .catch(error => {
            console.warn("Fetch Error:", error.message);
            headerRow.innerHTML = '<th>ARQUIVO INDISPONÍVEL</th>';
            tableBody.innerHTML = `
                <tr>
                    <td style="color: #a8a8b3; padding: 24px; line-height: 1.8; font-family: monospace;">
                        <span style="color: #ff6b6b; font-weight: bold;">Erro de Carregamento:</span> O arquivo local não foi encontrado:<br>
                        <strong style="color: #66c2ba;">${fullPath}</strong><br><br>
                        <span style="color: #fff; font-weight: bold;">Verifique se as pastas locais existem com os arquivos renomeados.</span>
                    </td>
                </tr>`;
        });
}

// Função dedicada a renderizar os cabeçalhos com eventos de clique
function renderHeaders() {
    const headerRow = document.getElementById('table-header');
    const columnsVisual = window.currentColumnsVisual;
    
    headerRow.innerHTML = '';
    columnsVisual.forEach(col => {
        const th = document.createElement('th');
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        
        // Adiciona a seta indicadora se a coluna for a que está ordenando atualmente
        let arrow = '';
        if (col === currentSortColumn) {
            arrow = isAscending ? ' ▲' : ' ▼';
        }
        
        th.innerText = col.toUpperCase() + arrow;
        
        // Evento de clique para ordenar
        th.onclick = () => sortData(col, true);
        headerRow.appendChild(th);
    });
}

// Função que processa a ordenação dos dados em memória
function sortData(columnName, toggleDirection) {
    const jsonColumnsNormalized = window.currentJsonColumns;
    
    // Encontra o índice da coluna correspondente dentro do array do JSON
    const colNormalized = columnName.toLowerCase().replace(' ', '').replace('/', '').replace('_', '');
    const indexInJson = jsonColumnsNormalized.indexOf(colNormalized);
    
    if (indexInJson === -1) return; // Coluna não mapeada no JSON, ignora

    if (toggleDirection) {
        if (currentSortColumn === columnName) {
            isAscending = !isAscending; // Inverte a direção (Ascendente <-> Descendente)
        } else {
            currentSortColumn = columnName;
            isAscending = true; // Nova coluna começa sempre crescente
        }
    }

    // Ordena o array principal de linhas de dados baseado no tipo do valor
    allDataRows.sort((rowA, rowB) => {
        let valA = rowA[indexInJson];
        let valB = rowB[indexInJson];

        // Trata valores nulos ou vazios jogando-os para o fim
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        // Se forem números (Kills, Deaths, Fame, Battle ID), faz conversão numérica para ordenar correto
        const numA = Number(valA);
        const numB = Number(valB);
        
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return isAscending ? numA - numB : numB - numA;
        }

        // Se for string (Guild, Player, Time), usa ordenação textual alfabética
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return isAscending ? -1 : 1;
        if (strA > strB) return isAscending ? 1 : -1;
        return 0;
    });

    // Reseta o ponteiro de paginação, atualiza cabeçalhos visuais e re-renderiza as linhas ordenadas
    currentIndex = 0;
    renderHeaders();
    renderNextRows(true);
}

function renderNextRows(clearTable = false) {
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const columnsVisual = window.currentColumnsVisual;
    const jsonColumnsNormalized = window.currentJsonColumns;
    
    if (clearTable) {
        tableBody.innerHTML = '';
    }
    
    if (!Array.isArray(allDataRows) || allDataRows.length === 0) return;

    const end = Math.min(currentIndex + rowsPerPage, allDataRows.length);

    for (let i = currentIndex; i < end; i++) {
        const rowArray = allDataRows[i];
        if (!Array.isArray(rowArray)) continue;

        const tr = document.createElement('tr');
        
        columnsVisual.forEach(col => {
            const td = document.createElement('td');
            const colNormalized = col.toLowerCase().replace(' ', '').replace('/', '').replace('_', '');
            const indexInJson = jsonColumnsNormalized.indexOf(colNormalized);
            
            let val = '-';
            if (indexInJson !== -1 && rowArray[indexInJson] !== undefined) {
                val = rowArray[indexInJson];
            }
            
            td.innerText = (val !== null) ? val : '-';
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    }

    currentIndex = end;

    if (currentIndex < allDataRows.length) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'block';
    } else {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}