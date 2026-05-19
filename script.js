let currentCategory = 'guildsbattles';
let allDataRows = []; 
let currentIndex = 0;
const rowsPerPage = 100; // Mantém a paginação para o navegador carregar instantaneamente

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById('load-more-btn')) {
        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.innerText = 'Carregar Mais Registros';
        btn.style = 'display:none; margin: 20px auto; padding: 10px 20px; background: #00ff87; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
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
    applyFilters();
}

function applyFilters() {
    const server = document.getElementById('select-server').value.toLowerCase().trim(); 
    const month = document.getElementById('select-month').value.toLowerCase().trim();
    
    // O nome da pasta local é exatamente o nome da categoria/aba
    let folderName = currentCategory; 
    let fileName = "";

    // Mapeamento exato dos nomes dos arquivos conforme seus prints do GitHub
    if (currentCategory === 'guildsbattles') {
        fileName = `guilds${server}${month}.json`;
    } else if (currentCategory === 'guildsbattlestotal') {
        fileName = `guilds${server}${month}total.json`;
    } else if (currentCategory === 'playersbattles') {
        fileName = `players${server}${month}.json`;
    } else if (currentCategory === 'playersbattlestotal') {
        fileName = `players${server}${month}total.json`;
    }

    // CORREÇÃO DO CAMINHO: Aponta para a subpasta correta dentro do repositório
    const finalPath = `./${folderName}/${fileName}`;
    document.getElementById('panel-title').innerText = `Buscando: ${folderName} ➔ ${fileName}`;

    let columnsVisual = [];
    if (currentCategory === 'guildsbattles') {
        columnsVisual = ['Time', 'Battle ID', 'Guild', 'Kills', 'Deaths', 'Fame'];
    } else if (currentCategory === 'playersbattles') {
        columnsVisual = ['Time', 'Battle ID', 'Player', 'Guild', 'Kills', 'Deaths', 'Fame'];
    } else if (currentCategory === 'playersbattlestotal') {
        columnsVisual = ['Player', 'Guild', 'Kills', 'Deaths', 'Fame', 'K/D'];
    } else if (currentCategory === 'guildsbattlestotal') {
        columnsVisual = ['Guild', 'Kills', 'Deaths', 'Fame', 'K/D'];
    }

    fetchData(finalPath, columnsVisual);
}

function fetchData(fullPath, columnsVisual) {
    const headerRow = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');

    headerRow.innerHTML = '<th>Carregando ranking...</th>';
    tableBody.innerHTML = '';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    fetch(fullPath)
        .then(response => {
            if (!response.ok) throw new Error(`Arquivo não localizado.`);
            return response.json();
        })
        .then(jsonData => {
            if (!jsonData || !jsonData.c || !Array.isArray(jsonData.d)) {
                headerRow.innerHTML = '<th>Aviso: Estrutura JSON compacta inválida.</th>';
                return;
            }

            const jsonColumnsNormalized = jsonData.c.map(col => 
                col.toLowerCase().replace(' ', '').replace('/', '')
            );

            headerRow.innerHTML = '';
            columnsVisual.forEach(col => {
                const th = document.createElement('th');
                th.innerText = col.toUpperCase();
                headerRow.appendChild(th);
            });

            allDataRows = jsonData.d;
            window.currentJsonColumns = jsonColumnsNormalized;
            window.currentColumnsVisual = columnsVisual;
            currentIndex = 0;

            renderNextRows();
        })
        .catch(error => {
            console.warn(error.message);
            headerRow.innerHTML = '<th>Dados indisponíveis nesta combinação</th>';
            tableBody.innerHTML = `
                <tr>
                    <td style="color: #a8a8b3; padding: 20px; line-height: 1.6;">
                        Não foi possível localizar o arquivo local:<br>
                        <strong style="color: #ff6b6b; font-family: monospace; font-size: 11px;">${fullPath}</strong><br><br>
                        <span style="color: #fff; font-weight: bold;">O que verificar:</span><br>
                        1. Certifique-se de que a subpasta contém letras minúsculas.<br>
                        2. Verifique se removeu os submódulos do Git para que os arquivos apareçam de verdade na branch main.
                    </td>
                </tr>`;
        });
}

function renderNextRows() {
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const columnsVisual = window.currentColumnsVisual;
    const jsonColumnsNormalized = window.currentJsonColumns;
    
    const end = Math.min(currentIndex + rowsPerPage, allDataRows.length);

    for (let i = currentIndex; i < end; i++) {
        const rowArray = allDataRows[i];
        const tr = document.createElement('tr');
        
        columnsVisual.forEach(col => {
            const td = document.createElement('td');
            const colNormalized = col.toLowerCase().replace(' ', '').replace('/', '');
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