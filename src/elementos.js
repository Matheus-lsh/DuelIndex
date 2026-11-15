export const elementos = {
    formulario: document.getElementById("formPesquisa"),
    resultados: document.getElementById("resultados"),
    mensagem: document.getElementById("mensagem"),
    botaoPesquisar: document.getElementById("botaoPesquisar"),
    listaCarrinhoSalvo: document.getElementById("listaCarrinhoSalvo"),
    modal: document.getElementById("modalCarta"),
    detalhesCarta: document.getElementById("detalhesCarta"),
    fecharModal: document.getElementById("fecharModal"),
    botaoAdicionarDeck: document.getElementById("adicionarDeck"),
    botaoAdicionarCarrinho: document.getElementById("adicionarCarrinho"),

    paginacao: document.getElementById("paginacao"),
    paginaAnterior: document.getElementById("paginaAnterior"),
    proximaPagina: document.getElementById("proximaPagina"),
    informacaoPagina: document.getElementById("informacaoPagina"),

    listaDeck: document.getElementById("listaDeck"),
    totalDeck: document.getElementById("totalDeck"),

    listaExtraDeck: document.getElementById("listaExtraDeck"),
    totalExtraDeck: document.getElementById("totalExtraDeck"),

    listaCarrinho: document.getElementById("listaCarrinho"),
    totalCarrinho: document.getElementById("totalCarrinho"),

    salvarDeck: document.getElementById("salvarDeck"),
    salvarCarrinho: document.getElementById("salvarCarrinho"),

    listaDecksSalvos: document.getElementById("listaDecksSalvos"),
    atualizarDecks: document.getElementById("atualizarDecks"),
    atualizarCarrinho : document.getElementById("AtualizarCarrinho"),
    nomeDeck: document.getElementById("nomeDeck"),
    listaSideDeck: document.getElementById("listaSideDeck"),
    totalSideDeck: document.getElementById("totalSideDeck"),
    botaoAdicionarSideDeck: document.getElementById("adicionarSideDeck"),
    geminiApiKey: document.getElementById("geminiApiKey"),
    mostrarChaveApi: document.getElementById("mostrarChaveApi"),
    salvarChaveApi: document.getElementById("salvarChaveApi"),
    statusChaveApi: document.getElementById("statusChaveApi")
};
let graficoHistorico = null;

if (elementos.botaoAdicionarDeck) {
    elementos.botaoAdicionarDeck.type = "button";
    elementos.botaoAdicionarDeck.textContent = "Adicionar ao deck";
}
if (elementos.botaoAdicionarCarrinho) {
    elementos.botaoAdicionarCarrinho.type = "button";
    elementos.botaoAdicionarCarrinho.textContent = "Adicionar ao carrinho";
}

export function obterFiltrosFormulario() {
    return {
        nome: document.getElementById("nome").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        tipo: document.getElementById("tipo").value.trim(),
        atributo: document.getElementById("atributo").value,
        arquetipo: document.getElementById("arquetipo").value.trim(),
        tipoCarta: document.getElementById("tipoCarta").value,
        nivel: document.getElementById("nivel").value.trim(),
        //listaExtraDeck: document.getElementById("listaExtraDeck"),
        //totalExtraDeck: document.getElementById("totalExtraDeck")
    };
}

export function limparResultados() {
    elementos.resultados.replaceChildren();
}

export function mostrarMensagem(texto) {
    elementos.mensagem.textContent = texto;
}

export function definirEstadoPesquisa(pesquisando) {
    elementos.botaoPesquisar.disabled = pesquisando;
    elementos.botaoPesquisar.textContent = pesquisando ? "Pesquisando..." : "Pesquisar cartas";
}

export function renderizarResultados(cartas, aoSelecionarCarta) {
    elementos.resultados.replaceChildren();

    cartas.forEach(carta => {
        const card = document.createElement("article");
        card.className = "carta";

        const imagem = document.createElement("img");
        imagem.src = carta.card_images?.[0]?.image_url_small || carta.card_images?.[0]?.image_url || "";
        imagem.alt = `Imagem da carta ${carta.name}`;
        imagem.className = "imagem-carta";
        imagem.loading = "lazy";

        const informacoes = document.createElement("div");
        informacoes.className = "informacoes";

        const titulo = document.createElement("h2");
        titulo.textContent = carta.name;

        informacoes.appendChild(titulo);
        card.append(imagem, informacoes);
        card.addEventListener("click", () => aoSelecionarCarta(carta));
        elementos.resultados.appendChild(card);
    });
}

