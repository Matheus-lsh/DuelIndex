from flask import Flask, jsonify , request
from flask_cors import CORS
import web_scraping
import json
app = Flask(__name__)

CORS(
    app,
    resources={
        r"/proibidas": {
            "origins": ["http://127.0.0.1:5500"]
        },
        r"/decks/*": {
            "origins": ["http://127.0.0.1:5500"]
        },
        r"/carrinho": {
            "origins": ["http://127.0.0.1:5500"]
        }
    }
)

banlist_json = web_scraping.buscar_cartas("https://www.yugioh-card.com/en/limited/list_2026-10-19//")
list_decks = []
list_carrinho = []

@app.route("/proibidas",methods=["GET"])
def proibidas():
    return banlist_json

@app.route("/decks",methods=["GET"])
def decks():
    return jsonify(list_decks)

@app.route("/decks",methods=["PUT"])
def salvar_decks():
    dados = request.get_json()

    if not dados:
        return jsonify({"erro": "Nenhum dado recebido"}), 400

    cartas = dados.get("cartas", [])
    extra = dados.get("extradeck", [])
    side = dados.get("sideDeck",[])
    tributo = dados.get("tributo")

    preco_deck = preco_cartas(cartas,tributo)
    preco_extra = preco_cartas(extra,tributo)
    preco_side = preco_cartas(side,tributo)
    precos_total = [
            { "nome": "Cardmarket", "preco_total" : preco_deck[0] + preco_extra[0] + preco_side[0] },
            { "nome": "TCGplayer", "preco_total" : preco_deck[1] + preco_extra[1] + preco_side[1] },
            { "nome": "eBay", "preco_total" : preco_deck[2] + preco_extra[2] + preco_side[2] },
            { "nome": "Amazon", "preco_total" : preco_deck[3] + preco_extra[3] + preco_side[3] },
            { "nome": "CoolStuffInc", "preco_total" : preco_deck[4] + preco_extra[4] + preco_side[4] }
            ]

    nome = dados["nome"]
    list_decks.append({nome : [cartas,extra,side],"precos" : precos_total})
    print(list_decks)
    return jsonify({
        "mensagem": "Deck recebido com sucesso!",
        "quantidade": len(cartas)
    }), 200

@app.route("/decks/<n>",methods=["DELETE"])
def remover_deck(n):
    for deck in list_decks:
        if n in deck:
            list_decks.remove(deck)
            return jsonify({"mensagem": "Deck removido com sucesso!"}), 200

    return jsonify({"mensagem": "Deck nao removido!"}), 400
    

@app.route("/carrinho",methods=["GET"])
def carrinho():
    return jsonify(list_carrinho)

@app.route("/carrinho",methods=["PUT"])
def salvar_carrinho():
    dados = request.get_json()

    if not dados:
        return jsonify({"erro": "Nenhum dado recebido"}), 400

    carrinho = dados.get("cartas", [])
    tributo = dados.get("tributo")
    preco_carrinho = preco_cartas(carrinho,tributo)
    precos_total = [
                { "nome": "Cardmarket", "preco_total" : preco_carrinho[0] },
                { "nome": "TCGplayer", "preco_total" : preco_carrinho[1] },
                { "nome": "eBay", "preco_total" : preco_carrinho[2] },
                { "nome": "Amazon", "preco_total" : preco_carrinho[3] },
                { "nome": "CoolStuffInc", "preco_total" : preco_carrinho[4] }
                ]
    if len(list_carrinho) > 0:
        list_carrinho[0]["lista"] = carrinho
        list_carrinho[0]["preco"] = precos_total
    else:
        list_carrinho.append({"lista" :carrinho,"preco" : precos_total})
    print(carrinho)
        
    return jsonify({
        "mensagem": "Carrinho atualizado!",
        "quantidade": len(carrinho)
    }), 200

def preco_cartas(decks,tributo):
    preco_cardmarket_price = 0.0
    preco_tcgplayer_price = 0.0
    preco_ebay_price = 0.0
    preco_amazon_price = 0.0
    preco_coolstuffinc_price = 0.0
    for carta in decks:
        if float(carta["precos"]["cardmarket_price"]) > 0:
            preco_cardmarket_price += float(carta["precos"]["cardmarket_price"]) * int(carta["quantidade"])
            preco_cardmarket_price = preco_cardmarket_price * tributo["cotacoes"]["euro"]["valor"]
        if float(carta["precos"]["tcgplayer_price"]) > 0:
            preco_tcgplayer_price += float(carta["precos"]["tcgplayer_price"]) * int(carta["quantidade"])
            preco_tcgplayer_price = preco_tcgplayer_price * tributo["cotacoes"]["dolar"]["valor"]
        if float(carta["precos"]["ebay_price"]) > 0:
            preco_ebay_price += float(carta["precos"]["ebay_price"]) * int(carta["quantidade"])
            preco_ebay_price = preco_ebay_price * tributo["cotacoes"]["dolar"]["valor"]
        if float(carta["precos"]["amazon_price"]) > 0:
            preco_amazon_price += float(carta["precos"]["amazon_price"]) * int(carta["quantidade"])
            preco_amazon_price = preco_amazon_price * tributo["cotacoes"]["dolar"]["valor"]
        if float(carta["precos"]["coolstuffinc_price"]) > 0:
            preco_coolstuffinc_price += float(carta["precos"]["coolstuffinc_price"]) * int(carta["quantidade"])
            preco_coolstuffinc_price = preco_coolstuffinc_price * tributo["cotacoes"]["dolar"]["valor"]
    return [preco_cardmarket_price,preco_tcgplayer_price,preco_ebay_price,preco_amazon_price,preco_coolstuffinc_price]

if __name__ == "__main__":
    app.run()
