from fpdf import FPDF
import re


def parse_markdown(md_content):
    lines = md_content.split('\n')
    elements = []
    current_table = []
    in_table = False
    
    for line in lines:
        if line.startswith('# '):
            if in_table:
                elements.append(('table', current_table))
                current_table = []
                in_table = False
            elements.append(('heading1', line[2:]))
            
        elif line.startswith('## '):
            if in_table:
                elements.append(('table', current_table))
                current_table = []
                in_table = False
            elements.append(('heading2', line[3:]))
            
        elif line.startswith('### '):
            if in_table:
                elements.append(('table', current_table))
                current_table = []
                in_table = False
            elements.append(('heading3', line[4:]))
            
        elif line.startswith('- '):
            if in_table:
                elements.append(('table', current_table))
                current_table = []
                in_table = False
            elements.append(('list', line[2:]))
            
        elif line.startswith('|'):
            in_table = True
            cells = [c.strip() for c in line.split('|')[1:-1]]
            current_table.append(cells)
            
        elif line.startswith('===') or line.startswith('---'):
            continue
            
        elif line.strip() and not in_table:
            if in_table:
                elements.append(('table', current_table))
                current_table = []
                in_table = False
            elements.append(('text', line.strip()))
            
        elif not line.strip():
            if in_table:
                elements.append(('table', current_table))
                current_table = []
                in_table = False
            elements.append(('empty', ''))
    
    if in_table:
        elements.append(('table', current_table))
    
    return elements


def md_to_pdf(md_path, pdf_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    elements = parse_markdown(md_content)
    
    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_font('ArialUnicode', '', '/Library/Fonts/Arial Unicode.ttf')
    pdf.add_font('ArialUnicode', 'B', '/Library/Fonts/Arial Unicode.ttf')
    pdf.set_font('ArialUnicode', '', 10)
    
    pdf.add_page()
    
    for element_type, content in elements:
        if element_type == 'heading1':
            pdf.set_font('ArialUnicode', 'B', 16)
            pdf.set_text_color(0, 0, 139)
            pdf.cell(0, 12, content, ln=True, align='C')
            pdf.set_font('ArialUnicode', '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)
            
        elif element_type == 'heading2':
            pdf.set_font('ArialUnicode', 'B', 12)
            pdf.set_text_color(0, 0, 139)
            pdf.cell(0, 10, content, ln=True)
            pdf.set_font('ArialUnicode', '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)
            
        elif element_type == 'heading3':
            pdf.set_font('ArialUnicode', 'B', 11)
            pdf.set_text_color(0, 100, 0)
            pdf.cell(0, 9, content, ln=True)
            pdf.set_font('ArialUnicode', '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)
            
        elif element_type == 'text':
            content = content.replace('**', '')
            pdf.multi_cell(0, 7, content)
            pdf.ln(2)
            
        elif element_type == 'list':
            content = content.replace('**', '')
            original_x = pdf.get_x()
            pdf.set_x(original_x + 10)
            pdf.cell(5, 7, '•', new_x='RIGHT', new_y='TOP')
            pdf.multi_cell(0, 7, content)
            pdf.set_x(original_x)
            pdf.ln(2)
            
        elif element_type == 'empty':
            pdf.ln(4)
            
        elif element_type == 'table':
            if len(content) > 0:
                table_data = []
                for row in content:
                    cleaned_row = [cell.replace('**', '').replace('--', '') for cell in row]
                    table_data.append(cleaned_row)
                
                col_count = len(table_data[0])
                page_width = pdf.w - 2 * pdf.l_margin
                
                if col_count == 3:
                    col_widths = [page_width * 0.15, page_width * 0.55, page_width * 0.30]
                elif col_count == 6:
                    col_widths = [page_width * w for w in [0.08, 0.18, 0.10, 0.10, 0.18, 0.18]]
                elif col_count == 10:
                    col_widths = [page_width * w for w in [0.06, 0.10, 0.08, 0.06, 0.08, 0.06, 0.09, 0.06, 0.09, 0.06]]
                else:
                    col_widths = [page_width / col_count] * col_count
                
                pdf.set_font('ArialUnicode', 'B', 8)
                pdf.set_fill_color(173, 216, 230)
                for j, cell in enumerate(table_data[0]):
                    pdf.cell(col_widths[j], 6, cell, border=1, new_x='RIGHT', new_y='TOP', align='C', fill=True)
                pdf.ln(6)
                
                pdf.set_font('ArialUnicode', '', 7)
                fill = False
                for row in table_data[1:]:
                    pdf.set_fill_color(255, 255, 255) if not fill else pdf.set_fill_color(240, 240, 240)
                    fill = not fill
                    for j, cell in enumerate(row):
                        pdf.cell(col_widths[j], 5, str(cell), border=1, new_x='RIGHT', new_y='TOP', align='C', fill=True)
                    pdf.ln(5)
                pdf.ln(4)
                
                pdf.set_font('ArialUnicode', '', 10)
    
    pdf.output(pdf_path)
    print(f'✅ PDF文件已生成: {pdf_path}')


if __name__ == '__main__':
    md_to_pdf('tournament_report.md', 'tournament_report.pdf')