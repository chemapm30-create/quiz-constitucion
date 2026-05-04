#!/usr/bin/env python3
"""
Extrae preguntas de los 3 PDFs de la oposición y genera preguntas.json
"""

import re
import json
from pathlib import Path
from pdfminer.high_level import extract_text, extract_pages
from pdfminer.layout import LTTextContainer, LTChar

PDF_DIR = Path("/home/user/opo")
OUT_FILE = Path("/home/user/opo-quiz/src/data/preguntas.json")

# ─── PDF 1: 1.000 preguntas Consti ─────────────────────────────────────────
# Página 84 en adelante. Respuesta correcta marcada con "+"
# Sección marcada por líneas TÍTULO X o CAPÍTULO X

def parse_pdf1():
    print("Extrayendo PDF 1...")
    text = extract_text(PDF_DIR / "1.000 preguntas Consti de temarios en pdf_limpio.pdf",
                        page_numbers=list(range(83, 140)))

    # Limpia caracteres especiales y normaliza
    text = text.replace('‐', '-').replace('‑', '-').replace('‒', '-')
    text = text.replace('–', '-').replace('—', '-')
    text = text.replace('­', '')  # soft hyphen

    lines = [l.strip() for l in text.split('\n')]
    lines = [l for l in lines if l and l != 'CONSTITUCIÓN ESPAÑOLA' and not l.startswith('www.')]

    questions = []
    current_tema = "Título Preliminar"

    # Detectar encabezados de sección
    HEADER_PATTERNS = [
        r'^TÍTULO\s+PRELIMINAR',
        r'^TÍTULO\s+I[\.\-\s]',
        r'^TÍTULO\s+II[\.\-\s]',
        r'^TÍTULO\s+III[\.\-\s]',
        r'^TÍTULO\s+IV[\.\-\s]',
        r'^TÍTULO\s+V[\.\-\s]',
        r'^TÍTULO\s+VI[\.\-\s]',
        r'^TÍTULO\s+VII[\.\-\s]',
        r'^TÍTULO\s+VIII[\.\-\s]',
        r'^TITULO\s+II',
        r'^TITULO\s+I[\.\-\s]',
        r'^DISPOSICIONES',
        r'^CAPÍTULO',
    ]

    SECTION_MAP = {
        'TÍTULO PRELIMINAR': 'Título Preliminar',
        'TÍTULO I': 'Título I - Derechos y Deberes',
        'TÍTULO II': 'Título II - La Corona',
        'TÍTULO III': 'Título III - Las Cortes Generales',
        'TÍTULO IV': 'Título IV - El Gobierno',
        'TÍTULO V': 'Título V - Relaciones Gobierno-Cortes',
        'TÍTULO VI': 'Título VI - El Poder Judicial',
        'TÍTULO VII': 'Título VII - Economía y Hacienda',
        'TÍTULO VIII': 'Título VIII - Organización Territorial',
        'DISPOSICIONES': 'Disposiciones',
    }

    def get_tema_from_line(line):
        line_up = line.upper()
        for key, val in SECTION_MAP.items():
            if line_up.startswith(key):
                return val
        return None

    # Estado del parser
    i = 0
    q_text = ""
    q_num = None
    options = []   # (letra, texto, es_correcta)
    current_option_letter = None
    current_option_text = ""
    current_option_correct = False

    OPTION_RE = re.compile(r'^(\+\s*)?([A-D])\)\s*(.*)', re.IGNORECASE)
    QUESTION_RE = re.compile(r'^(\d+)[.\-]+\s*(.+)')

    def flush_option():
        nonlocal current_option_letter, current_option_text, current_option_correct
        if current_option_letter:
            options.append((current_option_letter, current_option_text.strip(), current_option_correct))
        current_option_letter = None
        current_option_text = ""
        current_option_correct = False

    def flush_question():
        nonlocal q_text, q_num, options
        flush_option()
        if q_text and len(options) >= 2:
            correctas = [o[1] for o in options if o[2]]
            if correctas:
                questions.append({
                    "id": f"pdf1_{q_num}",
                    "tema": current_tema,
                    "pregunta": q_text.strip(),
                    "opciones": [o[1] for o in options],
                    "correcta": correctas[0],
                    "fuente": "PDF1"
                })
        q_text = ""
        q_num = None
        options = []

    while i < len(lines):
        line = lines[i]

        # Detectar encabezado de sección
        tema_nuevo = get_tema_from_line(line)
        if tema_nuevo:
            flush_question()
            current_tema = tema_nuevo
            i += 1
            continue

        # Detectar inicio de nueva pregunta
        qm = QUESTION_RE.match(line)
        if qm:
            num = int(qm.group(1))
            if num <= 5000:  # sanity check
                flush_question()
                q_num = num
                q_text = qm.group(2).strip()
                i += 1
                continue

        # Detectar opción
        om = OPTION_RE.match(line)
        if om and q_num is not None:
            flush_option()
            current_option_correct = bool(om.group(1))
            current_option_letter = om.group(2).upper()
            current_option_text = om.group(3).strip()
            i += 1
            continue

        # Continuación de texto (opción o pregunta)
        if current_option_letter:
            current_option_text += ' ' + line
        elif q_num is not None and not options:
            q_text += ' ' + line

        i += 1

    flush_question()
    print(f"  PDF 1: {len(questions)} preguntas extraídas")
    return questions


