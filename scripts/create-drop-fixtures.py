"""Non-identifying PDF fixtures. Test-only: requires ReportLab and a Korean TTF.
Usage: python3 scripts/create-drop-fixtures.py FONT.ttf tmp/pdf-drop-fixtures
Generated PDF/font/work files must stay under ignored tmp/.
"""
from pathlib import Path
import sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('TestKorean', sys.argv[1]))
c = canvas.Canvas(str(out / 'supported.pdf'), pagesize=(800, 700), invariant=1)
c.setTitle('SYNTHETIC ASSESSMENT PLAN - NO STUDENT DATA')
def text(value, x, y):
    c.setFont('TestKorean', 10)
    c.drawString(x, 700-y, value)
text('국어과 합성 평가계획', 98, 25)
for v, x in [('성취기준',97.68),('단원명',174),('평가영역',221.28),('평가요소',275),('평가방법',340),('평가기준',550)]:
    text(v, x, 70)
for i in range(2):
    y=120+i*180
    for v,x in [('[2국01-01]',100),(f'합성단원{i+1}',175),('읽기',224),('문장 읽기' if i else '낱말 읽기',270),('소리 내어 읽는다.',340)]:
        text(v,x,y)
    for v,d in [('매우',0),('잘함',15),('잘함',45),('보통',75),('노력',105),('요함',120)]:
        text(v,500,y+d)
    for j,d in enumerate([6,45,75,111]):
        text(f'합성 기준 {i+1}-{j+1}',550,y+d)
c.save()
for name, count, words in [('unsupported',1,True),('scanned',1,False),('too-many-pages',31,True)]:
    c=canvas.Canvas(str(out/f'{name}.pdf'),pagesize=(800,700),invariant=1)
    for n in range(count):
        if words:
            c.setFont('Helvetica',12); c.drawString(30,650,f'SYNTHETIC PAGE {n+1}')
        else:
            c.rect(30,500,100,100,fill=1)
        c.showPage()
    c.save()
(out/'not-pdf.txt').write_text('SYNTHETIC NON-PDF INPUT')
(out/'corrupt.pdf').write_bytes(b'%PDF-1.7\nnot a valid document')
print('Created supported (2 rows), unsupported, image-only, corrupt, non-PDF and 31-page fixtures:',out)
