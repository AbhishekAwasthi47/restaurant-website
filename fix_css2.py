with open('public/css/styles.css', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('\r\n', '\n')
idx = text.find('.hero {\n  .hero {\n')
if idx != -1:
    before = text[:idx]
    after = text[idx + 8:]
    lines = after.split('\n')
    unindented_lines = []
    for line in lines:
        if line.startswith('  '):
            unindented_lines.append(line[2:])
        else:
            unindented_lines.append(line)
            
    res = before + '\n'.join(unindented_lines)
    with open('public/css/styles.css', 'w', encoding='utf-8') as f:
        f.write(res)
    print('fixed')
else:
    print('not found')