export function atualizarPaginacao(paginaAtual, totalPaginas) {
    elementos.informacaoPagina.textContent =
        `Página ${paginaAtual} de ${totalPaginas}`;

    elementos.paginaAnterior.disabled = paginaAtual <= 1;
    elementos.proximaPagina.disabled = paginaAtual >= totalPaginas;

    elementos.paginacao.hidden = totalPaginas <= 1;
}

export function definirPaginacaoDesabilitada(desabilitada) {
    elementos.paginaAnterior.disabled = desabilitada;
    elementos.proximaPagina.disabled = desabilitada;
}

function adicionarCampo(container, rotulo, valor) {
    const paragrafo = document.createElement("p");
    const titulo = document.createElement("strong");
    titulo.textContent = `${rotulo}: `;
    const conteudo = document.createElement("span");
    conteudo.textContent = valor ?? "Não informado";
    paragrafo.append(titulo, conteudo);
    container.appendChild(paragrafo);
    return paragrafo;
}

function adicionarPrecos(container, carta,dadosCotacao) {
    const precos = carta.card_prices?.[0];
    const secao = document.createElement("section");
    secao.className = "secao-precos";
    const titulo = document.createElement("h3");
    titulo.textContent = "Preços da carta";
    secao.appendChild(titulo);

    if (!precos) {
        adicionarCampo(secao, "Preços", "Não disponíveis");
        container.appendChild(secao);
        return;
    }

    const plataformas = [
        { nome: "Cardmarket", chave: "cardmarket_price" },
        { nome: "TCGplayer", chave: "tcgplayer_price" },
        { nome: "eBay", chave: "ebay_price" },
        { nome: "Amazon", chave: "amazon_price" },
        { nome: "CoolStuffInc", chave: "coolstuffinc_price" }
    ];

    plataformas.forEach(plataforma => {

        const valor = precos[plataforma.chave];
        const preco = Number(valor);
        const cotacao = plataforma.chave === "cardmarket_price"
            ? dadosCotacao.cotacoes.euro.valor
            : dadosCotacao.cotacoes.dolar.valor;

        const impostoImport = plataforma.chave === "cardmarket_price"
            ? dadosCotacao.impostos.uniao_europeia.imposto_importacao
            : dadosCotacao.impostos.estados_unidos.imposto_importacao;
        if(plataforma.chave != "cardmarket"){
            console.log(impostoImport); 
        }
        const precoConvertido = preco * cotacao + impostoImport;

        const formatado = valor === null || valor === undefined || valor === ""
            ? "Não disponível"
            : Number.isFinite(preco) && Number.isFinite(cotacao) && preco > 0
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                }).format(precoConvertido)
                : "Não disponível";

        adicionarCampo(secao, plataforma.nome, formatado);
    });

    container.appendChild(secao);
}

export function abrirModal() {
    if (elementos.modal.open) elementos.modal.close();
    elementos.modal.scrollTop = 0;
    elementos.modal.showModal();
    requestAnimationFrame(() => { elementos.modal.scrollTop = 0; });
}

export function fecharModal() {
    if (elementos.modal.open) elementos.modal.close();
}

