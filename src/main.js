import {
    buscarCartas, buscarBanlist, salvarDeckApi,
    salvarCarrinhoApi, buscarDecksApi,buscarCarrinhoApi,removerDeckApi,consultarCotacoesEImpostos,
    consultarHistoricoPrecosCarta,configurarChaveGemini
} from "./api.js";

import {
    elementos, obterFiltrosFormulario, limparResultados,
    mostrarMensagem, definirEstadoPesquisa, renderizarResultados,
    atualizarPaginacao, definirPaginacaoDesabilitada,
    renderizarDetalhesCarta, fecharModal, renderizarDeck,
    renderizarCarrinho, renderizarDecksSalvos,renderizarExtraDeck,renderizarCarrinhoSalvo,renderizarSideDeck,
    renderizarGraficoHistorico
} from "./elementos.js";

const CARTAS_POR_PAGINA = 20;
const LIMITE_DECK = 60;
const MINIMO_DECK = 40;
const LIMITE_EXTRA_DECK = 15;
const LIMITE_SIDE_DECK = 15;

const TIPOS_EXTRA_DECK = [
    "Fusion Monster",
    "Synchro Monster",
    "Synchro Tuner Monster",
    "Synchro Pendulum Effect Monster",
    "XYZ Monster",
    "XYZ Pendulum Effect Monster",
    "Link Monster"
];

let deck = [];
let extraDeck = [];
let sideDeck = [];
let carrinho = [];
let decksSalvos = [];
let banlist = [];
let formato = "formato_avancado";
let paginaAtual = 1;
let totalPaginas = 1;
let filtrosPesquisa = null;
let identificadorPesquisa = 0;
let cartaSelecionada = null;
let banlistCarregada = false;
let jsonImp = null;

