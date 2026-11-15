import requests
from html.parser import HTMLParser

class ParserHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cartas = []
        self.linha = None
        self.celula_aberta = False
        self.dados_celula = []

    def handle_starttag(self, tag, attrs):
        atributos = dict(attrs)

        if tag == "tr":
            classe = atributos.get("class", "")

            # Ignora o cabeçalho e processa apenas linhas de cartas
            if classe.startswith("cardlist_") and classe != "cardlist_atitle":
                self.linha = []

        elif tag == "td" and self.linha is not None:
            self.celula_aberta = True
            self.dados_celula = []

    def handle_data(self, data):
        if self.celula_aberta:
            self.dados_celula.append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self.celula_aberta:
            texto = " ".join("".join(self.dados_celula).split())
            self.linha.append(texto)
            self.celula_aberta = False

        elif tag == "tr" and self.linha is not None:
            if len(self.linha) >= 5:
                self.cartas.append({
                    "tipo_carta": self.linha[0],
                    "nome": self.linha[1],
                    "formato_avancado": self.linha[2],
                    "formato_tradicional": self.linha[3],
                    "observacoes": self.linha[4]
                })

            self.linha = None


def buscar_cartas(url):
    resposta = requests.get(
        url,
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=15
    )
    resposta.raise_for_status()

    parser = ParserHTML()
    parser.feed(resposta.text)

    return parser.cartas


if __name__ == "__main__":

    try:
        cartas = buscar_cartas("https://www.yugioh-card.com/en/limited/list_2026-10-19//")

        print(f"\nTotal de cartas encontradas: {len(cartas)}\n")

        for carta in cartas:
            print(f"Nome: {carta['nome']}")
            print(f"Tipo: {carta['tipo_carta']}")
            print(f"Formato avançado: {carta['formato_avancado']}")
            print(f"Formato tradicional: {carta['formato_tradicional']}")
            print(f"Observações: {carta['observacoes']}")
            print("-" * 40)

    except requests.RequestException as erro:
        print(f"Erro ao acessar a página: {erro}")