export function renderizarDetalhesCarta(carta, status,jsonImpCot,aoConsultarHistorico) {
    const container = elementos.detalhesCarta;
    container.replaceChildren();

    const titulo = document.createElement("h2");
    titulo.textContent = carta.name;
    const imagem = document.createElement("img");
    imagem.src = carta.card_images?.[0]?.image_url || "";
    imagem.alt = carta.name;
    imagem.className = "imagem-detalhes";
    container.append(titulo, imagem);

    adicionarCampo(container, "Efeito", carta.desc);
    adicionarCampo(container, "Atributo", carta.attribute);
    adicionarCampo(container, "Tipo", carta.race);
    const ehXYZ = carta.type?.includes("XYZ");
    if (carta.level !== undefined) adicionarCampo(container, ehXYZ ? "Rank" : "Nível", carta.level);
    adicionarCampo(container, "Tipo de carta", carta.type);
    adicionarCampo(container, "Ataque", carta.atk);
    adicionarCampo(container, "Defesa", carta.def);
    adicionarCampo(container, "Arquétipo", carta.archetype);
    adicionarPrecos(container, carta,jsonImpCot);

    const secaoHistorico = document.createElement("section");
    secaoHistorico.className = "secao-historico";

    const tituloHistorico = document.createElement("h3");
    tituloHistorico.textContent = "Histórico de preços";

    const botaoHistorico = document.createElement("button");
    botaoHistorico.type = "button";
    botaoHistorico.textContent = "Consultar histórico de 12 meses";

    const mensagemHistorico = document.createElement("p");
    mensagemHistorico.textContent = "";

    const areaGrafico = document.createElement("div");
    areaGrafico.className = "area-grafico";

    const canvas = document.createElement("canvas");
    canvas.id = "graficoHistorico";

    areaGrafico.appendChild(canvas);

    botaoHistorico.addEventListener("click", async () => {
        if (aoConsultarHistorico) {
            await aoConsultarHistorico(
                carta,
                canvas,
                mensagemHistorico,
                botaoHistorico
            );
        }
    });

    secaoHistorico.append(
        tituloHistorico,
        botaoHistorico,
        mensagemHistorico,
        areaGrafico
    );

    container.appendChild(secaoHistorico);


    const campoAvancado = adicionarCampo(container, "Formato Avançado", status.avancado);
    const campoTradicional = adicionarCampo(container, "Formato Tradicional", status.tradicional);
    aplicarClasseStatus(campoAvancado, status.avancado);
    aplicarClasseStatus(campoTradicional, status.tradicional);
    abrirModal();
}

function aplicarClasseStatus(elemento, valor) {
    const classes = {
        "Forbidden": "forbidden", "Limited": "limited",
        "Semi-Limited": "semi-limited", "Free": "free"
    };
    elemento.classList.add(classes[valor] || "indisponivel");
}

function criarItemComRemocao(carta, aoRemover) {
    const item = document.createElement("li");
    const nome = document.createElement("span");
    nome.textContent = `${carta.nome} - ${carta.quantidade}x`;

    const remover = document.createElement("button");
    remover.type = "button";
    remover.textContent = "Remover 1";
    remover.addEventListener("click", () => aoRemover(carta.id));

    item.append(nome, remover);
    return item;
}

export function renderizarDeck(deck, aoRemover) {
    const total = deck.reduce((soma, carta) => soma + carta.quantidade, 0);
    elementos.listaDeck.replaceChildren();
    deck.forEach(carta => elementos.listaDeck.appendChild(criarItemComRemocao(carta, aoRemover)));
    elementos.totalDeck.textContent = `${total} / 60 cartas`;
}

export function renderizarCarrinho(carrinho, aoRemover) {
    const total = carrinho.reduce((soma, carta) => soma + carta.quantidade, 0);
    elementos.listaCarrinho.replaceChildren();
    carrinho.forEach(carta => elementos.listaCarrinho.appendChild(criarItemComRemocao(carta, aoRemover)));
    elementos.totalCarrinho.textContent = `${total} cartas`;
}



