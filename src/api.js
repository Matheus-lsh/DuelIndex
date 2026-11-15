const API_YUGIOH = "https://db.ygoprodeck.com/api/v7/cardinfo.php";
const API_BANLIST = "http://127.0.0.1:5000/proibidas";
const API_DECKS = "http://127.0.0.1:5000/decks";
const API_CARRINHO = "http://127.0.0.1:5000/carrinho";
const CARTAS_POR_PAGINA = 20;

async function requisicaoJson(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    let dados = {};
    try { dados = await resposta.json(); } catch {  }
    if (!resposta.ok) {
        throw new Error(dados.error || dados.erro || `Erro HTTP ${resposta.status}`);
    }
    return dados;
}

export async function buscarCartas(filtros, pagina) {
    const parametros = new URLSearchParams();

    if (filtros.nome) parametros.set("fname", filtros.nome);
    if (filtros.tipo) parametros.set("race", filtros.tipo);
    if (filtros.atributo) parametros.set("attribute", filtros.atributo);
    if (filtros.arquetipo) parametros.set("archetype", filtros.arquetipo);
    if (filtros.descricao) parametros.set("desc", filtros.descricao);
    if (filtros.tipoCarta) parametros.set("type", filtros.tipoCarta);
    if (filtros.nivel) parametros.set("level", filtros.nivel);
    //parametros.set("language","pt");

    parametros.set("num", String(CARTAS_POR_PAGINA));
    parametros.set(
        "offset",
        String((pagina - 1) * CARTAS_POR_PAGINA)
    );

    const dados = await requisicaoJson(
        `${API_YUGIOH}?${parametros.toString()}`
    );

    if (!dados.data || !Array.isArray(dados.data)) {
        throw new Error(dados.error || "Nenhuma carta encontrada.");
    }

    if (!dados.meta) {
        throw new Error("A API não retornou os metadados da paginação.");
    }

    return dados;
}

export async function buscarBanlist() {
    const dados = await requisicaoJson(API_BANLIST);
    return Array.isArray(dados) ? dados : dados.data || [];
}

export async function salvarDeckApi(name,deck,extraDeck,sideDeck, formato, quantidade,quantidadeExtra,totalSide,impCot) {
    return requisicaoJson(API_DECKS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            formato, quantidade, 
            cartas: deck ,
            nome : name,
            extradeck : extraDeck,
            qtdExtra : quantidadeExtra,
            sideDeck : sideDeck,
            totalSide : totalSide,
            tributo : impCot})
    });
}

export async function buscarDecksApi() {
    const dados = await requisicaoJson(API_DECKS, { method: "GET" });
    // Aceita tanto uma lista direta quanto respostas envelopadas pela API Flask.
    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados.decks)) return dados.decks;
    if (Array.isArray(dados.data)) return dados.data;
    if (Array.isArray(dados.resultados)) return dados.resultados;
    return [];
}

export async function salvarCarrinhoApi(carrinho,jsonImp) {
    return requisicaoJson(API_CARRINHO, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartas: carrinho,tributo : jsonImp })
    });
}

export async function buscarTodasCartas(filtros) {
    const primeiraPagina = await buscarCartas(filtros, 1);

    const totalCartas = Number(primeiraPagina.meta.total_rows);

    const totalPaginas = Math.ceil(
        totalCartas / CARTAS_POR_PAGINA
    );

    let cartas = [...primeiraPagina.data];

    for (let pagina = 2; pagina <= totalPaginas; pagina++) {
        const dados = await buscarCartas(filtros, pagina);

        cartas.push(...dados.data);
    }

    return cartas;
}

export async function buscarCarrinhoApi() {
    const dados = await requisicaoJson(API_CARRINHO, {
        method: "GET"
    });

    return dados;
}


export async function removerDeckApi(nomeDeck) {
    return requisicaoJson(
        `${API_DECKS}/${encodeURIComponent(nomeDeck)}`,
        {
            method: "DELETE"
        }
    );
}


let GEMINI_API_KEY = "";

export function configurarChaveGemini(chave) {
    if (!chave || !chave.trim()) {
        throw new Error("Informe uma chave API válida.");
    }

    GEMINI_API_KEY = chave.trim();
}


