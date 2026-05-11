#!/usr/bin/env python3
"""
Extrae preguntas de los 3 PDFs y genera preguntas.json
Temas: 1, 2, 3, 4, 29
Solo PDF1/PDF2 para Temas 1 y 2 (por rangos de número de pregunta).
Temas 3, 4, 29 solo tienen preguntas del Test App 1.pdf
"""

import re
import json
from pathlib import Path
from pdfminer.high_level import extract_text, extract_pages
from pdfminer.layout import LTTextContainer, LTChar

PDF_DIR = Path("/home/user/opo-quiz")
OUT_FILE = Path("/home/user/opo-quiz/src/data/preguntas.json")

# ── Rangos explícitos por tema (número de pregunta, NO página) ───────────────
TEMA_PDF1 = {
    "Tema 1": (1, 196),
    "Tema 2": (635, 808),
}
TEMA_PDF2 = {
    "Tema 1": (1, 203),
    "Tema 2": (895, 1069),
}

TEMA_TITLES = {
    1: "Tema 1. La Constitución española de 1978: Características y estructura. Derechos fundamentales y libertades públicas.",
    2: "Tema 2. Organización territorial del Estado. Regulación constitucional del sistema autonómico.",
    3: "Tema 3. El Estatuto de Autonomía de la Comunidad de Madrid.",
    4: "Tema 4. La Asamblea Legislativa: Composición, funciones y potestades.",
    29: "Tema 29. La Ley de Servicios Sociales de la Comunidad de Madrid.",
}

def get_tema_pdf1(q_num):
    for tema, (start, end) in TEMA_PDF1.items():
        if start <= q_num <= end:
            return tema
    return None

def get_tema_pdf2(q_num):
    for tema, (start, end) in TEMA_PDF2.items():
        if start <= q_num <= end:
            return tema
    return None