# ─── PDF 2: 1600 preguntas tipo test ────────────────────────────────────────
# Preguntas en páginas 1-94, respuestas en páginas 95+
# Opciones: a), b), c), d) sin marcador

def parse_pdf2():
    print("Extrayendo PDF 2...")
    full_text = extract_text(PDF_DIR / "1600 preguntas tipo test Constitución Española_limpio.pdf")

    # Separar en dos partes: preguntas y respuestas
    resp_idx = full_text.find('Respuestas:')
    if resp_idx == -1:
        resp_idx = full_text.find('RESPUESTAS')

    questions_text = full_text[:resp_idx] if resp_idx > 0 else full_text
    answers_text = full_text[resp_idx:] if resp_idx > 0 else ""

    # Parsear clave de respuestas: "N.- A" o "N.- B" etc.
    answer_map = {}  # num -> letra
    for m in re.finditer(r'(\d+)\.\-\s*([A-Da-d])\s', answers_text):
        num = int(m.group(1))
        letra = m.group(2).upper()
        answer_map[num] = letra

    print(f"  PDF 2: {len(answer_map)} respuestas parseadas")

    # Limpiar texto de preguntas
    questions_text = questions_text.replace('‐', '-').replace('‑', '-')
    questions_text = questions_text.replace('­', '')

    lines = [l.strip() for l in questions_text.split('\n')]
    lines = [l for l in lines if l and not l.startswith('Página ')]

    questions = []
    current_tema = "Título Preliminar"

    # Secciones del PDF 2: "1-Título Preliminar", "2-Título I:..."
    TEMA_RE = re.compile(r'^\d+\-(.+)$')

    SECTION_MAP_2 = {
        'título preliminar': 'Título Preliminar',
        'título i': 'Título I - Derechos y Deberes',
        'título ii': 'Título II - La Corona',
        'título iii': 'Título III - Las Cortes Generales',
        'título iv': 'Título IV - El Gobierno',
        'título v': 'Título V - Relaciones Gobierno-Cortes',
        'título vi': 'Título VI - El Poder Judicial',
        'título vii': 'Título VII - Economía y Hacienda',
        'título viii': 'Título VIII - Organización Territorial',
        'disposiciones': 'Disposiciones',
    }

    def normalize_tema(text):
        t = text.lower().strip()
        for key, val in SECTION_MAP_2.items():
            if t.startswith(key):
                return val
        return text.strip()

    OPTION_RE = re.compile(r'^([a-d])\)\s*(.*)', re.IGNORECASE)
    QUESTION_RE = re.compile(r'^(\d+)\.\-+\s*(.+)')

    q_text = ""
    q_num = None
    options = []   # (letra, texto)
    current_option_letter = None
    current_option_text = ""

    def flush_option():
        nonlocal current_option_letter, current_option_text
        if current_option_letter:
            options.append((current_option_letter.upper(), current_option_text.strip()))
        current_option_letter = None
        current_option_text = ""

    def flush_question():
        nonlocal q_text, q_num, options
        flush_option()
        if q_text and len(options) >= 2 and q_num in answer_map:
            letra_correcta = answer_map[q_num]
            # Encontrar la opción con esa letra
            opts_dict = {o[0]: o[1] for o in options}
            if letra_correcta in opts_dict:
                questions.append({
                    "id": f"pdf2_{q_num}",
                    "tema": current_tema,
                    "pregunta": q_text.strip(),
                    "opciones": [o[1] for o in options],
                    "correcta": opts_dict[letra_correcta],
                    "fuente": "PDF2"
                })
        q_text = ""
        q_num = None
        options = []

    for line in lines:
        # Detectar sección
        tm = TEMA_RE.match(line)
        if tm and not re.match(r'^\d+\.\-', line):
            # Comprueba que no es una pregunta numerada (1.- vs 1-Título)
            flush_question()
            current_tema = normalize_tema(tm.group(1))
            continue

        # Detectar pregunta
        qm = QUESTION_RE.match(line)
        if qm:
            num = int(qm.group(1))
            if num <= 1600:
                flush_question()
                q_num = num
                q_text = qm.group(2).strip()
                continue

        # Detectar opción
        om = OPTION_RE.match(line)
        if om and q_num is not None:
            flush_option()
            current_option_letter = om.group(1).upper()
            current_option_text = om.group(2).strip()
            continue

        # Continuación
        if current_option_letter:
            current_option_text += ' ' + line
        elif q_num is not None and not options:
            q_text += ' ' + line

    flush_question()
    print(f"  PDF 2: {len(questions)} preguntas extraídas")
    return questions


