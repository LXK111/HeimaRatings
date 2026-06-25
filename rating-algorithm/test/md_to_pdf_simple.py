from fpdf import FPDF
import re

def md_to_pdf_simple(md_path, pdf_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_font('ArialUnicode', '', '/Library/Fonts/Arial Unicode.ttf')
    pdf.add_font('ArialUnicode', 'B', '/Library/Fonts/Arial Unicode.ttf')
    pdf.set_font('ArialUnicode', '', 10)

    pdf.add_page()

    lines = md_content.split('\n')
    in_code = False
    current_table = []
    in_table = False

    for line in lines:
        if line.startswith('```'):
            in_code = not in_code
            if not in_code:
                pdf.ln(4)
            continue
        
        if in_code:
            pdf.set_font('ArialUnicode', '', 8)
            max_len = 100
            while len(line) > max_len:
                pdf.multi_cell(0, 5, line[:max_len])
                line = line[max_len:]
            pdf.multi_cell(0, 5, line)
            continue
        
        if line.startswith('|'):
            in_table = True
            current_table.append(line)
            continue
        
        if in_table and not line.startswith('|'):
            if len(current_table) > 0:
                col_count = len(current_table[0].split('|')) - 2
                if col_count >= 3:
                    total_rows = len(current_table)
                    estimated_height = total_rows * 7 + 10
                    remaining_height = pdf.h - pdf.get_y() - 2 * pdf.b_margin
                    
                    if remaining_height < estimated_height and pdf.page_no() > 1:
                        pdf.add_page()
                    
                    page_width = pdf.w - 2 * pdf.l_margin
                    col_widths = [page_width / col_count] * col_count
                    
                    header_printed = False
                    for row_idx, row in enumerate(current_table):
                        cells = [c.strip().replace('**', '') for c in row.split('|')[1:-1]]
                        if '---' in row:
                            continue
                        
                        if not header_printed:
                            pdf.set_font('ArialUnicode', 'B', 8)
                            pdf.set_fill_color(173, 216, 230)
                            header_printed = True
                        else:
                            pdf.set_font('ArialUnicode', '', 8)
                            pdf.set_fill_color(255, 255, 255)
                        
                        for j, cell in enumerate(cells):
                            pdf.cell(col_widths[j], 6, cell, border=1, ln=0, align='C', fill=True)
                        pdf.ln()
                
                pdf.set_font('ArialUnicode', '', 10)
                pdf.ln(4)
                in_table = False
                current_table = []
        
        if in_table:
            continue
        
        if line.startswith('# '):
            pdf.set_font('ArialUnicode', 'B', 18)
            pdf.set_text_color(0, 0, 139)
            pdf.cell(0, 14, line[2:], ln=True, align='C')
            pdf.set_font('ArialUnicode', '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(6)
            
        elif line.startswith('## '):
            pdf.set_font('ArialUnicode', 'B', 14)
            pdf.set_text_color(0, 0, 139)
            pdf.cell(0, 12, line[3:], ln=True)
            pdf.set_font('ArialUnicode', '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)
            
        elif line.startswith('### '):
            pdf.set_font('ArialUnicode', 'B', 12)
            pdf.set_text_color(0, 100, 0)
            pdf.cell(0, 10, line[4:], ln=True)
            pdf.set_font('ArialUnicode', '', 10)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)
            
        elif line.startswith('- '):
            pdf.set_x(pdf.get_x() + 10)
            pdf.cell(5, 7, '•')
            pdf.set_x(pdf.get_x() + 5)
            pdf.multi_cell(0, 7, line[2:].replace('**', ''))
            pdf.set_x(10)
            pdf.ln(2)
            
        elif line.startswith('**'):
            pdf.set_font('ArialUnicode', 'B', 10)
            pdf.multi_cell(0, 7, line.replace('**', ''))
            pdf.set_font('ArialUnicode', '', 10)
            pdf.ln(2)
            
        elif line.startswith('---'):
            pdf.ln(8)
            
        elif line.strip():
            pdf.multi_cell(0, 7, line)
            pdf.ln(2)
            
        else:
            pdf.ln(4)

    if in_table and len(current_table) > 0:
        col_count = len(current_table[0].split('|')) - 2
        if col_count >= 3:
            page_width = pdf.w - 2 * pdf.l_margin
            col_widths = [page_width / col_count] * col_count
            
            header_printed = False
            for row_idx, row in enumerate(current_table):
                cells = [c.strip().replace('**', '') for c in row.split('|')[1:-1]]
                if '---' in row:
                    continue
                
                if not header_printed:
                    pdf.set_font('ArialUnicode', 'B', 8)
                    pdf.set_fill_color(173, 216, 230)
                    header_printed = True
                else:
                    pdf.set_font('ArialUnicode', '', 8)
                    pdf.set_fill_color(255, 255, 255)
                
                for j, cell in enumerate(cells):
                    pdf.cell(col_widths[j], 6, cell, border=1, ln=0, align='C', fill=True)
                pdf.ln()

    pdf.output(pdf_path)
    print(f'✅ PDF文件已生成: {pdf_path}')

if __name__ == '__main__':
    md_to_pdf_simple('algorithm_comparison.md', 'algorithm_comparison.pdf')