export async function consultarCotacoesEImpostos() {
    if (!GEMINI_API_KEY) {
        throw new Error("Configure a chave API do Gemini primeiro.");
    }
    const prompt = `
        Pesquise informações atualizadas na internet sobre:

        1. Cotação do dólar americano (USD) em reais (BRL).
        2. Cotação do euro (EUR) em reais (BRL).

        Não invente valores.
        Se a alíquota depender do produto, explique isso.
        Se não conseguir determinar um valor, retorne null.

        Retorne EXCLUSIVAMENTE um JSON válido, sem Markdown,
        seguindo esta estrutura:

        {
            "cotacoes": {
                "dolar": {
                    "valor": float,
                },
                "euro": {
                    "valor": float,
                }
            }
        }

        Todos os percentuais e cotações devem ser números,
        e não strings.

        IMPORTANTE:
        - Não utilize comentários no JSON.
        - Não coloque explicações fora do JSON.
        - Valores desconhecidos devem ser null.
    `;

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {

        const resposta = await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],

                tools: [
                    {
                        google_search: {}
                    }
                ]
            })
        });

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP: ${resposta.status} - ${await resposta.text()}`
            );
        }

        const dados = await resposta.json();

        const texto = dados.candidates?.[0]?.content?.parts
            ?.map(parte => parte.text ?? "")
            .join("");

        if (!texto) {
            throw new Error(
                "O Gemini não retornou nenhum conteúdo."
            );
        }

        const jsonLimpo = texto
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const resultado = JSON.parse(jsonLimpo);

        return resultado;

    } catch (erro) {

        console.error("Erro ao consultar a cotação", erro.message);
        return null;
    }
}

export async function consultarHistoricoPrecosCarta(nomeCarta) {
    if (!GEMINI_API_KEY) {
        throw new Error("Configure a chave API do Gemini primeiro.");
    }
    if (!nomeCarta || !nomeCarta.trim()) {
        throw new Error("Informe o nome da carta.");
    }

    const prompt = `
        Pesquise o histórico de preços da carta de Yu-Gi-Oh!:
        "${nomeCarta}"

        Quero a media geral da flutuação de preço
        durante os últimos 12 meses.

        Retorne 12 registros, um para cada mês, em ordem
        cronológica, utilizando os preços históricos encontrados.

        Regras:
        - Pesquise especificamente a carta informada.
        - Não confunda cartas com nomes semelhantes.
        - Não invente preços históricos.
        - Se não encontrar o preço de determinado mês,
          utilize null.
        - Informe as fontes consultadas.
        - Informe a data da consulta.

        Retorne exclusivamente um JSON válido,
        sem Markdown, nesta estrutura:

        {
            "carta": "${nomeCarta}",
             "moeda": "USD",
            "historico": [
                {
                    "mes": "2025-12",
                    "preco": float | null
                }
            ],
            "fontes": []
        }

        O array historico deve conter os 12 meses.
        O campo preco deve ser numérico ou null.
    `;

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {

        const resposta = await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],

                tools: [
                    {
                        google_search: {}
                    }
                ]
            })
        });

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP ${resposta.status}: ${await resposta.text()}`
            );
        }

        const dados = await resposta.json();

        const texto = dados.candidates?.[0]?.content?.parts
            ?.map(parte => parte.text ?? "")
            .join("");

        if (!texto) {
            throw new Error("O Gemini não retornou o histórico.");
        }
        const jsonLimpo = texto
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const inicio = jsonLimpo.indexOf("{");
        const fim = jsonLimpo.lastIndexOf("}");

        if (inicio === -1 || fim === -1) {
            throw new Error("O Gemini não retornou um JSON válido.");
        }

        const resultado = JSON.parse(
            jsonLimpo.substring(inicio, fim + 1)
        );

        if (!Array.isArray(resultado.historico)) {
            throw new Error("Histórico de preços inválido.");
        }

        return resultado;

    } catch (erro) {

        console.error("Erro ao consultar histórico:", erro.message);

        throw erro;
    }
}