# ─── PDF 3: Test App 1 ───────────────────────────────────────────────────────
# Formato: "Tema N. Pregunta" seguido de "a. opción" ...
# La respuesta correcta está en negrita (font ABCDEE+Cambria,Bold)

def parse_pdf3():
    print("Extrayendo PDF 3...")

    all_segments = []  # (text, is_bold)

    from pdfminer.layout import LTTextLine

    def iter_chars(container):
        """Recursively yield LTChar objects from a layout element."""
        for item in container:
            if isinstance(item, LTChar):
                yield item
            elif hasattr(item, '__iter__'):
                yield from iter_chars(item)

    for page in extract_pages(PDF_DIR / "Test App 1.pdf"):
        for element in page:
            if not isinstance(element, LTTextContainer):
                continue

            current_font = None
            current_text = ""

            for char in iter_chars(element):
                font = char.fontname
                char_text = char.get_text()

                if font != current_font:
                    if current_text.strip():
                        is_bold_prev = 'Bold' in (current_font or '') or 'bold' in (current_font or '')
                        all_segments.append((current_text, is_bold_prev))
                    current_font = font
                    current_text = char_text
                else:
                    current_text += char_text

            if current_text.strip():
                is_bold_last = 'Bold' in (current_font or '') or 'bold' in (current_font or '')
                all_segments.append((current_text, is_bold_last))

    # Reconstruir texto con marcadores de negrita
    # Formato marcado: [B]texto en negrita[/B] texto normal
    full_marked = ""
    for text, is_bold in all_segments:
        text = text.replace('\n', ' ').strip()
        if not text:
            continue
        if is_bold:
            full_marked += f"[B]{text}[/B] "
        else:
            full_marked += f"{text} "

    # Normalizar espacios múltiples
    full_marked = re.sub(r'\s+', ' ', full_marked)

    questions = []

    # Patrón de pregunta: "Tema N. Texto de la pregunta"
    # Patrón de opción: "a. texto", "b. texto", "c. texto", "d. texto"
    # (Puede estar dentro de [B]...[/B] si es correcta)

    TEMA_Q_RE = re.compile(r'\[B\]Tema\s+(\d+)\.\s+(.*?)\[/B\]')

    # Separar por preguntas (todas empiezan con [B]Tema N.)
    parts = re.split(r'(?=\[B\]Tema\s+\d+\.)', full_marked)

    current_tema_num = None

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Extraer número de tema y texto de pregunta
        tm = re.match(r'\[B\]Tema\s+(\d+)\.\s+(.*?)\[/B\](.*)', part, re.DOTALL)
        if not tm:
            continue

        tema_num = int(tm.group(1))
        pregunta_text = tm.group(2).strip()
        rest = tm.group(3).strip()

        # En el PDF3, algunas preguntas continúan sin negrita
        # Extraer opciones del resto
        # Las opciones son: "a. texto" o "[B]a. texto[/B]" (si correcta en la misma línea)
        # o "[B]c. texto[/B]" para la correcta en negrita

        # Limpiar el resto de marcadores y parsear opciones
        # Primero, identificar qué opción es negrita
        bold_options = re.findall(r'\[B\](.*?)\[/B\]', rest)
        plain_text = re.sub(r'\[B\](.*?)\[/B\]', r'\1', rest)

        # En algunos casos, la pregunta no tiene opciones por separado (raras)
        # Buscar patrones de opciones en el texto combinado
        combined = re.sub(r'\[B\](.*?)\[/B\]', lambda m: f"__BOLD__{m.group(1)}__/BOLD__", rest)
        combined = re.sub(r'\s+', ' ', combined).strip()

        OPTION_RE2 = re.compile(
            r'(?:__BOLD__)?([a-d])\.\s+(.*?)(?=(?:__BOLD__)?[a-d]\.\s|$)',
            re.DOTALL
        )

        options_found = []
        correcta = None

        for om in OPTION_RE2.finditer(combined):
            letra = om.group(1).lower()
            opt_text = om.group(2).strip()
            is_bold_opt = combined[om.start():om.start()+8] == '__BOLD__'

            # Limpiar marcadores de negrita del texto de la opción
            opt_text = opt_text.replace('__BOLD__', '').replace('__/BOLD__', '').strip()
            opt_text = re.sub(r'\s+', ' ', opt_text).rstrip()

            if opt_text:
                options_found.append((letra, opt_text, is_bold_opt))
                if is_bold_opt:
                    correcta = opt_text

        # Si no encontramos correcta por negrita, buscar en bold_options
        if not correcta and bold_options:
            for bo in bold_options:
                bo = bo.strip()
                om2 = re.match(r'([a-d])\.\s+(.*)', bo)
                if om2:
                    for letra, opt_text, _ in options_found:
                        if letra == om2.group(1).lower():
                            correcta = opt_text
                            break

        if pregunta_text and len(options_found) >= 2 and correcta:
            # Limpiar URLs y referencias del texto de pregunta
            pregunta_clean = re.sub(r'https?://\S+', '', pregunta_text).strip()
            pregunta_clean = re.sub(r'PDF \d+\.\d+:.*', '', pregunta_clean).strip()
            pregunta_clean = re.sub(r'PDF \d+\.\d+:.*', '', pregunta_clean).strip()

            if len(pregunta_clean) < 10:
                continue

            questions.append({
                "id": f"pdf3_t{tema_num}_{len(questions)+1}",
                "tema": f"Tema {tema_num}",
                "pregunta": pregunta_clean,
                "opciones": [o[1] for o in options_found],
                "correcta": correcta,
                "fuente": "PDF3"
            })

    print(f"  PDF 3: {len(questions)} preguntas extraídas")
    return questions


