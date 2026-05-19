let currentCategory = 'guildsbattles';
let allDataRows = []; 
let currentIndex = 0;
const rowsPerPage = 100; // Mantém a renderização leve para milhões de registros

document.addEventListener("DOMContentLoaded", () => {
    // Cria o botão de paginação dinamicamente para carregar os dados sob demanda
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
    const server = document.getElementById('select-server').value.toLowerCase().trim(); // americas, asia, europe
    const monthValue = document.getElementById('select-month').value.toLowerCase().trim();
    
    // Mapeia os meses selecionados no HTML para o número do JSON correspondente
    let monthNumber = "1";
    if (monthValue === "january" || monthValue === "janeiro") monthNumber = "1";
    else if (monthValue === "february" || monthValue === "fevereiro") monthNumber = "2";
    else if (monthValue === "march" || monthValue === "março") monthNumber = "3";
    else if (monthValue === "april" || monthValue === "abril") monthNumber = "4";

    // Define a pasta exata combinando o servidor com a aba selecionada (ex: americasguildsbattlestotal)
    const folderName = `${server}${currentCategory}`; 
    let fileName = "";

    // Mapeamento idêntico de arquivos para as pastas Battles e Totais
    if (currentCategory.startsWith('guilds')) {
        fileName = `guilds (${monthNumber}).json`; // guilds (1).json ...
    } else if (currentCategory.startsWith('players')) {
        fileName = `players (${monthNumber}).json`; // players (1).json ...
    }

    // Constrói a rota relativa local perfeita
    const finalPath = `./${folderName}/${fileName}`;
    document.getElementById('panel-title').innerText = `Diretório Local: ${folderName} ➔ ${fileName}`;

    // Definição estrita das colunas conforme o seu cabeçalho oficial
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
            if (!response.ok) throw new Error(`Arquivo local não encontrado.`);
            return response.json();
        })
        .then(jsonData => {
            // Garante estabilidade validando a estrutura do JSON otimizado ("c" e "d")
            if (!jsonData || !jsonData.c || !Array.isArray(jsonData.d)) {
                headerRow.innerHTML = '<th>Aviso: Estrutura compacta vazia ou inválida.</th>';
                return;
            }

            // Normaliza as chaves do banco para bater certinho com as colunas visuais
            const jsonColumnsNormalized = jsonData.c.map(col => 
                col.toLowerCase().replace(' ', '').replace('/', '').replace('_', '')
            );

            // Renderiza os cabeçalhos das tabelas na tela
            headerRow.innerHTML = '';
            columnsVisual.forEach(col => {
                const th = document.createElement('th');
                th.innerText = col.toUpperCase();
                headerRow.appendChild(th);
            });

            // Indexa os registros na memória para a paginação sob demanda
            allDataRows = jsonData.d;
            window.currentJsonColumns = jsonColumnsNormalized;
            window.currentColumnsVisual = columnsVisual;
            currentIndex = 0;

            renderNextRows();
        })
        .catch(error => {
            console.warn("Erro no fetch local: ", error.message);
            headerRow.innerHTML = '<th>Banco de dados offline</th>';
            tableBody.innerHTML = `
                <tr>
                    <td style="color: #a8a8b3; padding: 20px; line-height: 1.6; font-family: monospace;">
                        Não foi possível abrir o arquivo:<br>
                        <strong style="color: #ff6b6b;">${fullPath}</strong><br><br>
                        <span style="color: #fff; font-weight: bold;">Verificação:</span> Confirme se os arquivos numerados foram commitados dentro da pasta <code style="color: #00ff87;">${fullPath.split('/')[1]}</code> na branch <code style="color: #00ff87;">ajustes</code>.
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

    // Controla o fluxo do botão "Carregar Mais"
    if (currentIndex < allDataRows.length) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'block';
    } else {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}