function normalizarTexto(texto) {
    return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function obterStatusCarta(nomeCarta) {
    if (!banlistCarregada) {
        return { avancado: "Não foi possível verificar", tradicional: "Não foi possível verificar" };
    }
    const encontrada = banlist.find(carta => normalizarTexto(carta.nome) === normalizarTexto(nomeCarta));
    if (!encontrada) return { avancado: "Free", tradicional: "Free" };
    return {
        avancado: encontrada.formato_avancado || "Free",
        tradicional: encontrada.formato_tradicional || "Free"
    };
}

function obterLimiteCarta(nome) {
    const encontrada = banlist.find(carta => normalizarTexto(carta.nome) === normalizarTexto(nome));
    if (!encontrada) return 3;
    const status = String(encontrada[formato] ?? "").toLowerCase();
    if (status.includes("forbi")) return 0;
    if (status.includes("semi")) return 2;
    if (status.includes("limit")) return 1;
    return 3;
}

function contarCartas(lista) {
    return lista.reduce((soma, carta) => soma + Number(carta.quantidade || 0), 0);
}

async function carregarPagina(pagina) {
    if (!filtrosPesquisa) return;

    const pesquisaAtual = ++identificadorPesquisa;

    limparResultados();
    mostrarMensagem("Buscando cartas...");

    elementos.paginacao.hidden = true;

    definirEstadoPesquisa(true);
    definirPaginacaoDesabilitada(true);

    try {
        const dados = await buscarCartas(filtrosPesquisa, pagina);

        console.log("Metadados da API:", dados.meta);
        console.log("Total de cartas:", dados.meta.total_rows);
        console.log("Total de páginas:", dados.meta.total_pages);
        console.log("Cartas recebidas:", dados.data.length);

        if (pesquisaAtual !== identificadorPesquisa) return;

        let cartas = dados.data;

        if (filtrosPesquisa.descricao) {
            const termo = normalizarTexto(filtrosPesquisa.descricao);

            cartas = cartas.filter(carta =>
                normalizarTexto(carta.desc || "").includes(termo)
            );
        }

        paginaAtual = pagina;
        const totalCartas = Number(dados.meta.total_rows);
        totalPaginas = Math.ceil(totalCartas / CARTAS_POR_PAGINA);

        atualizarPaginacao(paginaAtual, totalPaginas);

        if (cartas.length === 0) {
            mostrarMensagem("Nenhuma carta encontrada nesta página.");
        } else {
            renderizarResultados(cartas, selecionarCarta);

            mostrarMensagem(
                `${dados.meta.total_rows} carta(s) encontrada(s).`
            );
        }

    } catch (erro) {
        if (pesquisaAtual !== identificadorPesquisa) return;

        console.error("Erro na paginação:", erro);

        mostrarMensagem(
            "Não foi possível carregar as cartas: " + erro.message
        );

    } finally {
        if (pesquisaAtual === identificadorPesquisa) {
            definirEstadoPesquisa(false);
            definirPaginacaoDesabilitada(false);

            elementos.paginaAnterior.disabled = paginaAtual <= 1;

            elementos.proximaPagina.disabled =
                paginaAtual >= totalPaginas;
        }
    }
}

elementos.formulario.addEventListener("submit", async event => {
    event.preventDefault();

    const filtros = obterFiltrosFormulario();

    if (!Object.values(filtros).some(valor => valor !== "")) {
        mostrarMensagem("Preencha pelo menos um filtro para pesquisar.");
        return;
    }

    filtrosPesquisa = filtros;

    paginaAtual = 1;
    totalPaginas = 1;

    await carregarPagina(1);
});

elementos.paginaAnterior.addEventListener("click", async () => {
    if (paginaAtual > 1) {
        await carregarPagina(paginaAtual - 1);
    }
});

elementos.proximaPagina.addEventListener("click", async () => {
    if (paginaAtual < totalPaginas) {
        await carregarPagina(paginaAtual + 1);
    }
});

async function consultarHistoricoDaCarta(
    carta,
    canvas,
    mensagem,
    botao
) {

    try {

        botao.disabled = true;
        botao.textContent = "Consultando Gemini...";

        mensagem.textContent =
            "Pesquisando histórico de preços dos últimos 12 meses...";

        const dados = await consultarHistoricoPrecosCarta(
            carta.name
        );

        //console.log("Histórico recebido:", dados);

        renderizarGraficoHistorico(canvas, dados);

        mensagem.textContent =
            `Histórico de ${dados.carta} -` +
            `Moeda: ${dados.moeda}.`;

        if (dados.fontes?.length) {
            mensagem.textContent +=
                ` Fontes: ${dados.fontes.join(", ")}`;
        }

    } catch (erro) {

        console.error("Erro ao gerar gráfico:", erro);

        mensagem.textContent =
            "Não foi possível gerar o gráfico: " + erro.message;

    } finally {

        botao.disabled = false;
        botao.textContent = "Atualizar histórico de preços";
    }
}

function selecionarCarta(carta) {
    cartaSelecionada = carta;
    renderizarDetalhesCarta(carta, obterStatusCarta(carta.name),jsonImp,consultarHistoricoDaCarta);
}

elementos.fecharModal.addEventListener("click", fecharModal);
elementos.modal.addEventListener("click", event => {
    if (event.target === elementos.modal) fecharModal();
});

function atualizarDeck() {
    renderizarDeck(deck, removerDoDeck);
}

function adicionarAoDeck(carta) {
    if (!banlistCarregada) {
        alert("Aguarde o carregamento da banlist antes de montar o deck.");
        return;
    }

    const ehExtraDeck = pertenceAoExtraDeck(carta);

    const destino = ehExtraDeck ? extraDeck : deck;

    const limiteDestino = ehExtraDeck
        ? LIMITE_EXTRA_DECK
        : LIMITE_DECK;

    if (contarCartas(destino) >= limiteDestino) {
        alert(
            ehExtraDeck
                ? "O Extra Deck já atingiu o limite de 15 cartas!"
                : "O Deck principal já atingiu o limite de 60 cartas!"
        );
        return;
    }

    const limite = obterLimiteCarta(carta.name);

    if (limite === 0) {
        alert("Essa carta está proibida!");
        return;
    }

    const existenteDeck = deck.find(item => item.id === carta.id);
    const existenteExtra = extraDeck.find(item => item.id === carta.id);

    const quantidadeTotal =
        (existenteDeck?.quantidade || 0) +
        (existenteExtra?.quantidade || 0);

    if (quantidadeTotal >= limite) {
        alert(`Você só pode utilizar ${limite} cópia(s) dessa carta.`);
        return;
    }

    const existente = destino.find(item => item.id === carta.id);

    if (existente) {
        existente.quantidade++;
    } else {
        destino.push({
            id: carta.id,
            nome: carta.name,
            quantidade: 1,
            precos : carta.card_prices?.[0]
        });
    }

    if (ehExtraDeck) {
        atualizarExtraDeck();
    } else {
        atualizarDeck();
    }
}

function removerDoDeck(id) {
    const carta = deck.find(item => item.id === id);
    if (!carta) return;
    carta.quantidade--;
    if (carta.quantidade <= 0) deck = deck.filter(item => item.id !== id);
    atualizarDeck();
}

elementos.botaoAdicionarDeck.addEventListener("click", () => {
    if (cartaSelecionada) adicionarAoDeck(cartaSelecionada);
});

function atualizarCarrinho() {
    renderizarCarrinho(carrinho, removerDoCarrinho);
}

function adicionarAoCarrinho(carta) {
    const existente = carrinho.find(item => item.id === carta.id);
    if (existente) existente.quantidade++;
    else{
        carrinho.push({ id: carta.id, nome: carta.name, quantidade: 1 ,precos : carta.card_prices?.[0]});
    } 

    atualizarCarrinho();
}

function removerDoCarrinho(id) {
    const carta = carrinho.find(item => item.id === id);
    if (!carta) return;
    carta.quantidade--;
    if (carta.quantidade <= 0) carrinho = carrinho.filter(item => item.id !== id);
    atualizarCarrinho();
}

elementos.botaoAdicionarCarrinho.addEventListener("click", () => {
    if (cartaSelecionada) adicionarAoCarrinho(cartaSelecionada);
});

async function carregarDecksSalvos() {
    if (!elementos.listaDecksSalvos) return;

    elementos.listaDecksSalvos.textContent =
        "Carregando decks salvos...";

    try {
        decksSalvos = await buscarDecksApi();

        renderizarDecksSalvos(decksSalvos, excluirDeck);

    } catch (erro) {
        console.error("Erro ao carregar decks salvos:", erro);

        elementos.listaDecksSalvos.textContent =
            `Não foi possível carregar os decks: ${erro.message}`;
    }
}

async function excluirDeck(nomeDeck, botao) {
    const confirmar = confirm(
        `Deseja realmente remover o deck "${nomeDeck}"?`
    );

    if (!confirmar) return;

    try {
        botao.disabled = true;
        botao.textContent = "Removendo...";

        await removerDeckApi(nomeDeck);

        alert(`Deck "${nomeDeck}" removido com sucesso!`);

        await carregarDecksSalvos();

    } catch (erro) {
        console.error("Erro ao remover deck:", erro);

        alert(`Não foi possível remover o deck: ${erro.message}`);

        botao.disabled = false;
        botao.textContent = "Remover deck";
    }
}

if (elementos.atualizarDecks) {
    elementos.atualizarDecks.addEventListener(
        "click",
        carregarDecksSalvos
    );
}


if (elementos.atualizarDecks) {
    elementos.atualizarDecks.addEventListener("click", carregarDecksSalvos);
}

async function salvarDeck() {
    const nome = elementos.nomeDeck.value.trim();

    const total = contarCartas(deck);
    const totalExtra = contarCartas(extraDeck);

    if (!nome) {
        alert("Digite um nome para o deck!");
        elementos.nomeDeck.focus();
        return;
    }
    const totalSide = sideDeck.reduce(
        (soma, carta) => soma + Number(carta.quantidade ?? 1),
        0
    );

    if (total === 0 && totalExtra === 0) {
        alert("Adicione cartas ao deck antes de salvá-lo!");
        return;
    }

    if (total > LIMITE_DECK) {
        alert("O Deck principal ultrapassou o limite de 60 cartas!");
        return;
    }
    if (total < MINIMO_DECK) {
        alert("O Deck principal não cumpre o minimo de 40 cartas!");
        return;
    }

    if (totalExtra > LIMITE_EXTRA_DECK) {
        alert("O Extra Deck ultrapassou o limite de 15 cartas!");
        return;
    }

    try {
        const resp = await salvarDeckApi(
            nome,
            deck,
            extraDeck,sideDeck,
            formato,
            total,
            totalExtra,
            totalSide,
            jsonImp
        );

        console.log("Resposta da API:", resp);

        alert("Deck e Extra Deck salvos com sucesso!");

        elementos.nomeDeck.value = "";

        await carregarDecksSalvos();

    } catch (erro) {
        console.error("Erro ao salvar deck:", erro);

        alert("Erro ao salvar o deck: " + erro.message);
    }
}


async function salvarCarrinho() {
    try {
        let resp = await salvarCarrinhoApi(carrinho,jsonImp);
        alert("Carrinho salvo com sucesso!");
        console.log(resp)
    } catch (erro) {
        console.error("Erro ao salvar carrinho:", erro);
        alert("Erro ao salvar o carrinho: " + erro.message);
    }
}

elementos.atualizarCarrinho.addEventListener("click", carregarCarrinhoSalvo);
elementos.salvarDeck.addEventListener("click", salvarDeck);
elementos.salvarCarrinho.addEventListener("click", salvarCarrinho);
elementos.listaSideDeck.addEventListener("click", event => {
    if (event.target.tagName !== "BUTTON") return;

    const id = Number(event.target.dataset.id);

    removerDoSideDeck(id);
});

async function inicializar() {
    try {
        if (elementos.geminiApiKey.value) {
            jsonImp = await consultarCotacoesEImpostos();
        }
        if(jsonImp == null){
             console.log("Ativando valores padrão!")
            jsonImp = { "cotacoes": {
                    "dolar": { valor: 5.67 },
                    "euro": { valor: 6.25 }//data dia 15/11/2026
                    }
                }
        }        
        banlist = await buscarBanlist();
        banlistCarregada = true;
        console.log("Banlist carregada!");
    } catch (erro) {
        console.error("Não foi possível carregar a banlist:", erro);
        mostrarMensagem("Aviso: não foi possível carregar a banlist.");
        alert("Não foi possível carregar a banlist. A montagem do deck ficará bloqueada.");
    }
    await carregarDecksSalvos();
    await carregarCarrinhoSalvo();
    renderizarSideDeck(sideDeck);
}
function pertenceAoExtraDeck(carta) {
    return TIPOS_EXTRA_DECK.includes(carta.type);
}

function removerDoExtraDeck(id) {
    const carta = extraDeck.find(item => item.id === id);

    if (!carta) return;

    carta.quantidade--;

    if (carta.quantidade <= 0) {
        extraDeck = extraDeck.filter(item => item.id !== id);
    }

    atualizarExtraDeck();
}
function atualizarExtraDeck() {
    renderizarExtraDeck(extraDeck, removerDoExtraDeck);
}


async function carregarCarrinhoSalvo() {
    if (!elementos.listaCarrinhoSalvo) return;

    elementos.listaCarrinhoSalvo.textContent =
        "Carregando carrinho...";

    try {
        const carrinhoSalvo = await buscarCarrinhoApi();
        //const carrinhoSalvo = await carrinhoPy.json();
        console.log("Carrinho recebido da API:", carrinhoSalvo);

        renderizarCarrinhoSalvo(carrinhoSalvo);

    } catch (erro) {
        console.error("Erro ao carregar carrinho:", erro);

        elementos.listaCarrinhoSalvo.textContent =
            `Não foi possível carregar o carrinho: ${erro.message}`;
    }
}
function adicionarAoSideDeck(carta) {
    if (!existeDeckPrincipal()) {
        alert("Você precisa adicionar cartas ao Deck Principal antes de montar o Side Deck.");
        return;
    }

    const total = sideDeck.reduce(
        (soma, item) => soma + Number(item.quantidade ?? 1),
        0
    );

    if (total >= LIMITE_SIDE_DECK) {
        alert("O Side Deck já possui 15 cartas!");
        return;
    }

    sideDeck.push({
        id: carta.id,
        nome: carta.name,
        quantidade: 1,
        precos: carta.card_prices?.[0]
    });

    renderizarSideDeck(sideDeck);
}
function removerDoSideDeck(id) {
    sideDeck = sideDeck.filter(carta => carta.id !== id);

    renderizarSideDeck(sideDeck);
}
elementos.botaoAdicionarSideDeck.addEventListener("click", () => {
    if (!cartaSelecionada) return;

    adicionarAoSideDeck(cartaSelecionada);
});
function existeDeckPrincipal() {
    return deck.length > 0;
}

elementos.salvarChaveApi.addEventListener("click",async () => {

    const chave = elementos.geminiApiKey.value.trim();

    try {

        configurarChaveGemini(chave);

        elementos.statusChaveApi.textContent =
            "Chave API configurada nesta sessão.";
        jsonImp = await consultarCotacoesEImpostos();
        if(jsonImp == null){
            jsonImp = { "cotacoes": {
                    "dolar": { valor: 5.67 },
                    "euro": { valor: 6.25 }//data dia 15/11/2026
                    }
                }
        }
        elementos.statusChaveApi.style.color = "green";

        elementos.geminiApiKey.value = "";

    } catch (erro) {

        elementos.statusChaveApi.textContent = erro.message;

        elementos.statusChaveApi.style.color = "red";
    }
});

elementos.mostrarChaveApi.addEventListener("click", () => {

    const input = elementos.geminiApiKey;

    if (input.type === "password") {

        input.type = "text";

        elementos.mostrarChaveApi.textContent = "Ocultar";

    } else {

        input.type = "password";

        elementos.mostrarChaveApi.textContent = "Mostrar";
    }
});

inicializar();
