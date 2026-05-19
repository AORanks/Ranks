let dt = null;
let mainCategory = 'guilds';
let subCategory = 'battles';

async function loadData() {
    // 1. Pega os valores dos seletores do HTML
    const server = $('#select-server').val().toLowerCase().trim();
    const monthValue = $('#select-month').val().toLowerCase().trim();
    
    // 2. Converte o texto selecionado exatamente para o número correspondente do seu arquivo
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // 3. Monta a rota corrigida seguindo seu padrão: ./americasguildsbattles/guilds (1).json
    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    console.log(`[AO Ranks] Tentando carregar: ${finalPath}`);

    try {
        const response = await fetch(finalPath);
        if (!response.ok) throw new Error(`Arquivo não encontrado no servidor.`);
        
        const json = await response.json();
        renderTable(json.d);
    } catch (err) {
        console.error(err);
        // Exibe mensagem amigável na tela em caso de erro de arquivo
        $('#table-wrapper').html(`
            <div style="color: #f59e0b; font-family: monospace; padding: 25px; border: 1px dashed #334155;">
                <strong>[ERRO 404]:</strong> Não foi possível carregar os dados.<br>
                <strong>Caminho testado:</strong> ${finalPath}<br><br>
                <em>Verifique se a pasta e o arquivo existem exatamente com esse nome no seu projeto.</em>
            </div>
        `);
    }
}

function renderTable(data) {
    // Limpa a instância do DataTables anterior se ela existir para evitar congelamento
    if (dt) {
        dt.destroy();
        dt = null;
    }

    // Recria o esqueleto limpo da tabela para não misturar colunas de larguras diferentes
    $('#table-wrapper').html(`
        <table id="rankTable" class="display nowrap" style="width:100%">
            <thead id="table-head"></thead>
            <tbody id="tableData"></tbody>
        </table>
    `);

    // Detecta quantas colunas o JSON possui para injetar os nomes certos
    const totalColumns = data[0].length;
    let headers = '<tr><th>RANK</th>';
    
    if (mainCategory === 'guilds') {
        headers += (totalColumns === 6)
            ? '<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>'
            : '<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
    } else {
        headers += (totalColumns === 7)
            ? '<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>'
            : '<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>';
    }
    headers += '</tr>';
    $('#table-head').html(headers);

    // Renderiza as linhas de dados usando um loop estruturado simples
    let rowsHtml = '';
    for (let i = 0; i < data.length; i++) {
        let cells = `<td style="color: #f59e0b; font-weight: bold; text-align: center;">#${i + 1}</td>`;
        for (let j = 0; j < data[i].length; j++) {
            let val = data[i][j];
            let cleanVal = (val !== null && val !== undefined) ? val : '-';
            
            // Formata números grandes com pontos (ex: 1.500.000)
            if (typeof val === 'number' && val > 999) {
                cleanVal = val.toLocaleString('pt-BR');
            }
            cells += `<td>${cleanVal}</td>`;
        }
        rowsHtml += `<tr>${cells}</tr>`;
    }
    $('#tableData').html(rowsHtml);

    // Mapeia o índice correto da coluna de Abates (Kills) para ordenação automática padrão
    let sortIndex = 1;
    if (mainCategory === 'guilds' && totalColumns === 6) sortIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortIndex = 3;

    // Inicializa o DataTables de forma isolada
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[sortIndex, "desc"]],
        pageLength: 25,
        deferRender: true,
        language: {
            search: "PROCURAR:",
            lengthMenu: "MOSTRAR _MENU_",
            info: "Registros: _TOTAL_",
            paginate: { next: "›", previous: "‹" }
        }
    });
}

// Configuração simples dos eventos ao inicializar a página
$(document).ready(() => {
    // Escuta mudanças nos seletores normais
    $('#select-server, #select-month').on('change', loadData);

    // Escuta os cliques nas abas unificadas originais
    $('.tab-btn').on('click', function() {
        if ($(this).hasClass('active')) return;

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main');
        subCategory = $(this).attr('data-sub');

        loadData();
    });

    // Primeira execução automática
    loadData();
});