let currentCategory = 'guildsbattles';
let allDataRows = []; 
let currentIndex = 0;
const rowsPerPage = 100; // Renderização em blocos para performance máxima

document.addEventListener("DOMContentLoaded", () => {
    // Cria o botão de "Carregar Mais" dinamicamente caso ele não exista
    if (!document.getElementById('load-more-btn')) {
        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.innerText = 'Carregar Mais Registros';
        btn.style = 'display:none; margin: 20px auto; padding: 10px 20px; background: #00ff87; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: monospace;';
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
    const server = document.getElementById('select-server').value.toLowerCase().trim(); // ex: americas, asia, europe
    const monthValue = document.getElementById('select-month').value.toLowerCase().trim();
    
    // Mapeia o valor do select do HTML para o número do arquivo correspondente (1, 2, 3, 4)
    let monthNumber = "1";
    if (monthValue === "january" || monthValue === "janeiro") monthNumber = "1";
    else if (monthValue === "february" || monthValue === "fevereiro") monthNumber = "2";
    else if (monthValue === "march" || monthValue === "março") monthNumber = "3";
    else if (monthValue === "april" || monthValue === "abril") monthNumber = "4";

    // Define a pasta exata baseada na nova estrutura unificada (ex: americasguildsbattles)
    const folderName = `${server}${currentCategory}`; 
    let fileName = "";

    // Mapeia o nome exato dos arquivos com os parênteses
    if (currentCategory.startsWith('guilds')) {
        fileName = `guilds (${monthNumber}).json`; // vira guilds (1).json, etc.
    } else if (currentCategory.startsWith('players')) {
        fileName = `players (${monthNumber}).json`; // vira players (1).json, etc.
    }

    // Rota local perfeita
    const finalPath = `./${folderName}/${fileName}`;
    document.getElementById('panel-title').innerText = `Diretório: ${folderName} ➔ ${fileName}`;

    // Configuração estrita dos cabeçalhos das colunas
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

    headerRow.innerHTML = '<th>Acessando arquivos locais...</th>';
    tableBody.innerHTML = '';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    fetch(fullPath)
        .then(response => {
            if (!response.ok) throw new Error(`Arquivo não encontrado localmente.`);
            return response.json();
        })
        .then(jsonData => {
            if (!jsonData || !jsonData.c || !Array.isArray(jsonData.d)) {
                headerRow.innerHTML = '<th>Aviso: Estrutura compacta vazia ou inválida.</th>';
                return;
            }

            // Normalização das chaves para bater com as chaves do banco de dados compacto ("c")
            const jsonColumnsNormalized = jsonData.c.map(col => 
                col.toLowerCase().replace(' ', '').replace('/', '').replace('_', '')
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
            console.warn("Erro detectado:", error.message);
            headerRow.innerHTML = '<th>Arquivo não localizado</th>';
            tableBody.innerHTML = `
                <tr>
                    <td style="color: #a8a8b3; padding: 20px; line-height: 1.6; font-family: monospace;">
                        Não foi possível carregar a tabela:<br>
                        <strong style="color: #ff6b6b;">${fullPath}</strong><br><br>
                        <span style="color: #fff; font-weight: bold;">Causa provável:</span> O arquivo ou a pasta não existem localmente ou o nome do mês selecionado não corresponde aos números dos arquivos da pasta.
                    </td>
                </tr>`;
        });
}

function renderNextRows() {
    const tableBody = document.getElementById('table-body');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const columnsVisual = window.currentColumnsVisual;
    const jsonColumnsNormalized = window.currentJsonColumns;
    
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