# ─── Main ────────────────────────────────────────────────────────────────────

TEMA_NORMALIZE = {
    # PDF2 temas (con espacios extra)
    r'título\s+preliminar': 'Título Preliminar',
    r'título\s+i[\s:]+de los derechos': 'Título I - Derechos y Deberes Fundamentales',
    r'título\s+ii[\s:]+de la corona': 'Título II - La Corona',
    r'título\s+iii[\s:]+de las cortes': 'Título III - Las Cortes Generales',
    r'título\s+iv[\s:]+del gobierno': 'Título IV - El Gobierno y la Administración',
    r'título\s+v[\s:]+de las relaciones': 'Título V - Relaciones Gobierno-Cortes',
    r'título\s+vi[\s:]+del poder judicial': 'Título VI - El Poder Judicial',
    r'título\s+vii[\s:]+economía': 'Título VII - Economía y Hacienda',
    r'título\s+viii[\s:]+de la organización': 'Título VIII - Organización Territorial',
    r'título\s+ix[\s:]+del tribunal constitucional': 'Título IX - El Tribunal Constitucional',
    r'título\s+x[\s:]+de la reforma': 'Título X - La Reforma Constitucional',
    # PDF1 temas
    r'^título preliminar$': 'Título Preliminar',
    r'^título i - derechos y deberes$': 'Título I - Derechos y Deberes Fundamentales',
    r'^título ii - la corona$': 'Título II - La Corona',
    r'^título iii - las cortes generales$': 'Título III - Las Cortes Generales',
    r'^título iv - el gobierno$': 'Título IV - El Gobierno y la Administración',
    r'^título v - relaciones gobierno-cortes$': 'Título V - Relaciones Gobierno-Cortes',
    r'^título vi - el poder judicial$': 'Título VI - El Poder Judicial',
    r'^título vii - economía y hacienda$': 'Título VII - Economía y Hacienda',
    r'^título viii - organización territorial$': 'Título VIII - Organización Territorial',
    r'^disposiciones$': 'Disposiciones Adicionales y Transitorias',
}


