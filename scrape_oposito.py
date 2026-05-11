#!/usr/bin/env python3
"""
Scraper de preguntas de oposito.es
Extrae preguntas, opciones y respuesta correcta de cada URL
y las añade a preguntas.json con el tema correspondiente.
"""

import json
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path

OUT_FILE = Path("/home/user/opo-quiz/src/data/preguntas.json")

# ── URLs por tema (extraídas del Test App 1.pdf) ────────────────────────────
URLS_BY_TEMA = {
    1: [
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-constitucion-espanola-caracteristicas-generales/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-constitucion-espanola-estructura/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-preambulo-y-titulo-preliminar-constitucion-espanola/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-titulo-i-derechos-y-deberes-fundamentales/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-titulo-i-derechos-y-deberes-fundamentales-2/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-titulo-i-derechos-y-deberes-fundamentales-2-2/",
    ],
    2: [
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-titulo-viii-de-la-organizacion-territorial-del-estado/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-titulo-viii-de-la-organizacion-territorial-del-estado-2/",
        "https://oposito.es/test-oposiciones/test-de-la-constitucion-espanola-de-1978/test-titulo-viii-de-la-organizacion-territorial-del-estado-3/",
    ],
    3: [
        "https://oposito.es/test-oposiciones/test-estatutos-de-autonomia/test-estatuto-de-autonomia-de-la-comunidad-de-madrid/test-estatuto-autonomia-comunidad-madrid-1/",
        "https://oposito.es/test-oposiciones/test-estatutos-de-autonomia/test-estatuto-de-autonomia-de-la-comunidad-de-madrid/test-estatuto-autonomia-comunidad-madrid-3/",
    ],
    4: [
        "https://oposito.es/test-oposiciones/test-estatutos-de-autonomia/test-estatuto-de-autonomia-de-la-comunidad-de-madrid/test-estatuto-autonomia-comunidad-madrid-2/",
        "https://oposito.es/test-oposiciones/test-ley-gobierno-administracion-comunidad-madrid/test-ley-gobierno-administracion-madrid-titulo-preliminar/",
        "https://oposito.es/test-oposiciones/test-ley-gobierno-administracion-comunidad-madrid/test-ley-gobierno-administracion-madrid-titulo-1/",
        "https://oposito.es/test-oposiciones/test-ley-gobierno-administracion-comunidad-madrid/test-ley-gobierno-administracion-madrid-titulo-2/",
        "https://oposito.es/test-oposiciones/test-ley-gobierno-administracion-comunidad-madrid/test-ley-gobierno-administracion-madrid-titulo-3/",
    ],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "es-ES,es;q=0.9",
}


def scrape_url(url, tema_num):
    """Extrae preguntas de una URL de oposito.es"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ERROR fetching {url}: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    questions = []

    # Buscar todos los contenedores de preguntas
    question_divs = soup.find_all("div", class_="test-question")

    if not question_divs:
        # Intentar selector alternativo
        question_divs = soup.find_all(class_=re.compile(r'question|pregunta', re.I))

    for i, qdiv in enumerate(question_divs):
        # Texto de la pregunta
        p_tag = qdiv.find("p")
        if not p_tag:
            # Buscar el primer texto relevante
            p_tag = qdiv.find(["h3", "h4", "span"])
        if not p_tag:
            continue

        pregunta_text = p_tag.get_text(strip=True)
        # Limpiar número de pregunta al inicio (e.g. "1. ", "2.- ")
        pregunta_text = re.sub(r'^\d+[\.\-]+\s*', '', pregunta_text).strip()

        if len(pregunta_text) < 5:
            continue

        # Buscar opciones
        options_div = qdiv.find("div", class_="test-options")
        if not options_div:
            options_div = qdiv  # fallback: buscar en el propio div

        option_divs = options_div.find_all("div", class_="test-option")
        if not option_divs:
            # Intentar con otros selectores
            option_divs = options_div.find_all(class_=re.compile(r'option|opcion|respuesta', re.I))

        if len(option_divs) < 2:
            continue

        opciones = []
        correcta = None

        for opt in option_divs:
            opt_text = opt.get_text(strip=True)
            if not opt_text:
                continue
            opciones.append(opt_text)
            # La correcta tiene data-correct="true"
            if opt.get("data-correct", "").lower() == "true":
                correcta = opt_text

        if not correcta or len(opciones) < 2:
            continue

        # Generar ID único basado en URL y posición
        url_slug = url.rstrip("/").split("/")[-1]
        q_id = f"web_{tema_num}_{url_slug}_{i+1}"

        questions.append({
            "id": q_id,
            "tema": f"Tema {tema_num}",
            "pregunta": pregunta_text,
            "opciones": opciones,
            "correcta": correcta,
            "fuente": "WEB"
        })

    return questions


def main():
    # Cargar JSON existente
    with open(OUT_FILE, encoding="utf-8") as f:
        existing = json.load(f)

    # Índice de preguntas ya existentes para deduplicar
    existing_keys = set()
    for q in existing:
        key = re.sub(r'\s+', ' ', q['pregunta'].lower().strip())[:120]
        existing_keys.add(key)

    print(f"Preguntas existentes: {len(existing)}")

    new_questions = []
    total_fetched = 0

    for tema_num, urls in sorted(URLS_BY_TEMA.items()):
        print(f"\n--- Tema {tema_num} ({len(urls)} URLs) ---")
        for url in urls:
            print(f"  Scraping: {url}")
            qs = scrape_url(url, tema_num)
            total_fetched += len(qs)
            added = 0
            for q in qs:
                key = re.sub(r'\s+', ' ', q['pregunta'].lower().strip())[:120]
                if key not in existing_keys:
                    existing_keys.add(key)
                    new_questions.append(q)
                    added += 1
            print(f"    → {len(qs)} extraídas, {added} nuevas añadidas")
            time.sleep(1)  # Pausa entre requests

    print(f"\nTotal extraídas: {total_fetched}")
    print(f"Total nuevas (sin duplicados): {len(new_questions)}")

    # Guardar JSON actualizado
    all_questions = existing + new_questions
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"Total final: {len(all_questions)} preguntas")
    print(f"Guardado en {OUT_FILE}")

    # Estadísticas por tema
    from collections import Counter
    temas = Counter(q['tema'] for q in all_questions)
    print("\nPor tema:")
    for t, n in sorted(temas.items()):
        print(f"  {n:4d}  {t}")


if __name__ == "__main__":
    main()
