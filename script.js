let dt = null;
let mainCategory = 'guilds'; // 'guilds' ou 'players'
let subCategory = 'battles';  // 'battles' ou 'battlestotal'

async function loadData() {
    const server = $('#select-server').val().toLowerCase().trim(); // ex: 'americas'
    const monthValue = $('#select-month').val().toLowerCase().trim(); // ex: 'january'
    
    // Mapeamento numérico exato do mês para bater com o nome do arquivo: guilds (1).json
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // 1. Nome exato da pasta (ex: americasguildsbattles)
    const folderName = `${server}${mainCategory}${subCategory}`;
    
    // 2. Nome exato do arquivo (ex: guilds (1).json)
    const fileName = `${mainCategory} (${monthNumber}).json`;
    
    // =========================================================================
    // ESCOLHA SEU MODO DE HOSPEDAGEM AQUI (Descomente o que for usar e comente o outro)
    // =========================================================================
    
    // MODO A: Se você estiver testando LOCALMENTE ou no GitHub Pages direto:
    const finalPath = `./${folderName}/${fileName}`;
    
    // MODO B: Se for puxar via JSDELIVR (Insira seu usuário e repositório do GitHub aqui):
    // const USERNAME = "SeuUsuarioDoGithub";
    // const REPO = "NomeDoSeuRepositorio";
    // const finalPath = `https://cdn.jsdelivr.net/gh/${USERNAME}/${REPO}/main/${folderName}/${fileName}`;
    
    // =========================================================================

    console.log(`Buscando dados em: ${finalPath}`);
    $('#total-rows').text('Carregando...');

    try {
        const response = await fetch(finalPath);
        
        if (!response.ok) {
            throw new Error(`Código ${response.status}: Arquivo "${fileName}" não encontrado na pasta "${folderName}".`);
        }
        
        const json = await response.json();
        
        if (!json.d || json.d.length === 0) {
            throw new Error("O arquivo JSON foi lido, mas a lista de dados ('d') está vazia.");
        }

        render(json.d);
        
    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#top-name').text('---');
        
        // Exibe o erro visualmente na tabela para você saber exatamente o caminho que falhou
        $('#table-head').html(`<tr><th style="color:#ff6b6b;">ERRO DE CONEXÃO / ARQUIVO NÃO LOCALIZADO</th></tr>`);
        $('#tableData').html(`
            <tr>
                <td style="color:#ecc94b; padding:20px; font-family:monospace; white-space: normal;">
                    <strong>Tentativa de busca no caminho:</strong><br>${finalPath}<br><br>
                    <strong>Detalhes do Erro:</strong> ${err.message}
                </td>
            </tr>
        `);
    }
}

function render(data) {
    if (dt) {
        dt.destroy();
        $('#tableData').empty();
    }
    
    // Configuração dos Cabeçalhos Dinâmicos conforme a aba
    let headersHtml = '<tr><th>RANK</th>';
    if (mainCategory === 'guilds') {
        if (subCategory === 'battles') {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    } else { 
        if (subCategory === 'battles') {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    }
    headersHtml += '</tr>';
    $('#table-head').html(headersHtml);

    // Renderização das linhas do array compacto
    let rows = '';
    data.forEach((row, i) => {
        let cells = `<td class="font-bold text-center">#${i+1}</td>`;
        
        row.forEach(value => {
            let displayValue = (value !== null && value !== undefined) ? value : '-';
            if (typeof value === 'number' && !isNaN(value) && value > 100) {
                displayValue = value.toLocaleString();
            }
            cells += `<td>${displayValue}</td>`;
        });

        rows += `<tr class="hover:bg-slate-800/50 transition">${cells}</tr>`;
    });
    $('#tableData').html(rows);
    
    // Índice de ordenação padrão por Abates (Kills)
    let defaultSortIndex = 2; 
    if (mainCategory === 'guilds' && subCategory === 'battles') defaultSortIndex = 4;
    if (mainCategory === 'players' && subCategory === 'battles') defaultSortIndex = 5;
    if (mainCategory === 'players' && subCategory === 'battlestotal') defaultSortIndex = 3;

    // Inicializa o DataTables
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[defaultSortIndex, "desc"]],
        pageLength: 50,
        language: { 
            search: "PROCURAR:",
            lengthMenu: "MOSTRAR _MENU_",
            info: "Mostrando _TOTAL_ registros",
            paginate: { first: "«", last: "»", next: "›", previous: "‹" }
        }
    });

    // Atualiza metadados do topo
    if (data[0] && data[0][0]) {
        let topNameIndex = (subCategory === 'battles') ? 2 : 0; 
        $('#top-name').text(data[0][topNameIndex] || data[0][0]);
    }
    $('#total-rows').text(data.length.toLocaleString());
}

// Inicialização dos Eventos com jQuery
$(document).ready(() => {
    // Monitora mudanças nos seletores normais
    $('#select-server, #select-month').on('change', () => {
        loadData();
    });

    // Abas Principais (Nível 1)
    $('.main-tab-btn').on('click', function() {
        $('.main-tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main'); // 'guilds' ou 'players'
        
        // Atualiza dinamicamente o texto e comportamento dos botões filhos (Nível 2)
        const label = mainCategory.toUpperCase();
        $('#btn-sub-battles').text(`${label} BATTLES`);
        $('#btn-sub-total').text(`${label} TOTAL`);

        loadData();
    });

    // Sub-Abas (Nível 2)
    $('.sub-tab-btn').on('click', function() {
        $('.sub-tab-btn').removeClass('active');
        $(this).addClass('active');

        subCategory = $(this).attr('data-sub'); // 'battles' ou 'battlestotal'
        loadData();
    });

    // Executa a primeira carga automática
    loadData();
});