let dt = null;

async function loadData() {
    const server = $('#select-server').val().toLowerCase().trim(); 
    const mainCategory = $('#select-type').val().toLowerCase().trim(); // 'guilds' ou 'players'
    const subCategory = $('#select-mode').val().toLowerCase().trim(); // 'battles' ou 'battlestotal'
    const monthValue = $('#select-month').val().toLowerCase().trim(); 
    
    let monthNumber = "1";
    if (monthValue.includes("jan")) monthNumber = "1";
    else if (monthValue.includes("feb")) monthNumber = "2";
    else if (monthValue.includes("mar")) monthNumber = "3";
    else if (monthValue.includes("apr")) monthNumber = "4";

    const folderName = `${server}${mainCategory}${subCategory}`;
    const fileName = `${mainCategory} (${monthNumber}).json`;
    const finalPath = `./${folderName}/${fileName}`;

    console.log(`[AO Ranks] Carregando rota: ${finalPath}`);
    $('#total-rows').text('Carregando...');

    // 1. DESTRUIÇÃO PREVENTIVA DA INSTÂNCIA ANTERIOR DO DATATABLES
    if (dt) {
        dt.clear().destroy();
        dt = null;
    }
    
    // Raspa completamente a tabela física para apagar as larguras e dados antigos de cache
    $('#rankTable').empty(); 
    $('#rankTable').html('<thead id="table-head"></thead><tbody id="tableData"></tbody>');

    try {
        const response = await fetch(finalPath);
        
        if (!response.ok) {
            throw new Error(`Código ${response.status}: Não localizou "${fileName}" na pasta "${folderName}".`);
        }
        
        const json = await response.json();
        
        if (!json.d || json.d.length === 0) {
            throw new Error("O campo de dados ('d') do JSON está vazio.");
        }

        renderTable(json.d, mainCategory);
        
    } catch (err) {
        console.error(err);
        $('#total-rows').text('Erro');
        $('#top-name').text('---');
        
        $('#table-head').html(`<tr><th>ERRO DE AMBIENTE / ARQUIVO NÃO ENCONTRADO</th></tr>`);
        $('#tableData').html(`
            <tr>
                <td style="color:#f59e0b; padding:25px; font-family:monospace; white-space:normal; line-height:1.6;">
                    <strong>Tentativa no arquivo:</strong> ${finalPath}<br><br>
                    <strong>Nota:</strong> Certifique-se de carregar este projeto via <strong>Live Server</strong> (VS Code) para permitir requisições de arquivos locais.
                </td>
            </tr>
        `);
    }
}

function renderTable(data, mainCategory) {
    const sampleRow = data[0];
    const totalColumns = sampleRow.length;

    // 2. MONTAGEM DO CABEÇALHO BASEADO NO MODELO DETECTADO DO JSON
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

    // 3. PROCESSAMENTO DE STRINGS EM LOOP ULTRA RÁPIDO FOR
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

    // 4. MAPEAMENTO AUTOMÁTICO DO GATILHO DE ORDENAÇÃO DE ABATES (KILLS)
    let sortColumnIndex = 1; 
    if (mainCategory === 'guilds' && totalColumns === 6) sortColumnIndex = 4;
    if (mainCategory === 'players' && totalColumns === 7) sortColumnIndex = 5;
    if (mainCategory === 'players' && totalColumns === 5) sortColumnIndex = 3;

    // 5. INICIALIZAÇÃO BLINDADA COM DELAY SEGURO DE SEGMENTO DE MEMÓRIA
    setTimeout(() => {
        if ($.fn.DataTable.isDataTable('#rankTable')) {
            $('#rankTable').DataTable().destroy();
        }

        dt = $('#rankTable').DataTable({
            responsive: true,
            order: [[sortColumnIndex, "desc"]],
            pageLength: 50,
            deferRender: true, // Paginação sob demanda (não engasga navegadores)
            destroy: true,
            language: { 
                search: "PROCURAR:",
                lengthMenu: "MOSTRAR _MENU_",
                info: "Mostrando _TOTAL_ registros",
                paginate: { first: "«", last: "»", next: "›", previous: "‹" }
            }
        });
    }, 20);

    // Atualiza metadados do topo
    if (sampleRow) {
        let nameIndex = (totalColumns > 5) ? 2 : 0;
        $('#top-name').text(sampleRow[nameIndex] || sampleRow[0]);
    }
    $('#total-rows').text(totalRows.toLocaleString('pt-BR'));
}

$(document).ready(() => {
    // Escuta qualquer mudança em qualquer um dos 4 seletores e executa na hora
    $('#select-server, #select-type, #select-mode, #select-month').on('change', () => {
        loadData();
    });

    // Primeira carga ao carregar o DOM
    loadData();
});