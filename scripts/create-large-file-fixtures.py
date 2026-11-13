"""Test only: valid synthetic PDFs with a real, referenced EmbeddedFile stream.
No trailing padding. Requires pypdf and create-drop-fixtures.py's supported.pdf.
All large data stays in ignored tmp/. Nothing is sent to AI.
"""
from io import BytesIO
from pathlib import Path
from pypdf import PdfReader, PdfWriter
import json

out = Path('tmp/file-limit-fixtures')
out.mkdir(parents=True, exist_ok=True)
source = Path('tmp/pdf-drop-fixtures/supported.pdf')
manifest = []
for name, target in [('pdf-17',17*1024**2), ('pdf-49',49*1024**2),
                     ('pdf-minus',50*1024**2-1), ('pdf-exact',50*1024**2),
                     ('pdf-over',50*1024**2+1)]:
    length = target - source.stat().st_size - 2000
    for attempt in range(5):
        writer = PdfWriter(clone_from=source)
        block = bytes(range(256))
        data = (block * (length//256 + 1))[:length]
        writer.add_attachment('synthetic-byte-pattern.bin', data)
        result = BytesIO()
        writer.write(result)
        actual = result.tell()
        if actual == target:
            path = out / (name+'.pdf')
            path.write_bytes(result.getbuffer())
            reader = PdfReader(path, strict=True)
            assert len(reader.pages) == 1
            assert len(reader.attachments['synthetic-byte-pattern.bin'][0]) == length
            manifest.append({'file':str(path),'bytes':actual,'embeddedStreamBytes':length,
                             'pages':1,'strictPypdfRead':True})
            break
        length += target-actual
    else:
        raise AssertionError((name,actual,target))
(out/'pdf-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
