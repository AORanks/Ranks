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

    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    console.log(`[AO Ranks] Carregando: ${finalPath}`);
    $('#total-rows').text('Carregando...');

    // 1. DESTRUIÇÃO TOTAL E AGRESSIVA DO DATATABLES ANTES DE QUALQUER FETCH
    if (dt) {
        dt.clear().destroy();
        dt = null;
    }
    
    // Força a remoção completa de qualquer resíduo de colunas e dados velhos
    $('#rankTable').empty(); 
    
    // Recria a estrutura mínima limpa para o DataTables não se perder
    $('#rankTable').html('<thead id="table-head"></thead><tbody id="tableData"></tbody>');

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
        
        $('#table-head').html(`<tr><th>ERRO DE AMBIENTE / ARQUIVO NÃO LOCALIZADO</th></tr>`);
        $('#tableData').html(`
            <tr>
                <td style="color:#f59e0b; padding:25px; font-family:monospace; white-space:normal; line-height:1.6;">
                    <strong>Caminho:</strong> ${finalPath}<br><br>
                    <strong>Aviso:</strong> Se o erro for 'Failed to fetch', lembre-se de rodar o projeto através do <strong>Live Server</strong> no VS Code. O navegador bloqueia requisições locais se abrir o HTML direto com dois cliques.
                </td>
            </tr>
        `);
    }
}

function renderTable(data) {
    const sampleRow = data[0];
    const totalColumns = sampleRow.length;

    // 2. DETECTA QUANTAS COLUNAS VIERAM E MONTA O CABEÇALHO EXATO
    let headersHtml = '<tr><th>RANK</th>';
    if (mainCategory === 'guilds') {
        if (totalColumns === 6) { 
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else { 
            headersHtml += `<th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    } else { 
        if (totalColumns === 7) {
            headersHtml += `<th>TIME</th><th>BATTLE ID</th><th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        } else {
            headersHtml += `<th>JOGADOR</th><th>GUILDA</th><th>ABATES</th><th>MORTES</th><th>FAMA</th>`;
        }
    }
    headersHtml += '</tr>';
    $('#table-head').html(headersHtml);

    // 3. PROCESSAMENTO EM BUFFER DE STRING (Roda em milissegundos sem congelar a CPU)
    let rowsHtml = '';
    const totalRows = data.length;
    
    for (let i = 0; i < totalRows; i++) {
        let cells = `<td class="font-bold text-center" style="color: #f59e0b;">#${i + 1}</td>`;
        const row = data[i];
        const rowLen = row.length;
        
        for (let j = 0; j < rowLen; j++) {
            let val = row[j];
            let cleanVal = (val !== null && val !== undefined) ? val : '-';
            
            if (typeof val === 'number' && !isNaN(val) && val > 999) {
                cleanVal = val.toLocaleString('pt-BR');
            }
            cells += `<td>${cleanVal}</td>`;
        }
        rowsHtml += `<tr>${cells}</tr>`;
    }
    $('#tableData').html(rowsHtml);

    // 4. CALCULA O ÍNDICE CORRETO DE ORDENAÇÃO DE ACORDO COM O MODELO DO JSON
    let sortColumnIndex = 1; 
    if (mainCategory === 'guilds' && totalColumns === 6) sortColumnIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortColumnIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortColumnIndex = 3;

    // 5. INICIALIZAÇÃO BLINDADA COM TIME-OUT PARA EVITAR CORRIDA DE MEMÓRIA
    setTimeout(() => {
        // Garante que o plugin não tente duplicar a inicialização sob nenhuma circunstância
        if ($.fn.DataTable.isDataTable('#rankTable')) {
            $('#rankTable').DataTable().destroy();
        }

        dt = $('#rankTable').DataTable({
            responsive: true,
            order: [[sortColumnIndex, "desc"]],
            pageLength: 50,
            deferRender: true, // Renderiza as linhas sob demanda apenas ao mudar de página
            destroy: true,     // Permite re-inicialização forçada com novas colunas
            language: { 
                search: "PROCURAR:",
                lengthMenu: "MOSTRAR _MENU_",
                info: "Mostrando _TOTAL_ registros",
                paginate: { first: "«", last: "»", next: "›", previous: "‹" }
            }
        });
    }, 20);

    // Atualiza os painéis superiores de metadados
    if (sampleRow) {
        let nameIndex = (totalColumns > 5) ? 2 : 0;
        $('#top-name').text(sampleRow[nameIndex] || sampleRow[0]);
    }
    $('#total-rows').text(totalRows.toLocaleString('pt-BR'));
}

$(document).ready(() => {
    // Escuta seletores normais
    $('#select-server, #select-month').on('change', () => {
        loadData();
    });

    // Escuta cliques nas abas planas de um nível só
    $('.tab-btn').on('click', function() {
        if ($(this).hasClass('active')) return; // Evita cliques duplicados na mesma aba ativa
        
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        mainCategory = $(this).attr('data-main');
        subCategory = $(this).attr('data-sub');

        loadData();
    });

    // Dispara a primeira execução ao abrir o site
    loadData();
});