export function renderizarDecksSalvos(decks, aoRemover) {
    if (!elementos.listaDecksSalvos) return;

    elementos.listaDecksSalvos.replaceChildren();

    if (!Array.isArray(decks) || decks.length === 0) {
        const vazio = document.createElement("p");
        vazio.textContent = "Nenhum deck salvo foi encontrado.";
        elementos.listaDecksSalvos.appendChild(vazio);
        return;
    }

    decks.forEach((deck, indice) => {
        const nomeDeck = Object.keys(deck)[0] || `Deck ${indice + 1}`;
        const dados = deck[nomeDeck];

        if (!dados || typeof dados !== "object") return;

        const cartas = Array.isArray(dados[0]) ? dados[0] : [];
        const cartasExtra = Array.isArray(dados[1]) ? dados[1] : [];
        const cartasSide = Array.isArray(dados[2]) ? dados[2] : [];

        const quantidade = cartas.reduce(
            (soma, carta) => soma + Number(carta.quantidade ?? 1), 0
        );

        const totalExtra = cartasExtra.reduce(
            (soma, carta) => soma + Number(carta.quantidade ?? 1), 0
        );

        const totalSide = cartasSide.reduce(
            (soma, carta) => soma + Number(carta.quantidade ?? 1), 0
        );

        const details = document.createElement("details");
        details.className = "deck-salvo";

        const summary = document.createElement("summary");
        summary.textContent = nomeDeck;

        const botaoRemover = document.createElement("button");
        botaoRemover.type = "button";
        botaoRemover.textContent = "Remover deck";
        botaoRemover.className = "botao-remover-deck";

        botaoRemover.addEventListener("click", () => {
            aoRemover(nomeDeck, botaoRemover);
        });

        details.append(summary, botaoRemover);

        const informacoes = document.createElement("div");
        informacoes.className = "informacoes-deck";

        adicionarCampo(informacoes, "Formato", "Avançado");
        adicionarCampo(
            informacoes,
            "Quantidade no Deck Principal",
            `${quantidade} cartas`
        );
        adicionarCampo(
            informacoes,
            "Quantidade no Extra Deck",
            `${totalExtra} / 15 cartas`
        );
        adicionarCampo(
            informacoes,
            "Quantidade no Side Deck",
            `${totalSide} / 15 cartas`
        );

        details.appendChild(informacoes);

        function criarListaCartas(listaCartas, titulo) {
            const secao = document.createElement("section");

            const subtitulo = document.createElement("h4");
            subtitulo.textContent = titulo;

            const lista = document.createElement("ul");
            lista.className = "lista-cartas-deck";

            if (listaCartas.length === 0) {
                const li = document.createElement("li");
                li.textContent = "Nenhuma carta encontrada.";
                lista.appendChild(li);
            } else {
                listaCartas.forEach(carta => {
                    const li = document.createElement("li");

                    const nome = carta.nome || carta.name || `Carta ${carta.id}`;
                    const quantidadeCarta = Number(carta.quantidade ?? 1);

                    li.textContent = `${nome} - ${quantidadeCarta}x`;

                    lista.appendChild(li);
                });
            }
            secao.appendChild(lista);
            return secao;
        }
        const divPrecoTotal = document.createElement("div");
        divPrecoTotal.className = "preco-total-deck";

        const lojas = [
            { nome: "Cardmarket"},
            { nome: "TCGplayer"},
            { nome: "eBay"},
            { nome: "Amazon"},
            { nome: "CoolStuffInc"}
        ];

        const tituloPreco = document.createElement("h4");
        tituloPreco.textContent = "Preço total do deck";

        divPrecoTotal.appendChild(tituloPreco);

        const listaPrecos = document.createElement("div");
        listaPrecos.className = "lista-precos-totais";

        lojas.forEach((loja, indice) => {
            const item = document.createElement("div");
            item.className = "preco-total-loja";

            const nome = document.createElement("span");
            nome.textContent = loja.nome + ": ";

            const valor = document.createElement("strong");
            valor.textContent = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL"
            }).format(Number(deck.precos[indice].preco_total) || 0);

            item.append(nome, valor);
            listaPrecos.appendChild(item);
        });

        divPrecoTotal.appendChild(listaPrecos);

        details.appendChild(
            criarListaCartas(cartas, "Deck Principal")
        );

        details.appendChild(
            criarListaCartas(cartasExtra, "Extra Deck")
        );

        details.appendChild(
            criarListaCartas(cartasSide, "Side Deck")
        );
        details.appendChild(divPrecoTotal)        
        elementos.listaDecksSalvos.appendChild(details);
    });

}


export function renderizarExtraDeck(extraDeck, aoRemover) {
    const total = extraDeck.reduce(
        (soma, carta) => soma + carta.quantidade,
        0
    );

    elementos.listaExtraDeck.replaceChildren();

    extraDeck.forEach(carta => {
        elementos.listaExtraDeck.appendChild(
            criarItemComRemocao(carta, aoRemover)
        );
    });

    elementos.totalExtraDeck.textContent =
        `${total} / 15 cartas`;
}

