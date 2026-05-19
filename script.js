let currentCategory = 'guildsbattles';
let allDataRows = []; 
let currentIndex = 0;
const rowsPerPage = 100; // Evita travamentos na tela dividindo o carregamento em blocos

document.addEventListener("DOMContentLoaded", () => {
    // Garante que o botão de "Carregar Mais" seja injetado de forma dinâmica e limpa abaixo da tabela
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
    applyFilters();
}

function applyFilters() {
    const server = document.getElementById('select-server').value.toLowerCase().trim(); 
    const monthValue = document.getElementById('select-month').value.toLowerCase().trim();
    
    // Converte a string do select no número exato do arquivo (1, 2, 3, 4)
    let monthNumber = "1";
    if (monthValue === "january" || monthValue === "janeiro") monthNumber = "1";
    else if (monthValue === "february" || monthValue === "fevereiro") monthNumber = "2";
    else if (monthValue === "march" || monthValue === "março") monthNumber = "3";
    else if (monthValue === "april" || monthValue === "abril") monthNumber = "4";

    // Define o diretório combinando o servidor com a aba selecionada (ex: europeguildsbattlestotal)
    const folderName = `${server}${currentCategory}`; 
    let fileName = "";

    // Sincroniza os nomes de arquivos padronizados em lote
    if (currentCategory.startsWith('guilds')) {
        fileName = `guilds (${monthNumber}).json`; 
    } else if (currentCategory.startsWith('players')) {
        fileName = `players (${monthNumber}).json`; 
    }

    // Monta a URL estritamente local (./pasta/arquivo.json)
    const finalPath = `./${folderName}/${fileName}`;
    document.getElementById('panel-title')

    // Definição exata e padronizada dos cabeçalhos visuais solicitados
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
            if (!response.ok) throw new Error(`Arquivo não localizado.`);
            return response.json();
        })
        .then(jsonData => {
            // Proteção contra quebras: valida se as estruturas mapeadas 'c' (colunas) e 'd' (dados) existem
            if (!jsonData || !jsonData.c || !Array.isArray(jsonData.d)) {
                headerRow.innerHTML = '<th>ERRO: Estrutura compacta do banco de dados está vazia ou corrompida.</th>';
                return;
            }

            // Normaliza as strings da chave "c" enviadas do backend para casar com as colunas na tela
            const jsonColumnsNormalized = jsonData.c.map(col => 
                col.toLowerCase().replace(' ', '').replace('/', '').replace('_', '')
            );

            // Monta dinamicamente a linha de cabeçalhos (th)
            headerRow.innerHTML = '';
            columnsVisual.forEach(col => {
                const th = document.createElement('th');
                th.innerText = col.toUpperCase();
                headerRow.appendChild(th);
            });

            // Aloca a matriz completa de registros na memória local e zera o cursor de paginação
            allDataRows = jsonData.d;
            window.currentJsonColumns = jsonColumnsNormalized;
            window.currentColumnsVisual = columnsVisual;
            currentIndex = 0;

            // Dispara o carregamento do lote inicial
            renderNextRows();
        })
        .catch(error => {
            console.warn("Fetch Error:", error.message);
            headerRow.innerHTML = '<th>ARQUIVO INDISPONÍVEL</th>';
            tableBody.innerHTML = `
                <tr>
                    <td style="color: #a8a8b3; padding: 24px; line-height: 1.8; font-family: monospace;">
                        <span style="color: #ff6b6b; font-weight: bold;">Status 404 - Não Encontrado:</span> O navegador não localizou o arquivo no caminho esperado:<br>
                        <strong style="color: #66c2ba;">${fullPath}</strong><br><br>
                        <span style="color: #fff; font-weight: bold;">O que verificar:</span> Certifique-se de que o GitHub Actions terminou o deploy da branch <code style="color: #00ff87;">ajustes</code> e que a pasta existe no servidor com os arquivos renomeados.
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

    // Calcula o escopo do bloco atual (atual até o limite de +100 linhas ou fim do arquivo)
    const end = Math.min(currentIndex + rowsPerPage, allDataRows.length);

    for (let i = currentIndex; i < end; i++) {
        const rowArray = allDataRows[i];
        if (!Array.isArray(rowArray)) continue;

        const tr = document.createElement('tr');
        
        columnsVisual.forEach(col => {
            const td = document.createElement('td');
            // Remove espaços e caracteres especiais para fazer a correspondência de índice estável
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

    // Avança o ponteiro do cursor
    currentIndex = end;

    // Gerencia a visibilidade do botão de rolagem
    if (currentIndex < allDataRows.length) {
        if (loadMoreBtn) loadMoreBtn.style.display = 'block';
    } else {
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}