# ── PDF 1: 1.000 preguntas Consti ─────────────────────────────────────────────
def parse_pdf1():
    print("Extrayendo PDF 1...")
    text = extract_text(PDF_DIR / "1.000 preguntas Consti de temarios en pdf_limpio.pdf")

    text = text.replace('‐', '-').replace('‑', '-').replace('–', '-').replace('—', '-')
    text = text.replace('­', '')

    lines = [l.strip() for l in text.split('\n')]
    lines = [l for l in lines if l and l != 'CONSTITUCIÓN ESPAÑOLA' and not l.startswith('www.')]

    questions = []
    i = 0
    q_text = ""
    q_num = None
    options = []
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
        if q_text and len(options) >= 2 and q_num is not None:
            tema = get_tema_pdf1(q_num)
            if tema:  # Solo guardar si tiene tema asignado
                correctas = [o[1] for o in options if o[2]]
                if correctas:
                    questions.append({
                        "id": f"pdf1_{q_num}",
                        "tema": tema,
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

        qm = QUESTION_RE.match(line)
        if qm:
            num = int(qm.group(1))
            if 1 <= num <= 1000:
                flush_question()
                q_num = num
                q_text = qm.group(2).strip()
                i += 1
                continue

        om = OPTION_RE.match(line)
        if om and q_num is not None:
            flush_option()
            current_option_correct = bool(om.group(1))
            current_option_letter = om.group(2).upper()
            current_option_text = om.group(3).strip()
            i += 1
            continue

        if current_option_letter:
            current_option_text += ' ' + line
        elif q_num is not None and not options:
            q_text += ' ' + line

        i += 1

    flush_question()
    print(f"  PDF 1: {len(questions)} preguntas en rangos asignados")
    return questions


# ── PDF 2: 1600 preguntas tipo test ─────────────────────────────────────────
def parse_pdf2():
    print("Extrayendo PDF 2...")
    full_text = extract_text(PDF_DIR / "1600 preguntas tipo test Constitución Española_limpio.pdf")

    resp_idx = full_text.find('Respuestas:')
    if resp_idx == -1:
        resp_idx = full_text.find('RESPUESTAS')

    questions_text = full_text[:resp_idx] if resp_idx > 0 else full_text
    answers_text = full_text[resp_idx:] if resp_idx > 0 else ""

    answer_map = {}
    for m in re.finditer(r'(\d+)\.\-\s*([A-Da-d])\s', answers_text):
        answer_map[int(m.group(1))] = m.group(2).upper()

    print(f"  PDF 2: {len(answer_map)} respuestas parseadas")

    questions_text = questions_text.replace('‐', '-').replace('‑', '-').replace('­', '')
    lines = [l.strip() for l in questions_text.split('\n')]
    lines = [l for l in lines if l and not l.startswith('Página ')]

    questions = []
    OPTION_RE = re.compile(r'^([a-d])\)\s*(.*)', re.IGNORECASE)
    QUESTION_RE = re.compile(r'^(\d+)\.\-+\s*(.+)')

    q_text = ""
    q_num = None
    options = []
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
            tema = get_tema_pdf2(q_num)
            if tema:  # Solo guardar si tiene tema asignado
                letra_correcta = answer_map[q_num]
                opts_dict = {o[0]: o[1] for o in options}
                if letra_correcta in opts_dict:
                    questions.append({
                        "id": f"pdf2_{q_num}",
                        "tema": tema,
                        "pregunta": q_text.strip(),
                        "opciones": [o[1] for o in options],
                        "correcta": opts_dict[letra_correcta],
                        "fuente": "PDF2"
                    })
        q_text = ""
        q_num = None
        options = []

    for line in lines:
        qm = QUESTION_RE.match(line)
        if qm:
            num = int(qm.group(1))
            if 1 <= num <= 1600:
                flush_question()
                q_num = num
                q_text = qm.group(2).strip()
                continue

        om = OPTION_RE.match(line)
        if om and q_num is not None:
            flush_option()
            current_option_letter = om.group(1).upper()
            current_option_text = om.group(2).strip()
            continue

        if current_option_letter:
            current_option_text += ' ' + line
        elif q_num is not None and not options:
            q_text += ' ' + line

    flush_question()
    print(f"  PDF 2: {len(questions)} preguntas en rangos asignados")
    return questions


# ── PDF 3: Test App 1.pdf (preguntas propias por tema) ───────────────────────
def parse_pdf3():
    print("Extrayendo PDF 3 (Test App 1)...")

    all_segments = []

    def iter_chars(container):
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
                        is_bold = 'Bold' in (current_font or '') or 'bold' in (current_font or '')
                        all_segments.append((current_text, is_bold))
                    current_font = font
                    current_text = char_text
                else:
                    current_text += char_text
            if current_text.strip():
                is_bold = 'Bold' in (current_font or '') or 'bold' in (current_font or '')
                all_segments.append((current_text, is_bold))

    full_marked = ""
    for text, is_bold in all_segments:
        text = text.replace('\n', ' ').strip()
        if not text:
            continue
        if is_bold:
            full_marked += f"[B]{text}[/B] "
        else:
            full_marked += f"{text} "

    full_marked = re.sub(r'\s+', ' ', full_marked)

    questions = []
    parts = re.split(r'(?=\[B\]Tema\s+\d+\.)', full_marked)

    VALID_TEMAS = {1, 2, 3, 4, 29}

    for part in parts:
        part = part.strip()
        if not part:
            continue

        tm = re.match(r'\[B\]Tema\s+(\d+)\.\s+(.*?)\[/B\](.*)', part, re.DOTALL)
        if not tm:
            continue

        tema_num = int(tm.group(1))
        if tema_num not in VALID_TEMAS:
            continue

        pregunta_text = tm.group(2).strip()
        rest = tm.group(3).strip()

        # Limpiar URLs y referencias PDF del enunciado
        pregunta_clean = re.sub(r'https?://\S+', '', pregunta_text).strip()
        pregunta_clean = re.sub(r'PDF \d+[\.,]\d+:.*', '', pregunta_clean).strip()
        pregunta_clean = re.sub(r'libertades públicas:.*', '', pregunta_clean).strip()
        if len(pregunta_clean) < 10:
            continue

        # Identificar opciones
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
            opt_text = opt_text.replace('__BOLD__', '').replace('__/BOLD__', '').strip()
            opt_text = re.sub(r'\s+', ' ', opt_text).rstrip()
            if opt_text:
                options_found.append((letra, opt_text, is_bold_opt))
                if is_bold_opt:
                    correcta = opt_text

        if not correcta:
            bold_options = re.findall(r'\[B\](.*?)\[/B\]', rest)
            for bo in bold_options:
                bo = bo.strip()
                om2 = re.match(r'([a-d])\.\s+(.*)', bo)
                if om2:
                    for _, opt_text, _ in options_found:
                        if opt_text.startswith(om2.group(2)[:20]):
                            correcta = opt_text
                            break

        if pregunta_clean and len(options_found) >= 2 and correcta:
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


# ── Limpieza y deduplicación ──────────────────────────────────────────────────
def cleanup_text(text):
    text = re.sub(r'-\s+([a-záéíóúüñ])', r'\1', text, flags=re.IGNORECASE)
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def deduplicate(questions):
    seen = {}
    result = []
    for q in questions:
        key = re.sub(r'\s+', ' ', q['pregunta'].lower().strip())[:120]
        if key not in seen:
            seen[key] = True
            q['pregunta'] = cleanup_text(q['pregunta'])
            q['opciones'] = [cleanup_text(o) for o in q['opciones']]
            q['correcta'] = cleanup_text(q['correcta'])
            result.append(q)
    return result


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    q1 = parse_pdf1()
    q2 = parse_pdf2()
    q3 = parse_pdf3()

    all_questions = deduplicate(q1 + q2 + q3)

    print(f"\nTotal de preguntas únicas: {len(all_questions)}")

    from collections import Counter
    by_tema = Counter(q['tema'] for q in all_questions)
    by_src  = Counter(q['fuente'] for q in all_questions)

    print("\nPor fuente:")
    for k, v in sorted(by_src.items()):
        print(f"  {k}: {v}")

    print("\nPor tema:")
    for t, n in sorted(by_tema.items()):
        print(f"  {n:4d}  {t}")

    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\nGuardado en {OUT_FILE}")