export function renderizarCarrinhoSalvo(carrinho) {
    const container = elementos.listaCarrinhoSalvo;
    let item;
    if (!container) return;

    container.replaceChildren();

    const dadosCarrinho = carrinho?.[0];
    const listaCartas = dadosCarrinho?.lista;
    const precos = dadosCarrinho?.preco;

    if (!Array.isArray(listaCartas) || listaCartas.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.textContent = "Nenhum item encontrado no carrinho.";
        container.appendChild(mensagem);
        return;
    }

    const total = listaCartas.reduce(
        (soma, carta) => soma + Number(carta.quantidade ?? 1),
        0
    );

    const details = document.createElement("details");
    details.className = "carrinho-salvo";

    const summary = document.createElement("summary");
    summary.textContent = `Carrinho salvo - ${total} cartas`;

    details.appendChild(summary);

    const lista = document.createElement("ul");
    lista.className = "lista-cartas-deck";

    listaCartas.forEach((carta, indice) => {
        item = document.createElement("li");

        const nome = carta.nome || carta.name || `Carta ${carta.id}`;
        const quantidade = Number(carta.quantidade ?? 1);

        const titulo = document.createElement("p");
        titulo.textContent = `${nome} - ${quantidade}x`;

        item.appendChild(titulo);

        // Obtém os preços correspondentes à carta

        lista.appendChild(item);
    });
    const detailsPrecos = document.createElement("details");
    detailsPrecos.className = "precos-carta-salva";

    const summaryPrecos = document.createElement("summary");
    summaryPrecos.textContent = "Consultar preços";

    detailsPrecos.appendChild(summaryPrecos);
    const listaPrecos = document.createElement("ul");

    precos.forEach(({ nome, preco_total }) => {
        const preco = document.createElement("li");

        const valorFormatado = formatarMoeda(preco_total);

        preco.textContent = `${nome}: ${valorFormatado}`;

        listaPrecos.appendChild(preco);
    });

    detailsPrecos.appendChild(listaPrecos);
    details.append(detailsPrecos);
    details.appendChild(lista);
    container.appendChild(details);
}
export function formatarMoeda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) {
        return "Não disponível";
    }

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(valor);
}

export function renderizarSideDeck(cartas) {
    const lista = elementos.listaSideDeck;
    if (!lista) return;

    lista.replaceChildren();

    let total = 0;

    cartas.forEach(carta => {
        const item = document.createElement("li");

        const quantidade = Number(carta.quantidade ?? 1);
        total += quantidade;

        item.textContent = `${carta.nome} - ${quantidade}x`;

        lista.appendChild(item);
    });

    if (elementos.totalSideDeck) {
        elementos.totalSideDeck.textContent = `${total}/15 cartas`;
    }
}

export function renderizarGraficoHistorico(canvas, dados) {

    if (typeof Chart === "undefined") {
        throw new Error("Chart.js não foi carregado.");
    }

    if (graficoHistorico) {
        graficoHistorico.destroy();
        graficoHistorico = null;
    }

    const historico = [...dados.historico].sort(
        (a, b) => a.mes.localeCompare(b.mes)
    );

    const labels = historico.map(item => {
        const [ano, mes] = item.mes.split("-");

        return new Date(
            Number(ano),
            Number(mes) - 1,
            1
        ).toLocaleDateString("pt-BR", {
            month: "short",
            year: "numeric"
        });
    });

    const valores = historico.map(item =>
        item.preco === null || item.preco === undefined
            ? null
            : Number(item.preco)
    );

    if (!valores.some(Number.isFinite)) {
        throw new Error(
            "Não existem preços históricos disponíveis para gerar o gráfico."
        );
    }

    graficoHistorico = new Chart(canvas, {

        type: "line",

        data: {
            labels,

            datasets: [{
                label: `Média de Preço (${dados.moeda})`,

                data: valores,

                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.15)",

                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,

                fill: true,
                tension: 0.3,

                spanGaps: false
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: true
                },

                tooltip: {
                    callbacks: {
                        label: contexto => {
                            if (contexto.raw === null) {
                                return "Preço não disponível";
                            }

                            return new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: dados.moeda
                            }).format(contexto.raw);
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: false,

                    ticks: {
                        callback: valor =>
                            `${dados.moeda === "EUR" ? "€" : "$"} ${valor}`
                    }
                }
            }
        }
    });
}
