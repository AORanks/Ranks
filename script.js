let dt = null;
let mainCategory = 'guilds';
let subCategory = 'battles';

async function loadData() {
    const server = $('#select-server').val().toLowerCase().trim(); 
    const monthValue = $('#select-month').val().toLowerCase().trim(); 
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    // Montagem exata baseada na sua árvore de pastas real
    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    console.log(`Tentando carregar: ${finalPath}`);
    $('#total-rows').text('Carregando...');

    try {
        const response = await fetch(finalPath);
        
        if (!response.ok) {
            throw new Error(`Código ${response.status}: Não achou "${fileName}" em "${folderName}".`);
        }
        
        const json = await response.json();
        
        if (!json.d || json.d.length === 0) {
            throw new Error("A lista de dados ('d') está vazia.");
        }

        renderTable(json.d);
        
    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#top-name').text('---');
        
        if (dt) {
            dt.destroy();
            dt = null;
        }
        
        $('#table-head').html(`<tr><th>ERRO DE AMBIENTE / ARQUIVO NÃO ENCONTRADO</th></tr>`);
        $('#tableData').html(`
            <tr>
                <td style="color:#f59e0b; padding:25px; font-family:monospace; white-space:normal; line-height:1.6;">
                    <strong>Caminho Solicitado:</strong> ${finalPath}<br><br>
                    <strong>Dica de Desenvolvedor:</strong> Se aparecer 'Failed to fetch', você não pode abrir o HTML clicando duas vezes direto da pasta. Use a extensão <strong>Live Server</strong> do VS Code ou suba o código no GitHub Pages para o navegador permitir a leitura dos arquivos JSON locais!
                </td>
            </tr>
        `);
    }
}

function renderTable(data) {
    // Destrói tabela antiga se ela existir para evitar conflitos de memória
    if (dt) {
        dt.destroy();
        $('#table-head').empty();
        $('#tableData').empty();
        dt = null;
    }
    
    // DETECÇÃO AUTOMÁTICA DE COLUNAS: Lê o primeiro registro do JSON para ver o tamanho real
    const sampleRow = data[0];
    const totalColumns = sampleRow.length;

    let headersHtml = '<tr><th>RANK</th>';
    
    if (mainCategory === 'guilds') {
        if (totalColumns === 6) { // Se tiver 6 colunas de dados
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else { // Caso seja TOTAL (4 colunas de dados)
            headersHtml += `<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    } else { // Caso seja PLAYERS
        if (totalColumns === 7) {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    }
    headersHtml += '</tr>';
    $('#table-head').html(headersHtml);

    // Monta o corpo da tabela
    let rowsHtml = '';
    data.forEach((row, rowIndex) => {
        let cells = `<td class="font-bold text-center" style="color: #f59e0b;">#${rowIndex + 1}</td>`;
        
        row.forEach(val => {
            let cleanVal = (val !== null && val !== undefined) ? val : '-';
            // Formata números grandes com pontuação padrão (ex: 1.500.000)
            if (typeof val === 'number' && !isNaN(val) && val > 999) {
                cleanVal = val.toLocaleString('pt-BR');
            }
            cells += `<td>${cleanVal}</td>`;
        });
        
        rowsHtml += `<tr>${cells}</tr>`;
    });
    $('#tableData').html(rowsHtml);

    // Descobre automaticamente o índice da última coluna para ordenar por Abates/Kills por padrão
    // Em estruturas limpas do Albion, a coluna de abates costuma ser a antepenúltima (TotalColumns - 2)
    let sortColumnIndex = 2; 
    if (mainCategory === 'guilds' && totalColumns === 6) sortColumnIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortColumnIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortColumnIndex = 3;

    // Inicializa o DataTables de forma segura
    dt = $('#rankTable').DataTable({
        responsive: true,
        order: [[sortColumnIndex, "desc"]],
        pageLength: 50,
        language: { 
            search: "PROCURAR:",
            lengthMenu: "MOSTRAR _MENU_",
            info: "Mostrando _TOTAL_ registros",
            paginate: { first: "«", last: "»", next: "›", previous: "‹" }
        }
    });

    // Atualiza o topo do painel
    if (sampleRow) {
        let nameIndex = (totalColumns > 5) ? 2 : 0;
        $('#top-name').text(sampleRow[nameIndex] || sampleRow[0]);
    }
    $('#total-rows').text(data.length.toLocaleString('pt-BR'));
}

$(document).ready(() => {
    // Escuta alterações nos filtros suspensos
    $('#select-server, #select-month').on('change', () => {
        loadData();
    });

    // Gerencia cliques na barra de abas unificada
    $('.tab-btn').on('click', function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main');
        subCategory = $(this).attr('data-sub');

        loadData();
    });

    // Carga inicial do sistema
    loadData();
});