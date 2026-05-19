let dt = null;
let mainCategory = 'guilds'; // 'guilds' ou 'players'
let subCategory = 'battles';  // 'battles' ou 'battlestotal'

async function loadData() {
    const server = $('#select-server').val().toLowerCase().trim(); // ex: 'americas'
    const monthValue = $('#select-month').val().toLowerCase().trim(); // ex: 'january'
    
    // Mapeamento numérico dos arquivos (1, 2, 3, 4) baseado no mês selecionado
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Constrói o caminho das pastas locais baseado nas combinações (ex: americasguildsbattlestotal)
    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    $('#total-rows').text('Carregando...');

    try {
        const response = await fetch(finalPath);
        
        if (!response.ok) {
            throw new Error(`Arquivo não localizado no caminho: ${finalPath}`);
        }
        
        const json = await response.json();
        
        // Valida se o banco de dados compacto possui a propriedade 'd' preenchida
        if (!json.d || json.d.length === 0) {
            throw new Error("O arquivo JSON existe, mas os dados ('d') estão vazios.");
        }

        render(json.d);
        
    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#top-name').text('---');
        $('#table-head').html(`<tr><th>Status: Banco Offline</th></tr>`);
        $('#tableData').html(`<tr><td style="color:#ff6b6b; padding:20px;">${err.message}</td></tr>`);
    }
}

function render(data) {
    // Destrói a instância anterior para evitar vazamento de memória e travamento de chaves
    if (dt) {
        dt.destroy();
        $('#tableData').empty();
    }
    
    // Gerencia dinamicamente os CabeçalhosOficiais solicitados no HTML
    let headersHtml = '<tr><th>RANK</th>';
    if (mainCategory === 'guilds') {
        if (subCategory === 'battles') {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    } else { // 'players'
        if (subCategory === 'battles') {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    }
    headersHtml += '</tr>';
    $('#table-head').html(headersHtml);

    // Montagem eficiente de strings no loop
    let rows = '';
    data.forEach((row, i) => {
        let cells = `<td class="font-bold text-center">#${i+1}</td>`;
        
        // Mapeia as células do array baseado estritamente na categoria ativa
        row.forEach(value => {
            let displayValue = (value !== null && value !== undefined) ? value : '-';
            
            // Aplica formatação de milhar para números grandes (Kills, Deaths, Fame)
            if (typeof value === 'number' && !isNaN(value) && value > 100) {
                displayValue = value.toLocaleString();
            }
            cells += `<td>${displayValue}</td>`;
        });

        rows += `<tr class="hover:bg-slate-800/50 transition">${cells}</tr>`;
    });

    $('#tableData').html(rows);
    
    // Define dinamicamente qual coluna será o gatilho padrão de ordenação decrescente (Abates / Kills)
    // O Rank ocupa o índice 0. Procuramos a coluna de abates baseados nas posições dinâmicas
    let defaultSortIndex = 2; // Padrão Guilds Total (Rank = 0, Guild = 1, Kills = 2)
    
    if (mainCategory === 'guilds' && subCategory === 'battles') defaultSortIndex = 4; // Time(1), ID(2), Guild(3), Kills(4)
    if (mainCategory === 'players' && subCategory === 'battles') defaultSortIndex = 5; // Time(1), ID(2), Player(3), Guild(4), Kills(5)
    if (mainCategory === 'players' && subCategory === 'battlestotal') defaultSortIndex = 3; // Player(1), Guild(2), Kills(3)

    // Inicializa o DataTables nativo com recursos completos de pesquisa e performance de rolagem
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[defaultSortIndex, "desc"]],
        pageLength: 50,
        language: { 
            search: "PROCURAR:",
            lengthMenu: "MOSTRAR _MENU_",
            info: "Mostrando _TOTAL_ registros",
            paginate: {
                first: "«",
                last: "»",
                next: "›",
                previous: "‹"
            }
        }
    });

    // Atualiza os seletores de meta informativos no topo da interface
    if (data[0] && data[0][0]) {
        // Se for aba de batalha, o índice 0 costuma ser o Time ou ID. Filtramos para pegar o nome
        let topNameIndex = (subCategory === 'battles') ? 2 : 0; 
        $('#top-name').text(data[0][topNameIndex] || data[0][0]);
    }
    $('#total-rows').text(data.length.toLocaleString());
}

// Inicialização e Gerenciamento de Cliques via jQuery
$(document).ready(() => {
    // Escuta mudanças nos seletores globais de Servidor e Mês
    $('#select-server, #select-month').on('change', () => {
        loadData();
    });

    // Evento para Abas Principais (Nível 1)
    $('.main-tab-btn').on('click', function() {
        $('.main-tab-btn').classList.remove('active'); // Nota: se der erro de seletor puro, use jQuery:
        $('.main-tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-type');
        
        // Atualiza os textos dos botões de sub-abas dinamicamente
        const label = mainCategory.toUpperCase();
        $('#btn-battles').text(`${label} BATTLES`);
        $('#btn-total').text(`${label} TOTAL`);

        loadData();
    });

    // Evento para Sub-Abas (Nível 2)
    $('.sub-tab-btn').on('click', function() {
        $('.sub-tab-btn').removeClass('active');
        $(this).addClass('active');

        subCategory = $(this).attr('data-sub');
        loadData();
    });

    // Carregamento Inicial Forçado
    loadData();
});