def normalize_tema_global(tema):
    t = re.sub(r'\s+', ' ', tema).strip()
    t_low = t.lower()
    for pattern, replacement in TEMA_NORMALIZE.items():
        if re.search(pattern, t_low):
            return replacement
    return t


def cleanup_text(text):
    """Normaliza espacios y elimina guiones de partición de palabras."""
    # Eliminar guiones de final de línea que parten palabras
    text = re.sub(r'-\s+([a-záéíóúüñ])', r'\1', text, flags=re.IGNORECASE)
    # Normalizar múltiples espacios a uno
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def deduplicate(questions):
    """Elimina preguntas duplicadas basándose en el texto de la pregunta."""
    seen = {}
    result = []
    for q in questions:
        key = re.sub(r'\s+', ' ', q['pregunta'].lower().strip())[:120]
        if key not in seen:
            seen[key] = True
            # Normalize tema and clean text
            q['tema'] = normalize_tema_global(q['tema'])
            q['pregunta'] = cleanup_text(q['pregunta'])
            q['opciones'] = [cleanup_text(o) for o in q['opciones']]
            q['correcta'] = cleanup_text(q['correcta'])
            result.append(q)
    return result


if __name__ == "__main__":
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    all_questions = []

    q1 = parse_pdf1()
    q2 = parse_pdf2()
    q3 = parse_pdf3()

    all_questions = q1 + q2 + q3
    all_questions = deduplicate(all_questions)

    print(f"\nTotal de preguntas únicas: {len(all_questions)}")

    # Estadísticas por fuente
    for src in ['PDF1', 'PDF2', 'PDF3']:
        n = sum(1 for q in all_questions if q['fuente'] == src)
        print(f"  {src}: {n}")

    # Estadísticas por tema
    temas = {}
    for q in all_questions:
        temas[q['tema']] = temas.get(q['tema'], 0) + 1
    for t, n in sorted(temas.items()):
        print(f"  Tema '{t}': {n} preguntas")

    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\nGuardado en {OUT_FILE}")

    # Mostrar muestra de cada PDF
    print("\n--- Muestra PDF1 ---")
    for q in q1[:2]:
        print(f"  [{q['tema']}] {q['pregunta'][:60]}")
        print(f"  Correcta: {q['correcta'][:50]}")

    print("\n--- Muestra PDF2 ---")
    for q in q2[:2]:
        print(f"  [{q['tema']}] {q['pregunta'][:60]}")
        print(f"  Correcta: {q['correcta'][:50]}")

    print("\n--- Muestra PDF3 ---")
    for q in q3[:2]:
        print(f"  [{q['tema']}] {q['pregunta'][:60]}")
        print(f"  Correcta: {q['correcta'][:50]}")
