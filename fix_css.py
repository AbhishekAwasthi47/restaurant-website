import re

with open('public/css/styles.css', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('.hero {\n  .hero {\n')
if idx != -1:
    before = content[:idx]
    after = content[idx + 8:] # skip '.hero {\n'
    
    lines = after.split('\n')
    unindented_lines = []
    
    for line in lines:
        if line.startswith('  '):
            unindented_lines.append(line[2:])
        else:
            unindented_lines.append(line)
            
    # Also we need to remove the very last closing brace if it was added implicitly or if one is extra, 
    # but actually the previous multi_replace just replaced lines, meaning an extra closing brace is NOT at the end
    # because the replacement chunk ended before it, turning the rest of the file into the contents of .hero
    # Let me make sure we reconstruct correctly.
    new_content = before + '\n'.join(unindented_lines)
    
    with open('public/css/styles.css', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed CSS nesting")
else:
    print("Pattern not found")
